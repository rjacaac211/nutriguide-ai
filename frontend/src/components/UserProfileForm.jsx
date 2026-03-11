import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "../api/client";

const GOALS = ["lose", "maintain", "gain"];
const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"];

export default function UserProfileForm({ userId, onProfileSaved }) {
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("maintain");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [restrictions, setRestrictions] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId)
      .then((p) => {
        if (p) {
          setAge(p.age ?? "");
          setWeightKg(p.weight_kg ?? "");
          setGoal(p.goal ?? "maintain");
          setActivityLevel(p.activity_level ?? "moderate");
          setRestrictions((p.dietary_restrictions || []).join(", "));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, {
        age: age ? parseInt(age, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        goal,
        activity_level: activityLevel,
        dietary_restrictions: restrictions
          ? restrictions.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });
      onProfileSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (!userId) return null;

  return (
    <form onSubmit={handleSubmit} className="profile-form">
      <h3>Your Profile</h3>
      <label>
        Age
        <input
          type="number"
          min="1"
          max="120"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="e.g. 30"
        />
      </label>
      <label>
        Weight (kg)
        <input
          type="number"
          min="1"
          step="0.1"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          placeholder="e.g. 70"
        />
      </label>
      <label>
        Goal
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {g === "lose" ? "Lose weight" : g === "gain" ? "Gain weight" : "Maintain weight"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Activity level
        <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {a.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dietary restrictions (comma-separated)
        <input
          type="text"
          value={restrictions}
          onChange={(e) => setRestrictions(e.target.value)}
          placeholder="e.g. vegetarian, gluten-free"
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
