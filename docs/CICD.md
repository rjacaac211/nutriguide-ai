# CI/CD Guide

How the GitHub Actions pipeline works and how to modify it.

## Trigger

The workflow runs on **push to `main`**, but is **skipped** when the push only touches documentation or config files:

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '**/README.md'
      - '.env.example'
      - '.gitignore'
      - '.dockerignore'
```

- `docs/**` – any file under the `docs/` folder  
- `**/README.md` – README files anywhere (root, `frontend/`, `backend/`, `ai-agent-ts/`, etc.)  
- `.env.example`, `.gitignore`, `.dockerignore` – config files that do not affect the build

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
  9. SSH to EC2, write `.env`, run ECR login, `docker compose pull`, `docker compose up -d`
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
    |-- Write .env (OPENAI_API_KEY, PINECONE_*, LANGSMITH_*, ECR_REGISTRY, IMAGE_TAG)
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
| `LANGSMITH_API_KEY` | LangSmith API key (optional, for tracing) |

## GitHub Variables

Add these in **Settings > Secrets and variables > Actions > Variables**:

| Name | Description | Example |
|------|-------------|---------|
| `EC2_HOST` | EC2 public IP or DNS | `ec2-3-236-56-12.compute-1.amazonaws.com` |
| `PINECONE_INDEX` | Pinecone index name (not sensitive) | `nutriguide-app-knowledge` |
| `ECR_REGISTRY` | ECR registry URI | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `SECURITY_GROUP_ID` | EC2 security group ID (for dynamic IP whitelisting) | `sg-0123456789abcdef0` |
| `LANGSMITH_TRACING_V2` | Enable LangSmith tracing | `true` or `false` |
| `LANGSMITH_PROJECT` | LangSmith project name | `nutriguide-ai-prod` |

## Modifying the Workflow

- **Change trigger branch**: Edit `branches: [main]` in `.github/workflows/deploy.yml`
- **Change docs skip paths**: Edit `paths-ignore` to add/remove paths that skip the pipeline when only those files change
- **Add build steps**: Add steps in the `build-and-push` job before the push commands
- **Use self-hosted runner**: Change `runs-on: ubuntu-latest` to `runs-on: self-hosted` (requires runner installed on EC2)
- **AI agent build context**: The ai-agent image is built from `./ai-agent-ts` (TypeScript). RAG uses Pinecone (cloud).
