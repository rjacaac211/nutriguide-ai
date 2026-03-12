# NutriGuide Backend

Express API that proxies chat requests to the AI agent and manages user profiles in memory.

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
| POST | `/api/chat` | Send message to agent. Body: `{ userId, message, threadId }` |
| GET | `/api/users/:id/profile` | Get user profile |
| PUT | `/api/users/:id/profile` | Update profile. Body: `{ age, weight_kg, goal, dietary_restrictions, activity_level }` |
| GET | `/api/health` | Health check |

**Note:** User profiles are stored in memory and are not persisted across restarts.

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
