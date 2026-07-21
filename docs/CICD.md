# CI/CD Guide

How the GitHub Actions pipeline works and how to modify it.

## PR checks (`ci.yml`)

Separate from the deploy pipeline below: `.github/workflows/ci.yml` runs on every pull request targeting `main` and gates on correctness, not deployment. Three independent jobs, each `actions/checkout` + `actions/setup-node@v4` (Node 20) + `npm ci` in that service's directory:

| Job | Working directory | Steps |
|-----|-------------------|-------|
| `ai-agent-test` | `ai-agent-ts/` | `npm run typecheck` (`tsc --noEmit`), then `npm test` (`vitest run`) |
| `backend-test` | `backend/` | `npm test` (`vitest run`) |
| `frontend-build` | `frontend/` | `npm run build` (Vite) |

No secrets, no Postgres service container, no live network access — the unit tests only cover pure functions (`parseLogFoodMessage`, `parseSelectionToIndex` in the agent; `calculateTDEE` in the backend), so nothing here touches the database or external APIs. This does **not** run the eval harness (`npm run eval` in `ai-agent-ts`) — that's wired separately as a manually-triggered workflow, `eval.yml` (see below), since it's too costly/slow to gate every PR.

## Offline Eval (`eval.yml`)

Runs the agent's offline eval harness (LLM-as-judge + `agentevals` trajectory match + retrieval-source check, ~46 examples) against a real backend, ephemeral database, and live external APIs (OpenAI, Pinecone, USDA). Deliberately **not** a PR gate: every example makes multiple billed LLM calls (agent turn + judge + trajectory-match), so it's triggered manually via `workflow_dispatch` — run it after changing the system prompt, model, `knowledge/*.md`, or tool/node logic, not on every commit.

- **Runner**: `ubuntu-latest`, single `eval` job, 30 min timeout
- **Postgres**: a `postgres:16` `services:` container (ephemeral, wiped after the run) — deliberately **not** the real `secrets.DATABASE_URL` (production RDS), since eval writes checkpoint/interrupt state and this must never touch prod
- **Steps**: install backend deps → `npx prisma migrate deploy` against the ephemeral DB → seed the `eval-test-user` fixture (`backend/scripts/eval-seed.js` — the eval dataset hardcodes this user id for every example; without seeded profile/food-log/weight-log data, profile-dependent examples degrade to a "no data found" response instead of the personalized path their reference answers were written against) → start the backend in the background → poll `GET /health` until it responds → install agent deps → `npm run eval`
- **Secrets/vars reused** from the `deploy.yml` set below (no new ones needed): `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `USDA_FDC_API_KEY`. `INTERNAL_API_KEY` and `JWT_SECRET` are hardcoded CI-local dummy strings instead of the real secrets — backend and agent are both freshly started in the same job and only need to agree with each other, nothing real trusts these values.
- **Pass/fail**: `run-eval.ts` normally always exits 0 (it only fails on infra errors like a missing DB); this workflow sets `EVAL_FAIL_BELOW=0.7` so the job actually fails if the overall pass rate drops below 70%. The threshold is deliberately generous since the judge and trajectory-match evaluators are themselves LLM-based and non-deterministic. Results (per-evaluator + overall pass rate) are also written to the job's `$GITHUB_STEP_SUMMARY` regardless of pass/fail.

## Trigger (deploy pipeline, `deploy.yml`)

The workflow runs on **push to `main`**, but is **skipped** when the push only touches documentation or config files:

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '**/README.md'
      - 'CLAUDE.md'
      - '.env.example'
      - '.gitignore'
      - '.dockerignore'
      - 'docker-compose.yml'
      - 'backend/scripts/dummy-data*.sql'
```

- `docs/**` – any file under the `docs/` folder  
- `**/README.md` – README files anywhere (root, `frontend/`, `backend/`, `ai-agent-ts/`, etc.)  
- `CLAUDE.md` – repo-root guidance file for Claude Code, doesn't affect the build
- `.env.example`, `.gitignore`, `.dockerignore` – config files that do not affect the build
- `docker-compose.yml` – local dev compose file, not used in prod (`docker-compose.prod.yml` is)
- `backend/scripts/dummy-data*.sql` – dev-only seed data, never run in prod

Note: `*.md` was removed so pushes that change `ai-agent-ts/knowledge/*.md` trigger the workflow (for RAG indexing).

## Jobs

### 1. build-and-push

- **Runner**: `ubuntu-latest` (GitHub-hosted)
- **Steps**:
  1. Checkout repository
  2. Configure AWS credentials (from secrets)
  3. Login to ECR
  4. Build and push frontend, backend, ai-agent images to ECR (ai-agent built from `./ai-agent-ts`)
