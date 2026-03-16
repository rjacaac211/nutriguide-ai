# EC2 Server Setup

Commands to run on a fresh EC2 instance (Ubuntu). Connect via SSH or EC2 Instance Connect before running these steps.

## Connect to EC2

**SSH** (replace with your key path and host):

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**EC2 Instance Connect**: Use the browser-based terminal from the EC2 console (Connect > EC2 Instance Connect).

---

## 0. Update Package Index (Recommended)

Refresh the package cache before installing anything:

```bash
sudo apt update
```

Optional: upgrade existing packages for security (`sudo apt upgrade -y`). On a fresh instance this is often quick.

---

## 1. Install Docker

### Official Docker Script

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker
```

---

## 2. Verify Docker Compose


```bash
docker compose version
```

You should see Docker Compose v2.x or higher.

---

## 3. Install AWS CLI

The AWS CLI is required for ECR login during deployment.

### Option A: Official AWS CLI v2 Installer (Recommended)

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install -y unzip
unzip -o awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip
```

### Option B: apt (if available)

```bash
sudo apt install -y awscli
```

Verify:

```bash
aws --version
```

---

## 4. Create App Directory

```bash
mkdir -p /home/ubuntu/nutriguide
cd /home/ubuntu/nutriguide
```

This directory will hold `docker-compose.prod.yml` and `.env`. The compose file is deployed by GitHub Actions; `.env` is written during each deploy.

---

## Troubleshooting

### "Permission denied" when running docker

Ensure you're in the `docker` group and have logged out/in or run `newgrp docker`.

### "Package awscli has no installation candidate"

Use the official AWS CLI v2 installer (Option A in step 3).

### ECR login fails during deploy

Ensure the EC2 instance has the IAM role `NutriGuideEC2ECRRole` attached with `AmazonEC2ContainerRegistryReadOnly` policy.
