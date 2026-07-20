import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import express, { Request, Response } from "express";
import { pinoHttp } from "pino-http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { Command } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { graph } from "./agent/index.js";
import { logger } from "./logger.js";
import type {
  ChatRequest,
  ChatTokenEvent,
  ChatInterruptEvent,
  ChatDoneEvent,
  ChatErrorEvent,
} from "./types.js";

// Nodes whose LLM output is user-facing and should be streamed to the client.
// classifyIntent (structured-output classification) and analyze (internal reasoning
// step feeding agentNode's system prompt) are deliberately excluded.
const STREAMED_NODES = new Set(["agentNode", "chitchatNode", "respondDecline"]);

// Keep in sync with backend/src/routes/chat.js's MAX_MESSAGE_LENGTH — enforced
// independently here since this endpoint is also reachable directly (eval harness,
// test:chat script), not just through the backend proxy.
const MAX_MESSAGE_LENGTH = 4000;

const app = express();
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      if (existing) return Array.isArray(existing) ? existing[0] : existing;
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === "/health" },
  })
);
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

let agentReady = false;

// Initialize agent (async - connects to Chroma, etc.)
agentReady = true;

function extractChunkText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === "string" ? c : (c as { text?: string })?.text ?? "")).join("");
  }
  return "";
}

// Fallback for nodes that construct their final AIMessage directly (e.g. logFoodNode's
// post-resume confirmation) instead of via a streamed model.invoke() call — these never
// appear in "messages" streamMode, so if no tokens were streamed for a completed
// (non-interrupted) turn, pull the last message's text straight from final state.
function extractLastMessageText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = (messages[i] as { content?: unknown } | undefined)?.content;
    const text = extractChunkText(content);
    if (text) return text;
  }
  return "";
}

function formatFoodLogInterrupt(payload: {
  type?: string;
  options?: Array<{ description?: string; brandOwner?: string | null; per100g?: { calories: number } }>;
  mealType?: string;
  grams?: number;
}): string {
  if (payload.type !== "food_log_confirmation" || !payload.options?.length) {
    return "Please reply with a number to select, or say cancel.";
  }
  const lines = payload.options.map((opt, i) => {
    const brand = opt.brandOwner ? ` (${opt.brandOwner})` : "";
    const cal = opt.per100g?.calories ?? 0;
    return `${i + 1}) ${opt.description ?? "?"}${brand} - ${cal} cal/100g`;
  });
  return `Here are the options:\n${lines.join("\n")}\n\nReply with 1-${payload.options.length} to log, or say cancel.`;
}

type GraphState = {
  values?: { messages?: unknown[] };
  tasks?: Array<{ interrupts?: unknown[] }>;
};

function getPendingInterrupts(state: GraphState | undefined): unknown[] {
  return (state?.tasks ?? []).flatMap((t) => t.interrupts ?? []);
}

app.post("/chat", async (req: Request, res: Response) => {
  const body = req.body as ChatRequest;
  const { user_id, message, thread_id } = body;

  if (!user_id || !message || !thread_id) {
    res.status(400).json({ error: "user_id, message, and thread_id are required" });
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
    return;
  }

  const config = { configurable: { thread_id, request_id: req.id } };

  let state: GraphState | undefined;
  try {
    state = (await graph.getState(config)) as GraphState | undefined;
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: (err as Error).message ?? "Chat request failed" });
    return;
  }
  const isInterrupted = getPendingInterrupts(state).length > 0;

  const runConfig = {
    ...config,
    runName: "nutriguide-chat",
    tags: ["chat", isInterrupted ? "resume" : "new-turn"],
    metadata: { user_id, thread_id, request_id: req.id },
  };

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  function sendEvent(event: string, data: ChatTokenEvent | ChatInterruptEvent | ChatDoneEvent | ChatErrorEvent) {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // res.on("close") — not req.on("close") — is the correct client-disconnect signal here:
  // req (the incoming request stream) emits "close" once its body is fully read, which
  // happens almost immediately and has nothing to do with whether the client is still
  // waiting on the response.
  let clientClosed = false;
  res.on("close", () => {
    clientClosed = true;
  });

  try {
    const streamConfig = { ...runConfig, streamMode: "messages" as const };
    const stream = isInterrupted
      ? await graph.stream(new Command({ resume: message }), streamConfig)
      : await graph.stream(
          {
            messages: (() => {
              const existingMessages = state?.values?.messages ?? [];
              const isNewThread = existingMessages.length === 0;
              return isNewThread
                ? [
                    new SystemMessage(
                      `Current user ID for this conversation: ${user_id}. Use this ID when calling get_user_profile.`
                    ),
                    new HumanMessage(message),
                  ]
                : [new HumanMessage(message)];
            })(),
            user_id,
          },
          streamConfig
        );

    let anyTokenSent = false;
    // Some nodes (chitchatNode/respondDecline, which share a plain, non-tool-bound
    // model instance) emit one extra chunk after their real incremental deltas whose
    // content is a full recap of everything already streamed for this turn, rather than
    // a genuine delta. Detect and drop it by comparing against what's accumulated so far.
    let accumulated = "";
    for await (const [chunk, metadata] of stream) {
      if (clientClosed) break;
      const nodeName = (metadata as { langgraph_node?: string } | undefined)?.langgraph_node;
      if (!nodeName || !STREAMED_NODES.has(nodeName)) continue;
      const text = extractChunkText(chunk.content);
      if (text && !(accumulated.length > 0 && text === accumulated)) {
        accumulated += text;
        anyTokenSent = true;
        sendEvent("token", { text } satisfies ChatTokenEvent);
      }
    }

    if (clientClosed) return;

    const finalState = (await graph.getState(config)) as GraphState | undefined;
    const interrupts = getPendingInterrupts(finalState);
    const isNowInterrupted = interrupts.length > 0;

    if (!isNowInterrupted && !anyTokenSent) {
      const fallbackText = extractLastMessageText(finalState?.values?.messages ?? []);
      if (fallbackText) sendEvent("token", { text: fallbackText } satisfies ChatTokenEvent);
    }

    if (isNowInterrupted) {
      const raw = interrupts[0];
      const payload = (raw as { value?: unknown })?.value ?? raw;
      const formatted =
        typeof payload === "object" && payload !== null && "type" in payload
          ? formatFoodLogInterrupt(payload as Parameters<typeof formatFoodLogInterrupt>[0])
          : String(payload);
      sendEvent("interrupt", { text: formatted } satisfies ChatInterruptEvent);
    }

    sendEvent("done", { interrupted: isNowInterrupted } satisfies ChatDoneEvent);
  } catch (err) {
    req.log.error({ err }, "Chat error");
    sendEvent("error", { error: (err as Error).message ?? "Chat request failed" } satisfies ChatErrorEvent);
  } finally {
    res.end();
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
  logger.info(`NutriGuide AI Agent listening on port ${PORT}`);
});
