/**
 * Run offline evaluation for NutriGuide AI agent.
 *
 * Usage: npm run eval
 *
 * Prerequisites:
 * - Backend running at BACKEND_URL
 * - OPENAI_API_KEY, BACKEND_URL, INTERNAL_API_KEY, PINECONE_* in .env
 * - Optional: LANGSMITH_TRACING_V2=true for trace upload
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { runAgent } from "../eval/target.js";
import { EVAL_EXAMPLES } from "../eval/dataset.js";
import { ALL_EVALUATORS } from "../eval/evaluators.js";

async function runLocalEval() {
  const byKey: Record<string, { pass: number; total: number }> = {};
  let passCount = 0;
  let totalCount = 0;

  for (let i = 0; i < EVAL_EXAMPLES.length; i++) {
    const ex = EVAL_EXAMPLES[i];
    const inputs = ex.inputs;
    const referenceOutputs = ex.outputs ?? {};
    process.stdout.write(`\r[${i + 1}/${EVAL_EXAMPLES.length}] ${inputs.message.slice(0, 40)}...`);

    try {
      const outputs = await runAgent(inputs);
      for (const evaluator of ALL_EVALUATORS) {
        const { key, score } = evaluator({
          inputs: inputs as unknown as Record<string, unknown>,
          outputs: outputs as unknown as Record<string, unknown>,
          referenceOutputs: referenceOutputs as unknown as Record<string, unknown>,
        });
        if (!byKey[key]) byKey[key] = { pass: 0, total: 0 };
        byKey[key].total += 1;
        const passed = score === true || score === 1;
        if (passed) byKey[key].pass += 1;
        totalCount += 1;
        if (passed) passCount += 1;
      }
    } catch (err) {
      console.error(`\nError on example "${inputs.message}":`, err);
    }
  }

  return { byKey, passCount, totalCount };
}

function printResults(byKey: Record<string, { pass: number; total: number }>, passCount: number, totalCount: number) {
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

  // Use local eval (reliable, no LangSmith dependency)
  const { byKey, passCount, totalCount } = await runLocalEval();
  printResults(byKey, passCount, totalCount);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
