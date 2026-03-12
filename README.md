# NutriGuide AI

A production-ready nutrition chatbot that demonstrates LangGraph (Python), Node.js/Express, RAG, OpenAI, and React. Provides personalized nutrition recommendations based on user profile, goals, and conversation history.

## Tech Stack

- **Python / LangChain / LangGraph**: Single-agent with tools and RAG
- **Node.js / Express**: Backend API, middleware, agent proxy
- **RAG**: OpenAI embeddings + ChromaDB for nutrition knowledge
- **OpenAI**: GPT-4o-mini for the agent
- **React**: Create Profile onboarding, dashboard, and AI chat widget (light theme, green/orange palette)

## Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key (required for the agent)
- Docker and Docker Compose (optional, for Docker setup)

## Quick Reference

| Service   | Port | Description                    |
| --------- | ---- | ------------------------------ |
| AI Agent  | 8000 | LangGraph agent, RAG, tools    |
| Backend   | 3001 | Express API, agent proxy       |
| Frontend  | 5173 | React chat UI                  |

## Setup

### 1. Environment

Copy [`.env.example`](.env.example) to `.env` in the project root and set your values:

```
OPENAI_API_KEY=sk-your-key-here
```

Optional (for LangSmith tracing):

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=your_langchain_project_name
```

Backend options: `PORT=3001`, `AGENT_URL=http://localhost:8000`

### 2. AI Agent (Python)

```bash
cd ai-agent
pip install -r requirements.txt
python main.py
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

App available at http://localhost:80. Uses [docker-compose.yml](docker-compose.yml) to build and run frontend, backend, and ai-agent.

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
├── ai-agent/          # Python LangGraph agent ([README](ai-agent/README.md))
│   ├── agent/          # create_agent, tools, RAG
│   ├── knowledge/      # Nutrition docs for RAG
│   └── main.py         # FastAPI server
├── backend/            # Express API ([README](backend/README.md))
│   └── src/
│       ├── routes/     # /chat, /users
│       └── index.js
├── frontend/           # React app ([README](frontend/README.md))
│   └── src/
│       ├── components/ # LandingStep, OnboardingWizard, QuestionSlide, Dashboard, ChatWidget, etc.
│       ├── config/     # onboardingQuestions
│       ├── App.css     # Component styles, design tokens
│       └── api/
└── README.md
```

## API

- `POST /api/chat` — Send message: `{ userId, message, threadId }` (userId is sessionId; agent maintains session memory per thread)
- `GET /api/users/:id/profile` — Get user profile (id = sessionId)
- `PUT /api/users/:id/profile` — Update profile. Extended schema: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }`

## Deployment

For AWS deployment (EC2, ECR, GitHub Actions, Docker Compose), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Troubleshooting

- **Chat stuck on "Thinking..."** — Backend is not running. Start it with `cd backend && npm run dev`.
- **Agent connection errors** — Ensure the AI agent is running on port 8000. Set `AGENT_URL` in `.env` if it runs elsewhere.
- **OpenAI API errors** — Verify `OPENAI_API_KEY` is set correctly in `.env`.
