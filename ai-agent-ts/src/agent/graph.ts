import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
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

const checkpointer = new MemorySaver();

export const graph = workflow.compile({ checkpointer });
