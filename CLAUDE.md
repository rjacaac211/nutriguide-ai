# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Three independent services, each with its own `package.json` and Node.js process:

| Service | Dir | Port | Stack |
|---------|-----|------|-------|
| AI Agent | `ai-agent-ts/` | 8000 | TypeScript, LangGraph.js, LangChain, OpenAI GPT-4o-mini |
| Backend | `backend/` | 3001 | Node.js ESM, Express, Prisma, PostgreSQL |
| Frontend | `frontend/` | 5173 | React 18, Vite, React Router v6, Recharts |

All three must run simultaneously. The frontend proxies `/api` to the backend; the backend proxies `/api/chat` to the agent. The agent calls back to the backend via internal API endpoints (`/api/internal/*`) protected by `X-Internal-API-Key` header.

```
Frontend → Backend → AI Agent → Backend (internal)
                  ↘          ↗
                   PostgreSQL
                   Pinecone (RAG)
                   USDA FoodData Central
```

## Commands

### AI Agent (`ai-agent-ts/`)
```bash
npm install
npm run build          # tsc compile to dist/
npm start              # run compiled dist/index.js
npm run dev            # tsx watch (hot reload, no build needed)
npm run index          # index knowledge/ files to Pinecone (run after changing .md files)
npm run test:chat      # smoke test agent directly
npm run eval           # run offline eval suite (LLM-as-judge + agentevals trajectory match + retrieval-source check); uses LangSmith evaluate() if LANGSMITH_TRACING_V2/LANGSMITH_API_KEY are set, else runs locally
npm run typecheck      # tsc --noEmit
npm test               # vitest run — unit tests for pure-logic functions (parseLogFoodMessage, parseSelectionToIndex), no live services needed
```

### Backend (`backend/`)
```bash
npm install
npm run migrate dev    # run Prisma migrations (requires PostgreSQL)
npm run dev            # node --watch src/index.js
npm start              # migrate-and-start (used in Docker/prod)
npm test               # vitest run — unit tests for pure-logic functions (tdee.js's calculateTDEE), no live services needed
```

### Frontend (`frontend/`)
```bash
npm install
npm run dev            # Vite dev server
npm run build          # production build
npm run preview        # preview production build
```

### Docker (from project root)
```bash
docker compose up --build      # build and run all three services
docker compose up              # run without rebuilding
```

## Environment

Copy `.env.example` to `.env` in the project root. Required variables:
- `OPENAI_API_KEY` — GPT-4o-mini + OpenAI embeddings
- `PINECONE_API_KEY`, `PINECONE_INDEX` — Pinecone vector store for RAG
- `DATABASE_URL` — PostgreSQL connection string (shared by the backend's Prisma models and the AI agent's LangGraph checkpointer tables)
- `INTERNAL_API_KEY` — shared secret for agent↔backend internal calls
- `USDA_FDC_API_KEY` — USDA FoodData Central API key
- `JWT_SECRET` — signs user session tokens (see Authentication below)
- `FRONTEND_URL` — comma-separated CORS allow-list for the backend (defaults to localhost dev origins if unset)
- `PORT=3001`, `AGENT_URL=http://localhost:8000`, `BACKEND_URL=http://localhost:3001`, `AGENT_PORT=8000`

