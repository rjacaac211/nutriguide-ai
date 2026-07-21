/**
 * Run offline evaluation for NutriGuide AI agent.
 *
 * Usage: npm run eval
 *
 * Prerequisites:
 * - Backend running at BACKEND_URL
 * - OPENAI_API_KEY, BACKEND_URL, INTERNAL_API_KEY, PINECONE_* in .env
 * - Optional: LANGSMITH_TRACING_V2=true + LANGSMITH_API_KEY to run via LangSmith's
 *   evaluate() instead of the local loop - results then show up as an experiment
 *   in the LangSmith UI (project: LANGSMITH_PROJECT) rather than only in the console.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import type { Client } from "langsmith";
import { runAgent } from "../eval/target.js";
import { EVAL_EXAMPLES } from "../eval/dataset.js";
import { ALL_EVALUATORS } from "../eval/evaluators.js";

type ByKey = Record<string, { pass: number; total: number }>;

function recordResult(byKey: ByKey, key: string, score: unknown, counts: { pass: number; total: number }) {
  if (!byKey[key]) byKey[key] = { pass: 0, total: 0 };
  byKey[key].total += 1;
  counts.total += 1;
  const passed = score === true || score === 1;
  if (passed) {
    byKey[key].pass += 1;
    counts.pass += 1;
  }
}

async function runLocalEval() {
  const byKey: ByKey = {};
  const counts = { pass: 0, total: 0 };

  for (let i = 0; i < EVAL_EXAMPLES.length; i++) {
    const ex = EVAL_EXAMPLES[i];
    const inputs = ex.inputs;
    const referenceOutputs = ex.outputs ?? {};
    process.stdout.write(`\r[${i + 1}/${EVAL_EXAMPLES.length}] ${inputs.message.slice(0, 40)}...`);

    try {
      const outputs = await runAgent(inputs);
      for (const evaluator of ALL_EVALUATORS) {
        const { key, score } = await evaluator({
          inputs: inputs as unknown as Record<string, unknown>,
          outputs: outputs as unknown as Record<string, unknown>,
          referenceOutputs: referenceOutputs as unknown as Record<string, unknown>,
        });
        recordResult(byKey, key, score, counts);
      }
    } catch (err) {
      console.error(`\nError on example "${inputs.message}":`, err);
    }
  }

  return { byKey, passCount: counts.pass, totalCount: counts.total };
}

const LANGSMITH_DATASET_NAME = "nutriguide-agent-eval";

/**
 * Sync EVAL_EXAMPLES (dataset.ts, the source of truth) into a real LangSmith
 * dataset: wipe and recreate examples every run so the two never drift apart.
 * Passing an in-memory array directly to evaluate()'s `data` doesn't work with
 * this SDK version - it expects server-populated Example objects (created_at
 * etc.), so the dataset needs to actually exist server-side first.
 */
async function syncLangSmithDataset(client: Client) {
  const exists = await client.hasDataset({ datasetName: LANGSMITH_DATASET_NAME });
  if (!exists) {
    await client.createDataset(LANGSMITH_DATASET_NAME, {
      description: "NutriGuide agent offline eval examples (synced from ai-agent-ts/src/eval/dataset.ts)",
    });
  } else {
    const existingIds: string[] = [];
    for await (const ex of client.listExamples({ datasetName: LANGSMITH_DATASET_NAME })) {
      existingIds.push(ex.id);
    }
    if (existingIds.length) {
      await client.deleteExamples(existingIds);
    }
  }
  await client.createExamples(
    EVAL_EXAMPLES.map((ex) => ({
      inputs: ex.inputs,
      outputs: ex.outputs ?? {},
      dataset_name: LANGSMITH_DATASET_NAME,
    }))
  );
}

async function runLangSmithEval() {
  const { Client } = await import("langsmith");
  const { evaluate } = await import("langsmith/evaluation");

  const client = new Client();
  await syncLangSmithDataset(client);

  const results = await evaluate((inputs) => runAgent(inputs as never), {
    data: LANGSMITH_DATASET_NAME,
    evaluators: ALL_EVALUATORS as never,
    experimentPrefix: "nutriguide-agent-eval",
    client,
  });

  const byKey: ByKey = {};
  const counts = { pass: 0, total: 0 };
  // evaluate() already fully drains its internal async generator while building
  // this response (see processData() in the SDK) - `.results` is the populated
  // array of rows; re-iterating `results` itself via for-await yields nothing.
  for (const row of results.results) {
    for (const result of row.evaluationResults.results) {
      recordResult(byKey, result.key, result.score, counts);
    }
  }

  console.log(`\nLangSmith experiment: ${results.experimentName}`);
  const project = process.env.LANGSMITH_PROJECT ?? "default";
  console.log(`View in LangSmith: https://smith.langchain.com/ (project: ${project})`);

  return { byKey, passCount: counts.pass, totalCount: counts.total };
}

function printResults(byKey: ByKey, passCount: number, totalCount: number) {
  console.log("\n\nResults by evaluator:");
  for (const [key, { pass, total }] of Object.entries(byKey)) {
    const pct = total > 0 ? ((pass / total) * 100).toFixed(1) : "0";
    console.log(`  ${key}: ${pass}/${total} (${pct}%)`);
  }
  console.log(`\nOverall: ${passCount}/${totalCount} passed`);
}

async function main() {
  const hasLangSmith = process.env.LANGSMITH_TRACING_V2 === "true" && !!process.env.LANGSMITH_API_KEY;

  console.log("NutriGuide AI Agent - Offline Evaluation");
  console.log("========================================");
  console.log(`Examples: ${EVAL_EXAMPLES.length}`);
  console.log(`Mode: ${hasLangSmith ? "LangSmith" : "Local"}`);
  console.log("");

  const { byKey, passCount, totalCount } = hasLangSmith ? await runLangSmithEval() : await runLocalEval();
  printResults(byKey, passCount, totalCount);

  // Opt-in pass-rate gate: unset locally, so `npm run eval` always exits 0 for
  // a developer eyeballing results. CI (eval.yml) sets this to make the
  // workflow actually fail on a real regression instead of only on infra errors.
  const failBelow = process.env.EVAL_FAIL_BELOW ? Number(process.env.EVAL_FAIL_BELOW) : undefined;
  if (failBelow !== undefined && totalCount > 0 && passCount / totalCount < failBelow) {
    console.error(`\nPass rate ${(passCount / totalCount).toFixed(3)} is below EVAL_FAIL_BELOW threshold ${failBelow}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
