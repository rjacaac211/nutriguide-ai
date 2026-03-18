# PostgreSQL Data Integration - Review

Technical review of the PostgreSQL integration. For setup steps (dev and prod), see [DATABASE_SETUP.md](DATABASE_SETUP.md).

## Package Versions

### Backend

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| @prisma/client | ^6.19.0 | 7.5.0 (6.19.x for v6) | Correct – staying on Prisma 6 for stability; Prisma 7 has breaking changes (driver adapters, new generator, ES module requirements) |
| prisma | ^6.19.0 | 7.5.0 (6.19.x for v6) | Correct – must match @prisma/client |
| express | ^4.21.0 | 5.2.1 | Correct – Express 4 is stable; Express 5 has breaking changes |
| dotenv | ^16.4.5 | 17.3.1 | Correct – 16.x is widely used; 17 is newer major |
| cors | ^2.8.5 | 2.8.5 | Up to date |

### AI Agent

| Package | Status |
|---------|--------|
| @langchain/* | Current versions |
| zod | ^3.23.0 |
| express, dotenv, cors | Same as backend |

---

## Correctness Verification

### Prisma Schema

- **datasource**: `url = env("DATABASE_URL")` – correct for Prisma 6 (Prisma 7 moves this to prisma.config.ts)
- **generator**: `prisma-client-js` – correct for Prisma 6
- **@@index**: `@@index([userId, loggedAt(sort: Desc)])` – valid per [Prisma schema reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#index)
- **Decimal fields**: Use `@db.Decimal(precision, scale)` – correct
- **Json fields**: Use `Json` type with `@default("[]")` – correct for PostgreSQL JSONB

### Decimal Serialization

- Prisma returns Decimal.js objects for `Decimal` fields; they cannot be JSON-serialized directly
- Current approach: `"toNumber" in v ? v.toNumber() : v` – correct per [Prisma docs](https://www.prisma.io/docs/orm/reference/prisma-client-reference#decimal) and [GitHub discussion](https://github.com/prisma/prisma/discussions/16218)
- Handles: null, undefined, numbers, and Decimal objects

### Internal API

- **Header**: `X-Internal-API-Key` – HTTP headers are case-insensitive; Express normalizes to `x-internal-api-key`
- **Response shape**: `{ food_logs, weight_trend }` – matches plan
- **Profile endpoint**: Returns camelCase (weightKg, etc.) – agent `formatProfileForLLM` expects camelCase

### Migration Flow

- **Dev**: `npm run migrate dev` loads root `.env` via `scripts/migrate.js`
- **Prod**: `scripts/migrate-and-start.js` runs `prisma migrate deploy` before starting; `existsSync` skips dotenv when no `.env` (Docker uses env vars)
- **Dockerfile**: CMD uses `migrate-and-start.js` – correct

### Agent Tools

- **Profile fetch**: Uses `BACKEND_URL` and `INTERNAL_API_KEY` from `process.env`
- **Format**: Maps internal API camelCase (weightKg, etc.) to LLM string format – correct

---

## Recommendations

1. **Prisma 6**: Keep on 6.x; Prisma 7 requires driver adapters, new config, and migration effort.
2. **Express 4**: Keep for now; Express 5 upgrade can be done later with testing.
3. **Lock file**: Run `npm install` after any package.json change to refresh `package-lock.json`.
4. **INTERNAL_API_KEY**: Ensure it is set in production; agent requests will fail with 401 if missing.

---

## Production Checklist

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for full steps. Summary:

- [ ] Create RDS PostgreSQL instance in same VPC as EC2
- [ ] Configure RDS security group: inbound 5432 from EC2 security group
- [ ] Add `DATABASE_URL` (with `?sslmode=require`) and `INTERNAL_API_KEY` to GitHub Actions secrets
