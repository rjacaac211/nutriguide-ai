import pg from "pg";
import { StateGraph, START, END } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { NutriGuideState } from "./state.js";
import {
  classifyIntent,
  respondDecline,
  chitchatNode,
  logFoodNode,
  analyze,
  agentNode,
  toolNode,
  shouldContinue,
} from "./nodes.js";

function routeAfterClassify(
  state: { classification?: { intent?: string } }
): "respondDecline" | "chitchatNode" | "logFoodNode" | "analyze" {
  const intent = state.classification?.intent;
  if (intent === "off_topic") return "respondDecline";
  if (intent === "chitchat") return "chitchatNode";
  if (intent === "log_food") return "logFoodNode";
  return "analyze";
}

const workflow = new StateGraph(NutriGuideState)
  .addNode("classifyIntent", classifyIntent)
  .addNode("respondDecline", respondDecline)
  .addNode("chitchatNode", chitchatNode)
  .addNode("logFoodNode", logFoodNode)
  .addNode("analyze", analyze)
  .addNode("agentNode", agentNode)
  .addNode("toolNode", toolNode)
  .addEdge(START, "classifyIntent")
  .addConditionalEdges("classifyIntent", routeAfterClassify, [
    "respondDecline",
    "chitchatNode",
    "logFoodNode",
    "analyze",
  ])
  .addEdge("respondDecline", END)
  .addEdge("chitchatNode", END)
  .addEdge("logFoodNode", END)
  .addEdge("analyze", "agentNode")
  .addConditionalEdges("agentNode", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "agentNode");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required for the Postgres checkpointer");
}

// pg's ConnectionParameters re-parses `connectionString` internally and lets whatever
// it derives from a `sslmode=...` query param silently overwrite an explicitly-passed
// `ssl` option (Object.assign order in pg/lib/connection-parameters.js runs the
// re-parsed result last) — so passing both `connectionString` (with sslmode=require)
// and `ssl: { rejectUnauthorized: false }` doesn't work as intended: the string-derived
// `ssl: {}` wins, re-enabling strict certificate verification, which then fails against
// RDS's certificate chain (SELF_SIGNED_CERT_IN_CHAIN). Strip sslmode from the string
// handed to Pool so our explicit override survives that re-parse; still SSL either way.
const requiresSsl = /sslmode=require/.test(databaseUrl);
const poolConnectionString = requiresSsl
  ? (() => {
      const url = new URL(databaseUrl);
      url.searchParams.delete("sslmode");
      return url.toString();
    })()
  : databaseUrl;

const pool = new pg.Pool({
  connectionString: poolConnectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

const checkpointer = new PostgresSaver(pool);
await checkpointer.setup(); // idempotent: creates checkpoints/checkpoint_blobs/checkpoint_writes/checkpoint_migrations tables

export const graph = workflow.compile({ checkpointer });
