import { END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import type { NutriGuideStateType } from "./state.js";
import { NutriGuideState } from "./state.js";
import {
  getUserProfileTool,
  getUserBehaviouralTool,
  searchNutritionKnowledgeTool,
  searchFoodsTool,
  getCalorieGoalTool,
  requestFoodLogConfirmationTool,
} from "./tools.js";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 1000,
});

const tools = [
  getUserProfileTool,
  getUserBehaviouralTool,
  searchNutritionKnowledgeTool,
  getCalorieGoalTool,
  requestFoodLogConfirmationTool,
  searchFoodsTool,
];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
const modelWithTools = model.bindTools(tools);

const CLASSIFY_SCHEMA = z.object({
  intent: z.enum(["nutrition", "chitchat", "off_topic", "log_food"]),
});

const classifyLlm = model.withStructuredOutput(CLASSIFY_SCHEMA);

const DECLINE_PROMPT = `You are NutriGuide, a friendly nutrition assistant. The user has asked something off-topic (not about nutrition, diet, fitness, meal planning, macros, weight management, or health).

Politely decline and redirect them to nutrition-related questions. Keep your response brief (1-2 sentences).`;

const CHITCHAT_PROMPT = `You are NutriGuide, a friendly nutrition assistant. The user is greeting you or making small talk (hi, thanks, how are you, etc.).

Respond in 1-2 friendly sentences. Acknowledge them and invite them to ask nutrition questions if they'd like. Be warm but concise.`;

const ANALYZE_PROMPT = `You are analyzing a user's nutrition-related question. In 2-3 sentences, briefly reason about:
1. What the user needs (e.g., macro advice, meal planning, dietary restriction guidance)
2. What to search for in the knowledge base (suggested search query)
3. Whether their profile (age, weight, goals, restrictions) is relevant

Be concise. Output only the analysis text.`;

const AGENT_SYSTEM_PROMPT = `You are NutriGuide, a friendly and knowledgeable nutrition assistant. You help users with personalized nutrition recommendations based on their profile, goals, and questions.

Before giving recommendations:
1. Use get_user_profile to fetch the user's age, weight, goal, dietary restrictions, and activity level when relevant.
2. Use get_calorie_goal when discussing calorie targets, deficits, or daily intake—it returns their TDEE-based goal.
3. Use get_user_behavioural when discussing recent eating habits, calorie/macro intake, or meal patterns—it returns their food logs.
4. Use search_nutrition_knowledge to look up evidence-based nutrition information for their questions.
5. Use search_foods ONLY for suggestions (e.g. "what should I eat?", "high-protein foods")—never for logging.
6. Food logging: When the user wants to LOG a food (e.g. "log 100g chicken for lunch", "add 1 cup rice for dinner", "log 2 servings oatmeal for breakfast"), you MUST call request_food_log_confirmation with search_query, meal_type, and either grams OR amount+unit. This is the ONLY way to log food. Do NOT use search_foods for logging—it will break the flow when the user replies "1" or "2".

Always personalize your advice based on the user's profile. Respect dietary restrictions (e.g., vegetarian, gluten-free, allergies). Be concise but helpful. If you don't have specific knowledge, say so and give general guidance.

When the search_nutrition_knowledge tool returns **Sources** at the end, cite them in your response (e.g., "According to WHO..." or include the source link when relevant).

You MUST only answer questions about nutrition, diet, fitness, meal planning, macros, weight management, dietary restrictions, and related health topics.`;

export const classifyIntent = async (
  state: NutriGuideStateType
) => {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const lastMsg = messages.at(-1);
  const text =
    typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.content)
        ? (lastMsg.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join(" ")
        : "";
  const result = await classifyLlm.invoke(
    `Classify this user message into exactly one intent:
- log_food: user wants to LOG or ADD a food to their diary (e.g. "log 100g chicken for lunch", "add 1 cup rice for dinner", "record 2 servings oatmeal for breakfast")
- nutrition: diet, fitness, macros, meal planning, weight management, health, dietary restrictions (but NOT logging)
- chitchat: greetings (hi, hello, hey), thanks, how are you, small talk, casual conversation
- off_topic: politics, weather, tech support, unrelated topics, anything not nutrition or chitchat

Reply with intent: "log_food", "nutrition", "chitchat", or "off_topic".

User: ${text}`
  );
  return {
    classification: { intent: result.intent },
  };
};

