# NutriGuide Frontend

React SPA with landing (Create Account / Log in), onboarding flow, dashboard, and AI chat widget. Proxies `/api` requests to the backend.

Part of [NutriGuide AI](../README.md).

## Tech Stack

- **Node.js 18+**
- **React 18**
- **React Router** — Path-based routing (`/dashboard`, `/dashboard/chat`, `/dashboard/profile`)
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
- **Dashboard** — Overview, Chat, and Profile tabs; date picker, calorie summary (eaten/remaining from TDEE using latest weight log or profile), meals logged (Breakfast, Lunch, Dinner, Snack) with add/edit/delete via USDA food search (unit selector: grams, cups, servings, etc.), weight section (add/edit/delete weight logs for selected date), progress charts (weight trend and calories vs goal with 7/30/90-day presets, each with its own empty state until there's enough data to show a real trend), **Log out** button
- **Chat Tab** — Full-page AI chat at `/dashboard/chat`; shared thread with chat widget
- **Profile Tab** — Read-only view of onboarding-collected details (goal, age, height, starting weight, goal weight, activity level, preferences, challenges) at `/dashboard/profile`
- **Chat Widget** — Floating, collapsible panel (bottom-right) for nutrition Q&A; "Open in Chat tab" navigates to full page; hidden when on the Chat tab
- **Chat display** — User message appears immediately when sent; NutriGuide shows "Thinking..." until the first token arrives, then the response renders incrementally as it streams in (SSE); only the final AI output is displayed (no internal tool outputs, profile dumps, or RAG labels)
- **Session-scoped** — Profile and chat use `sessionId` (userId); reload clears session; users log in again with their name to restore access
- **API Proxy** — `/api` requests forwarded to backend

Conversation memory is handled by the agent per session (thread); the frontend sends only the new message and a `threadId`. The chat API streams the response as SSE (`sendChatStream` in `src/api/client.js` reads and hand-parses `event:`/`data:` frames off the fetch response body — a plain `EventSource` can't be used since it doesn't support POST bodies or an `Authorization` header), calling back into `ChatThreadContext` per `token`/`interrupt`/`done`/`error` event; a pause for food log confirmation arrives as a single `interrupt` event with the formatted options. Chat state (threadId, messages) lives in `ChatThreadContext` so the widget and Chat tab share the same thread; the frontend appends the user message immediately and incrementally builds the assistant response as tokens arrive.

## UI / Design

The frontend uses a "Bento & Bold" visual identity — a color-blocked bento grid of rounded tiles, chunky rounded type, and high-contrast borders, chosen to read as more distinctive/modern than the generic light-theme look it replaced. Confirmed via mockups (phone-frame previews rendered against the app's own real content) before implementation — see the project's design memory for the two rounds of directions considered and rejected.

- **Colors:** Warm off-white background (`#fffaf2`), near-black ink (`#211531`) for text and borders, coral (`#ff5d73`) as the primary accent, lime (`#c3f53c`) and sky (`#4fc6ff`) as secondary tile colors. `.modal-btn-danger` keeps its own semantic red, deliberately outside the brand palette.
- **Design tokens:** CSS variables in `App.css` (`--color-primary`, `--color-cta`, `--color-bg`, `--color-lime`, `--color-sky`, `--border-tile`, `--border-tile-sm`, `--shadow-sm`, `--shadow-md`, `--radius`, `--radius-sm`, `--font-display`, etc.)
- **Type:** Fredoka (600/700) for headings, brand name, and big numbers; Plus Jakarta Sans (500/700) for body copy. Both self-hosted as `woff2` in `public/fonts/` — no font CDN dependency.
- **Tiles:** Thick `2.5px` ink borders paired with hard offset shadows (`6px 6px 0`, not soft blur) on primary surfaces (calorie tiles, meal/weight/chart cards, modals, chat bubbles); a lighter nested tier (`1.5px` border, `3px 3px 0` shadow) for content nested inside a primary tile (individual meal cards inside "Meals Logged", chart cards inside "Progress")
- **Dashboard Overview layout:** a real CSS grid, not just a reskinned stack — a coral "Remaining" hero tile and lime "Eaten" tile side by side, Meals Logged and Weight side by side below, Progress charts spanning full width beneath. Collapses to a single column below 700px.
- **Buttons:** Chunky pill shapes (`border-radius: 100px`) with a thick ink border; primary actions (Send, Save, Add, Next) are ink-filled with cream text
- **Chat bubbles:** Bot replies are white ink-bordered tiles with a rounded "tail" corner; user messages are ink-filled with cream text; bold markdown text in bot replies picks up the coral accent
- **Chat widget:** Floating ink-filled circular button (bottom-right); expands to a tile-bordered panel matching the rest of the app

Styles live in `src/index.css` (global) and `src/App.css` (component styles).

## Structure

```
frontend/
├── public/
│   └── fonts/        # Self-hosted Fredoka, Plus Jakarta Sans (woff2)
├── src/
│   ├── components/   # LandingStep, OnboardingWizard, QuestionSlide, LoadingScreen,
│   │                 # EnterNameStep, GoalSummaryStep, DashboardLayout, DashboardOverview,
│   │                 # ProfileView, ChatPage, ProgressCharts, CalorieSummary, MealsLogged,
│   │                 # WeightSection, AddFoodModal, AddWeightModal, EditFoodModal, DatePicker,
│   │                 # ChatWidget, Chat
│   ├── hooks/        # useModalA11y — shared Escape/focus-trap/aria-modal for AddFoodModal,
│   │                 # EditFoodModal, AddWeightModal
│   ├── context/      # ChatThreadContext
│   ├── config/       # onboardingQuestions.js
│   ├── api/          # API client (profile, chat, calorie goal, daily calories, foods, food logs, weight logs)
│   ├── App.css       # Component styles, design tokens
│   ├── index.css     # Global styles
│   └── ...
├── vite.config.js    # Proxy: /api -> http://localhost:3001
└── package.json
```
