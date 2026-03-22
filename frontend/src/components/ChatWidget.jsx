import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Chat from "./Chat";

export default function ChatWidget() {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === "/dashboard/chat") {
    return null;
  }

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
            <Chat />
          </div>
          <button
            type="button"
            className="chat-widget-open-tab"
            onClick={() => navigate("/dashboard/chat")}
          >
            Open in Chat tab
          </button>
        </>
      ) : (
        <button
          type="button"
          className="chat-widget-toggle"
          onClick={() => setExpanded(true)}
          aria-label="Open chat"
        >
          <span className="chat-widget-icon" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