- **Image tag**: `${{ github.sha }}` (commit SHA)

### 2. deploy

- **Runner**: `ubuntu-latest` (GitHub-hosted)
- **Depends on**: build-and-push
- **Steps**:
  1. Checkout repository
  2. Paths filter: detect if `ai-agent-ts/knowledge/**` changed
  3. **Index knowledge to Pinecone** (only when knowledge changed) — runs `npm run index` in ai-agent-ts
  4. Get runner public IP (via checkip.amazonaws.com or api.ipify.org)
  5. Configure AWS credentials
  6. Add runner IP to EC2 security group (dynamic whitelisting)
  7. Setup SSH key (from `EC2_SSH_KEY` secret)
  8. Copy `docker-compose.prod.yml` to EC2 via scp
  9. SSH to EC2, write `.env` (including `JWT_SECRET` for user session tokens and `FRONTEND_URL` for CORS), run ECR login, `docker compose pull`, `docker compose up -d`
  10. Remove runner IP from security group (runs even on failure via `if: always()`)

## Flow

```
Push to main
    |
    v
build-and-push
    |-- Build frontend image
    |-- Push to ECR
    |-- Build backend image
    |-- Push to ECR
    |-- Build ai-agent image (from ai-agent-ts)
    |-- Push to ECR
    |
    v
deploy
    |-- Paths filter (knowledge changed?)
    |-- If yes: Index knowledge to Pinecone
    |-- Get runner public IP
    |-- Add runner IP to EC2 security group (SSH port 22)
    |-- Copy docker-compose.prod.yml to EC2
    |-- SSH to EC2
    |-- Write .env (OPENAI_API_KEY, PINECONE_*, DATABASE_URL, INTERNAL_API_KEY, USDA_FDC_API_KEY, JWT_SECRET, FRONTEND_URL, LANGSMITH_*, ECR_REGISTRY, IMAGE_TAG)
    |-- aws ecr get-login-password | docker login
    |-- docker compose pull
    |-- docker compose up -d
    |-- Remove runner IP from security group (always runs)
```

## GitHub Secrets

Add these in **Settings > Secrets and variables > Actions > Secrets**:

| Name | Description |
|------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key for ECR push |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret access key |
| `EC2_SSH_KEY` | Full contents of the .pem file (including BEGIN/END lines) |
| `OPENAI_API_KEY` | OpenAI API key for the AI agent |
| `PINECONE_API_KEY` | Pinecone API key for RAG |
| `DATABASE_URL` | PostgreSQL connection string (RDS). Include `?sslmode=require`. See [DATABASE_SETUP.md](DATABASE_SETUP.md) |
| `INTERNAL_API_KEY` | Shared secret for backend–agent auth (generate with `openssl rand -hex 32`) |
| `USDA_FDC_API_KEY` | USDA FoodData Central API key for food search (get at [api.data.gov/signup](https://api.data.gov/signup)) |
| `JWT_SECRET` | Signing secret for user session tokens (generate with `openssl rand -hex 32`) |
| `LANGSMITH_API_KEY` | LangSmith API key (optional, for tracing) |

## GitHub Variables

Add these in **Settings > Secrets and variables > Actions > Variables**:

| Name | Description | Example |
|------|-------------|---------|
| `EC2_HOST` | EC2 public IP or DNS | `ec2-3-236-56-12.compute-1.amazonaws.com` |
| `AGENT_PORT` | AI agent port (required for prod) | `8000` |
| `PINECONE_INDEX` | Pinecone index name (not sensitive) | `nutriguide-app-knowledge` |
| `ECR_REGISTRY` | ECR registry URI | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `SECURITY_GROUP_ID` | EC2 security group ID (for dynamic IP whitelisting) | `sg-0123456789abcdef0` |
| `LANGSMITH_TRACING_V2` | Enable LangSmith tracing | `true` or `false` |
| `LANGSMITH_PROJECT` | LangSmith project name | `nutriguide-ai-prod` |
| `FRONTEND_URL` | Comma-separated allowed CORS origins (optional; prod traffic is same-origin through the frontend's nginx proxy, so this mainly matters for direct API testing) | `https://nutriguide.example.com` |

## Modifying the Workflow

- **Change trigger branch**: Edit `branches: [main]` in `.github/workflows/deploy.yml`
- **Change docs skip paths**: Edit `paths-ignore` to add/remove paths that skip the pipeline when only those files change
- **Add build steps**: Add steps in the `build-and-push` job before the push commands
- **Use self-hosted runner**: Change `runs-on: ubuntu-latest` to `runs-on: self-hosted` (requires runner installed on EC2)
- **AI agent build context**: The ai-agent image is built from `./ai-agent-ts` (TypeScript). RAG uses Pinecone (cloud).
