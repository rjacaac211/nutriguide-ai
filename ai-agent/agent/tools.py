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
    """Fetch the user's nutrition profile including age, weight, goals, dietary restrictions,
    height, goal weight, preferences, and challenges. Use this to personalize recommendations.
    Call with the user_id from the conversation context."""
    profiles = get_user_profiles()
    profile = profiles.get(user_id)
    if not profile:
        return f"No profile found for user {user_id}. User has not set up their profile yet."
    parts = [
        f"User profile: name={profile.get('name', 'unknown')}",
        f"age={profile.get('age', 'unknown')}",
        f"gender={profile.get('gender', 'unknown')}",
        f"weight_kg={profile.get('weight_kg', 'unknown')}",
        f"height_cm={profile.get('height_cm', 'unknown')}",
        f"goal={profile.get('goal', 'unknown')}",
        f"goal_weight_kg={profile.get('goal_weight_kg', 'unknown')}",
        f"activity_level={profile.get('activity_level', 'unknown')}",
        f"speed_kg_per_week={profile.get('speed_kg_per_week', 'unknown')}",
        f"dietary_restrictions={profile.get('dietary_restrictions', [])}",
        f"preferences={profile.get('preferences', [])}",
        f"challenges={profile.get('challenges', [])}",
    ]
    return ", ".join(parts)
