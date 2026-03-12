# NutriGuide Frontend

React SPA with chat UI and user profile form. Proxies `/api` requests to the backend.

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

- **Chat UI** — Nutrition Q&A with the AI agent
- **New chat** — Start a fresh conversation with a new thread (clean memory)
- **User Profile Form** — Age, weight, goal, activity level, dietary restrictions
- **API Proxy** — `/api` requests forwarded to backend

Conversation memory is handled by the agent per session (thread); the frontend sends only the new message and a `threadId`.

## Structure

```
frontend/
├── src/
│   ├── components/   # Chat, UserProfileForm
│   ├── api/          # API client
│   └── ...
├── vite.config.js    # Proxy: /api -> http://localhost:3001
└── package.json
```
