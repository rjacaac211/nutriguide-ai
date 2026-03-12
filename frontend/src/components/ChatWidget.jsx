import { useState } from "react";
import Chat from "./Chat";

export default function ChatWidget({ sessionId }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`chat-widget ${expanded ? "expanded" : "collapsed"}`}>
      {expanded ? (
        <>
          <div className="chat-widget-header">
            <span>NutriGuide AI</span>
            <button
              type="button"
              className="chat-widget-close"
              onClick={() => setExpanded(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div className="chat-widget-body">
            <Chat userId={sessionId} />
          </div>
        </>
      ) : (
        <button
          type="button"
          className="chat-widget-toggle"
          onClick={() => setExpanded(true)}
          aria-label="Open chat"
        >
          <span className="chat-widget-icon">💬</span>
        </button>
      )}
    </div>
  );
}
