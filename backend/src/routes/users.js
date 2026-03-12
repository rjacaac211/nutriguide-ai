import express from "express";

const router = express.Router();

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

router.get("/:id/profile", (req, res) => {
  const profiles = req.app.locals.userProfiles || {};
  const profile = profiles[req.params.id];
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }
  res.json(profile);
});

router.put("/:id/profile", (req, res) => {
  const {
    name,
    gender,
    birth_date,
    height_cm,
    weight_kg,
    goal_weight_kg,
    goal,
    activity_level,
    speed_kg_per_week,
    preferences,
    challenges,
    dietary_restrictions,
    age,
  } = req.body;

  if (!req.app.locals.userProfiles) {
    req.app.locals.userProfiles = {};
  }

  const ageComputed = age ?? ageFromBirthDate(birth_date);

  req.app.locals.userProfiles[req.params.id] = {
    name: name ?? null,
    gender: gender ?? null,
    birth_date: birth_date ?? null,
    age: ageComputed,
    height_cm: height_cm ?? null,
    weight_kg: weight_kg ?? null,
    goal_weight_kg: goal_weight_kg ?? null,
    goal: goal ?? "maintain",
    activity_level: activity_level ?? "moderate",
    speed_kg_per_week: speed_kg_per_week ?? null,
    preferences: preferences || [],
    challenges: challenges || [],
    dietary_restrictions: dietary_restrictions || [],
  };
  res.json(req.app.locals.userProfiles[req.params.id]);
});

export default router;