export const respondDecline = async (
  state: NutriGuideStateType
) => {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const lastMsg = messages.at(-1);
  const userText =
    typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.content)
        ? (lastMsg.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join(" ")
        : "";
  const response = await model.invoke([
    new SystemMessage(DECLINE_PROMPT),
    new HumanMessage(userText),
  ]);
  const content =
    typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? (response.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join("")
        : "";
  return {
    messages: [new AIMessage({ content })],
  };
};

export const chitchatNode = async (state: NutriGuideStateType) => {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const lastMsg = messages.at(-1);
  const userText =
    typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.content)
        ? (lastMsg.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join(" ")
        : "";
  const response = await model.invoke([
    new SystemMessage(CHITCHAT_PROMPT),
    new HumanMessage(userText),
  ]);
  const content =
    typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? (response.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join("")
        : "";
  return {
    messages: [new AIMessage({ content })],
  };
};

const LOG_FOOD_GRAMS_REGEX = /(?:log|add|record)\s+(\d+)\s*g\s+(?:of\s+)?(.+?)(?:\s+for\s+(breakfast|lunch|dinner|snack))?$/i;
const LOG_FOOD_PORTION_REGEX =
  /(?:log|add|record)\s+(\d+(?:\.\d+)?)\s+(cup|cups|serving|servings|oz|tbsp|tsp|piece|pieces|slice|slices)\s+(?:of\s+)?(.+?)(?:\s+for\s+(breakfast|lunch|dinner|snack))?$/i;

type ParsedLogFood =
  | { search_query: string; grams: number; meal_type: string }
  | { search_query: string; amount: number; unit: string; meal_type: string };

function parseLogFoodMessage(text: string): ParsedLogFood | null {
  const t = text.trim();
  const gramsMatch = t.match(LOG_FOOD_GRAMS_REGEX);
  if (gramsMatch) {
    const grams = parseInt(gramsMatch[1], 10);
    const search_query = gramsMatch[2].trim();
    const meal_type = (gramsMatch[3] ?? "lunch").toLowerCase();
    if (!search_query || isNaN(grams) || grams <= 0) return null;
    return { search_query, grams, meal_type };
  }
  const portionMatch = t.match(LOG_FOOD_PORTION_REGEX);
  if (portionMatch) {
    const amount = parseFloat(portionMatch[1]);
    const unit = portionMatch[2].toLowerCase();
    const search_query = portionMatch[3].trim();
    const meal_type = (portionMatch[4] ?? "lunch").toLowerCase();
    if (!search_query || isNaN(amount) || amount <= 0) return null;
    return { search_query, amount, unit, meal_type };
  }
  return null;
}

export const logFoodNode = async (state: NutriGuideStateType) => {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const lastMsg = messages.at(-1);
  const text =
    typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.content)
        ? (lastMsg.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join(" ")
        : "";
  const parsed = parseLogFoodMessage(text);
  if (!parsed || !state.user_id) {
    return {
      messages: [
        new AIMessage({
          content:
            "I couldn't parse that. Try: 'log 100g chicken for lunch', 'add 1 cup rice for dinner', or 'log 2 servings oatmeal for breakfast'.",
        }),
      ],
    };
  }
  const toolArgs: Record<string, unknown> = {
    user_id: state.user_id,
    search_query: parsed.search_query,
    meal_type: parsed.meal_type,
  };
  if ("grams" in parsed) {
    toolArgs.grams = parsed.grams;
  } else {
    toolArgs.amount = parsed.amount;
    toolArgs.unit = parsed.unit;
  }
  const result = await (requestFoodLogConfirmationTool as { invoke: (input: unknown) => Promise<unknown> }).invoke(
    toolArgs
  );
  return {
    messages: [new AIMessage({ content: typeof result === "string" ? result : String(result) })],
  };
};

export const analyze = async (state: NutriGuideStateType) => {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const lastMsg = messages.at(-1);
  const userText =
    typeof lastMsg?.content === "string"
      ? lastMsg.content
      : Array.isArray(lastMsg?.content)
        ? (lastMsg.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join(" ")
        : "";
  const response = await model.invoke([
    new SystemMessage(ANALYZE_PROMPT),
    new HumanMessage(userText),
  ]);
  const analysis =
    typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? (response.content as { text?: string }[])
            .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
            .join("")
        : "";
  return { analysis };
};

export const agentNode = async (state: NutriGuideStateType) => {
  const systemParts = [
    AGENT_SYSTEM_PROMPT,
    `Current user ID for this conversation: ${state.user_id}. Use this ID when calling get_user_profile, get_user_behavioural, get_calorie_goal, or request_food_log_confirmation.`,
  ];
  if (state.analysis) {
    systemParts.push(`\nAnalysis of the user's question:\n${state.analysis}`);
  }
  const systemMessage = new SystemMessage(systemParts.join("\n\n"));
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const response = await modelWithTools.invoke([
    systemMessage,
    ...messages,
  ]);
  return {
    messages: [response],
  };
};

export const toolNode = async (state: NutriGuideStateType) => {
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const lastMessage = messages.at(-1);
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }
  const toolCalls = lastMessage.tool_calls ?? [];
  const results: ToolMessage[] = [];
  for (const toolCall of toolCalls) {
    const toolCallId = toolCall.id ?? `call_${Math.random().toString(36).slice(2)}`;
    const tool = toolsByName[toolCall.name as keyof typeof toolsByName];
    if (!tool) {
      results.push(
        new ToolMessage({
          content: `Unknown tool: ${toolCall.name}`,
          tool_call_id: toolCallId,
        })
      );
      continue;
    }
    try {
      const args = (toolCall.args ?? {}) as Record<string, unknown>;
      const observation = await (tool as { invoke: (input: unknown) => Promise<unknown> }).invoke(args);
      const content =
        typeof observation === "string"
          ? observation
          : JSON.stringify(observation);
      results.push(
        new ToolMessage({
          content,
          tool_call_id: toolCallId,
        })
      );
    } catch (err) {
      results.push(
        new ToolMessage({
          content: `Tool error: ${(err as Error).message}`,
          tool_call_id: toolCallId,
          status: "error",
        })
      );
    }
  }
  return { messages: results };
};

export function shouldContinue(
  state: { messages?: unknown[] }
): "toolNode" | typeof END {
  const lastMessage = state.messages?.at(-1);
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }
  return END;
}
