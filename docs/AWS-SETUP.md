# AWS Setup Guide

Step-by-step AWS Console setup for NutriGuide-AI deployment. Perform these steps manually before running the CI/CD pipeline.

## 1. Create ECR Repositories

1. Go to **ECR** (Elastic Container Registry) in AWS Console
2. Click **Create repository**
3. Create **3 repositories**:

| Repository name | Purpose |
|-----------------|---------|
| `nutriguide-frontend` | React + Nginx image |
| `nutriguide-backend` | Node.js Express image |
| `nutriguide-ai-agent` | TypeScript LangGraph.js agent image |

For each repository:

- **Visibility**: Private
- **Tag immutability**: Disabled (for flexibility)
- **Scan on push**: Optional
- **Encryption**: Default (AES-256)

4. Note the **URI** for each repo. Format: `{account-id}.dkr.ecr.{region}.amazonaws.com/{repo-name}`  
   Example: `123456789012.dkr.ecr.us-east-1.amazonaws.com/nutriguide-frontend`

---

## 2. Create IAM User & Group for GitHub Actions

The GitHub Actions workflow needs credentials to push images to ECR and to dynamically whitelist the runner's IP on the EC2 security group.

### Required Policies

| Resource | Policy |
|----------|--------|
| GitHub Actions user | `AmazonEC2ContainerRegistryFullAccess` |
| GitHub Actions user | Custom inline policy (see below) for security group updates |

You do **not** need `AmazonEC2FullAccess`. Deployment uses SSH, not EC2 APIs.

### Custom Policy for Dynamic IP Whitelisting

The deploy job adds the GitHub Actions runner's IP to the EC2 security group before SSH and removes it after. This keeps SSH restricted instead of allowing `0.0.0.0/0`.

1. Go to **IAM** > **Users** > select `nutriguide-github-actions` > **Add permissions** > **Create inline policy**
2. Switch to **JSON** tab and paste (replace placeholders):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UpdateSecurityGroupIngress",
      "Effect": "Allow",
      "Action": [
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupIngress"
      ],
      "Resource": "arn:aws:ec2:YOUR_REGION:YOUR_ACCOUNT_ID:security-group/YOUR_SECURITY_GROUP_ID"
    },
    {
      "Sid": "DescribeSecurityGroups",
      "Effect": "Allow",
      "Action": "ec2:DescribeSecurityGroups",
      "Resource": "*"
    }
  ]
}
```

3. Replace:
   - `YOUR_REGION` — e.g. `ap-southeast-2`
   - `YOUR_ACCOUNT_ID` — 12-digit AWS account ID (EC2 console URL or IAM console)
   - `YOUR_SECURITY_GROUP_ID` — e.g. `sg-0123456789abcdef0` (EC2 > Instances > your instance > Security tab)
4. **Review policy** > Name: `NutriGuideSecurityGroupUpdate` > **Create policy**

### Option A: With User Group (Recommended)

1. Go to **IAM** > **User groups** > **Create group**
2. **Group name**: `NutriGuideCICD`
3. **Attach policies**: Search and select `AmazonEC2ContainerRegistryFullAccess`
4. Create group
5. Go to **IAM** > **Users** > **Create user**
6. **User name**: `nutriguide-github-actions`
7. **Access type**: Programmatic access (access key)
8. **Permissions**: Add user to group — select `NutriGuideCICD`
9. Complete user creation
10. **Save the Access Key ID and Secret Access Key** — add these to GitHub Secrets. You cannot view the secret again after leaving the page.

### Option B: Attach Policy Directly

1. Go to **IAM** > **Users** > **Create user**
2. **User name**: `nutriguide-github-actions`
3. **Access type**: Programmatic access (access key)
4. **Permissions**: Attach policies directly — select `AmazonEC2ContainerRegistryFullAccess`
5. Complete user creation
6. **Save the Access Key ID and Secret Access Key**

---

## 3. Create IAM Role for EC2

The EC2 instance needs permission to **pull** images from ECR.

| Policy | Purpose |
|--------|---------|
| `AmazonEC2ContainerRegistryReadOnly` | Lets EC2 run `docker pull` from your ECR repos |

1. Go to **IAM** > **Roles** > **Create role**
2. **Trusted entity**: AWS service > **EC2**
3. **Permissions**: Search and attach `AmazonEC2ContainerRegistryReadOnly` (AWS managed)
4. **Role name**: `NutriGuideEC2ECRRole`
5. Create role

---

## 4. Launch EC2 Instance

1. Go to **EC2** > **Instances** > **Launch instance**
2. **Name**: `nutriguide-app`
3. **AMI**: Ubuntu 22.04 LTS (or Amazon Linux 2023)
4. **Instance type**: `t2.micro` or `t3.micro` (free tier eligible)
5. **Key pair**: Create new or use existing. **Download the .pem file** — you need the private key for GitHub Secrets.
6. **Network settings**:
   - Create security group (e.g. `nutriguide-sg`)
   - Allow **SSH (22)** from your IP only (for manual access). GitHub Actions will add its runner IP dynamically during deploy.
   - Allow **HTTP (80)** from 0.0.0.0/0
7. **Advanced details**:
   - **IAM instance profile**: Select `NutriGuideEC2ECRRole` (created in step 3)
8. **Storage**: 8 GB (default)
9. Launch instance
10. Note the **Public IPv4 address** (or Public DNS) — you need this for `EC2_HOST`.

---

## 5. Verify Security Group

1. EC2 > **Security Groups** > select your security group
2. **Inbound rules** should include:
   - Type: SSH, Port: 22, Source: Your IP (for manual access only)
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0

3. **Note the Security Group ID** (e.g. `sg-0123456789abcdef0`) — add it as `SECURITY_GROUP_ID` in GitHub Variables.

---

## Reference Summary

| Item | Example |
|------|---------|
| ECR Registry URI | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| EC2 Public IP | `3.236.56.12` |
| EC2 Public DNS | `ec2-3-236-56-12.compute-1.amazonaws.com` |
| AWS Region | `us-east-1` |
| Security Group ID | `sg-0123456789abcdef0` |
