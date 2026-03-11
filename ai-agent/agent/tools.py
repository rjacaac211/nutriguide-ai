"""Tools for the NutriGuide nutrition agent."""

from langchain.tools import tool
from typing import Optional

# In-memory user store - will be populated by backend via HTTP or shared state
# For agent-only testing, we use a simple dict. The FastAPI server will inject
# user data from the backend when invoking the agent.
_user_profiles: dict[str, dict] = {}


def set_user_profiles(profiles: dict[str, dict]) -> None:
    """Set user profiles (called by agent server with data from backend)."""
    global _user_profiles
    _user_profiles = profiles


def get_user_profiles() -> dict[str, dict]:
    """Get current user profiles."""
    return _user_profiles


@tool
def get_user_profile(user_id: str) -> str:
    """Fetch the user's nutrition profile including age, weight, goals, and dietary restrictions.
    Use this to personalize recommendations. Call with the user_id from the conversation context."""
    profiles = get_user_profiles()
    profile = profiles.get(user_id)
    if not profile:
        return f"No profile found for user {user_id}. User has not set up their profile yet."
    return (
        f"User profile: age={profile.get('age', 'unknown')}, "
        f"weight_kg={profile.get('weight_kg', 'unknown')}, "
        f"goal={profile.get('goal', 'unknown')}, "
        f"dietary_restrictions={profile.get('dietary_restrictions', [])}, "
        f"activity_level={profile.get('activity_level', 'unknown')}"
    )
