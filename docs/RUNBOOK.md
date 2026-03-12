# Runbook

Operational checklist for deploy and recovery.

## First-Time Setup

Complete these steps in order:

| Step | Action |
|------|--------|
| 1 | Create 3 ECR repositories (nutriguide-frontend, backend, ai-agent). See [AWS-SETUP.md](AWS-SETUP.md) |
| 2 | Create IAM user for GitHub Actions, save access keys |
| 3 | Create IAM role for EC2 (AmazonEC2ContainerRegistryReadOnly) |
| 4 | Launch EC2 instance with key pair, IAM role, security group (22, 80) |
| 5 | SSH to EC2: install Docker, Docker Compose, AWS CLI; create `/home/ubuntu/nutriguide` |
| 6 | Add `docker-compose.prod.yml` and `.github/workflows/deploy.yml` to repo |
| 7 | Add GitHub Secrets and Variables (see [CICD.md](CICD.md)) |
| 8 | Push to `main` to trigger deploy |

## Redeploy

1. Commit and push changes to `main`
2. GitHub Actions workflow runs automatically
3. Verify in **Actions** tab that both jobs (build-and-push, deploy) succeed
4. Open `http://YOUR_EC2_PUBLIC_IP` to verify the app

## Rollback

### Option A: Revert commit

1. Revert the last commit: `git revert HEAD && git push origin main`
2. Workflow will deploy the reverted version

### Option B: Manual on EC2

1. SSH to EC2
2. `cd /home/ubuntu/nutriguide`
3. Edit `.env` and set `IMAGE_TAG` to a previous commit SHA (from GitHub)
4. `docker compose -f docker-compose.prod.yml pull`
5. `docker compose -f docker-compose.prod.yml up -d`

## Recovery

### EC2 instance down

1. Launch a new EC2 instance (same AMI, security group, IAM role)
2. Run EC2 setup commands from [EC2-SETUP.md](EC2-SETUP.md)
3. Update `EC2_HOST` GitHub variable to the new instance's IP/DNS
4. Push to `main` (or re-run the workflow) to deploy

### ECR images missing or corrupted

1. Push to `main` to trigger a fresh build and push
2. SSH to EC2 and run `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`

### GitHub secrets rotation

1. Generate new credentials (e.g. new IAM access key, new EC2 key pair)
2. Update GitHub Secrets with new values
3. Re-run the workflow or push to `main`

### Containers not running after EC2 reboot

- Containers have `restart: unless-stopped`; they should come back automatically
- If not, SSH to EC2 and run: `cd /home/ubuntu/nutriguide && docker compose -f docker-compose.prod.yml up -d`
- For automatic restart on boot, add a systemd service or user-data script
