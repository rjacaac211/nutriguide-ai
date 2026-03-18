# NutriGuide Backend

Express API that proxies chat requests to the AI agent and manages user profiles in PostgreSQL. Profiles are keyed by `sessionId` (session-scoped; reload = new session = new profile).

Part of [NutriGuide AI](../README.md).

## Tech Stack

- **Node.js 18+**
- **Express** — HTTP server
- **Prisma** — PostgreSQL ORM
- **CORS** — Cross-origin support

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ (local or RDS). See [docs/DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) for setup.

## Environment

Create `.env` in the project root:

```
DATABASE_URL=postgresql://user:password@localhost:5432/nutriguide
INTERNAL_API_KEY=your-internal-api-key
PORT=3001
AGENT_URL=http://localhost:8000
```

- `DATABASE_URL` — PostgreSQL connection string (required)
- `INTERNAL_API_KEY` — Secret for internal API (agent-backend auth; generate with `openssl rand -hex 32`)
- `PORT` — Server port (default: 3001)
- `AGENT_URL` — AI agent base URL (default: http://localhost:8000)

## Setup

```bash
npm install
```

Run migrations (requires DATABASE_URL and a running PostgreSQL):

```bash
npm run migrate dev
```

## Run

```bash
npm run dev
```

Runs on **http://localhost:3001**. For production-like runs, `npm start` runs migrations before starting the server.

## API

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/chat` | Send message to agent. Body: `{ userId, message, threadId }` (userId = sessionId). Returns `{ response }` with the final AI output only. |
| GET | `/api/users/:id/profile` | Get user profile (id = sessionId) |
| PUT | `/api/users/:id/profile` | Update profile. Body: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }` |
| GET | `/api/health` | Health check |

**Note:** User profiles are persisted in PostgreSQL. Profiles are keyed by sessionId; reloading the frontend generates a new sessionId, so the previous profile is not accessible.

## Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── db.js
│   ├── routes/
│   │   ├── chat.js      # Proxies to AI agent
│   │   ├── users.js     # Profile CRUD (PostgreSQL)
│   │   └── internal.js  # Internal API for agent (profile, behavioural)
│   └── index.js
└── package.json
```