Optional: `LANGSMITH_TRACING_V2`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` for LangSmith observability. `LOG_LEVEL` (default `info`) controls `pino` verbosity in both the agent and backend.

## Agent Architecture (LangGraph StateGraph)

`ai-agent-ts/src/agent/graph.ts` defines a `StateGraph` compiled with a Postgres-backed `PostgresSaver` checkpointer (`@langchain/langgraph-checkpoint-postgres`, using the same `DATABASE_URL` as the backend) — conversation history and in-flight interrupts survive process restarts and redeploys. Flow:

**RDS SSL gotcha**: `graph.ts` builds its own `pg.Pool` (not `PostgresSaver.fromConnString`) and strips `sslmode` off `DATABASE_URL` before passing it as `connectionString`, passing SSL config instead via an explicit `ssl: { rejectUnauthorized: false }` option. This isn't cosmetic — `pg`'s `ConnectionParameters` re-parses `connectionString` internally and applies that re-parsed result *after* your explicit config (`Object.assign` order in `pg/lib/connection-parameters.js`), so if `sslmode=require` is left in the string, its derived `ssl: {}` silently overwrites the explicit override, re-enabling strict certificate verification and failing against RDS's cert chain with `SELF_SIGNED_CERT_IN_CHAIN`. Caused a real prod outage (agent crash-looping) since PR #13 first introduced the pool — don't "simplify" this back to passing `databaseUrl` directly just because it looks redundant.

```
START → classifyIntent → routeAfterClassify →
  "off_topic"  → respondDecline → END
  "chitchat"   → chitchatNode   → END
  "log_food"   → logFoodNode    → END
  "nutrition"  → analyze → agentNode ⇄ toolNode (loop) → END
