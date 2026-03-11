import express from "express";

const router = express.Router();

router.get("/:id/profile", (req, res) => {
  const profiles = req.app.locals.userProfiles || {};
  const profile = profiles[req.params.id];
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }
  res.json(profile);
});

router.put("/:id/profile", (req, res) => {
  const { age, weight_kg, goal, dietary_restrictions, activity_level } = req.body;
  if (!req.app.locals.userProfiles) {
    req.app.locals.userProfiles = {};
  }
  req.app.locals.userProfiles[req.params.id] = {
    age: age ?? null,
    weight_kg: weight_kg ?? null,
    goal: goal ?? "maintain",
    dietary_restrictions: dietary_restrictions || [],
    activity_level: activity_level ?? "moderate",
  };
  res.json(req.app.locals.userProfiles[req.params.id]);
});

export default router;
