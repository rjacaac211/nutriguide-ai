# NutriGuide AI

A production-ready nutrition chatbot that helps users get personalized dietary advice through natural conversation. It combines an AI agent powered by LangGraph and RAG with a React frontend and Node.js/Express backend, demonstrating a full-stack architecture for AI-driven applications.

Users complete a short onboarding flow (goals, body metrics, preferences, activity level), then chat with the agent to ask nutrition questions, log meals, and receive tailored recommendations. The agent uses a curated knowledge base and maintains conversation context, so advice adapts to each user's profile and history.

## Tech Stack

- **TypeScript / LangGraph.js / LangChain**: Single-agent with tools and RAG (`createAgent`)
- **Node.js / Express**: Backend API, middleware, agent proxy
- **RAG**: OpenAI embeddings + Chroma for nutrition knowledge (Chroma server in Docker)
- **OpenAI**: GPT-4o-mini for the agent
- **React**: Create Profile onboarding, dashboard, and AI chat widget (light theme, green/orange palette)

## Prerequisites

- Node.js 20+
- OpenAI API key (required for the agent)
- Docker and Docker Compose (optional, for Docker setup)

## Quick Reference

| Service   | Port | Description                    |
| --------- | ---- | ------------------------------ |
| Chroma    | 8001 | Vector store for RAG (when run separately) |
| AI Agent  | 8000 | LangGraph.js agent, RAG, tools |
| Backend   | 3001 | Express API, agent proxy       |
| Frontend  | 5173 | React chat UI (dev); 80 (Docker) |

## Setup

### 1. Environment

Copy [`.env.example`](.env.example) to `.env` in the project root and set your values:

```
OPENAI_API_KEY=sk-your-key-here
```

Optional (for LangSmith tracing):

```
LANGSMITH_TRACING_V2=true
LANGSMITH_API_KEY=your_langchain_api_key
LANGSMITH_PROJECT=your_langchain_project_name
```

Backend options: `PORT=3001`, `AGENT_URL=http://localhost:8000`

AI agent options: `AGENT_PORT=8000`, `CHROMA_URL=http://localhost:8001` (when Chroma runs separately)

### 2. AI Agent (TypeScript)

Requires Chroma running (e.g. `docker run --rm -p 8001:8000 chromadb/chroma:0.6.1`). See [docs/RUN-SERVICES-LOCALLY.md](docs/RUN-SERVICES-LOCALLY.md) for full setup.

```bash
cd ai-agent-ts
npm install --legacy-peer-deps
npm run build
CHROMA_URL=http://localhost:8001 npm start
```

Runs on http://localhost:8000

### 3. Backend (Node.js)

```bash
cd backend
npm install
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
# From project root (ensure .env exists)
docker compose up --build
```

App available at http://localhost. Uses [docker-compose.yml](docker-compose.yml) to build and run frontend, backend, Chroma, and ai-agent (TypeScript).

For production deployment (ECR images), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Usage

**All three services must be running** for the frontend to work:

1. **AI Agent** (port 8000) – handles chat with OpenAI
2. **Backend** (port 3001) – proxies requests from frontend to agent
3. **Frontend** (port 5173) – React UI

If the backend is not running, the chat will show "Thinking..." and then fail. Start the backend with `cd backend && npm run dev`.

1. Open http://localhost:5173
2. Click **Create Account** to start the onboarding flow
3. Answer the profile questions (goal, gender, birth date, height, weight, preferences, activity level, etc.)
4. Enter your name and view your goal summary
5. Use the **dashboard** to see calorie summary, meals logged, and activity
6. Open the **chat widget** (bottom-right) to ask nutrition questions. Use **New chat** in the widget to start a fresh conversation.

**Session-scoped data:** Profile and conversation memory are stored in memory and are not persisted. Reloading the page starts a new session—you will need to create your profile again. This mirrors the LangGraph agent's session-scoped conversation memory.

## Project Structure

```
NutriGuide-AI/
├── docker-compose.yml      # Local dev (build from source)
├── docker-compose.prod.yml # Production (ECR images)
├── ai-agent-ts/       # TypeScript LangGraph agent ([README](ai-agent-ts/README.md))
│   ├── src/
│   │   ├── agent/     # createAgent, tools, RAG
│   │   ├── index.ts   # Express server
│   │   └── types.ts
│   └── knowledge/     # Nutrition docs for RAG
├── ai-agent/          # (Legacy) Python agent — deprecated, use ai-agent-ts
├── backend/           # Express API ([README](backend/README.md))
│   └── src/
│       ├── routes/    # /chat, /users
│       └── index.js
├── frontend/          # React app ([README](frontend/README.md))
│   └── src/
│       ├── components/ # LandingStep, OnboardingWizard, QuestionSlide, Dashboard, ChatWidget, etc.
│       ├── config/    # onboardingQuestions
│       ├── App.css    # Component styles, design tokens
│       └── api/
└── README.md
```

## API

- `POST /api/chat` — Send message: `{ userId, message, threadId }` (userId is sessionId; agent maintains session memory per thread). Returns `{ response }` with the final AI output only (no intermediate tool outputs or internal details).
- `GET /api/users/:id/profile` — Get user profile (id = sessionId)
- `PUT /api/users/:id/profile` — Update profile. Extended schema: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }`

## Deployment

For AWS deployment (EC2, ECR, GitHub Actions, Docker Compose), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Troubleshooting

- **Chat stuck on "Thinking..."** — Backend is not running. Start it with `cd backend && npm run dev`.
- **Agent connection errors** — Ensure the AI agent is running on port 8000. Set `AGENT_URL` in `.env` if it runs elsewhere.
- **OpenAI API errors** — Verify `OPENAI_API_KEY` is set correctly in `.env`.
