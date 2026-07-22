import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getProfile } from "../api/client";
import { ONBOARDING_QUESTIONS } from "../config/onboardingQuestions";

function labelFor(field, value) {
  if (value == null) return null;
  const question = ONBOARDING_QUESTIONS.find((q) => q.field === field);
  const choice = question?.choices?.find((c) => c.value === value);
  return choice?.label ?? value;
}

function labelsFor(field, values) {
  return (values || []).map((v) => labelFor(field, v)).filter(Boolean);
}

export default function ProfileView() {
  const { userId } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setLoading(true);
    getProfile(userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="profile-view">
        <p className="profile-view-loading">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-view">
        <p className="profile-view-empty">No profile data found.</p>
      </div>
    );
  }

  const preferences = labelsFor("preferences", profile.preferences).join(", ");
  const challenges = labelsFor("challenges", profile.challenges).join(", ");

  const rows = [
    { label: "Name", value: profile.name },
    { label: "Gender", value: labelFor("gender", profile.gender) },
    { label: "Age", value: profile.age != null ? `${profile.age}` : null },
    { label: "Height", value: profile.height_cm != null ? `${profile.height_cm} cm` : null },
    { label: "Starting weight", value: profile.weight_kg != null ? `${profile.weight_kg} kg` : null },
    { label: "Goal weight", value: profile.goal_weight_kg != null ? `${profile.goal_weight_kg} kg` : null },
    { label: "Goal", value: labelFor("goal", profile.goal) },
    { label: "Activity level", value: labelFor("activity_level", profile.activity_level) },
    {
      label: "Desired pace",
      value: profile.goal === "lose" && profile.speed_kg_per_week != null
        ? `${profile.speed_kg_per_week} kg/week`
        : null,
    },
    { label: "Preferences", value: preferences || null },
    { label: "Challenges", value: challenges || null },
  ].filter((row) => row.value);

  return (
    <div className="profile-view">
      <h3 className="profile-view-title">Profile</h3>
      <div className="profile-card">
        {rows.map((row) => (
          <div key={row.label} className="profile-row">
            <span className="profile-row-label">{row.label}</span>
            <span className="profile-row-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
