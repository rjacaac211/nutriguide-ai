import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express, { Request, Response } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "./agent/index.js";
import { setUserProfiles } from "./agent/tools.js";
import type { ChatRequest, ChatResponse } from "./types.js";

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

let agentReady = false;

// Initialize agent (async - connects to Chroma, etc.)
agentReady = true;

function msgToDict(msg: { type?: string; content?: unknown }): { role: string; content: string } {
  const raw = msg as { type?: string; content?: unknown };
  const msgType = raw.type ?? "";
  let content = raw.content ?? "";

  if (Array.isArray(content)) {
    const parts = content.map((c) => {
      if (typeof c === "string") return c;
      if (typeof c === "object" && c !== null && "text" in c) return (c as { text: string }).text;
      return String(c);
    });
    content = parts.join(" ");
  }
  if (typeof content !== "string") {
    content = content ? String(content) : "";
  }

  const roleMap: Record<string, string> = {
    ai: "assistant",
    human: "user",
    AIMessage: "assistant",
    HumanMessage: "user",
  };
  const role =
    roleMap[msgType] ??
    (msgType.includes("Tool") || msgType.includes("System") ? "system" : "assistant");

  return { role, content: content as string };
}

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
    const { user_id, message, thread_id, user_profiles } = body;

    if (!user_id || !message || !thread_id) {
      res.status(400).json({ error: "user_id, message, and thread_id are required" });
      return;
    }

    setUserProfiles(user_profiles ?? {});

    const config = { configurable: { thread_id } };

    const state = (await agent.getState(config)) as { values?: { messages?: unknown[] } } | undefined;
    const existingMessages = state?.values?.messages ?? [];
    const isNewThread = !existingMessages || existingMessages.length === 0;

    const messageContent = isNewThread
      ? `[Current user ID for this conversation: ${user_id}. Use this ID when calling get_user_profile.]\n\n${message}`
      : message;
    const messages = [new HumanMessage(messageContent)];

    const result = await agent.invoke({ messages }, config);
    const resultMessages = (result?.messages ?? []) as Array<{ type?: string; content?: unknown }>;
    const responseText = extractResponseText(resultMessages);

    const response: ChatResponse = {
      messages: resultMessages.map(msgToDict),
      response: responseText,
    };
    res.json(response);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: (err as Error).message ?? "Chat request failed" });
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", agent_ready: agentReady });
});

const PORT = Number(process.env.AGENT_PORT) || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`NutriGuide AI Agent listening on port ${PORT}`);
});
