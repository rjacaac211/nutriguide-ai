# Running Services Individually for Debugging

Use this guide to run each service in a separate terminal so you can see logs and diagnose 500 errors. The AI agent is TypeScript (ai-agent-ts); RAG uses Pinecone (cloud-based, requires internet).

## Prerequisites

- **Index knowledge first** — When you add or change `.md` files in `ai-agent-ts/knowledge/`, run `npm run index` in `ai-agent-ts` before testing. The agent reads from a pre-populated Pinecone index; it does not index at runtime.
- **PostgreSQL** — Backend requires PostgreSQL. See [DATABASE_SETUP.md](DATABASE_SETUP.md) for setup. Create `nutriguide` database and run migrations.
- `.env` in **project root** — both AI agent and backend load from it. Include at least:
  - `OPENAI_API_KEY` (required for AI agent)
  - `PINECONE_API_KEY` (required for RAG)
  - `PINECONE_INDEX=nutriguide-app-knowledge` (or your index name)
  - `DATABASE_URL=postgresql://user:password@localhost:5432/nutriguide` (required for backend)
  - `INTERNAL_API_KEY` (required; backend and agent share this; generate with `openssl rand -hex 32`)
  - `USDA_FDC_API_KEY` (required for food search; get at [api.data.gov/signup](https://api.data.gov/signup))
  - `PORT=3001` (backend)
  - `AGENT_URL=http://localhost:8000` (backend → AI agent)
  - `AGENT_PORT=8000` (required for AI agent)
  - `BACKEND_URL=http://localhost:3001` (agent → backend for profile, behavioural, food search)
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

Loads `PINECONE_API_KEY`, `PINECONE_INDEX`, `PORT`, `OPENAI_API_KEY`, `BACKEND_URL`, and `INTERNAL_API_KEY` from root `.env`. The agent uses these to fetch profiles, behavioural data, and food search from the backend. You should see: `NutriGuide AI Agent listening on port 8000`

---

## Terminal 2: Backend

```powershell
cd backend
npm run dev
```

Loads `AGENT_URL`, `PORT`, `USDA_FDC_API_KEY`, and `DATABASE_URL` from root `.env`.

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

## Run Offline Evaluation

With the **backend** and **AI agent** running, run the evaluation suite:

```powershell
cd ai-agent-ts
npm run eval
```

Runs ~43 examples covering intent classification, off-topic handling, chitchat, log-food parsing, tool selection, and response quality. See [ai-agent-ts/README.md](../ai-agent-ts/README.md#evaluation) for details.

---

## Common 500 Causes

1. **Missing `OPENAI_API_KEY`** — Agent fails on first LLM call
2. **Pinecone unreachable** — `PINECONE_API_KEY` or `PINECONE_INDEX` wrong or missing (RAG/search tool fails). Ensure you have internet and a valid Pinecone index.
3. **Database unreachable** — `DATABASE_URL` wrong or PostgreSQL not running. See [DATABASE_SETUP.md](DATABASE_SETUP.md).
4. **Agent not running** — Backend gets connection refused when calling `AGENT_URL`
5. **Backend not running** — Frontend gets 500 when proxying to backend

Check each terminal for stack traces when a request fails.
