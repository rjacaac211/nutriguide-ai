# Running Services Individually for Debugging

Use this guide to run each service in a separate terminal so you can see logs and diagnose 500 errors.

## Prerequisites

- `.env` in **project root** — both AI agent and backend load from it. Include at least:
  - `OPENAI_API_KEY` (required for AI agent)
  - `PORT=3001` (backend)
  - `AGENT_URL=http://localhost:8000` (backend → AI agent)
  - `AGENT_PORT=8000` (AI agent; omit to use default)
  - `CHROMA_URL=http://localhost:8001` (when Chroma runs on 8001)
- Node.js 20+

## Service Order & Ports

| Service   | Port | Depends on |
|-----------|------|------------|
| Chroma    | 8001 | —          |
| AI Agent  | 8000 | Chroma     |
| Backend   | 3001 | AI Agent   |
| Frontend  | 5173 | Backend   |

Chroma uses host port **8001** to avoid conflict with the AI agent (8000).

---

## Terminal 1: Chroma

```powershell
docker run --rm -p 8001:8000 chromadb/chroma:0.6.1
```

Use `chromadb/chroma:0.6.1` (not `latest`) for compatibility with the chromadb npm client. Chroma will be at `http://localhost:8001`.

---

## Terminal 2: AI Agent

```powershell
cd ai-agent-ts
npm run dev
```

Loads `CHROMA_URL`, `PORT`, and `OPENAI_API_KEY` from root `.env`. You should see: `NutriGuide AI Agent listening on port 8000`

---

## Terminal 3: Backend

```powershell
cd backend
npm run dev
```

Loads `AGENT_URL` and `PORT` from root `.env`.

---

## Terminal 4: Frontend

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
2. **Chroma unreachable** — `CHROMA_URL` wrong or Chroma not running (RAG/search tool fails)
3. **Agent not running** — Backend gets connection refused when calling `AGENT_URL`
4. **Backend not running** — Frontend gets 500 when proxying to backend

Check each terminal for stack traces when a request fails.
