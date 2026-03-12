"""FastAPI server for the NutriGuide AI agent."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

# Load .env from project root or ai-agent directory
from dotenv import load_dotenv
_env_root = Path(__file__).parent.parent / ".env"
_env_local = Path(__file__).parent / ".env"
load_dotenv(_env_root)
load_dotenv(_env_local)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from agent.main import create_nutrition_agent
from agent.tools import set_user_profiles

agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    agent = create_nutrition_agent()
    yield
    agent = None


app = FastAPI(title="NutriGuide AI Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    user_id: str
    message: str
    thread_id: str
    user_profiles: dict[str, dict] | None = None


class ChatResponse(BaseModel):
    messages: list[dict]
    response: str


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and return the agent's response."""
    global agent
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")

    # User profiles are passed from the Express backend
    set_user_profiles(request.user_profiles or {})

    config = {"configurable": {"thread_id": request.thread_id}}

    # Only the new message; agent loads history from checkpoint via thread_id
    # Add user context SystemMessage only on first message (new thread)
    state = agent.get_state(config)
    existing = (state.values or {}).get("messages", []) if state else []
    messages = [HumanMessage(content=request.message)]
    if not existing:
        messages.insert(
            0,
            SystemMessage(content=f"Current user ID for this conversation: {request.user_id}. Use this ID when calling get_user_profile."),
        )

    try:
        result = agent.invoke({"messages": messages}, config=config)
        result_messages = result.get("messages", [])
        # Last AI message with content is the final response
        response_text = ""
        for msg in reversed(result_messages):
            if hasattr(msg, "content") and msg.content and isinstance(msg.content, str):
                response_text = msg.content
                break

        return ChatResponse(messages=[_msg_to_dict(m) for m in result_messages], response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _dict_to_msg(d: dict):
    """Convert a dict to a LangChain message."""
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    role = d.get("role", "")
    content = d.get("content", "")
    if role == "user":
        return HumanMessage(content=content)
    if role == "assistant":
        return AIMessage(content=content)
    return HumanMessage(content=content)  # fallback


def _msg_to_dict(msg) -> dict:
    """Convert a message object to a serializable dict with normalized role and content for frontend."""
    raw = None
    if hasattr(msg, "model_dump"):
        try:
            raw = msg.model_dump()
        except Exception:
            pass

    # Normalize role: LangChain uses type="ai"/"human", frontend expects role="assistant"/"user"
    if raw:
        msg_type = raw.get("type", "")
        content = raw.get("content", "") or ""
    else:
        msg_type = type(msg).__name__
        content = getattr(msg, "content", "") or ""

    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, str):
                parts.append(c)
            elif isinstance(c, dict) and "text" in c:
                parts.append(c["text"])
            else:
                parts.append(str(c))
        content = " ".join(parts) if parts else ""
    if not isinstance(content, str):
        content = str(content) if content else ""

    role_map = {"ai": "assistant", "human": "user", "AIMessage": "assistant", "HumanMessage": "user"}
    role = role_map.get(msg_type, "system" if "Tool" in str(msg_type) or "System" in str(msg_type) else "assistant")

    return {"role": role, "content": content}


@app.get("/health")
async def health():
    return {"status": "ok", "agent_ready": agent is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
