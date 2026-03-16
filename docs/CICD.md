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
      - '*.md'
      - '.env.example'
      - '.gitignore'
      - '.dockerignore'
```

- `docs/**` – any file under the `docs/` folder  
- `**/README.md` – README files anywhere (root, `frontend/`, `backend/`, `ai-agent-ts/`, etc.)  
- `*.md` – other root-level markdown files (e.g. `CHANGELOG.md`, `CONTRIBUTING.md`)  
- `.env.example`, `.gitignore`, `.dockerignore` – config files that do not affect the build

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
  2. Setup SSH key (from `EC2_SSH_KEY` secret)
  3. Copy `docker-compose.prod.yml` to EC2 via scp
  4. SSH to EC2, write `.env`, run ECR login, `docker compose pull`, `docker compose up -d`

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
    |-- Copy docker-compose.prod.yml to EC2
    |-- SSH to EC2
    |-- Write .env (OPENAI_API_KEY, LANGCHAIN_*, ECR_REGISTRY, IMAGE_TAG)
    |-- aws ecr get-login-password | docker login
    |-- docker compose pull
    |-- docker compose up -d
```

## GitHub Secrets

Add these in **Settings > Secrets and variables > Actions > Secrets**:

| Name | Description |
|------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key for ECR push |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret access key |
| `EC2_SSH_KEY` | Full contents of the .pem file (including BEGIN/END lines) |
| `OPENAI_API_KEY` | OpenAI API key for the AI agent |
| `LANGCHAIN_API_KEY` | LangSmith API key (optional, for tracing) |

## GitHub Variables

Add these in **Settings > Secrets and variables > Actions > Variables**:

| Name | Description | Example |
|------|-------------|---------|
| `EC2_HOST` | EC2 public IP or DNS | `ec2-3-236-56-12.compute-1.amazonaws.com` |
| `ECR_REGISTRY` | ECR registry URI | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing | `true` or `false` |
| `LANGCHAIN_PROJECT` | LangSmith project name | `nutriguide-ai-prod` |

## Modifying the Workflow

- **Change trigger branch**: Edit `branches: [main]` in `.github/workflows/deploy.yml`
- **Change docs skip paths**: Edit `paths-ignore` to add/remove paths that skip the pipeline when only those files change
- **Add build steps**: Add steps in the `build-and-push` job before the push commands
- **Use self-hosted runner**: Change `runs-on: ubuntu-latest` to `runs-on: self-hosted` (requires runner installed on EC2)
- **AI agent build context**: The ai-agent image is built from `./ai-agent-ts` (TypeScript). Chroma is pulled from Docker Hub, not built.
