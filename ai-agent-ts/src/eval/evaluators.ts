/**
 * Evaluators for NutriGuide agent offline evaluation.
 * Each evaluator receives { inputs, outputs, referenceOutputs } (LangSmith convention).
 */

import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { createTrajectoryMatchEvaluator } from "agentevals";
import { z } from "zod";
import { parseLogFoodMessage } from "../agent/nodes.js";
import { KNOWN_SOURCES } from "../agent/rag.js";
import type { EvalExampleOutput } from "./dataset.js";

interface EvaluatorArgs {
  inputs: Record<string, unknown>;
  // On a failed target-function run (e.g. graph recursion limit hit), LangSmith's
  // evaluate() still invokes evaluators with outputs undefined - every evaluator
  // must treat a missing run as a fail, not crash.
  outputs: Record<string, unknown> | undefined;
  referenceOutputs?: Record<string, unknown>;
}

type Evaluator = (
  args: EvaluatorArgs
) => { key: string; score: number | boolean } | Promise<{ key: string; score: number | boolean }>;

export const intentCorrect: Evaluator = ({ outputs = {}, referenceOutputs }) => {
  const expected = referenceOutputs?.intent as string | undefined;
  if (expected == null) return { key: "intent_correct", score: true };
  const actual = (outputs as { classification?: { intent?: string } }).classification?.intent;
  return { key: "intent_correct", score: actual === expected };
};

export const offTopicHandled: Evaluator = ({ outputs = {}, referenceOutputs }) => {
  if (referenceOutputs?.intent !== "off_topic") return { key: "off_topic_handled", score: true };
  const response = (String(outputs.response ?? "")).toLowerCase();
  const hasRedirect = response.includes("nutrition") || response.includes("diet") || response.includes("health");
  const isBrief = response.length < 500;
  return { key: "off_topic_handled", score: hasRedirect && isBrief };
};

export const chitchatAppropriate: Evaluator = ({ outputs = {}, referenceOutputs }) => {
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

export const logFoodParsed: Evaluator = ({ inputs, referenceOutputs }) => {
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

/**
 * Trajectory match via agentevals: does the actual tool-call trajectory contain
 * (at least) every tool in expected_tools? Tool args are ignored - expected_tools
 * is a minimum-required-set, not an exact-call assertion. "superset" mode allows
 * the agent to call additional helpful tools beyond the minimum.
 */
const trajectorySupersetMatch = createTrajectoryMatchEvaluator({
  trajectoryMatchMode: "superset",
  toolArgsMatchMode: "ignore",
});

export const rightToolsCalled: Evaluator = async ({ outputs = {}, referenceOutputs }) => {
  const expectedTools = referenceOutputs?.expected_tools as string[] | undefined;
  if (!expectedTools?.length) return { key: "right_tools_called", score: true };
  const actualMessages = (outputs.messages ?? []) as BaseMessage[];
  const referenceTrajectory = [
    new AIMessage({
      content: "",
      tool_calls: expectedTools.map((name, i) => ({ id: `ref_${i}`, name, args: {} })),
    }),
  ];
  const result = await trajectorySupersetMatch({
    outputs: actualMessages,
    referenceOutputs: referenceTrajectory,
  });
  return { key: "right_tools_called", score: result.score === true };
};

const JUDGE_SCHEMA = z.object({
  grounded: z
    .boolean()
    .describe(
      "True if the response's factual claims are reasonable and don't contradict or fabricate beyond the reference answer."
    ),
  addressesQuestion: z.boolean().describe("True if the response directly and substantively addresses the user's question."),
  reasoning: z.string().describe("One or two sentence justification for the scores above."),
});

const judgeModel = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }).withStructuredOutput(JUDGE_SCHEMA);

/**
 * LLM-as-judge evaluator for final response quality on nutrition-intent examples.
 * Grades against a golden reference answer (dataset.ts) rather than length/keyword heuristics.
 */
export const judgeResponseQuality: Evaluator = async ({ inputs, outputs = {}, referenceOutputs }) => {
  const ref = referenceOutputs as EvalExampleOutput | undefined;
  if (ref?.intent !== "nutrition") return { key: "response_quality_judge", score: true };
  const response = String(outputs.response ?? "");
  if (!response || response.length < 10 || response.toLowerCase().includes("error")) {
    return { key: "response_quality_judge", score: false };
  }

  const question = String((inputs as { message?: string }).message ?? "");
  const referenceAnswer = ref.reference_answer ?? "(no reference answer provided; grade on general soundness and relevance)";

  const result = await judgeModel.invoke(
    `You are grading a nutrition assistant's response for quality.

User question: ${question}

Reference answer (guidance for grading, not a required verbatim match): ${referenceAnswer}

Assistant's actual response: ${response}

Grade whether the response is grounded (no fabricated or contradictory claims relative to the reference) and whether it addresses the user's question.`
  );
  return { key: "response_quality_judge", score: result.grounded && result.addressesQuestion };
};

/**
 * Retrieval-quality check: for nutrition examples that name an expected_source_file,
 * verifies the search_nutrition_knowledge tool call actually surfaced that source's
 * URL (searchNutritionKnowledge appends a **Sources:** URL list to its returned string -
 * see rag.ts), not just that some plausible-sounding answer was produced.
 */
export const retrievalSourceCorrect: Evaluator = ({ outputs = {}, referenceOutputs }) => {
  const ref = referenceOutputs as EvalExampleOutput | undefined;
  if (ref?.intent !== "nutrition" || !ref?.expected_source_file) {
    return { key: "retrieval_source_correct", score: true };
  }
  const expectedUrl = KNOWN_SOURCES[ref.expected_source_file];
  if (!expectedUrl) {
    return { key: "retrieval_source_correct", score: false };
  }
  const actualMessages = (outputs.messages ?? []) as BaseMessage[];
  // ToolMessage.content doesn't carry the tool name that produced it - only tool_call_id -
  // so the corresponding AIMessage.tool_calls entry has to be looked up to identify which
  // ToolMessages came from search_nutrition_knowledge.
  const searchCallIds = new Set(
    actualMessages
      .filter((m): m is AIMessage => m instanceof AIMessage)
      .flatMap((m) => m.tool_calls ?? [])
      .filter((tc) => tc.name === "search_nutrition_knowledge")
      .map((tc) => tc.id)
  );
  const found = actualMessages.some(
    (m) =>
      m instanceof ToolMessage &&
      searchCallIds.has(m.tool_call_id) &&
      typeof m.content === "string" &&
      m.content.includes(expectedUrl)
  );
  return { key: "retrieval_source_correct", score: found };
};

export const ALL_EVALUATORS = [
  intentCorrect,
  offTopicHandled,
  chitchatAppropriate,
  logFoodParsed,
  rightToolsCalled,
  judgeResponseQuality,
  retrievalSourceCorrect,
];
