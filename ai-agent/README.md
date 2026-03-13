# NutriGuide AI Agent (Python — Deprecated)

> **Deprecated:** This Python agent has been replaced by the TypeScript implementation. Use [ai-agent-ts](../ai-agent-ts/README.md) instead.

Python FastAPI service hosting the LangGraph nutrition agent with RAG (ChromaDB) and tools. Handles chat requests and returns personalized nutrition recommendations. Uses LangGraph's InMemorySaver checkpointer for session-scoped conversation memory.

Part of [NutriGuide AI](../README.md).

## Tech Stack

- **Python 3.10+**
- **FastAPI** — HTTP server
- **LangChain / LangGraph** — Agent with tools and checkpointer (session memory)
- **ChromaDB** — RAG vector store for nutrition knowledge
- **OpenAI** — GPT-4o-mini for the agent

## Prerequisites

- Python 3.10+
- OpenAI API key

## Environment

Create `.env` in the project root or in `ai-agent/`:

```
OPENAI_API_KEY=sk-your-key-here
```

Optional (for LangSmith tracing):

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=your_langchain_project_name
```

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

Runs on **http://localhost:8000** (uvicorn).

## API

### POST /chat

Process a chat message and return the agent's response. Conversation history is maintained per `thread_id` via the InMemorySaver checkpointer (session-scoped; lost on server restart).

**Request:**

```json
{
  "user_id": "string",
  "message": "string",
  "thread_id": "string",
  "user_profiles": {
    "sessionId": {
      "name", "gender", "birth_date", "age", "height_cm", "weight_kg",
      "goal_weight_kg", "goal", "activity_level", "speed_kg_per_week",
      "preferences", "challenges", "dietary_restrictions"
    }
  }
}
```

**Response:**

```json
{
  "messages": [{"role": "user"|"assistant", "content": "string"}],
  "response": "string"
}
```

### Session Memory

The agent uses LangGraph's `InMemorySaver` checkpointer. Each `thread_id` maps to a separate conversation with its own message history. The client sends only the new message; the agent loads prior state from the checkpoint and appends the new message.

### GET /health

Health check. Returns `{"status": "ok", "agent_ready": true|false}`.

## Structure

```
ai-agent/
├── agent/          # Agent logic
│   ├── main.py     # create_nutrition_agent
│   ├── tools.py    # get_user_profile (extended with name, gender, height_cm, goal_weight_kg, preferences, challenges)
│   └── rag.py      # ChromaDB retriever
├── knowledge/      # Nutrition docs for RAG
├── main.py         # FastAPI server
└── requirements.txt
```
