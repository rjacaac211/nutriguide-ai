import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { checkBackendHealth, signup, setAuthToken } from "./api/client";
import LandingStep from "./components/LandingStep";
import OnboardingWizard from "./components/OnboardingWizard";
import LoadingScreen from "./components/LoadingScreen";
import EnterNameStep from "./components/EnterNameStep";
import GoalSummaryStep from "./components/GoalSummaryStep";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./components/DashboardOverview";
import ProfileView from "./components/ProfileView";
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
  const [userId, setUserId] = useState(null);
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
    try {
      const result = await signup(mapProfileToBackend(fullProfile));
      setAuthToken(result.token);
      setUserId(result.userId);
      setProfile(fullProfile);
      setAppPhase(PHASES.SUMMARY);
    } catch (err) {
      setNameError(err.message || "Name already taken");
    }
  };

  const enterDashboard = () => {
    setAppPhase(PHASES.DASHBOARD);
    navigate("/dashboard");
  };

  const handleLogin = ({ userId: loggedInUserId, token, profile: backendProfile }) => {
    setAuthToken(token);
    setUserId(loggedInUserId);
    setProfile(backendProfile);
    enterDashboard();
  };

  const handleSummaryContinue = () => {
    enterDashboard();
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUserId(null);
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
        <ChatThreadProvider userId={userId}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <DashboardLayout
                  profile={profile}
                  userId={userId}
                  onLogout={handleLogout}
                />
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="profile" element={<ProfileView />} />
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
