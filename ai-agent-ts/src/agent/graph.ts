import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { NutriGuideState } from "./state.js";
import {
  classifyIntent,
  respondDecline,
  analyze,
  agentNode,
  toolNode,
  shouldContinue,
} from "./nodes.js";

function routeAfterClassify(
  state: { classification?: { intent?: string } }
): "respondDecline" | "analyze" {
  return state.classification?.intent === "off_topic"
    ? "respondDecline"
    : "analyze";
}

const workflow = new StateGraph(NutriGuideState)
  .addNode("classifyIntent", classifyIntent)
  .addNode("respondDecline", respondDecline)
  .addNode("analyze", analyze)
  .addNode("agentNode", agentNode)
  .addNode("toolNode", toolNode)
  .addEdge(START, "classifyIntent")
  .addConditionalEdges("classifyIntent", routeAfterClassify, [
    "respondDecline",
    "analyze",
  ])
  .addEdge("respondDecline", END)
  .addEdge("analyze", "agentNode")
  .addConditionalEdges("agentNode", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "agentNode");

const checkpointer = new MemorySaver();

export const graph = workflow.compile({ checkpointer });
