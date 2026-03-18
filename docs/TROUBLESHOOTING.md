# Troubleshooting

Common issues and fixes for NutriGuide-AI deployment.

## GitHub Actions

### Build fails

- **Docker build error**: Check that all Dockerfiles exist and build contexts are correct (`./frontend`, `./backend`, `./ai-agent-ts`)
- **ECR push denied**: Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct and the IAM user has `AmazonEC2ContainerRegistryFullAccess`

### SSH timeout

- **Connection timed out**: The workflow uses dynamic IP whitelisting. Ensure `SECURITY_GROUP_ID` is set in GitHub Variables and the IAM user has the custom policy for `ec2:AuthorizeSecurityGroupIngress` and `ec2:RevokeSecurityGroupIngress` (see [AWS-SETUP.md](AWS-SETUP.md)). The security group must allow SSH (22) from your IP for manual access; the workflow adds the runner's IP before deploy and removes it after.
- **Permission denied**: Verify `EC2_SSH_KEY` contains the full .pem file including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`
- **Host key verification failed**: The workflow uses `ssh-keyscan` to add the host; if it still fails, check `EC2_HOST` is correct

### ECR push denied

- IAM user needs `AmazonEC2ContainerRegistryFullAccess` (or equivalent ECR push permissions)
- Verify `ECR_REGISTRY` variable matches your AWS account and region

### Deploy fails: "no space left on device"

- EC2 disk is full, usually from accumulated Docker images and layers
- SSH to EC2 and run: `docker system prune -a -f --volumes` to free space
- Consider increasing EC2 storage or adding a cron job to prune Docker periodically

## EC2

### Cannot pull from ECR

- Ensure EC2 instance has IAM role `NutriGuideEC2ECRRole` with `AmazonEC2ContainerRegistryReadOnly`
- Run manually: `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REGISTRY`

### Docker permission denied

- Run `sudo usermod -aG docker ubuntu` and log out/in (or `newgrp docker`)
- Or run docker commands with `sudo`

### AWS CLI not found

- Install AWS CLI v2: see [EC2-SETUP.md](EC2-SETUP.md#3-install-aws-cli)

## App

### "Name already taken" when creating account

- Names must be unique. If you see this error, another user has that name. Choose a different name or use **Log in** if it's your existing account.

### White screen

- **crypto.randomUUID error**: The app uses `crypto.randomUUID()` which is not available over HTTP (non-secure context). The codebase includes a fallback; ensure you have the latest frontend build deployed.
- **Check browser console**: Open DevTools (F12) > Console for JavaScript errors

### Chat stuck on "Thinking..."

- Backend or AI agent may not be running. SSH to EC2 and run `docker ps` to verify all containers are up (frontend, backend, ai-agent)
- Check logs: `docker compose -f docker-compose.prod.yml logs backend` and `logs ai-agent`

### Backend unreachable

- Verify frontend nginx proxies `/api` to backend. Check `frontend/nginx.conf`
- Ensure backend container is running: `docker ps`

### Database connection errors

- **Dev**: Ensure PostgreSQL is running and `DATABASE_URL` in `.env` is correct. For Docker, use `host.docker.internal` as host. See [DATABASE_SETUP.md](DATABASE_SETUP.md)
- **Prod**: Verify `DATABASE_URL` in GitHub Secrets. RDS must be in same VPC as EC2; security group must allow 5432 from EC2. Add `?sslmode=require` for RDS

### Env vars missing

- The deploy workflow writes `.env` on EC2. Verify GitHub Secrets (`OPENAI_API_KEY`, `PINECONE_API_KEY`, `DATABASE_URL`, `INTERNAL_API_KEY`, `USDA_FDC_API_KEY`) and Variables (`PINECONE_INDEX`, `LANGSMITH_*`) are set
- SSH to EC2 and run `cat /home/ubuntu/nutriguide/.env` to inspect
- For database setup, see [DATABASE_SETUP.md](DATABASE_SETUP.md)

### Food search returns 500 or 0 kcal

- **"USDA_FDC_API_KEY is not configured"** — Add `USDA_FDC_API_KEY` to `.env` (dev) or GitHub Secrets (prod). Get a key at [api.data.gov/signup](https://api.data.gov/signup).

- **0 kcal in search results** — Fixed in current code: FDC search API returns `value` instead of `amount` for nutrients; ensure backend uses the latest `fdc.js` that handles both.

### RAG returns empty or generic answers

- **Empty Pinecone index**: The agent reads from a pre-populated index; it does not index at runtime. In CI, indexing runs when `ai-agent-ts/knowledge/` changes. If you deployed before adding knowledge files, push a change that touches `ai-agent-ts/knowledge/` to trigger re-indexing, or run `npm run index` locally (with env vars set) and redeploy.
- **Wrong index**: Ensure `PINECONE_INDEX` matches your Pinecone index name (e.g. `nutriguide-app-knowledge`)

## AWS

### IAM permissions

- **GitHub Actions user**: Needs `AmazonEC2ContainerRegistryFullAccess` for ECR push, plus the custom policy for security group updates (`ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress`) — see [AWS-SETUP.md](AWS-SETUP.md)
- **EC2 instance role**: Needs `AmazonEC2ContainerRegistryReadOnly` for ECR pull

### Security group

- Inbound: SSH (22) from your IP (for manual access; GitHub Actions adds runner IP dynamically), HTTP (80) from 0.0.0.0/0
- If the app is unreachable, verify HTTP (80) allows 0.0.0.0/0 (or your IP range)

### Key pair

- Keep the .pem file secure. It is stored as `EC2_SSH_KEY` in GitHub Secrets
- If lost, create a new key pair and associate it with the instance (or launch a new instance)
