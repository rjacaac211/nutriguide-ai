import { createContext, useContext, useState, useCallback } from "react";
import { sendChat } from "../api/client";

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

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!input.trim() || loading || !userId) return;

      const userMsg = input.trim();
      setInput("");
      setLoading(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

      try {
        const { response } = await sendChat(userId, userMsg, threadId);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response || "(No response)" },
        ]);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [userId, threadId, input, loading]
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
