# NutriGuide AI

An AI nutrition coach you talk to: log meals in plain English, ask questions grounded in a curated knowledge base, and track calories and weight — powered by a LangGraph agent with durable conversation state, streamed token-by-token to a React dashboard.

[![CI](https://github.com/rjacaac211/nutriguide-ai/actions/workflows/ci.yml/badge.svg?event=pull_request)](https://github.com/rjacaac211/nutriguide-ai/actions/workflows/ci.yml)
[![Build and Deploy](https://github.com/rjacaac211/nutriguide-ai/actions/workflows/deploy.yml/badge.svg)](https://github.com/rjacaac211/nutriguide-ai/actions/workflows/deploy.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Node 20](https://img.shields.io/badge/Node-20-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph.js-agent-1c3c3c)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169e1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ed?logo=docker&logoColor=white)

![Logging food through chat: the agent parses "200 grams of white rice", searches USDA FoodData Central, pauses on a LangGraph interrupt for confirmation, and the logged meal lands on the dashboard](docs/media/hero-chat-log.gif)

*Natural-language food logging: parse → confirm via LangGraph interrupt → logged to the dashboard.*

- **Chat-based food logging** — "log 200 grams of white rice for dinner" is parsed (regex fast path, LLM fallback), matched against USDA FoodData Central, and confirmed through a real LangGraph `interrupt()` before anything is written.
- **Grounded nutrition Q&A** — answers cite a curated CDC/WHO-sourced knowledge base (Pinecone RAG) and are personalized from the user's profile and logs.
- **Streaming end-to-end** — tokens stream over SSE from the agent through the backend proxy to the UI.
- **Onboarding → personalized goal** — goals, body metrics, and activity level become a TDEE-based daily calorie target.
- **Dashboard** — meals, weight trend, and calories-vs-goal charts in a "Bento & Bold" visual identity.
- **Eval-gated agent** — an offline eval suite (LLM-as-judge, trajectory matching, retrieval-source checks) runs against every part of the agent's behavior.

### More demos

| Grounded Q&A with cited sources | Dashboard |
|---|---|
| ![Asking how much water to drink per day: the agent streams a personalized answer citing the CDC source](docs/media/rag-qa.gif) | ![Dashboard overview with calorie tiles, logged meals, weight, and progress charts](docs/media/dashboard.png) |

<details>
<summary>Onboarding flow (GIF)</summary>

![Onboarding wizard: goal, body metrics, preferences, activity level, then a computed goal summary and the dashboard](docs/media/onboarding.gif)

</details>

## Tech Stack at a Glance

| Area | Technologies & Approaches |
|------|---------------------------|
| **AI / Agent** | LangGraph.js `StateGraph` (classify → analyze → agent ⇄ tools loop), LangChain tools, `interrupt()` confirmation flows, Postgres-backed conversation memory (`PostgresSaver`) that survives restarts and redeploys |
| **RAG** | OpenAI `text-embedding-3-small` + Pinecone; curated CDC/WHO-sourced Markdown knowledge base |
| **LLM** | OpenAI GPT-4o-mini (agent, structured-output classification and extraction) |
| **Evaluation** | LLM-as-judge grading vs reference answers, `agentevals` trajectory matching, retrieval-source correctness checks, LangSmith `evaluate()` experiments; runnable in CI |
| **Observability** | Structured JSON logging (`pino`), cross-service `X-Request-Id` correlation, per-LLM-call token/cost logging, LangSmith run tags/metadata |
| **Frontend** | React 18 (Vite, React Router), SSE streaming chat, Recharts, self-hosted fonts |
| **Backend / Data** | Node.js/Express (ESM), Prisma + PostgreSQL 15, USDA FoodData Central proxy, JWT auth with per-user ownership checks |
| **Testing / CI** | `vitest` unit tests (agent + backend), TypeScript typecheck gate, PR-triggered GitHub Actions |
| **Deployment** | Docker Compose, AWS EC2 + ECR + RDS, GitHub Actions CI/CD on push to `main` |

## Architecture

```mermaid
flowchart LR
    subgraph Client
        FE[React Frontend]
    end

    subgraph Backend
        API[Express API]
    end

    subgraph Agent
        AG[LangGraph Agent]
    end

    subgraph Data
        DB[(PostgreSQL)]
        PC[Pinecone RAG]
        USDA[USDA FoodData Central]
    end

    FE -->|/api/*| API
    API -->|/chat| AG
    AG -->|Internal API| API
    API --> DB
    API -->|food search| USDA
    AG --> PC
```

The agent calls back into the backend through internal-only endpoints protected by a shared `X-Internal-API-Key`; user-facing routes require a JWT scoped to one user. Both the backend's Prisma models and the agent's LangGraph checkpointer share one PostgreSQL database.

## Engineering Highlights

The parts an engineer reviewing this repo will probably find most interesting:

- **Agent graph with durable interrupts.** The LangGraph `StateGraph` routes each message by intent (off-topic / chitchat / food-log / nutrition) before any expensive work. Food logging pauses on a real `interrupt()` — the pause survives process restarts because checkpoints live in Postgres, so a user can confirm "1" after a redeploy and the graph resumes. Details: [ai-agent-ts/README.md](ai-agent-ts/README.md).

- **Hybrid parsing: deterministic fast path, LLM fallback.** Food-log messages hit a zero-cost regex first; only phrasings the regex can't handle ("200 *grams* of rice", "2kg") fall back to a temperature-0 structured-extraction LLM call. The eval harness tests the combined path — the same code that runs in production — not just the regex.

- **Offline eval suite, wired into CI.** ~50 examples graded three ways: LLM-as-judge against reference answers, `agentevals` trajectory matching (did it call the right tools in the right order), and a retrieval-source check (did RAG surface the *expected* source URL, not just plausible text). A manually-triggered GitHub Actions workflow ([eval.yml](.github/workflows/eval.yml)) runs it against an ephemeral Postgres + seeded fixture user and fails below a pass-rate threshold.

- **SSE streaming without rewriting the agent.** LangGraph's `streamMode: "messages"` intercepts `model.invoke()` calls, so tokens stream with zero node changes. Chunks are filtered to an allow-list of user-facing nodes (classification/reasoning tokens never leak), the backend proxies bytes as-is, and client disconnects are detected via `res.on("close")` — its tempting sibling `req.on("close")` fires immediately and kills the stream before any response is sent.

- **Observability that crosses service boundaries.** One `X-Request-Id` threads through backend logs → agent logs → LangGraph run metadata, so a LangSmith trace correlates back to the exact request in both services' `pino` JSON logs. Every LLM call logs token usage and estimated cost.

- **Prompt-injection mitigations.** Message length caps are enforced at both the backend proxy *and* the agent (which is reachable directly), and the tool-execution node overwrites any model-supplied `user_id` argument with the trusted one from graph state — a successful injection can't read another user's profile or logs. Threat model and known gaps: [ai-agent-ts/README.md](ai-agent-ts/README.md#prompt-injection--security-considerations).

- **A production incident worth reading.** The agent crash-looped in prod with `SELF_SIGNED_CERT_IN_CHAIN` while the backend used the same `DATABASE_URL` fine. Root cause (verified against `pg`'s source, not guessed): `pg` re-parses `connectionString` internally and merges the result *after* explicit config, so `sslmode=require` in the URL silently clobbered an explicit `ssl: { rejectUnauthorized: false }` override. The fix, and why it must not be "simplified" away, is documented in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) and [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

## Quick Start

Prerequisites: Node.js 20+, PostgreSQL 15+ ([docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)), an OpenAI API key, a Pinecone account + index ([app.pinecone.io](https://app.pinecone.io)), and a USDA FoodData Central API key. Docker Desktop for the Compose path.

**1. Environment** — copy [`.env.example`](.env.example) to `.env` in the project root and set:

```
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=nutriguide-app-knowledge
DATABASE_URL=postgresql://user:password@localhost:5432/nutriguide
INTERNAL_API_KEY=your-internal-api-key
USDA_FDC_API_KEY=your-data-gov-api-key
JWT_SECRET=your-jwt-secret
```

Optional: `LANGSMITH_TRACING_V2`/`LANGSMITH_API_KEY`/`LANGSMITH_PROJECT` (tracing), `LOG_LEVEL` (default `info`).

**2. Run with Docker Compose** (recommended):

```bash
# DATABASE_URL host must be host.docker.internal so containers reach host Postgres
docker compose up --build
```

App available at http://localhost. First run: index the knowledge base with `cd ai-agent-ts && npm install && npm run index`.

**3. Demo data (optional)** — seed a ready-made account with two weeks of realistic logs, then log in as **Alex Demo**:

```bash
cd backend && npm install && npm run migrate dev && node scripts/demo-seed.js
```

<details>
<summary>Run services individually without Docker (dev mode)</summary>

All three services must run simultaneously. See [docs/RUN-SERVICES-LOCALLY.md](docs/RUN-SERVICES-LOCALLY.md) for details.

```bash
# AI Agent (port 8000)
cd ai-agent-ts
npm install
npm run index   # when adding/changing knowledge/ files
npm run dev

# Backend (port 3001)
cd backend
npm install
npm run migrate dev
npm run dev

# Frontend (port 5173, proxies /api to the backend)
cd frontend
npm install
npm run dev
```

| Service   | Port | Description |
| --------- | ---- | ------------------------------ |
| AI Agent  | 8000 | LangGraph.js agent, RAG (Pinecone), tools |
| Backend   | 3001 | Express API, agent proxy |
| Frontend  | 5173 | React UI (dev); 80 (Docker) |

</details>

## Project Structure

```
NutriGuide-AI/
├── docker-compose.yml      # Local dev (build from source)
├── docker-compose.prod.yml # Production (ECR images, used by deploy workflow)
├── docs/                   # Deployment, runbook, troubleshooting, Docker, CI/CD
│   ├── media/              # README GIFs and screenshots
│   ├── DEPLOYMENT.md
│   ├── RUN-SERVICES-LOCALLY.md
│   ├── RUNBOOK.md
│   ├── TROUBLESHOOTING.md
│   └── ...
├── ai-agent-ts/       # TypeScript LangGraph agent ([README](ai-agent-ts/README.md))
│   ├── src/
│   │   ├── agent/     # StateGraph, nodes, tools, RAG
│   │   ├── eval/      # Dataset, target, evaluators (npm run eval)
│   │   ├── scripts/   # index.ts (Pinecone indexing), run-eval.ts
│   │   ├── index.ts   # Express server
│   │   └── types.ts
│   └── knowledge/     # Nutrition docs for RAG
├── backend/           # Express API ([README](backend/README.md))
│   ├── scripts/       # demo-seed.js (demo account), eval-seed.js (eval fixture)
│   └── src/
│       ├── routes/    # /chat, /users, /foods, food logs, weight logs
│       ├── services/  # fdc (USDA proxy), tdee, foodLogs, weightLogs
│       └── index.js
├── frontend/          # React app ([README](frontend/README.md))
│   ├── public/fonts/  # Self-hosted Fredoka, Plus Jakarta Sans (woff2)
│   └── src/
│       ├── components/ # LandingStep, OnboardingWizard, DashboardLayout, DashboardOverview, ProfileView, ChatPage, ProgressCharts, MealsLogged, WeightSection, AddFoodModal, AddWeightModal, EditFoodModal, DatePicker, ChatWidget, Chat
│       ├── hooks/      # useModalA11y (shared modal Escape/focus-trap/aria)
│       ├── context/   # ChatThreadContext (shared chat state)
│       ├── config/    # onboardingQuestions
│       ├── App.css    # Component styles, design tokens
│       └── api/
└── README.md
```

## API

Every route below except account creation/login requires `Authorization: Bearer <token>` (a JWT scoped to one userId, issued at signup/login); requests for a `:id` the token doesn't own are rejected with 403. Chat responses stream as SSE (`text/event-stream`), token-by-token, with food-log confirmations delivered as a single `interrupt` event — see [ai-agent-ts/README.md](ai-agent-ts/README.md) for the full event contract.

<details>
<summary>Full endpoint list</summary>

- `GET /api/health` — Health check (returns `{ status: "ok" }`)
- `GET /health` — Same, alternate path
- `POST /api/users` — Create a new account server-side. Returns `{ userId, token, profile }`.
- `GET /api/users/by-name?name=...` — Log in by name (case-insensitive, no password). Returns `{ userId, token, profile }` or 404 if not found.
- `POST /api/chat` — Send message: `{ message, threadId }` (userId comes from the token; agent maintains session memory per thread). Responds `text/event-stream` (SSE), streaming the AI output token-by-token as `token` events, rather than a single JSON blob. Pauses for food log confirmation (e.g. user said "log 100g chicken for lunch") are sent as a single `interrupt` event with the formatted options; reply with "1" or "2" in a follow-up request using the same threadId to resume.
- `GET /api/users/:id/profile` — Get user profile
- `PUT /api/users/:id/profile` — Update profile. Schema: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }`. Names must be unique; returns 400 `{ error: "Name already taken" }` if name exists.
- `GET /api/users/:id/calorie-goal` — Get TDEE calorie goal (uses latest WeightLog or profile). Returns `{ goalKcal, bmr, tdee }`
- `GET /api/users/:id/daily-calories?from=YYYY-MM-DD&to=YYYY-MM-DD` — Daily calorie totals for date range (UTC). Returns `{ days: [{ date, calories }] }` with all days filled (missing = 0). Range capped at 366 days.
- `GET /api/foods/search?q=...&limit=25` — Search foods via USDA FoodData Central (proxy)
- `GET /api/foods/:fdcId` — Fetch full food details including portions (cups, servings, etc.)
- `GET /api/users/:id/food-logs?date=YYYY-MM-DD` — List food logs for date
- `POST /api/users/:id/food-logs` — Create food log. Body: `{ mealType, items, loggedAt }`
- `PUT /api/users/:id/food-logs/:logId` — Update food log
- `DELETE /api/users/:id/food-logs/:logId` — Delete food log
- `GET /api/users/:id/weight-logs?from=YYYY-MM-DD&to=YYYY-MM-DD` — List weight logs (default: last 30 days)
- `POST /api/users/:id/weight-logs` — Create or replace weight log. Body: `{ weightKg, date, notes? }`
- `PUT /api/users/:id/weight-logs/:logId` — Update weight log. Body: `{ weightKg?, notes? }`
- `DELETE /api/users/:id/weight-logs/:logId` — Delete weight log

</details>

## Deployment

Push to `main` triggers GitHub Actions to build Docker images, push to AWS ECR, and deploy to EC2 via SSH. The EC2 instance runs `docker compose` with frontend, backend, and ai-agent containers.

```mermaid
flowchart LR
    subgraph GitHub
        Repo[GitHub Repo]
        Actions[GitHub Actions]
    end

    subgraph AWS
        ECR[ECR Registry]
        EC2[EC2 Instance]
        Docker[Docker Compose]
        RDS[(RDS PostgreSQL)]
    end

    Repo -->|push| Actions
    Actions -->|build & push| ECR
    Actions -->|SSH deploy| EC2
    EC2 -->|pull| ECR
    EC2 -->|runs| Docker
    EC2 -->|DATABASE_URL| RDS
```

For full setup (EC2, ECR, secrets, RDS), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

| Doc | Description |
|-----|-------------|
| [DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | PostgreSQL setup (dev and prod) |
| [FOOD_LOGGING_TEST.md](docs/FOOD_LOGGING_TEST.md) | Test food logging (USDA FDC) and weight logging |
| [RUN-SERVICES-LOCALLY.md](docs/RUN-SERVICES-LOCALLY.md) | Run each service separately for debugging |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | AWS deployment (EC2, ECR, GitHub Actions) |
| [RUNBOOK.md](docs/RUNBOOK.md) | Operations runbook |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Deployment and CI/CD troubleshooting |
| [DOCKER.md](docs/DOCKER.md) | Docker setup details |
| [CICD.md](docs/CICD.md) | GitHub Actions and secrets |
| [AWS-SETUP.md](docs/AWS-SETUP.md) | AWS IAM and security group setup |
| [EC2-SETUP.md](docs/EC2-SETUP.md) | EC2 instance setup |

## Troubleshooting

- **Chat stuck on "Thinking..."** — Backend is not running. Start it with `cd backend && npm run dev`.
- **Agent connection errors** — Ensure the AI agent is running on port 8000. Set `AGENT_URL` in `.env` if it runs elsewhere.
- **OpenAI API errors** — Verify `OPENAI_API_KEY` is set correctly in `.env`.
- **Session behavior** — Profiles and logs persist in PostgreSQL (names are unique); the browser session is in-memory, so reloading the page returns to the landing page — use **Log in** with your name to restore your profile.

For deployment, CI/CD, and EC2 issues, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
