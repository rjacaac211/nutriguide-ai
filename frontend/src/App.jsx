import { useState, useEffect } from "react";
import Chat from "./components/Chat";
import UserProfileForm from "./components/UserProfileForm";
import { checkBackendHealth } from "./api/client";
import "./App.css";

const DEFAULT_USER_ID = "user-1";

export default function App() {
  const [userId] = useState(DEFAULT_USER_ID);
  const [showProfile, setShowProfile] = useState(false);
  const [backendOk, setBackendOk] = useState(null);

  useEffect(() => {
    checkBackendHealth().then(setBackendOk);
  }, []);

  return (
    <div className="app">
      {backendOk === false && (
        <div className="backend-warning">
          Backend not reachable. Start it with: <code>cd backend && npm run dev</code>
        </div>
      )}
      <header className="app-header">
        <h1>NutriGuide AI</h1>
        <p>Personalized nutrition recommendations</p>
        <button
          className="profile-toggle"
          onClick={() => setShowProfile((p) => !p)}
        >
          {showProfile ? "Hide Profile" : "Edit Profile"}
        </button>
      </header>

      <main className="app-main">
        {showProfile && (
          <aside className="profile-sidebar">
            <UserProfileForm userId={userId} onProfileSaved={() => setShowProfile(false)} />
          </aside>
        )}
        <section className="chat-section">
          <Chat userId={userId} />
        </section>
      </main>
    </div>
  );
}