```

**State** (`state.ts`): `messages` (LangChain BaseMessage array with reducer), `user_id`, `classification`, `analysis`.

**Nodes** (`nodes.ts`):
- `classifyIntent` — structured output (zod schema) to classify intent
- `logFoodNode` — regex-parses food log messages, calls `requestFoodLogConfirmationTool` directly
- `analyze` — brief LLM reasoning step before agent loop
- `agentNode` — GPT-4o-mini with tools bound; loops with `toolNode` until no tool calls remain
- `toolNode` — executes tool calls from agent, returns ToolMessages; overwrites any `user_id` argument in a tool call with the trusted `state.user_id` before invoking (see "Prompt injection mitigations" below)

All LLM-calling nodes log token usage/cost via `logTokenUsage()` (`agent/observability.ts`), keyed off `nodes.ts`'s `MODEL_NAME` constant. **If you change the model, add a matching entry to `observability.ts`'s `PRICING_PER_1M_TOKENS_USD` table** — an unlisted model logs a warning and skips the cost estimate rather than silently pricing against the old model.

**Tools** (`tools.ts`): `get_user_profile`, `get_user_behavioural`, `search_nutrition_knowledge`, `search_foods`, `get_calorie_goal`, `request_food_log_confirmation`. All profile/log tools call backend internal API with `X-Internal-API-Key`.

**Food log confirmation flow**: `requestFoodLogConfirmationTool` calls LangGraph `interrupt()` to pause execution. `ai-agent-ts/src/index.ts` derives pause status from `graph.getState(config).tasks[].interrupts` (durable via the Postgres checkpointer), checked both before starting a turn (to decide whether to resume) and after the streaming loop completes (to detect a pause mid-turn). On a pause, it sends the formatted options as a single SSE `interrupt` event (see "Streaming chat responses" below) instead of a normal `token` stream. The frontend shows the options; the user's selection (e.g., "1") is sent as a follow-up message with the same `threadId`, which resumes the graph via `graph.stream(new Command({ resume: value }), { ...config, streamMode: "messages" })`.

**Streaming chat responses**: `POST /chat` responds `text/event-stream`, not a single JSON blob. `ai-agent-ts/src/index.ts` drives the turn via `graph.stream(input, { ...config, streamMode: "messages" })`, which yields `[messageChunk, metadata]` tuples — LLM tokens stream even though every node still calls `model.invoke()` internally (LangGraph's `"messages"` stream mode intercepts the call), so no node code changes were needed. Chunks are filtered to a `STREAMED_NODES` allow-list (`agentNode`, `chitchatNode`, `respondDecline`) via `metadata.langgraph_node`, forwarded as SSE `token` events; `classifyIntent`'s structured-output tokens and `analyze`'s internal reasoning are excluded this way. Two node-specific quirks are worked around in `index.ts`: (1) nodes that construct their final `AIMessage` directly instead of via a streamed LLM call (`logFoodNode`'s post-resume confirmation) never appear in `"messages"` mode, so if a completed turn produced zero `token` events, the last message's text is read straight from final state and sent as a fallback `token`; (2) `chitchatNode`/`respondDecline` (which share a plain, non-tool-bound `model` instance) emit one extra chunk after their real incremental deltas whose content is a full recap of everything already streamed — detected and dropped by comparing each incoming chunk against the turn's accumulated text so far. The backend (`backend/src/routes/chat.js`) proxies this as a byte-level passthrough (`Readable.fromWeb(response.body).pipe(res)`), not a JSON re-serialize. **Client-disconnect detection must use `res.on("close")`, not `req.on("close")`** in both the agent and backend proxy handlers — `req` (the incoming request stream) fires `"close"` once its body is fully read, which happens almost immediately and is unrelated to whether the client is still waiting on the response; using it instead of `res.on("close")` aborts the upstream fetch/graph run before any response is ever sent.

**RAG** (`rag.ts`): Pinecone vector store with OpenAI `text-embedding-3-small` embeddings. Sources are in `ai-agent-ts/knowledge/*.md` (currently `healthy_diet.md`, `hydration.md`, `diabetes_diet.md`, `physical_activity_nutrition.md`). Add source URL mappings in the exported `KNOWN_SOURCES` record in `rag.ts` when adding new knowledge files — the eval suite's `retrievalSourceCorrect` evaluator (`eval/evaluators.ts`) imports this same map to check that `search_nutrition_knowledge` surfaced the expected source's URL for a given question (see `expected_source_file` on eval dataset examples in `eval/dataset.ts`), so an undocumented `KNOWN_SOURCES` entry breaks that check, not just source attribution.

**Prompt injection mitigations**: `message` is capped at 4000 characters, enforced independently at both `backend/src/routes/chat.js` and this service's `POST /chat` (`index.ts`) since the agent is also reachable directly (eval harness, `test:chat`), not just through the backend proxy — a matching `maxLength` on the frontend input is UX only, not the actual control. `toolNode` (`nodes.ts`) also overwrites any `user_id` argument in a tool call with the trusted `state.user_id` before invoking, rather than trusting whatever the model supplied, closing a gap where a successful injection could otherwise target another user's data via `get_user_profile`/`get_user_behavioural`/`get_calorie_goal`/`request_food_log_confirmation`. See `ai-agent-ts/README.md`'s "Prompt Injection & Security Considerations" section for the full threat model and known gaps.

## Observability

Both services log structured JSON via `pino` (`ai-agent-ts/src/logger.ts`, `backend/src/logger.js`) — pretty-printed via `pino-pretty` in dev, plain JSON in prod. This is gated on `NODE_ENV=production`, set explicitly in both Dockerfiles: without it, prod containers would try to load the dev-only `pino-pretty` transport (stripped from the `--omit=dev` production install) and crash on boot — don't remove that `ENV` line.

`pino-http` is mounted as the *first* middleware in both Express apps (before `cors()`/`express.json()`, since `cors()` doesn't call `next()` for rejected/preflight requests) and attaches a per-request `req.log` plus `req.id`. `backend/src/routes/chat.js` forwards its `req.id` to the agent as an `X-Request-Id` header on the `/chat` proxy call; the agent's `pino-http` reuses that header instead of minting a new one, so one correlation ID threads through both services' logs. That same ID (plus `user_id`/`thread_id`) is also passed as LangGraph `metadata` on every graph call, alongside `tags` (`chat` + `new-turn`/`resume` for live traffic, `eval`/`manual-test` for the eval harness and `test:chat` script) and `runName: "nutriguide-chat"` — so LangSmith traces are filterable by source and correlate back to the same request. Live chat traffic drives the graph via `graph.stream(..., { streamMode: "messages" })` (see "Streaming chat responses" under Agent Architecture above); the eval harness and `test:chat` script call `graph.invoke()` directly, in-process, bypassing HTTP entirely, so they're unaffected by the streaming endpoint's wire format. See the token-usage/cost logging note under Agent Architecture above for the `MODEL_NAME`/pricing-table coupling.

## Backend Structure

`backend/src/` is plain ESM (`.js` files, `"type": "module"`).
- `routes/internal.js` — agent-only endpoints, all protected by `requireInternalApiKey` middleware
- `routes/chat.js` — proxies frontend chat requests to the agent, protected by `requireAuth` (interrupt detection happens in the agent, not here — see Agent Architecture above)
- `routes/users.js`, `foodLogs.js`, `weightLogs.js` — user-scoped routes, all protected by `requireAuth` + `requireOwnership`
- `services/tdee.js` — TDEE/BMR calculation from profile
- `services/fdc.js` — USDA FoodData Central proxy (search, food details, unit conversion)
- `services/foodLogs.js` — `appendFoodLog`: upserts a food log entry by date+mealType (used by agent)
- `prisma/schema.prisma` — models: `User`, `Profile` (1:1), `FoodLog`, `WeightLog`

Prisma `Decimal` fields must be serialized with `.toNumber()` before sending JSON — a pattern repeated in route handlers (look for `toNum` helper functions).

### Authentication

`middleware/auth.js` issues and verifies JWTs (7-day TTL, `JWT_SECRET`). Accounts are created via `POST /api/users` and resumed via `GET /api/users/by-name`; both return a token the frontend sends as `Authorization: Bearer <token>` (see `frontend/src/api/client.js`). `requireAuth` verifies the token and sets `req.userId`; `requireOwnership` (must run after `requireAuth`) 403s if `req.params.id !== req.userId`, so a valid token for one account can't read/write another account's profile, food logs, or weight logs. `/api/internal/*` is separate — it's agent-to-backend only and uses `requireInternalApiKey`, not user auth.

CORS (`backend/src/index.js`) allows origins in `FRONTEND_URL` (comma-separated) plus any origin whose host matches the request's own `Host` header — so the same server reached via IP, DNS name, or a future custom domain is treated as same-origin without needing every variant listed explicitly.

## Frontend Structure

`frontend/src/App.jsx` manages app phase state machine (`PHASES`: landing → onboarding → loading → name → summary → dashboard). React Router routes are only mounted in the dashboard phase.

`ChatThreadProvider` (`context/ChatThreadContext.jsx`) holds shared `threadId`, `messages`, `input`, and `handleSubmit` — both `ChatWidget` (floating overlay) and `ChatPage` (full-page `/dashboard/chat`) consume the same context so they share the same thread.

`DashboardLayout` renders the tab bar (Overview / Chat) and wraps the `<Outlet>`. `DashboardOverview` is the index route. `ChatPage` is `/dashboard/chat`.

All API calls go through `frontend/src/api/client.js`.

All component styles live in `frontend/src/App.css`. Design tokens are CSS variables at `:root` (green primary `#22c55e`, orange CTA `#f97316`, light theme).

## Database

PostgreSQL 15+ with Prisma ORM. Run migrations with `npm run migrate dev` from `backend/`. Schema: `users` → `profile` (1:1), `food_log` (many), `weight_log` (many). `WeightLog` has a unique constraint on `(userId, date)` — one log per user per day.

The same database also holds the AI agent's LangGraph checkpoint tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`), created and managed by `PostgresSaver.setup()` (see Agent Architecture above) — outside Prisma's schema/migrations, no collision.

## CI

Pull requests targeting `main` trigger `.github/workflows/ci.yml`: three independent jobs (`ai-agent-test`, `backend-test`, `frontend-build`), each `npm ci` + the relevant check (`npm run typecheck && npm test` for the agent, `npm test` for the backend, `npm run build` for the frontend). No Postgres service container and no secrets are needed — the unit tests only cover pure functions (no DB/network access). This is separate from `deploy.yml` below and doesn't run the eval harness (`npm run eval`), which still needs a live backend + DB + API keys and isn't wired into CI.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`: builds Docker images, pushes to AWS ECR, deploys to EC2 via SSH using `docker-compose.prod.yml` (pulls ECR images). See `docs/DEPLOYMENT.md` for full AWS setup.
