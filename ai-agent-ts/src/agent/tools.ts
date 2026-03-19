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

function formatBehaviouralForLLM(data: {
  food_logs: Array<{
    id: string;
    loggedAt: string;
    mealType?: string;
    items: unknown[];
    totalCal?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
  }>;
  weight_trend: unknown[];
}): string {
  const logs = data.food_logs ?? [];
  if (logs.length === 0) {
    return "No food logs in the last 7 days. User has not logged any meals yet.";
  }
  const parts = logs.map((log) => {
    const date = new Date(log.loggedAt).toISOString().split("T")[0];
    const meal = log.mealType ?? "meal";
    const items = (log.items ?? []) as Array<{ description?: string; grams?: number; calories?: number }>;
    const itemStr = items
      .map((i) => `${i.description ?? "?"} (${i.grams ?? 0}g, ${i.calories ?? 0} cal)`)
      .join("; ");
    return `[${date}] ${meal}: ${itemStr} | Total: ${log.totalCal ?? 0} cal, ${log.totalProtein ?? 0}g protein, ${log.totalCarbs ?? 0}g carbs, ${log.totalFat ?? 0}g fat`;
  });
  return `Recent food logs:\n${parts.join("\n")}`;
}

function formatFoodsForLLM(foods: Array<{
  fdcId: number;
  description: string;
  brandOwner?: string | null;
  referenceGrams: number;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
}>): string {
  if (foods.length === 0) {
    return "No foods found for that search.";
  }
  const parts = foods.map((f) => {
    const brand = f.brandOwner ? ` (${f.brandOwner})` : "";
    const p = f.per100g;
    return `${f.description}${brand}: per 100g - ${p.calories} cal, ${p.protein}g protein, ${p.carbs}g carbs, ${p.fat}g fat [fdcId: ${f.fdcId}]`;
  });
  return parts.join("\n");
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

export const getUserBehaviouralTool = tool(
  async ({ user_id, days }: { user_id: string; days?: number }) => {
    try {
      const d = days ?? 7;
      const res = await fetch(
        `${BACKEND_URL}/api/internal/users/${user_id}/behavioural?days=${d}`,
        {
          headers: {
            "X-Internal-API-Key": INTERNAL_API_KEY,
          },
        }
      );
      if (!res.ok) {
        return `Could not fetch behavioural data: ${res.status} ${res.statusText}`;
      }
      const data = (await res.json()) as {
        food_logs: Array<{
          id: string;
          loggedAt: string;
          mealType?: string;
          items: unknown[];
          totalCal?: number;
          totalProtein?: number;
          totalCarbs?: number;
          totalFat?: number;
        }>;
        weight_trend: unknown[];
      };
      return formatBehaviouralForLLM(data);
    } catch (err) {
      return `Error fetching behavioural data: ${(err as Error).message}`;
    }
  },
  {
    name: "get_user_behavioural",
    description:
      "Fetch the user's recent food logs (meals, macros, items) for personalized advice. Use when discussing eating habits, calorie/macro intake, or meal suggestions. Call with the user_id from the conversation context.",
    schema: z.object({
      user_id: z.string().describe("The user ID from the conversation context"),
      days: z.number().optional().describe("Number of days to look back (default 7)"),
    }),
  }
);

export const searchFoodsTool = tool(
  async ({ query, limit }: { query: string; limit?: number }) => {
    try {
      const l = Math.min(Math.max(1, limit ?? 10), 25);
      const url = `${BACKEND_URL}/api/internal/foods/search?q=${encodeURIComponent(query.trim())}&limit=${l}`;
      const res = await fetch(url, {
        headers: {
          "X-Internal-API-Key": INTERNAL_API_KEY,
        },
      });
      if (!res.ok) {
        return `Could not search foods: ${res.status} ${res.statusText}`;
      }
      const { foods } = (await res.json()) as {
        foods: Array<{
          fdcId: number;
          description: string;
          brandOwner?: string | null;
          referenceGrams: number;
          per100g: { calories: number; protein: number; carbs: number; fat: number };
        }>;
      };
      return formatFoodsForLLM(foods ?? []);
    } catch (err) {
      return `Error searching foods: ${(err as Error).message}`;
    }
  },
  {
    name: "search_foods",
    description:
      "Search USDA FoodData Central for foods by name. Use when the user asks 'what should I eat?', 'suggest high-protein foods', or wants specific food options. Returns nutrient info per 100g.",
    schema: z.object({
      query: z.string().describe("The search query for food name or type"),
      limit: z.number().optional().describe("Max results to return (default 10, max 25)"),
    }),
  }
);
