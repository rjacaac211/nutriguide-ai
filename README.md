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

**Note:** Create a `.env` file in the project root with `OPENAI_API_KEY=sk-your-key` before running the AI agent.

## Setup

### 1. Environment

Create `.env` in the project root (or in each service directory):

```
OPENAI_API_KEY=sk-your-key-here
```

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
├── ai-agent/          # Python LangGraph agent
│   ├── agent/          # create_agent, tools, RAG
│   ├── knowledge/      # Nutrition docs for RAG
│   └── main.py         # FastAPI server
├── backend/            # Express API
│   └── src/
│       ├── routes/     # /chat, /users
│       └── index.js
├── frontend/           # React app
│   └── src/
│       ├── components/ # Chat, UserProfileForm
│       └── api/
└── README.md
```

## API

- `POST /api/chat` — Send message: `{ userId, message, messages? }`
- `GET /api/users/:id/profile` — Get user profile
- `PUT /api/users/:id/profile` — Update profile: `{ age, weight_kg, goal, dietary_restrictions, activity_level }`
