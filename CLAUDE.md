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
npm run eval           # run offline evaluation suite
```

### Backend (`backend/`)
```bash
npm install
npm run migrate dev    # run Prisma migrations (requires PostgreSQL)
npm run dev            # node --watch src/index.js
npm start              # migrate-and-start (used in Docker/prod)
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
- `DATABASE_URL` — PostgreSQL connection string
- `INTERNAL_API_KEY` — shared secret for agent↔backend internal calls
- `USDA_FDC_API_KEY` — USDA FoodData Central API key
- `PORT=3001`, `AGENT_URL=http://localhost:8000`, `BACKEND_URL=http://localhost:3001`, `AGENT_PORT=8000`

Optional: `LANGSMITH_TRACING_V2`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` for LangSmith observability.

## Agent Architecture (LangGraph StateGraph)

`ai-agent-ts/src/agent/graph.ts` defines a `StateGraph` compiled with `MemorySaver` (session-scoped memory per `threadId`). Flow:

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
- `toolNode` — executes tool calls from agent, returns ToolMessages

**Tools** (`tools.ts`): `get_user_profile`, `get_user_behavioural`, `search_nutrition_knowledge`, `search_foods`, `get_calorie_goal`, `request_food_log_confirmation`. All profile/log tools call backend internal API with `X-Internal-API-Key`.

**Food log confirmation flow**: `requestFoodLogConfirmationTool` calls LangGraph `interrupt()` to pause execution. The backend chat route detects `isGraphInterrupt` and returns `{ response, interrupted: true }`. The frontend shows food options; the user's selection (e.g., "1") is sent as a follow-up message with the same `threadId`, which resumes the graph via `graph.invoke(null, { config, command: { resume: value } })`.

**RAG** (`rag.ts`): Pinecone vector store with OpenAI `text-embedding-3-small` embeddings. Sources are in `ai-agent-ts/knowledge/*.md`. Add source URL mappings in the `KNOWN_SOURCES` record in `rag.ts` when adding new knowledge files.

## Backend Structure

`backend/src/` is plain ESM (`.js` files, `"type": "module"`).
- `routes/internal.js` — agent-only endpoints, all protected by `requireInternalApiKey` middleware
- `routes/chat.js` — proxies frontend chat requests to the agent, handles interrupt detection
- `services/tdee.js` — TDEE/BMR calculation from profile
- `services/fdc.js` — USDA FoodData Central proxy (search, food details, unit conversion)
- `services/foodLogs.js` — `appendFoodLog`: upserts a food log entry by date+mealType (used by agent)
- `prisma/schema.prisma` — models: `User`, `Profile` (1:1), `FoodLog`, `WeightLog`

Prisma `Decimal` fields must be serialized with `.toNumber()` before sending JSON — a pattern repeated in route handlers (look for `toNum` helper functions).

## Frontend Structure

`frontend/src/App.jsx` manages app phase state machine (`PHASES`: landing → onboarding → loading → name → summary → dashboard). React Router routes are only mounted in the dashboard phase.

`ChatThreadProvider` (`context/ChatThreadContext.jsx`) holds shared `threadId`, `messages`, `input`, and `handleSubmit` — both `ChatWidget` (floating overlay) and `ChatPage` (full-page `/dashboard/chat`) consume the same context so they share the same thread.

`DashboardLayout` renders the tab bar (Overview / Chat) and wraps the `<Outlet>`. `DashboardOverview` is the index route. `ChatPage` is `/dashboard/chat`.

All API calls go through `frontend/src/api/client.js`.

All component styles live in `frontend/src/App.css`. Design tokens are CSS variables at `:root` (green primary `#22c55e`, orange CTA `#f97316`, light theme).

## Database

PostgreSQL 15+ with Prisma ORM. Run migrations with `npm run migrate dev` from `backend/`. Schema: `users` → `profile` (1:1), `food_log` (many), `weight_log` (many). `WeightLog` has a unique constraint on `(userId, date)` — one log per user per day.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`: builds Docker images, pushes to AWS ECR, deploys to EC2 via SSH using `docker-compose.prod.yml` (pulls ECR images). See `docs/DEPLOYMENT.md` for full AWS setup.
