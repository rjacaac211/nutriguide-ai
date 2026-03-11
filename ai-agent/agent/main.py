"""LangGraph nutrition agent with tools and RAG."""

from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langchain_core.tools import StructuredTool

from .tools import get_user_profile
from .rag import get_retriever

SYSTEM_PROMPT = """You are NutriGuide, a friendly and knowledgeable nutrition assistant. You help users with personalized nutrition recommendations based on their profile, goals, and questions.

Before giving recommendations:
1. Use get_user_profile to fetch the user's age, weight, goal, dietary restrictions, and activity level when relevant.
2. Use search_nutrition_knowledge to look up evidence-based nutrition information for their questions.

Always personalize your advice based on the user's profile. Respect dietary restrictions (e.g., vegetarian, gluten-free, allergies). Be concise but helpful. If you don't have specific knowledge, say so and give general guidance."""


def _search_nutrition(query: str) -> str:
    """Search the nutrition knowledge base."""
    retriever = get_retriever()
    docs = retriever.invoke(query)
    if not docs:
        return "No specific nutrition information found for this query. Use general nutrition knowledge."
    return "\n\n".join(doc.page_content for doc in docs)


def create_nutrition_agent():
    """Create the NutriGuide agent with tools."""
    search_tool = StructuredTool.from_function(
        func=_search_nutrition,
        name="search_nutrition_knowledge",
        description="Search the nutrition knowledge base for evidence-based information on macros, meal timing, diets, allergies, and general nutrition. Use when the user asks about nutrition facts, meal plans, or dietary advice.",
    )
    tools = [get_user_profile, search_tool]

    model = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        max_tokens=1000,
    )

    agent = create_agent(
        model=model,
        tools=tools,
        system_prompt=SYSTEM_PROMPT,
    )
    return agent
