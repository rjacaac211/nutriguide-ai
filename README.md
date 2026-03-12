# NutriGuide AI

A production-ready nutrition chatbot that demonstrates LangGraph (Python), Node.js/Express, RAG, OpenAI, and React. Provides personalized nutrition recommendations based on user profile, goals, and conversation history.

## Tech Stack

- **Python / LangChain / LangGraph**: Single-agent with tools and RAG
- **Node.js / Express**: Backend API, middleware, agent proxy
- **RAG**: OpenAI embeddings + ChromaDB for nutrition knowledge
- **OpenAI**: GPT-4o-mini for the agent
- **React**: Chat UI and user profile form

## Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key (required for the agent)

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

## Usage

**All three services must be running** for the frontend chat to work:

1. **AI Agent** (port 8000) – handles chat with OpenAI
2. **Backend** (port 3001) – proxies requests from frontend to agent
3. **Frontend** (port 5173) – React UI

If the backend is not running, the chat will show "Thinking..." and then fail. Start the backend with `cd backend && npm run dev`.

1. Open http://localhost:5173
2. Click "Edit Profile" and fill in age, weight, goal, activity level, dietary restrictions (optional but improves recommendations)
3. Save your profile
4. Ask nutrition questions in the chat (e.g., "What should I eat to lose weight?", "I'm vegetarian—suggest a high-protein breakfast")

The agent uses your profile and RAG-retrieved nutrition knowledge to personalize responses.

## Project Structure

```
NutriGuide-AI/
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
│       ├── components/ # Chat, UserProfileForm
│       └── api/
└── README.md
```

## API

- `POST /api/chat` — Send message: `{ userId, message, messages? }`
- `GET /api/users/:id/profile` — Get user profile
- `PUT /api/users/:id/profile` — Update profile: `{ age, weight_kg, goal, dietary_restrictions, activity_level }`

## Troubleshooting

- **Chat stuck on "Thinking..."** — Backend is not running. Start it with `cd backend && npm run dev`.
- **Agent connection errors** — Ensure the AI agent is running on port 8000. Set `AGENT_URL` in `.env` if it runs elsewhere.
- **OpenAI API errors** — Verify `OPENAI_API_KEY` is set correctly in `.env`.
