# Testing Food Logging with USDA FDC

This guide covers how to test the food logging feature. The API spec is in [`docs/api/usda-fdc-api-spec.json`](api/usda-fdc-api-spec.json).

## Prerequisites

1. **USDA_FDC_API_KEY** in `.env` (project root):
   ```
   USDA_FDC_API_KEY=your-data-gov-api-key
   ```
   Get a key at [api.data.gov/signup](https://api.data.gov/signup).

2. **PostgreSQL** running with `nutriguide` database and migrations applied.

3. **Other services** (AI agent, backend, frontend) as per [RUN-SERVICES-LOCALLY.md](RUN-SERVICES-LOCALLY.md).

---

## 1. Start Services

### Option A: Local (3 terminals)

```powershell
# Terminal 1: AI Agent
cd ai-agent-ts
npm run dev

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

### Option B: Docker Compose

Ensure `USDA_FDC_API_KEY` is in `.env`, then:

```powershell
docker compose up --build
```

Open http://localhost (port 80)

---

## 2. UI Flow (End-to-End)

1. **Create Account or Log in** — New users: Landing → Onboarding → Name → Summary → Dashboard. Returning users: click **Log in**, enter your name. This creates or restores a profile and user.

2. **Dashboard** — You should see:
   - Date picker (default: today)
   - Calorie summary (Eaten, Goal, Burned; goal from TDEE using latest weight log or profile)
   - Meals: Breakfast, Lunch, Dinner, Snack with "+" buttons
   - Weight: current weight for selected date, add/edit/delete weight logs

3. **Add food** — Click "+" on any meal:
   - Search: type "chicken", "milk", or "apple" (min 2 chars)
   - Wait for results (debounced 300ms)
   - Click a food item
   - Select unit (Grams, or portions like "1 cup (236 ml)", "1 serving", etc.)
   - Enter amount (e.g. 150 for grams, 1 for 1 cup)
   - Click "Add"

4. **Verify** — The meal card should show the logged item and calories (e.g. "Milk (1 × 1 cup (236 ml))"). The summary "Eaten" should update.

5. **Edit** — Click "Edit" on a logged item:
   - Change unit and/or amount
   - Click "Save" or "Remove"

6. **Date picker** — Change the date to view logs for other days.

### Chat flow (food logging via AI)

You can also log food through the chat widget:

1. Open the chat widget and say e.g. **"log 100g chicken for lunch"**, **"add 1 cup rice for dinner"**, or **"log 2 servings oatmeal for breakfast"**
2. The agent searches and shows numbered options (1, 2, 3, …)
3. Reply with a number (e.g. **"1"**) to select and log, or **"cancel"** to abort
4. The agent confirms the log was created

The agent accepts grams (e.g. 100g) or amount+unit (e.g. 1 cup, 2 servings). It uses LangGraph interrupts so your reply ("1", "2", etc.) is treated as a selection, not a new message. You can log multiple foods for the same meal (e.g. chicken then rice for lunch); they are merged into one log.

---

## 3. API Testing (curl)

Use a valid `userId` (e.g. from session after onboarding, or from login by name).

### Food search and details (no auth)

```powershell
# Search foods
curl "http://localhost:3001/api/foods/search?q=cheddar&limit=5"

# Fetch full food details including portions (cups, servings, etc.)
curl "http://localhost:3001/api/foods/1909132"
```

### Calorie goal (requires profile)

```powershell
curl "http://localhost:3001/api/users/YOUR_USER_ID/calorie-goal"
```

### Food logs

```powershell
# List logs for date
curl "http://localhost:3001/api/users/YOUR_USER_ID/food-logs?date=2025-03-18"

# Create log (items may include optional portionDescription, portionAmount for display)
curl -X POST "http://localhost:3001/api/users/YOUR_USER_ID/food-logs" `
  -H "Content-Type: application/json" `
  -d '{
    "mealType": "breakfast",
    "items": [{
      "fdcId": 534358,
      "description": "NUT N BERRY MIX",
      "brandOwner": "Kar Nut Products Company",
      "referenceGrams": 100,
      "grams": 50,
      "calories": 250,
      "protein": 8,
      "carbs": 15,
      "fat": 18
    }],
    "loggedAt": "2025-03-18"
  }'

# Update log (use log ID from create response)
curl -X PUT "http://localhost:3001/api/users/YOUR_USER_ID/food-logs/LOG_ID" `
  -H "Content-Type: application/json" `
  -d '{"items": [...]}'

# Delete log
curl -X DELETE "http://localhost:3001/api/users/YOUR_USER_ID/food-logs/LOG_ID"
```

### Weight logs

```powershell
# List weight logs (default: last 30 days)
curl "http://localhost:3001/api/users/YOUR_USER_ID/weight-logs"

# List for date range
curl "http://localhost:3001/api/users/YOUR_USER_ID/weight-logs?from=2025-03-01&to=2025-03-19"

# Create or replace weight log for date
curl -X POST "http://localhost:3001/api/users/YOUR_USER_ID/weight-logs" `
  -H "Content-Type: application/json" `
  -d '{"weightKg": 70, "date": "2025-03-19", "notes": "morning"}'

# Update weight log
curl -X PUT "http://localhost:3001/api/users/YOUR_USER_ID/weight-logs/LOG_ID" `
  -H "Content-Type: application/json" `
  -d '{"weightKg": 71, "notes": "updated"}'

# Delete weight log
curl -X DELETE "http://localhost:3001/api/users/YOUR_USER_ID/weight-logs/LOG_ID"
```

---

## 4. USDA FDC API Reference

The full spec is in [`docs/api/usda-fdc-api-spec.json`](api/usda-fdc-api-spec.json).

Key endpoints:

- **Search**: `POST https://api.nal.usda.gov/fdc/v1/foods/search` — Body: `{ "query": "...", "pageSize": 25 }`
- **Food details**: `GET https://api.nal.usda.gov/fdc/v1/food/{fdcId}`

Nutrient IDs used: 208 (kcal), 203 (protein), 205 (carbs), 204 (fat).

---

## 5. Troubleshooting

| Issue | Check |
|-------|-------|
| "USDA_FDC_API_KEY is not configured" | Add key to `.env` in project root |
| Food search returns 500 | Verify API key is valid; check backend logs |
| Calorie goal 404 | Complete onboarding so profile exists |
| Empty food logs | Ensure `date` query param is YYYY-MM-DD |
| No profile for TDEE | Profile needs `height_cm`, `weight_kg` (or WeightLog), `age`, `gender` |

**Note:** The USDA FDC search API returns nutrients with `value` instead of `amount` (see [USDA/USDA-APIs#102](https://github.com/USDA/USDA-APIs/issues/102)). The full food details API (`GET /food/{fdcId}`) returns `foodNutrients` with `nutrient.number` as a string. The backend `fdc.js` service handles both formats and falls back to `labelNutrients` when `foodNutrients` is empty.
