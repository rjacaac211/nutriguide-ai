# Troubleshooting

Common issues and fixes for NutriGuide-AI deployment.

## GitHub Actions

### Build fails

- **Docker build error**: Check that all Dockerfiles exist and build contexts are correct (`./frontend`, `./backend`, `./ai-agent-ts`)
- **ECR push denied**: Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct and the IAM user has `AmazonEC2ContainerRegistryFullAccess`

### SSH timeout

- **Connection refused**: Ensure EC2 security group allows SSH (port 22) from GitHub's IPs (or 0.0.0.0/0 for testing)
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

### White screen

- **crypto.randomUUID error**: The app uses `crypto.randomUUID()` which is not available over HTTP (non-secure context). The codebase includes a fallback; ensure you have the latest frontend build deployed.
- **Check browser console**: Open DevTools (F12) > Console for JavaScript errors

### Chat stuck on "Thinking..."

- Backend or AI agent may not be running. SSH to EC2 and run `docker ps` to verify all containers are up (frontend, backend, ai-agent, chroma)
- Check logs: `docker compose -f docker-compose.prod.yml logs backend` and `logs ai-agent`

### Backend unreachable

- Verify frontend nginx proxies `/api` to backend. Check `frontend/nginx.conf`
- Ensure backend container is running: `docker ps`

### Env vars missing

- The deploy workflow writes `.env` on EC2. Verify GitHub Secrets (`OPENAI_API_KEY`) and Variables (`LANGSMITH_*`) are set
- SSH to EC2 and run `cat /home/ubuntu/nutriguide/.env` to inspect

## AWS

### IAM permissions

- **GitHub Actions user**: Needs `AmazonEC2ContainerRegistryFullAccess` for ECR push
- **EC2 instance role**: Needs `AmazonEC2ContainerRegistryReadOnly` for ECR pull

### Security group

- Inbound: SSH (22), HTTP (80)
- If the app is unreachable, verify HTTP (80) allows 0.0.0.0/0 (or your IP range)

### Key pair

- Keep the .pem file secure. It is stored as `EC2_SSH_KEY` in GitHub Secrets
- If lost, create a new key pair and associate it with the instance (or launch a new instance)
