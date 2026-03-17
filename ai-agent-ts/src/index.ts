import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express, { Request, Response } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { graph } from "./agent/index.js";
import type { ChatRequest, ChatResponse } from "./types.js";

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

let agentReady = false;

// Initialize agent (async - connects to Chroma, etc.)
agentReady = true;

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

app.post("/chat", async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequest;
    const { user_id, message, thread_id } = body;

    if (!user_id || !message || !thread_id) {
      res.status(400).json({ error: "user_id, message, and thread_id are required" });
      return;
    }

    const config = { configurable: { thread_id } };

    const state = (await graph.getState(config)) as {
      values?: { messages?: unknown[] };
    } | undefined;
    const existingMessages = state?.values?.messages ?? [];
    const isNewThread = !existingMessages || existingMessages.length === 0;

    const messages = isNewThread
      ? [
          new SystemMessage(
            `Current user ID for this conversation: ${user_id}. Use this ID when calling get_user_profile.`
          ),
          new HumanMessage(message),
        ]
      : [new HumanMessage(message)];

    const result = await graph.invoke({ messages, user_id }, config);
    const resultMessages = (result?.messages ?? []) as Array<{ content?: unknown }>;
    const responseText = extractResponseText(resultMessages);

    res.json({ response: responseText } satisfies ChatResponse);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: (err as Error).message ?? "Chat request failed" });
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", agent_ready: agentReady });
});

const PORT = process.env.AGENT_PORT;
if (!PORT) {
  throw new Error("AGENT_PORT environment variable is required");
}
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`NutriGuide AI Agent listening on port ${PORT}`);
});
