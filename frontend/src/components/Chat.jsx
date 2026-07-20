import { useRef, useEffect } from "react";
import { useChatThread } from "../context/ChatThreadContext";

export default function Chat() {
  const bottomRef = useRef(null);
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    handleSubmit,
    handleNewChat,
  } = useChatThread();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        {messages.map((m, i) => {
          const isPendingStream = m.streaming && !m.content;
          return (
            <div key={i} className={`message message-${m.role}`}>
              <span className="message-role">{m.role === "user" ? "You" : "NutriGuide"}</span>
              <div className={`message-content${isPendingStream ? " typing" : ""}`}>
                {isPendingStream ? "Thinking..." : m.content}
              </div>
            </div>
          );
        })}
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
          disabled={loading}
          maxLength={4000}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
