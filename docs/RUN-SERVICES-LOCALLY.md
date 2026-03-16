# Running Services Individually for Debugging

Use this guide to run each service in a separate terminal so you can see logs and diagnose 500 errors. The AI agent is TypeScript (ai-agent-ts); RAG uses Pinecone (cloud-based, requires internet).

## Prerequisites

- `.env` in **project root** — both AI agent and backend load from it. Include at least:
  - `OPENAI_API_KEY` (required for AI agent)
  - `PINECONE_API_KEY` (required for RAG)
  - `PINECONE_INDEX=nutriguide-app-knowledge` (or your index name)
  - `PORT=3001` (backend)
  - `AGENT_URL=http://localhost:8000` (backend → AI agent)
  - `AGENT_PORT=8000` (AI agent; omit to use default)
- Node.js 20+
- Internet connection (Pinecone is cloud-only)

## Service Order & Ports

| Service   | Port | Depends on |
|-----------|------|------------|
| AI Agent  | 8000 | Pinecone (cloud) |
| Backend   | 3001 | AI Agent   |
| Frontend  | 5173 | Backend   |

---

## Terminal 1: AI Agent

```powershell
cd ai-agent-ts
npm run dev
```

Loads `PINECONE_API_KEY`, `PINECONE_INDEX`, `PORT`, and `OPENAI_API_KEY` from root `.env`. You should see: `NutriGuide AI Agent listening on port 8000`

---

## Terminal 2: Backend

```powershell
cd backend
npm run dev
```

Loads `AGENT_URL` and `PORT` from root `.env`.

---

## Terminal 3: Frontend

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173 and use the chat.

---

## Test AI Agent Directly (CMD one-liners)

Bypass frontend and backend to isolate the AI agent. Run in a separate CMD window:

```cmd
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"user_id\":\"test-user\",\"message\":\"What are good sources of protein?\",\"thread_id\":\"thread-1\"}"
```

Shorter message:

```cmd
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"user_id\":\"t\",\"message\":\"Hi\",\"thread_id\":\"t1\"}"
```

**Response format:** The agent returns `{ response }` with the final AI output only (no intermediate tool outputs or internal details).

---

## Common 500 Causes

1. **Missing `OPENAI_API_KEY`** — Agent fails on first LLM call
2. **Pinecone unreachable** — `PINECONE_API_KEY` or `PINECONE_INDEX` wrong or missing (RAG/search tool fails). Ensure you have internet and a valid Pinecone index.
3. **Agent not running** — Backend gets connection refused when calling `AGENT_URL`
4. **Backend not running** — Frontend gets 500 when proxying to backend

Check each terminal for stack traces when a request fails.
