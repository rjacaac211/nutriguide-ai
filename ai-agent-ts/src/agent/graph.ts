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

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: /sslmode=require/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
});

const checkpointer = new PostgresSaver(pool);
await checkpointer.setup(); // idempotent: creates checkpoints/checkpoint_blobs/checkpoint_writes/checkpoint_migrations tables

export const graph = workflow.compile({ checkpointer });
