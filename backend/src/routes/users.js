import express from "express";
import { prisma } from "../db.js";
import { calculateTDEE } from "../services/tdee.js";
import { getCurrentWeight } from "../services/weightLogs.js";

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

function serializeProfile(profile) {
  if (!profile) return null;
  const toNum = (v) => (v != null && typeof v === "object" && "toNumber" in v ? v.toNumber() : v);
  const birthDate = profile.birthDate;
  const birth_date = birthDate instanceof Date
    ? birthDate.toISOString().slice(0, 10)
    : birthDate && typeof birthDate === "string"
      ? birthDate.slice(0, 10)
      : birthDate;
  return {
    name: profile.name,
    gender: profile.gender,
    birth_date,
    age: profile.age,
    height_cm: toNum(profile.heightCm),
    weight_kg: toNum(profile.weightKg),
    goal_weight_kg: toNum(profile.goalWeightKg),
    goal: profile.goal,
    activity_level: profile.activityLevel,
    speed_kg_per_week: toNum(profile.speedKgPerWeek),
    preferences: profile.preferences ?? [],
    challenges: profile.challenges ?? [],
    dietary_restrictions: profile.dietaryRestrictions ?? [],
  };
}

router.get("/by-name", async (req, res) => {
  const name = req.query.name?.trim();
  if (!name) return res.status(400).json({ error: "Name is required" });
  const profile = await prisma.profile.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    include: { user: true },
  });
  if (!profile) return res.status(404).json({ error: "No account found with that name" });
  res.json({ userId: profile.userId, profile: serializeProfile(profile) });
});

router.get("/:id/profile", async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.params.id },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(serializeProfile(profile));
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.get("/:id/calorie-goal", async (req, res) => {
  try {
    const userId = req.params.id;
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const currentWeight = await getCurrentWeight(userId);
    const profileForTDEE = { ...profile, weightKg: currentWeight ?? profile.weightKg };
    const { goalKcal, bmr, tdee } = calculateTDEE(profileForTDEE);
    res.json({ goalKcal, bmr, tdee });
  } catch (err) {
    console.error("Calorie goal error:", err);
    res.status(500).json({ error: "Failed to get calorie goal" });
  }
});

function parseBirthDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const str = String(v).trim();
  if (!str) return null;
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

router.put("/:id/profile", async (req, res) => {
  try {
    const userId = req.params.id;
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

    const birthDateParsed = parseBirthDate(birth_date);
    const ageComputed = age ?? ageFromBirthDate(birthDateParsed);

    if (name != null && String(name).trim()) {
      const existing = await prisma.profile.findFirst({
        where: {
          name: { equals: String(name).trim(), mode: "insensitive" },
          userId: { not: userId },
        },
      });
      if (existing) {
        return res.status(400).json({ error: "Name already taken" });
      }
    }

    const profile = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        create: { id: userId },
        update: {},
      });

      const updated = await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          name: name ?? null,
          gender: gender ?? null,
          birthDate: birthDateParsed,
          age: ageComputed,
          heightCm: height_cm ?? null,
          weightKg: weight_kg ?? null,
          goalWeightKg: goal_weight_kg ?? null,
          goal: goal ?? "maintain",
          activityLevel: activity_level ?? "moderate",
          speedKgPerWeek: speed_kg_per_week ?? null,
          preferences: preferences || [],
          challenges: challenges || [],
          dietaryRestrictions: dietary_restrictions || [],
        },
        update: {
          name: name ?? null,
          gender: gender ?? null,
          birthDate: birthDateParsed,
          age: ageComputed,
          heightCm: height_cm ?? null,
          weightKg: weight_kg ?? null,
          goalWeightKg: goal_weight_kg ?? null,
          goal: goal ?? "maintain",
          activityLevel: activity_level ?? "moderate",
          speedKgPerWeek: speed_kg_per_week ?? null,
          preferences: preferences || [],
          challenges: challenges || [],
          dietaryRestrictions: dietary_restrictions || [],
        },
      });

      // Seed initial weight log when profile has weight_kg and user has no weight logs
      const weightNum = weight_kg != null ? parseFloat(weight_kg) : NaN;
      if (!isNaN(weightNum) && weightNum > 0) {
        const count = await tx.weightLog.count({ where: { userId } });
        if (count === 0) {
          const today = new Date();
          const dateObj = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
          await tx.weightLog.create({
            data: {
              userId,
              weightKg: weightNum,
              date: dateObj,
            },
          });
        }
      }

      return updated;
    });

    res.json(serializeProfile(profile));
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
