import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchNutritionKnowledge } from "./rag.js";

export type UserProfile = Record<string, unknown>;

let userProfiles: Record<string, UserProfile> = {};

export function setUserProfiles(profiles: Record<string, UserProfile>): void {
  userProfiles = profiles;
}

export function getUserProfiles(): Record<string, UserProfile> {
  return userProfiles;
}

export const getUserProfileTool = tool(
  async ({ user_id }: { user_id: string }) => {
    const profile = userProfiles[user_id];
    if (!profile) {
      return `No profile found for user ${user_id}. User has not set up their profile yet.`;
    }
    const parts = [
      `User profile: name=${(profile as Record<string, unknown>).name ?? "unknown"}`,
      `age=${(profile as Record<string, unknown>).age ?? "unknown"}`,
      `gender=${(profile as Record<string, unknown>).gender ?? "unknown"}`,
      `weight_kg=${(profile as Record<string, unknown>).weight_kg ?? "unknown"}`,
      `height_cm=${(profile as Record<string, unknown>).height_cm ?? "unknown"}`,
      `goal=${(profile as Record<string, unknown>).goal ?? "unknown"}`,
      `goal_weight_kg=${(profile as Record<string, unknown>).goal_weight_kg ?? "unknown"}`,
      `activity_level=${(profile as Record<string, unknown>).activity_level ?? "unknown"}`,
      `speed_kg_per_week=${(profile as Record<string, unknown>).speed_kg_per_week ?? "unknown"}`,
      `dietary_restrictions=${JSON.stringify((profile as Record<string, unknown>).dietary_restrictions ?? [])}`,
      `preferences=${JSON.stringify((profile as Record<string, unknown>).preferences ?? [])}`,
      `challenges=${JSON.stringify((profile as Record<string, unknown>).challenges ?? [])}`,
    ];
    return parts.join(", ");
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
