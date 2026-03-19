# NutriGuide AI

A production-ready nutrition chatbot that helps users get personalized dietary advice through natural conversation. It combines an AI agent powered by LangGraph and RAG with a React frontend and Node.js/Express backend, demonstrating a full-stack architecture for AI-driven applications.

Users create an account (or log in by name) and complete a short onboarding flow (goals, body metrics, preferences, activity level), then chat with the agent to ask nutrition questions, log meals, and receive tailored recommendations. The agent uses a curated knowledge base, fetches user profiles and recent food logs from the backend, and can search USDA FoodData Central for food suggestions. It maintains conversation context so advice adapts to each user's profile and history.

## Tech Stack

- **TypeScript / LangGraph.js / LangChain**: Custom LangGraph StateGraph with routing, multi-step reasoning, tools, and RAG
- **Node.js / Express**: Backend API, middleware, agent proxy
- **RAG**: OpenAI embeddings + Pinecone for nutrition knowledge (cloud vector store)
- **OpenAI**: GPT-4o-mini for the agent
- **React**: Landing (Create Account / Log in), onboarding, dashboard, and AI chat widget (light theme, green/orange palette)

## Prerequisites

- Node.js 20+
- OpenAI API key (required for the agent)
- Pinecone account and index (required for RAG; create at [app.pinecone.io](https://app.pinecone.io))
- PostgreSQL 15+ (required for backend; see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md))
- Docker and Docker Compose (optional, for Docker setup)

## Quick Reference

| Service   | Port | Description                    |
| --------- | ---- | ------------------------------ |
| AI Agent  | 8000 | LangGraph.js agent, RAG (Pinecone), tools |
| Backend   | 3001 | Express API, agent proxy       |
| Frontend  | 5173 | React chat UI (dev); 80 (Docker) |

## Setup

### 1. Environment

Copy [`.env.example`](.env.example) to `.env` in the project root and set your values:

```
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX=nutriguide-app-knowledge
DATABASE_URL=postgresql://user:password@localhost:5432/nutriguide
INTERNAL_API_KEY=your-internal-api-key
USDA_FDC_API_KEY=your-data-gov-api-key
```

Optional (for LangSmith tracing):

```
LANGSMITH_TRACING_V2=true
LANGSMITH_API_KEY=your_langchain_api_key
LANGSMITH_PROJECT=your_langchain_project_name
```

Backend: `PORT=3001`, `AGENT_URL=http://localhost:8000`, `DATABASE_URL` (required). See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for database setup.

AI agent: `AGENT_PORT=8000` (required). Pinecone keys above are required for RAG.

### 2. AI Agent (TypeScript)

Requires Pinecone index (create at [app.pinecone.io](https://app.pinecone.io)). Run `npm run index` when adding or changing files in `knowledge/`. See [docs/RUN-SERVICES-LOCALLY.md](docs/RUN-SERVICES-LOCALLY.md) for full setup.

```bash
cd ai-agent-ts
npm install
npm run build
npm run index   # when adding/changing knowledge files
npm start
```

Runs on http://localhost:8000

### 3. Backend (Node.js)

```bash
cd backend
npm install
npm run migrate dev   # Run migrations (requires PostgreSQL; see docs/DATABASE_SETUP.md)
npm run dev
```

Runs on http://localhost:3001. Set `AGENT_URL=http://localhost:8000` if the agent runs elsewhere.

### 4. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173 (proxies `/api` to backend).

### 5. Alternative: Docker Compose

Run all services with Docker:

```bash
# From project root (ensure .env exists with DATABASE_URL pointing to host PostgreSQL)
docker compose up --build
```

App available at http://localhost. Uses [docker-compose.yml](docker-compose.yml) to build and run frontend, backend, and ai-agent (TypeScript). Backend connects to your local PostgreSQL via `DATABASE_URL` (use `host.docker.internal` as host). RAG uses Pinecone (cloud). See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

For production deployment (ECR images), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Usage

**All three services must be running** for the frontend to work:

1. **AI Agent** (port 8000) – handles chat with OpenAI
2. **Backend** (port 3001) – proxies requests from frontend to agent
3. **Frontend** (port 5173) – React UI

If the backend is not running, the chat will show "Thinking..." and then fail. Start the backend with `cd backend && npm run dev`.

1. Open http://localhost:5173
2. **Create Account** or **Log in** — New users complete onboarding (goal, gender, birth date, height, weight, preferences, activity level, etc.), enter a unique name, and view the goal summary. Returning users click **Log in** and enter their name to access the dashboard.
3. Use the **dashboard** to see calorie summary (TDEE from latest weight log or profile), date picker, meals logged (search/add/edit food via USDA FDC API), weight tracking (add/edit/delete weight logs), and activity. Click **Log out** in the header to return to the landing page.
4. Open the **chat widget** (bottom-right) to ask nutrition questions. Use **New chat** in the widget to start a fresh conversation.

**Session-scoped data:** User profiles are persisted in PostgreSQL. Names must be unique. Conversation memory is session-scoped (per thread). Reloading the page clears the session; use **Log in** with your name to restore your profile.

## Project Structure

```
NutriGuide-AI/
├── docker-compose.yml      # Local dev (build from source)
├── docker-compose.prod.yml # Production (ECR images, used by deploy workflow)
├── docs/                   # Deployment, runbook, troubleshooting, Docker, CI/CD
│   ├── DEPLOYMENT.md
│   ├── RUN-SERVICES-LOCALLY.md
│   ├── RUNBOOK.md
│   ├── TROUBLESHOOTING.md
│   └── ...
├── ai-agent-ts/       # TypeScript LangGraph agent ([README](ai-agent-ts/README.md))
│   ├── src/
│   │   ├── agent/     # StateGraph, nodes, tools, RAG
│   │   ├── scripts/   # index.ts (Pinecone indexing for knowledge/)
│   │   ├── index.ts   # Express server
│   │   └── types.ts
│   └── knowledge/     # Nutrition docs for RAG
├── backend/           # Express API ([README](backend/README.md))
│   └── src/
│       ├── routes/    # /chat, /users, /foods, food logs, weight logs
│       ├── services/  # fdc (USDA proxy), tdee, foodLogs, weightLogs
│       └── index.js
├── frontend/          # React app ([README](frontend/README.md))
│   └── src/
│       ├── components/ # LandingStep, OnboardingWizard, Dashboard, MealsLogged, WeightSection, AddFoodModal, AddWeightModal, EditFoodModal, DatePicker, ChatWidget, etc.
│       ├── config/    # onboardingQuestions
│       ├── App.css    # Component styles, design tokens
│       └── api/
└── README.md
```

## API

- `GET /api/health` — Health check (returns `{ status: "ok" }`)
- `GET /health` — Same, alternate path
- `POST /api/chat` — Send message: `{ userId, message, threadId }` (userId is sessionId; agent maintains session memory per thread). Returns `{ response }` or `{ response, interrupted: true }` when the agent pauses for food log confirmation (e.g. user said "log 100g chicken for lunch" or "add 1 cup rice for dinner"—reply with "1" or "2" in a follow-up request using the same threadId). The response contains the final AI output only (no intermediate tool outputs or internal details).
- `GET /api/users/by-name?name=...` — Lookup user by name (case-insensitive). Returns `{ userId, profile }` or 404 if not found. Used for name-based login.
- `GET /api/users/:id/profile` — Get user profile (id = sessionId)
- `PUT /api/users/:id/profile` — Update profile. Schema: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }`. Names must be unique; returns 400 `{ error: "Name already taken" }` if name exists.
- `GET /api/users/:id/calorie-goal` — Get TDEE calorie goal (uses latest WeightLog or profile). Returns `{ goalKcal, bmr, tdee }`
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

## Deployment

For AWS deployment (EC2, ECR, GitHub Actions, Docker Compose), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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

For deployment, CI/CD, and EC2 issues, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
