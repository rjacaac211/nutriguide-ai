# NutriGuide AI Agent (TypeScript)

LangGraph.js-based nutrition assistant agent with RAG (Chroma) and tools.

## Setup

```bash
npm install --legacy-peer-deps
npm run build
```

## Run

```bash
# With Chroma running (e.g. docker run -p 8000:8000 chromadb/chroma)
CHROMA_URL=http://localhost:8000 npm start
```

Or use the project's `docker-compose.yml` which includes Chroma and the agent.

## Environment

- `OPENAI_API_KEY` - Required
- `CHROMA_URL` - Chroma server URL (default: http://localhost:8000)
- `LANGCHAIN_*` - Optional LangSmith tracing
