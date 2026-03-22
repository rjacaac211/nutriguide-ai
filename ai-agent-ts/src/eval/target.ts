/**
 * Target function for NutriGuide agent evaluation.
 * Invokes the graph and returns outputs for evaluators.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";
import { graph } from "../agent/index.js";
import type { EvalExampleInput } from "./dataset.js";

export interface TargetOutput {
  messages: unknown[];
  classification?: { intent: string };
  response: string;
  __interrupt__?: unknown;
  tool_calls: string[];
}

function extractResponseText(messages: Array<{ content?: unknown }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const content = msg.content;
    if (content && typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content
        .map((c) => (typeof c === "string" ? c : (c as { text?: string })?.text ?? ""))
        .join("")
        .trim();
      if (text) return text;
    }
  }
  return "";
}

function extractToolCalls(messages: unknown[]): string[] {
  const toolNames: string[] = [];
  for (const msg of messages) {
    if (AIMessage.isInstance(msg) && msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        if (tc.name) toolNames.push(tc.name);
      }
    }
  }
  return toolNames;
}

/**
 * Target function for LangSmith evaluate().
 * Accepts example inputs and returns outputs for evaluators.
 */
export async function runAgent(inputs: EvalExampleInput): Promise<TargetOutput> {
  const { message, user_id } = inputs;
  const threadId = `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const config = { configurable: { thread_id: threadId } };

  const messages = [
    new SystemMessage(
      `Current user ID for this conversation: ${user_id}. Use this ID when calling get_user_profile, get_user_behavioural, get_calorie_goal, or request_food_log_confirmation.`
    ),
    new HumanMessage(message),
  ];

  const result = (await graph.invoke({ messages, user_id }, config)) as {
    messages?: unknown[];
    classification?: { intent: string };
    __interrupt__?: unknown;
  };

  const resultMessages = (result?.messages ?? []) as unknown[];
  const response = extractResponseText(resultMessages as Array<{ content?: unknown }>);
  const tool_calls = extractToolCalls(resultMessages);

  return {
    messages: resultMessages,
    classification: result.classification,
    response,
    __interrupt__: result.__interrupt__,
    tool_calls,
  };
}
