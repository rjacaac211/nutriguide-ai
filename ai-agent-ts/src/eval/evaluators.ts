/**
 * Evaluators for NutriGuide agent offline evaluation.
 * Each evaluator receives { inputs, outputs, referenceOutputs } (LangSmith convention).
 */

import { parseLogFoodMessage } from "../agent/nodes.js";
import type { EvalExampleOutput } from "./dataset.js";

interface EvaluatorArgs {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}

type Evaluator = (args: EvaluatorArgs) => { key: string; score: number | boolean };

export const intentCorrect: Evaluator = ({ outputs, referenceOutputs }) => {
  const expected = referenceOutputs?.intent as string | undefined;
  if (expected == null) return { key: "intent_correct", score: true };
  const actual = (outputs as { classification?: { intent?: string } }).classification?.intent;
  return { key: "intent_correct", score: actual === expected };
};

export const offTopicHandled: Evaluator = ({ outputs, referenceOutputs }) => {
  if (referenceOutputs?.intent !== "off_topic") return { key: "off_topic_handled", score: true };
  const response = (String(outputs.response ?? "")).toLowerCase();
  const hasRedirect = response.includes("nutrition") || response.includes("diet") || response.includes("health");
  const isBrief = response.length < 500;
  return { key: "off_topic_handled", score: hasRedirect && isBrief };
};

export const chitchatAppropriate: Evaluator = ({ outputs, referenceOutputs }) => {
  if (referenceOutputs?.intent !== "chitchat") return { key: "chitchat_appropriate", score: true };
  const response = (String(outputs.response ?? "")).toLowerCase();
  const isFriendly = response.length > 0 && !response.includes("error");
  const invitesQuestion =
    response.includes("?") ||
    response.includes("ask") ||
    response.includes("question") ||
    response.includes("help") ||
    response.includes("nutrition");
  return { key: "chitchat_appropriate", score: isFriendly && (invitesQuestion || response.length < 200) };
};

export const logFoodParsed: Evaluator = ({ inputs, outputs, referenceOutputs }) => {
  const ref = referenceOutputs as EvalExampleOutput | undefined;
  if (ref?.intent !== "log_food" || !ref?.parsed) return { key: "log_food_parsed", score: true };
  const message = String(inputs.message ?? "");
  const parsed = parseLogFoodMessage(message);
  const expected = ref.parsed;
  if (!parsed) return { key: "log_food_parsed", score: false };
  if (parsed.search_query !== expected.search_query) return { key: "log_food_parsed", score: false };
  if (parsed.meal_type !== expected.meal_type) return { key: "log_food_parsed", score: false };
  if ("grams" in expected && expected.grams != null) {
    if (!("grams" in parsed) || parsed.grams !== expected.grams) return { key: "log_food_parsed", score: false };
  }
  if ("amount" in expected && expected.amount != null && "unit" in expected && expected.unit) {
    if (
      !("amount" in parsed) ||
      !("unit" in parsed) ||
      parsed.amount !== expected.amount ||
      parsed.unit !== expected.unit
    )
      return { key: "log_food_parsed", score: false };
  }
  return { key: "log_food_parsed", score: true };
};

export const rightToolsCalled: Evaluator = ({ outputs, referenceOutputs }) => {
  const expectedTools = referenceOutputs?.expected_tools as string[] | undefined;
  if (!expectedTools?.length) return { key: "right_tools_called", score: true };
  const actualTools = (outputs.tool_calls ?? []) as string[];
  const actualSet = new Set(actualTools);
  const allExpectedCalled = expectedTools.every((t) => actualSet.has(t));
  return { key: "right_tools_called", score: allExpectedCalled };
};

/**
 * Heuristic evaluator for final response quality.
 * Can be extended with LLM-as-judge for nutrition examples.
 */
export const finalResponseQuality: Evaluator = ({ outputs, referenceOutputs }) => {
  if (referenceOutputs?.intent !== "nutrition") return { key: "final_response_quality", score: true };
  const response = String(outputs.response ?? "");
  if (!response || response.length < 10) return { key: "final_response_quality", score: false };
  const hasContent = response.length > 50;
  const notError = !response.toLowerCase().includes("error") && !response.toLowerCase().includes("could not");
  return { key: "final_response_quality", score: hasContent && notError };
};

export const ALL_EVALUATORS = [
  intentCorrect,
  offTopicHandled,
  chitchatAppropriate,
  logFoodParsed,
  rightToolsCalled,
  finalResponseQuality,
];
