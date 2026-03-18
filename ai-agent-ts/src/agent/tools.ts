import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchNutritionKnowledge } from "./rag.js";

const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!BACKEND_URL || !INTERNAL_API_KEY) {
  throw new Error("BACKEND_URL and INTERNAL_API_KEY environment variables are not set");
}

function formatProfileForLLM(profile: Record<string, unknown>): string {
  const parts = [
    `User profile: name=${profile.name ?? "unknown"}`,
    `age=${profile.age ?? "unknown"}`,
    `gender=${profile.gender ?? "unknown"}`,
    `weight_kg=${profile.weightKg ?? "unknown"}`,
    `height_cm=${profile.heightCm ?? "unknown"}`,
    `goal=${profile.goal ?? "unknown"}`,
    `goal_weight_kg=${profile.goalWeightKg ?? "unknown"}`,
    `activity_level=${profile.activityLevel ?? "unknown"}`,
    `speed_kg_per_week=${profile.speedKgPerWeek ?? "unknown"}`,
    `dietary_restrictions=${JSON.stringify(profile.dietaryRestrictions ?? [])}`,
    `preferences=${JSON.stringify(profile.preferences ?? [])}`,
    `challenges=${JSON.stringify(profile.challenges ?? [])}`,
  ];
  return parts.join(", ");
}

export const getUserProfileTool = tool(
  async ({ user_id }: { user_id: string }) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/internal/users/${user_id}/profile`,
        {
          headers: {
            "X-Internal-API-Key": INTERNAL_API_KEY,
          },
        }
      );
      if (!res.ok) {
        if (res.status === 404) {
          return `No profile found for user ${user_id}. User has not set up their profile yet.`;
        }
        return `Could not fetch profile: ${res.status} ${res.statusText}`;
      }
      const profile = (await res.json()) as Record<string, unknown>;
      return formatProfileForLLM(profile);
    } catch (err) {
      return `Error fetching profile: ${(err as Error).message}`;
    }
  },
  {
    name: "get_user_profile",
    description:
      "Fetch the user's nutrition profile including age, weight, goals, dietary restrictions, height, goal weight, preferences, and challenges. Use this to personalize recommendations. Call with the user_id from the conversation context.",
    schema: z.object({
      user_id: z.string().describe("The user ID from the conversation context"),
    }),
  }
);

export const searchNutritionKnowledgeTool = tool(
  async ({ query }: { query: string }) => {
    return searchNutritionKnowledge(query);
  },
  {
    name: "search_nutrition_knowledge",
    description:
      "Search the nutrition knowledge base for evidence-based information on macros, meal timing, diets, allergies, and general nutrition. Use when the user asks about nutrition facts, meal plans, or dietary advice. Returns content with Sources (URLs) when available—cite these in your response.",
    schema: z.object({
      query: z.string().describe("The search query for nutrition information"),
    }),
  }
);
