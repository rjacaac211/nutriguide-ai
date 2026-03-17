import express from "express";
import { prisma } from "../db.js";

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
  return {
    name: profile.name,
    gender: profile.gender,
    birth_date: profile.birthDate,
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

    const ageComputed = age ?? ageFromBirthDate(birth_date);

    await prisma.$transaction([
      prisma.user.upsert({
        where: { id: userId },
        create: { id: userId },
        update: {},
      }),
    ]);

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: name ?? null,
        gender: gender ?? null,
        birthDate: birth_date ?? null,
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
        birthDate: birth_date ?? null,
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

    res.json(serializeProfile(profile));
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
