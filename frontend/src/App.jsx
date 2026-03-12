import { useState, useEffect } from "react";
import { checkBackendHealth, updateProfile } from "./api/client";
import LandingStep from "./components/LandingStep";
import OnboardingWizard from "./components/OnboardingWizard";
import LoadingScreen from "./components/LoadingScreen";
import EnterNameStep from "./components/EnterNameStep";
import GoalSummaryStep from "./components/GoalSummaryStep";
import Dashboard from "./components/Dashboard";
import ChatWidget from "./components/ChatWidget";
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
  const [sessionId] = useState(() => crypto.randomUUID());
  const [appPhase, setAppPhase] = useState(PHASES.LANDING);
  const [profile, setProfile] = useState({});
  const [backendOk, setBackendOk] = useState(null);

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

  const handleNameSubmit = (name) => {
    const fullProfile = { ...profile, name };
    setProfile(fullProfile);
    setAppPhase(PHASES.SUMMARY);
    updateProfile(sessionId, mapProfileToBackend(fullProfile)).catch(console.error);
  };

  const handleSummaryContinue = () => {
    setAppPhase(PHASES.DASHBOARD);
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
        <LandingStep onStart={() => setAppPhase(PHASES.ONBOARDING)} />
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
        <EnterNameStep onNext={handleNameSubmit} />
      )}

      {appPhase === PHASES.SUMMARY && (
        <GoalSummaryStep profile={profile} onContinue={handleSummaryContinue} />
      )}

      {appPhase === PHASES.DASHBOARD && (
        <>
          <Dashboard profile={profile} />
          <ChatWidget sessionId={sessionId} />
        </>
      )}
    </div>
  );
}
