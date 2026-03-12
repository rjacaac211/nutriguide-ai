# NutriGuide Frontend

React SPA with Create Profile onboarding flow, dashboard, and AI chat widget. Proxies `/api` requests to the backend.

Part of [NutriGuide AI](../README.md).

## Tech Stack

- **Node.js 18+**
- **React 18**
- **Vite** — Build tool and dev server

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

## Features

- **Create Account** — Landing page with onboarding entry point
- **Onboarding Wizard** — Multi-step questionnaire (goal, gender, birth date, height, weight, preferences, activity, speed of change)
- **Loading & Summary** — Progress animation, name entry, goal summary with calculated target date
- **Dashboard** — Calorie summary (eaten/remaining/burned), meals logged (Breakfast, Lunch, Dinner, Snack), activity section
- **Chat Widget** — Floating, collapsible AI chat (bottom-right) for nutrition Q&A; **New chat** starts a fresh conversation
- **Session-scoped** — Profile and chat use `sessionId`; reload starts a new session (no persistence)
- **API Proxy** — `/api` requests forwarded to backend

Conversation memory is handled by the agent per session (thread); the frontend sends only the new message and a `threadId`.

## Structure

```
frontend/
├── src/
│   ├── components/   # LandingStep, OnboardingWizard, QuestionSlide, LoadingScreen,
│   │                 # EnterNameStep, GoalSummaryStep, Dashboard, CalorieSummary,
│   │                 # MealsLogged, ActivitySection, ChatWidget, Chat
│   ├── config/       # onboardingQuestions.js
│   ├── api/          # API client
│   └── ...
├── vite.config.js    # Proxy: /api -> http://localhost:3001
└── package.json
```
