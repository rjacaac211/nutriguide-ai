# Database Setup

PostgreSQL setup for NutriGuide-AI. Both development and production use external PostgreSQL (no database container in Docker).

## Overview

| Environment | PostgreSQL Source | Connection |
|-------------|-------------------|------------|
| **Development** | Local PostgreSQL on host | `localhost` (backend on host) or `host.docker.internal` (backend in Docker) |
| **Production** | AWS RDS | RDS endpoint from `DATABASE_URL` |

When using `docker compose up`, the backend runs in a container and connects to your local PostgreSQL via `host.docker.internal`.

---

## Development Setup

### 1. Install PostgreSQL

Install PostgreSQL 15+ on your machine:

- **Windows**: [PostgreSQL installer](https://www.postgresql.org/download/windows/)
- **macOS**: `brew install postgresql@16`
- **Linux**: `sudo apt install postgresql-16` (Ubuntu/Debian)

### 2. Create Database

```bash
# Connect to PostgreSQL (adjust user if needed)
psql -U postgres

# Create database and user (optional; you can use default postgres user)
CREATE DATABASE nutriguide;
\q
```

### 3. Configure DATABASE_URL

Add to `.env` in the project root:

**Running services locally** (backend outside Docker):

```
DATABASE_URL=postgresql://user:password@localhost:5432/nutriguide
```

**Running with Docker Compose** (backend in container, connects to host PostgreSQL):

```
DATABASE_URL=postgresql://user:password@host.docker.internal:5432/nutriguide
```

> `docker-compose.yml` includes `extra_hosts` so `host.docker.internal` works on Windows, macOS, and Linux.

### 4. Run Migrations

```bash
cd backend
npm run migrate dev
```

This applies Prisma migrations and creates the schema (User, Profile, FoodLog, etc.).

### 5. Verify

Start the backend and check it connects:

```bash
cd backend
npm run dev
```

---

## Production Setup (AWS RDS)

### 1. Create RDS Instance

Use **Easy create** (default) or **Full configuration** for more control.

1. Go to **RDS** in AWS Console > **Create database**
2. **Engine**: PostgreSQL (16+ or latest available; version varies by region)
3. **Template**: Free tier (or dev/prod as needed)
4. **Settings**:
   - DB instance identifier: `nutriguide-db`
   - Master username: `postgres` (or your choice)
   - Master password: Use **Auto generate password** and retrieve from "View credential details" in the creation banner, or set your own — store securely
5. **Instance configuration**: `db.t4g.micro` (free tier, Graviton) or `db.t3.micro` (varies by region)
6. **Storage**: 20 GB (default)
7. **Connectivity**:
   - **VPC**: Same VPC as your EC2 instance
   - **Subnet**: Default
   - **Public access**: No (recommended for security)
   - **VPC security group**: Create new or use existing
8. **Set up EC2 connection** (optional): Choose **Don't connect to an EC2 compute resource** to configure connectivity manually later (see step 2 below), or **Connect to an EC2 compute resource** to have AWS auto-configure the connection. You can also set this up after creation via Actions > Set up to EC2 connection.
9. **Database name**: `nutriguide` — if using Easy create and this option is not shown, create the database manually after the instance is ready: connect via psql and run `CREATE DATABASE nutriguide;`
10. Create database

### 2. Configure Security Group

*Required if you chose "Don't connect to an EC2 compute resource" in step 8.*

1. EC2 > **Security Groups** > select the RDS security group
2. **Inbound rules** > **Edit inbound rules**
3. Add rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source: EC2 instance security group (e.g. `nutriguide-sg`)
   - Description: Allow EC2 to connect to RDS

### 3. Get Connection Details

1. RDS > **Databases** > select your instance
2. Note the **Endpoint** (e.g. `nutriguide-db.xxxxx.ap-southeast-2.rds.amazonaws.com` for Sydney; region segment varies)
3. Build connection string:

```
postgresql://postgres:YOUR_PASSWORD@nutriguide-db.xxxxx.ap-southeast-2.rds.amazonaws.com:5432/nutriguide?sslmode=require
```

### 4. Add to GitHub Secrets

1. GitHub repo > **Settings** > **Secrets and variables** > **Actions**
2. Add secret `DATABASE_URL` with the full connection string (including `?sslmode=require`)

### 5. Deploy

The deploy workflow writes `DATABASE_URL` to EC2 `.env`. Migrations run automatically when the backend container starts (`prisma migrate deploy`).

---

## Troubleshooting

### Connection refused (localhost)

- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check `DATABASE_URL` user/password match your PostgreSQL setup

### Connection refused (Docker)

- Ensure your local PostgreSQL is running and listening on 5432
- Verify `DATABASE_URL` in `.env` uses `host.docker.internal` (not `localhost`)
- Check user/password match your local PostgreSQL

### RDS connection timeout

- EC2 and RDS must be in the same VPC
- RDS security group must allow inbound 5432 from EC2 security group
- If using private subnets, ensure EC2 can reach RDS (no public IP needed for RDS)

### SSL required (RDS)

- Add `?sslmode=require` to the end of `DATABASE_URL` for production RDS

### Migration failed

- Ensure database exists and user has CREATE privileges
- Check `backend/prisma/migrations/` for migration files
