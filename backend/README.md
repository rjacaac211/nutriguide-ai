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
USDA_FDC_API_KEY=your-data-gov-api-key
PORT=3001
AGENT_URL=http://localhost:8000
```

- `DATABASE_URL` — PostgreSQL connection string (required)
- `INTERNAL_API_KEY` — Secret for internal API (agent-backend auth; generate with `openssl rand -hex 32`)
- `USDA_FDC_API_KEY` — USDA FoodData Central API key for food search (required for food logging; get at [api.data.gov/signup](https://api.data.gov/signup))
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
| GET | `/api/users/by-name?name=...` | Lookup user by name (case-insensitive). Returns `{ userId, profile }` or 404 if not found. Used for login. |
| GET | `/api/users/:id/profile` | Get user profile (id = sessionId) |
| PUT | `/api/users/:id/profile` | Update profile. Body: `{ name, gender, birth_date, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, preferences, challenges, dietary_restrictions }`. Names must be unique; returns 400 `{ error: "Name already taken" }` if name exists. When `weight_kg` is provided and the user has no weight logs, seeds an initial WeightLog for today. |
| GET | `/api/users/:id/calorie-goal` | Get TDEE calorie goal. Uses latest WeightLog weight when available, else profile. Returns `{ goalKcal, bmr, tdee }` |
| GET | `/api/foods/search?q=...&limit=25` | Search foods via USDA FoodData Central (proxy) |
| GET | `/api/foods/:fdcId` | Fetch full food details including portions (cups, servings, etc.) |
| GET | `/api/users/:id/food-logs?date=YYYY-MM-DD` | List food logs for date |
| POST | `/api/users/:id/food-logs` | Create food log. Body: `{ mealType, items, loggedAt }` |
| PUT | `/api/users/:id/food-logs/:logId` | Update food log |
| DELETE | `/api/users/:id/food-logs/:logId` | Delete food log |
| PATCH | `/api/users/:id/food-logs/:logId/items/:itemIndex` | Update single item. Body: `{ grams?, calories?, protein?, carbs?, fat?, portionDescription?, portionAmount? }` |
| DELETE | `/api/users/:id/food-logs/:logId/items/:itemIndex` | Delete single item |
| GET | `/api/users/:id/weight-logs?from=YYYY-MM-DD&to=YYYY-MM-DD` | List weight logs (default: last 30 days) |
| POST | `/api/users/:id/weight-logs` | Create or replace weight log for date. Body: `{ weightKg, date, notes? }` |
| PUT | `/api/users/:id/weight-logs/:logId` | Update weight log. Body: `{ weightKg?, notes? }` |
| DELETE | `/api/users/:id/weight-logs/:logId` | Delete weight log |
| GET | `/api/health` | Health check |

**Internal API (agent only)** — Requires `X-Internal-API-Key` header:

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/internal/users/:id/profile` | User profile for personalization |
| GET | `/api/internal/users/:id/behavioural?days=7` | Recent food logs and weight trend (weight_trend from WeightLog) |
| GET | `/api/internal/users/:id/calorie-goal` | TDEE-based calorie goal |
| GET | `/api/internal/foods/search?q=...&limit=25` | USDA FDC food search proxy |
| GET | `/api/internal/foods/:fdcId` | Fetch full food details including portions (agent use) |
| POST | `/api/internal/foods/convert` | Convert amount+unit to grams. Body: `{ food, amount, unit }`. Returns `{ grams, portionDescription?, portionAmount? }` |
| POST | `/api/internal/users/:id/food-logs/append` | Append items to existing log or create new one (agent use) |

**Note:** User profiles are persisted in PostgreSQL. Profiles are keyed by userId; names must be unique. Users can log in by name via `GET /api/users/by-name`. Reloading the frontend clears the session; users log in again with their name to restore access.

**Weight logs:** WeightLog is the source of truth for current weight. `profile.weight_kg` is synced to the latest WeightLog on create/update/delete. Calorie goal uses latest WeightLog when available, else profile.

## Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── db.js
│   ├── env.js           # Load .env before routes
│   ├── routes/
│   │   ├── chat.js      # Proxies to AI agent
│   │   ├── users.js     # Profile CRUD, calorie-goal
│   │   ├── foods.js     # USDA FDC food search proxy
│   │   ├── foodLogs.js   # Food log CRUD
│   │   ├── weightLogs.js # Weight log CRUD
│   │   └── internal.js   # Internal API for agent (profile, behavioural, foods/search, foods/convert)
│   ├── services/
│   │   ├── fdc.js        # USDA FoodData Central API proxy (search, getFoodDetails, convertToGrams, portions)
│   │   ├── tdee.js       # TDEE calculation (Mifflin-St Jeor)
│   │   ├── foodLogs.js   # Food log service
│   │   └── weightLogs.js # Weight log service, getCurrentWeight (used by calorie-goal)
│   └── index.js
└── package.json
```
