# Docker Guide

Docker layout and how to run NutriGuide-AI locally vs production.

## Structure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development — builds from source |
| `docker-compose.prod.yml` | Production — pulls pre-built images from ECR |

## Services

| Service | Technology | Port | Description |
|---------|------------|------|-------------|
| frontend | React, Vite, Nginx | 80 | React UI, proxies /api to backend |
| backend | Node.js, Express | 3001 | API, proxies chat to ai-agent |
| ai-agent | TypeScript, Express | 8000 | LangGraph.js agent, RAG (Pinecone), OpenAI |

## Local Development

```bash
# From project root
docker compose up --build
```

- Builds images from `./frontend`, `./backend`, `./ai-agent-ts`
- Uses `.env` in project root for environment variables (including `PINECONE_API_KEY`, `PINECONE_INDEX`)
- App available at http://localhost:80 (or http://localhost)

## Production

Production uses `docker-compose.prod.yml` with images from ECR:

- **Images**: `${ECR_REGISTRY}/nutriguide-{frontend|backend|ai-agent}:${IMAGE_TAG}`
- **Env vars**: From `.env` on EC2 (written by deploy workflow)
- **ECR_REGISTRY**, **IMAGE_TAG**: Set in `.env` during deploy

The workflow copies `docker-compose.prod.yml` to EC2 and runs:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Build Context

Each service has its own Dockerfile:

| Service | Dockerfile | Build context |
|---------|------------|---------------|
| frontend | `frontend/Dockerfile` | `./frontend` |
| backend | `backend/Dockerfile` | `./backend` |
| ai-agent | `ai-agent-ts/Dockerfile` | `./ai-agent-ts` |

RAG uses Pinecone (cloud); no local vector store container is needed.
