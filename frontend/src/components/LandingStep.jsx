import { useState } from "react";
import { loginByName } from "../api/client";

export default function LandingStep({ onStart, onLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    const name = loginName.trim();
    if (!name) return;
    try {
      const result = await loginByName(name);
      if (result) {
        onLogin({ userId: result.userId, profile: result.profile });
      } else {
        setLoginError("No account found with that name. Create one?");
      }
    } catch (err) {
      setLoginError(err.message || "Login failed");
    }
  };

  const handleCancelLogin = () => {
    setShowLogin(false);
    setLoginName("");
    setLoginError(null);
  };

  return (
    <div className="landing-step">
      <header className="landing-header">
        <h1>NutriGuide AI</h1>
        <p>Personalized nutrition recommendations</p>
      </header>
      <div className="landing-content">
        <p className="landing-subtitle">
          Create your profile to get personalized meal plans, calorie goals, and AI-powered nutrition advice.
        </p>
        {!showLogin && (
          <>
            <button type="button" className="landing-create-btn" onClick={onStart}>
              Create Account
            </button>
            <button
              type="button"
              className="landing-login-btn"
              onClick={() => setShowLogin(true)}
            >
              Log in
            </button>
          </>
        )}
        {showLogin && (
          <form onSubmit={handleLoginSubmit} className="landing-login-form">
            <input
              type="text"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Your name"
              className="landing-login-input"
              autoFocus
            />
            {loginError && <p className="landing-login-error">{loginError}</p>}
            <div className="landing-login-actions">
              <button type="submit" className="landing-create-btn">
                Log in
              </button>
              <button
                type="button"
                className="landing-login-cancel"
                onClick={handleCancelLogin}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
