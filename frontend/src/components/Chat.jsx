import { useState, useRef, useEffect } from "react";
import { sendChat } from "../api/client";

export default function Chat({ userId }) {
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !userId) return;

    const userMsg = input.trim();
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { response, messages: updatedMessages } = await sendChat(
        userId,
        userMsg,
        threadId
      );
      const normalizeMsg = (m) => {
        const role = m.role || (m.type === "ai" ? "assistant" : m.type === "human" ? "user" : null);
        const content = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((c) => (c?.text ?? c)).join(" ") : "";
        return { role, content };
      };
      const displayMessages = updatedMessages
        ? updatedMessages
            .map(normalizeMsg)
            .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
            .map((m) => ({ role: m.role, content: m.content }))
        : [];
      setMessages(displayMessages.length > 0 ? displayMessages : [{ role: "user", content: userMsg }, { role: "assistant", content: response || "(No response)" }]);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setThreadId(crypto.randomUUID());
    setMessages([]);
    setError(null);
  };

  return (
    <div className="chat">
      <div className="chat-header-row">
        <button type="button" className="chat-new-btn" onClick={handleNewChat} disabled={loading}>
          New chat
        </button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-placeholder">
            Ask me about nutrition, meal plans, or your goals. I'll personalize my
            advice based on your profile.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message message-${m.role}`}>
            <span className="message-role">{m.role === "user" ? "You" : "NutriGuide"}</span>
            <div className="message-content">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message message-assistant">
            <span className="message-role">NutriGuide</span>
            <div className="message-content typing">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {error && (
        <div className="chat-error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about nutrition..."
          disabled={loading || !userId}
        />
        <button type="submit" disabled={loading || !input.trim() || !userId}>
          Send
        </button>
      </form>
    </div>
  );
}
