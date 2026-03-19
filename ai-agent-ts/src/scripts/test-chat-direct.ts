/**
 * Direct test script for the AI agent (bypasses HTTP, backend, and UI).
 * Use this to verify interrupt flow and debug without the full stack.
 *
 * Run: npm run test:chat
 * Or:  npx tsx src/scripts/test-chat-direct.ts
 *
 * Requires: BACKEND_URL, INTERNAL_API_KEY, OPENAI_API_KEY in .env
 * LangSmith: Set LANGSMITH_TRACING_V2=true to see traces at smith.langchain.com
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Command } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { graph } from "../agent/index.js";

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

async function main() {
  const threadId = "test-thread-" + Date.now();
  const userId = "test-user-1";
  const config = { configurable: { thread_id: threadId } };

  console.log("=== Turn 1: Log 100g chicken for lunch ===\n");

  const messages1 = [
    new SystemMessage(`Current user ID for this conversation: ${userId}. Use this ID when calling get_user_profile.`),
    new HumanMessage("log 100g chicken for lunch"),
  ];

  const result1 = (await graph.invoke({ messages: messages1, user_id: userId }, config)) as {
    messages?: unknown[];
    __interrupt__?: unknown;
  };

  if (result1.__interrupt__ != null) {
    console.log("✅ INTERRUPT TRIGGERED!");
    console.log("__interrupt__ payload:", JSON.stringify(result1.__interrupt__, null, 2));
    const raw = result1.__interrupt__;
    const payload = Array.isArray(raw)
      ? (raw[0] as { value?: unknown })?.value ?? raw[0]
      : raw;
    if (typeof payload === "object" && payload !== null && "options" in payload) {
      const opts = (payload as { options?: Array<{ description?: string }> }).options ?? [];
      console.log("\nOptions presented:");
      opts.forEach((o, i) => console.log(`  ${i + 1}) ${o.description ?? "?"}`));
    }
    console.log("\n--- Simulating user reply: '1' ---\n");
  } else {
    const text = extractResponseText((result1.messages ?? []) as Array<{ content?: unknown }>);
    console.log("No interrupt. Agent response:", text);
    console.log("\n(If you expected an interrupt, the agent may have used search_foods instead of request_food_log_confirmation.)");
    return;
  }

  console.log("=== Turn 2: Resume with '1' ===\n");

  const result2 = (await graph.invoke(new Command({ resume: "1" }), config)) as {
    messages?: unknown[];
    __interrupt__?: unknown;
  };

  if (result2.__interrupt__ != null) {
    console.log("⚠️ Still interrupted (unexpected):", result2.__interrupt__);
    return;
  }

  const text2 = extractResponseText((result2.messages ?? []) as Array<{ content?: unknown }>);
  console.log("✅ Agent response after resume:", text2);
  console.log("\n--- Done. Check LangSmith for full trace. ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
