import { createContext, useContext, useState, useCallback } from "react";
import { sendChatStream } from "../api/client";

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

const ChatThreadContext = createContext(null);

export function ChatThreadProvider({ userId, children }) {
  const [threadId, setThreadId] = useState(() => generateId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const appendToLastMessage = useCallback((text) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, content: last.content + text }];
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!input.trim() || loading || !userId) return;

      const userMsg = input.trim();
      setInput("");
      setLoading(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userMsg },
        { role: "assistant", content: "", streaming: true },
      ]);

      await sendChatStream(userMsg, threadId, {
        onToken: (text) => appendToLastMessage(text),
        onInterrupt: (text) => appendToLastMessage(text),
        onDone: () => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return [
              ...prev.slice(0, -1),
              { ...last, streaming: false, content: last.content || "(No response)" },
            ];
          });
          setLoading(false);
        },
        onError: (err) => {
          setError(err.message || "Something went wrong");
          setMessages((prev) => prev.slice(0, -1));
          setLoading(false);
        },
      });
    },
    [userId, threadId, input, loading, appendToLastMessage]
  );

  const handleNewChat = useCallback(() => {
    setThreadId(generateId());
    setMessages([]);
    setError(null);
  }, []);

  const value = {
    threadId,
    messages,
    input,
    setInput,
    loading,
    error,
    handleSubmit,
    handleNewChat,
  };

  return (
    <ChatThreadContext.Provider value={value}>
      {children}
    </ChatThreadContext.Provider>
  );
}

export function useChatThread() {
  const ctx = useContext(ChatThreadContext);
  if (!ctx) {
    throw new Error("useChatThread must be used within ChatThreadProvider");
  }
  return ctx;
}
