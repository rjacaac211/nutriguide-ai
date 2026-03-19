import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { interrupt, isGraphInterrupt } from "@langchain/langgraph";
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
      "Search USDA FoodData Central for foods by name. Use ONLY for suggestions: 'what should I eat?', 'suggest high-protein foods', 'what foods have X?'. Do NOT use when the user wants to LOG a food—use request_food_log_confirmation instead.",
    schema: z.object({
      query: z.string().describe("The search query for food name or type"),
      limit: z.number().optional().describe("Max results to return (default 10, max 25)"),
    }),
  }
);

export const getCalorieGoalTool = tool(
  async ({ user_id }: { user_id: string }) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/internal/users/${user_id}/calorie-goal`,
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
        return `Could not fetch calorie goal: ${res.status} ${res.statusText}`;
      }
      const data = (await res.json()) as { goalKcal: number; bmr: number | null; tdee: number | null };
      const { goalKcal, bmr, tdee } = data;
      if (bmr != null && tdee != null) {
        return `Calorie goal: ${goalKcal} kcal/day (TDEE: ${tdee}, BMR: ${bmr})`;
      }
      return `Calorie goal: ${goalKcal} kcal/day (profile incomplete for TDEE/BMR)`;
    } catch (err) {
      return `Error fetching calorie goal: ${(err as Error).message}`;
    }
  },
  {
    name: "get_calorie_goal",
    description:
      "Fetch the user's daily calorie goal based on their profile (TDEE, BMR, goal). Use when discussing calorie targets, deficits, or daily intake. Call with the user_id from the conversation context.",
    schema: z.object({
      user_id: z.string().describe("The user ID from the conversation context"),
    }),
  }
);

function parseSelectionToIndex(resumeValue: unknown, optionCount: number): number | null {
  if (resumeValue == null) return null;
  const s = String(resumeValue).trim().toLowerCase();
  if (
    s === "cancel" ||
    s === "never mind" ||
    s === "nevermind" ||
    s === "no" ||
    s === "stop"
  ) {
    return -1;
  }
  const num = parseInt(s, 10);
  if (!isNaN(num) && num >= 1 && num <= optionCount) {
    return num - 1;
  }
  if (s === "1" || s === "first" || s === "the first one") return 0;
  if (s === "2" || s === "second" || s === "the second one") return 1;
  if (s === "3" || s === "third" || s === "the third one") return 2;
  return null;
}

export const requestFoodLogConfirmationTool = tool(
  async ({
    user_id,
    search_query,
    meal_type,
    grams,
    logged_at,
  }: {
    user_id: string;
    search_query: string;
    meal_type: string;
    grams: number;
    logged_at?: string;
  }) => {
    try {
      const url = `${BACKEND_URL}/api/internal/foods/search?q=${encodeURIComponent(search_query.trim())}&limit=10`;
      const res = await fetch(url, {
        headers: { "X-Internal-API-Key": INTERNAL_API_KEY },
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
      const options = foods ?? [];
      if (options.length === 0) {
        return "No foods found for that search.";
      }

      const resumeValue = interrupt({
        type: "food_log_confirmation",
        options,
        mealType: meal_type,
        grams,
      });

      const index = parseSelectionToIndex(resumeValue, options.length);
      if (index === -1) {
        return "Logging cancelled.";
      }
      if (index === null || index < 0 || index >= options.length) {
        return `Could not understand selection. Please reply with a number (1-${options.length}) or say cancel.`;
      }

      const selected = options[index];
      const p = selected.per100g;
      const ratio = grams / 100;
      const item = {
        fdcId: selected.fdcId,
        description: selected.description,
        referenceGrams: 100,
        grams,
        calories: Math.round(p.calories * ratio * 10) / 10,
        protein: Math.round(p.protein * ratio * 10) / 10,
        carbs: Math.round(p.carbs * ratio * 10) / 10,
        fat: Math.round(p.fat * ratio * 10) / 10,
      };

      const body = {
        mealType: meal_type,
        items: [item],
        ...(logged_at ? { loggedAt: logged_at } : {}),
      };
      const createRes = await fetch(
        `${BACKEND_URL}/api/internal/users/${user_id}/food-logs/append`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-API-Key": INTERNAL_API_KEY,
          },
          body: JSON.stringify(body),
        }
      );
      if (!createRes.ok) {
        const errData = (await createRes.json().catch(() => ({}))) as { error?: string };
        return `Could not create food log: ${errData.error ?? createRes.statusText}`;
      }
      const log = (await createRes.json()) as {
        mealType: string;
        items: Array<{ description: string; grams: number; calories: number }>;
        totalCal?: number;
      };
      const itemStr = (log.items ?? [])
        .map((i) => `${i.description} (${i.grams}g, ${i.calories} cal)`)
        .join(", ");
      return `Logged for ${log.mealType}: ${itemStr}. Total: ${log.totalCal ?? 0} cal.`;
    } catch (err) {
      if (isGraphInterrupt(err)) throw err;
      return `Error: ${(err as Error).message}`;
    }
  },
  {
    name: "request_food_log_confirmation",
    description:
      "LOG FOOD: Use this when the user wants to LOG or ADD a food to their diary (e.g. 'log 100g chicken for lunch', 'add 50g oatmeal for breakfast'). Pass search_query, meal_type (breakfast/lunch/dinner/snack), and grams. The tool searches, shows options, pauses for user to reply 1/2/3, then creates the log. Do NOT use search_foods for logging—search_foods is for suggestions only.",
    schema: z.object({
      user_id: z.string().describe("The user ID from the conversation context"),
      search_query: z.string().describe("The food to search for (e.g. chicken, oatmeal)"),
      meal_type: z
        .enum(["breakfast", "lunch", "dinner", "snack"])
        .describe("Meal type for the log"),
      grams: z.number().describe("Amount in grams the user wants to log"),
      logged_at: z
        .string()
        .optional()
        .describe("Date for the log (YYYY-MM-DD); defaults to today"),
    }),
  }
);
