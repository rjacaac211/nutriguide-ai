# NutriGuide Frontend

React SPA with landing (Create Account / Log in), onboarding flow, dashboard, and AI chat widget. Proxies `/api` requests to the backend.

Part of [NutriGuide AI](../README.md).

## Tech Stack

- **Node.js 18+**
- **React 18**
- **Vite** — Build tool and dev server
- **CSS** — Plain CSS with design tokens

## Prerequisites

- Node.js 18+

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Runs on **http://localhost:5173**.

Vite proxies `/api` to the backend at `http://localhost:3001`. Ensure the backend is running for chat to work.

## Build

```bash
npm run build
npm run preview
```

**Production hosting:** Configure the server to serve `index.html` for all paths (SPA fallback). Vite’s static build has no server-side routing; clients hitting `/dashboard` or `/dashboard/chat` directly must receive the same HTML.

## Features

- **Landing** — Create Account (onboarding) or Log in (name-based, no password)
- **Onboarding Wizard** — Multi-step questionnaire (goal, gender, birth date, height, weight, preferences, activity, speed of change)
- **Loading & Summary** — Progress animation, name entry (unique names enforced), goal summary with calculated target date
- **Dashboard** — Overview and Chat tabs; date picker, calorie summary (eaten/remaining/burned from TDEE using latest weight log or profile), meals logged (Breakfast, Lunch, Dinner, Snack) with add/edit/delete via USDA food search (unit selector: grams, cups, servings, etc.), weight section (add/edit/delete weight logs for selected date), progress charts (weight trend and calories vs goal with 7/30/90-day presets), activity section, **Log out** button
- **Chat Tab** — Full-page AI chat at `/dashboard/chat`; shared thread with chat widget
- **Chat Widget** — Floating, collapsible panel (bottom-right) for nutrition Q&A; "Open in Chat tab" navigates to full page; hidden when on the Chat tab
- **Chat display** — User message appears immediately when sent; NutriGuide shows "Thinking..." while the AI responds; only the final AI output is displayed (no internal tool outputs, profile dumps, or RAG labels)
- **Session-scoped** — Profile and chat use `sessionId` (userId); reload clears session; users log in again with their name to restore access
- **API Proxy** — `/api` requests forwarded to backend

Conversation memory is handled by the agent per session (thread); the frontend sends only the new message and a `threadId`. The chat API returns `{ response }` or `{ response, interrupted: true }` when the agent pauses for food log confirmation; the frontend appends each user message and assistant response to local state.

## UI / Design

The frontend uses a light, nutrition-focused theme:

- **Colors:** White/off-white backgrounds (`#f8fafc`, `#ffffff`), green accents (`#22c55e`) for progress bars and selected states, orange (`#f97316`) for primary CTAs
- **Design tokens:** CSS variables in `App.css` (`--color-primary`, `--color-cta`, `--color-bg`, `--shadow-md`, `--radius`, etc.)
- **Cards:** White surfaces with soft shadows and 12px rounded corners
- **Chat widget:** Floating orange button (bottom-right) with minimalist SVG message icon; expands to a white chat panel
- **Onboarding:** Compact layout with the NEXT button positioned close to question content

Styles live in `src/index.css` (global) and `src/App.css` (component styles).

## Structure

```
frontend/
├── src/
│   ├── components/   # LandingStep, OnboardingWizard, QuestionSlide, LoadingScreen,
│   │                 # EnterNameStep, GoalSummaryStep, DashboardLayout, DashboardOverview,
│   │                 # ChatPage, ProgressCharts, CalorieSummary, MealsLogged, WeightSection,
│   │                 # AddFoodModal, AddWeightModal, EditFoodModal, DatePicker, ActivitySection,
│   │                 # ChatWidget, Chat
│   ├── context/      # ChatThreadContext
│   ├── config/       # onboardingQuestions.js
│   ├── api/          # API client (profile, chat, calorie goal, daily calories, foods, food logs, weight logs)
│   ├── App.css       # Component styles, design tokens
│   ├── index.css     # Global styles
│   └── ...
├── vite.config.js    # Proxy: /api -> http://localhost:3001
└── package.json
```
