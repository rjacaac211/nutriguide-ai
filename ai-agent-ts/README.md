# NutriGuide AI Agent (TypeScript)

LangGraph.js-based nutrition assistant agent with RAG (Chroma) and tools. Uses `createAgent` (langchain) with MemorySaver for session-scoped conversation memory.

## Chat API

`POST /chat` — Request: `{ user_id, message, thread_id, user_profiles? }`. Returns `{ response }` with the final AI output only (extracted from the last assistant message; intermediate tool outputs, user profile dumps, and RAG content are not included). The user ID is passed to the agent via a system message so it never appears in chat bubbles.

## Setup

```bash
npm install --legacy-peer-deps
npm run build
```

## Run

```bash
# With Chroma running (e.g. docker run --rm -p 8001:8000 chromadb/chroma:0.6.1)
CHROMA_URL=http://localhost:8001 AGENT_PORT=8000 npm start
```

Or use the project's `docker-compose.yml` which includes Chroma and the agent.

## Environment

- `OPENAI_API_KEY` — Required
- `CHROMA_URL` — Chroma server URL (default: http://localhost:8000)
- `AGENT_PORT` — Server port (default: 8000)
- `LANGSMITH_*` — Optional LangSmith tracing
