# NutriGuide Backend

Express API that proxies chat requests to the AI agent and manages user profiles in memory. Profiles are keyed by `sessionId` (session-scoped; reload = new session = no profile).

Part of [NutriGuide AI](../README.md).

## Tech Stack

- **Node.js 18+**
- **Express** — HTTP server
- **CORS** — Cross-origin support

## Prerequisites

- Node.js 18+

## Environment

Create `.env` in the project root or in `backend/`:

```
PORT=3001
AGENT_URL=http://localhost:8000
```

- `PORT` — Server port (default: 3001)
- `AGENT_URL` — AI agent base URL (default: http://localhost:8000)

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Runs on **http://localhost:3001**.

## API

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/chat` | Send message to agent. Body: `{ userId, message, threadId }` (userId = sessionId) |
| GET | `/api/users/:id/profile` | Get user profile (id = sessionId) |
| PUT | `/api/users/:id/profile` | Update profile. Body: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }` |
| GET | `/api/health` | Health check |

**Note:** User profiles are stored in memory and are not persisted across restarts. Profiles are keyed by sessionId; reloading the frontend generates a new sessionId, so the previous profile is not accessible.

## Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── chat.js    # Proxies to AI agent
│   │   └── users.js   # Profile CRUD
│   └── index.js
└── package.json
```
