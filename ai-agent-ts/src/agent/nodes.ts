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
  searchNutritionKnowledgeTool,
} from "./tools.js";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 1000,
});

const tools = [getUserProfileTool, searchNutritionKnowledgeTool];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));
const modelWithTools = model.bindTools(tools);

const CLASSIFY_SCHEMA = z.object({
  intent: z.enum(["nutrition", "off_topic"]),
});

const classifyLlm = model.withStructuredOutput(CLASSIFY_SCHEMA);

const DECLINE_PROMPT = `You are NutriGuide, a friendly nutrition assistant. The user has asked something off-topic (not about nutrition, diet, fitness, meal planning, macros, weight management, or health).

Politely decline and redirect them to nutrition-related questions. Keep your response brief (1-2 sentences).`;

const ANALYZE_PROMPT = `You are analyzing a user's nutrition-related question. In 2-3 sentences, briefly reason about:
1. What the user needs (e.g., macro advice, meal planning, dietary restriction guidance)
2. What to search for in the knowledge base (suggested search query)
3. Whether their profile (age, weight, goals, restrictions) is relevant

Be concise. Output only the analysis text.`;

const AGENT_SYSTEM_PROMPT = `You are NutriGuide, a friendly and knowledgeable nutrition assistant. You help users with personalized nutrition recommendations based on their profile, goals, and questions.

Before giving recommendations:
1. Use get_user_profile to fetch the user's age, weight, goal, dietary restrictions, and activity level when relevant.
2. Use search_nutrition_knowledge to look up evidence-based nutrition information for their questions.

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
    `Classify this user message. Is it about nutrition, diet, fitness, meal planning, macros, weight management, or health? Reply with intent: "nutrition" or "off_topic".\n\nUser: ${text}`
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
    `Current user ID for this conversation: ${state.user_id}. Use this ID when calling get_user_profile.`,
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
