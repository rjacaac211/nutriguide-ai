import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { checkBackendHealth, updateProfile } from "./api/client";
import LandingStep from "./components/LandingStep";
import OnboardingWizard from "./components/OnboardingWizard";
import LoadingScreen from "./components/LoadingScreen";
import EnterNameStep from "./components/EnterNameStep";
import GoalSummaryStep from "./components/GoalSummaryStep";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./components/DashboardOverview";
import ChatPage from "./components/ChatPage";
import ChatWidget from "./components/ChatWidget";
import { ChatThreadProvider } from "./context/ChatThreadContext";
import "./App.css";

const PHASES = {
  LANDING: "landing",
  ONBOARDING: "onboarding",
  LOADING: "loading",
  NAME: "name",
  SUMMARY: "summary",
  DASHBOARD: "dashboard",
};

export default function App() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    );
  });
  const [appPhase, setAppPhase] = useState(PHASES.LANDING);
  const [profile, setProfile] = useState({});
  const [backendOk, setBackendOk] = useState(null);
  const [nameError, setNameError] = useState(null);

  useEffect(() => {
    checkBackendHealth().then(setBackendOk);
  }, []);

  const handleProfileUpdate = (field, value) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const handleOnboardingComplete = () => {
    setAppPhase(PHASES.LOADING);
  };

  const handleLoadingComplete = () => {
    setAppPhase(PHASES.NAME);
  };

  const handleNameSubmit = async (name) => {
    setNameError(null);
    const fullProfile = { ...profile, name };
    setProfile(fullProfile);
    try {
      await updateProfile(sessionId, mapProfileToBackend(fullProfile));
      setAppPhase(PHASES.SUMMARY);
    } catch (err) {
      setNameError(err.message || "Name already taken");
    }
  };

  const enterDashboard = () => {
    setAppPhase(PHASES.DASHBOARD);
    navigate("/dashboard");
  };

  const handleLogin = ({ userId, profile: backendProfile }) => {
    setSessionId(userId);
    setProfile(backendProfile);
    enterDashboard();
  };

  const handleSummaryContinue = () => {
    enterDashboard();
  };

  const handleLogout = () => {
    setSessionId(
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
          )
    );
    setProfile({});
    setAppPhase(PHASES.LANDING);
  };

  const mapProfileToBackend = (p) => ({
    name: p.name ?? null,
    gender: p.gender ?? null,
    birth_date: p.birth_date ?? null,
    height_cm: p.height_cm ?? null,
    weight_kg: p.weight_kg ?? null,
    goal_weight_kg: p.goal_weight_kg ?? null,
    goal: p.goal ?? "maintain",
    activity_level: p.activity_level ?? "moderate",
    speed_kg_per_week: p.speed_kg_per_week ?? null,
    preferences: p.preferences || [],
    challenges: p.challenges || [],
    dietary_restrictions: p.dietary_restrictions || [],
  });

  return (
    <div className="app">
      {backendOk === false && (
        <div className="backend-warning">
          Backend not reachable. Start it with: <code>cd backend && npm run dev</code>
        </div>
      )}

      {appPhase === PHASES.LANDING && (
        <LandingStep
          onStart={() => setAppPhase(PHASES.ONBOARDING)}
          onLogin={handleLogin}
        />
      )}

      {appPhase === PHASES.ONBOARDING && (
        <OnboardingWizard
          profile={profile}
          onUpdate={handleProfileUpdate}
          onComplete={handleOnboardingComplete}
          onBack={() => setAppPhase(PHASES.LANDING)}
        />
      )}

      {appPhase === PHASES.LOADING && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      {appPhase === PHASES.NAME && (
        <EnterNameStep onNext={handleNameSubmit} error={nameError} />
      )}

      {appPhase === PHASES.SUMMARY && (
        <GoalSummaryStep profile={profile} onContinue={handleSummaryContinue} />
      )}

      {appPhase === PHASES.DASHBOARD && (
        <ChatThreadProvider userId={sessionId}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <DashboardLayout
                  profile={profile}
                  userId={sessionId}
                  onLogout={handleLogout}
                />
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ChatWidget />
        </ChatThreadProvider>
      )}
    </div>
  );
}
