import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

function requireInternalApiKey(req, res, next) {
  const key = req.headers["x-internal-api-key"];
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.use(requireInternalApiKey);

function serializeProfile(profile) {
  if (!profile) return null;
  const toNum = (v) =>
    v != null && typeof v === "object" && "toNumber" in v ? v.toNumber() : v;
  return {
    userId: profile.userId,
    name: profile.name,
    gender: profile.gender,
    birthDate: profile.birthDate,
    age: profile.age,
    heightCm: toNum(profile.heightCm),
    weightKg: toNum(profile.weightKg),
    goalWeightKg: toNum(profile.goalWeightKg),
    goal: profile.goal,
    activityLevel: profile.activityLevel,
    speedKgPerWeek: toNum(profile.speedKgPerWeek),
    dietaryRestrictions: profile.dietaryRestrictions ?? [],
    preferences: profile.preferences ?? [],
    challenges: profile.challenges ?? [],
  };
}

router.get("/users/:id/profile", async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.params.id },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(serializeProfile(profile));
  } catch (err) {
    console.error("Internal profile fetch error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.get("/users/:id/behavioural", async (req, res) => {
  try {
    const userId = req.params.id;
    const days = parseInt(req.query.days, 10) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const foodLogs = await prisma.foodLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: "desc" },
    });

    const toNum = (v) =>
      v != null && typeof v === "object" && "toNumber" in v ? v.toNumber() : v;

    const serializedLogs = foodLogs.map((log) => ({
      id: log.id,
      loggedAt: log.loggedAt,
      mealType: log.mealType,
      items: log.items,
      totalCal: toNum(log.totalCal),
      totalProtein: toNum(log.totalProtein),
      totalCarbs: toNum(log.totalCarbs),
      totalFat: toNum(log.totalFat),
    }));

    res.json({ food_logs: serializedLogs, weight_trend: [] });
  } catch (err) {
    console.error("Internal behavioural fetch error:", err);
    res.status(500).json({ error: "Failed to fetch behavioural data" });
  }
});

export default router;
