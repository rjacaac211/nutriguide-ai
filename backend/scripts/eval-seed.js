/**
 * Seed a fixed "eval-test-user" fixture used by the AI agent's offline eval
 * harness (ai-agent-ts/src/eval/dataset.ts hardcodes this user id for all
 * examples). Without this, profile/behavioural/calorie-goal tool calls 404
 * and the agent falls back to a "no data found" response instead of the
 * personalized path the dataset's reference answers were written against.
 *
 * Idempotent: safe to run against a fresh or already-seeded database.
 *
 * Usage: node scripts/eval-seed.js
 */
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { prisma } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const EVAL_USER_ID = "eval-test-user";

function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  await prisma.user.upsert({
    where: { id: EVAL_USER_ID },
    update: {},
    create: { id: EVAL_USER_ID },
  });

  await prisma.profile.upsert({
    where: { userId: EVAL_USER_ID },
    update: {},
    create: {
      userId: EVAL_USER_ID,
      name: "Eval Test User",
      gender: "female",
      birthDate: new Date("1992-03-10"),
      age: 33,
      heightCm: 165.0,
      weightKg: 68.0,
      goalWeightKg: 62.0,
      goal: "lose",
      activityLevel: "moderate",
      speedKgPerWeek: 0.5,
      dietaryRestrictions: ["dairy-free"],
      preferences: ["high-protein", "quick meals"],
      challenges: ["late-night snacking"],
    },
  });

  await prisma.foodLog.deleteMany({ where: { userId: EVAL_USER_ID } });
  await prisma.foodLog.createMany({
    data: [
      {
        userId: EVAL_USER_ID,
        loggedAt: new Date(daysAgo(2).getTime() + 8 * 3600 * 1000),
        mealType: "breakfast",
        items: [
          { fdcId: 173410, description: "Oatmeal, regular, cooked", referenceGrams: 100, grams: 300, calories: 68, protein: 2.4, carbs: 12, fat: 1.4 },
          { fdcId: 173944, description: "Banana, raw", referenceGrams: 100, grams: 118, calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
        ],
        totalCal: 309.02,
        totalProtein: 8.5,
        totalCarbs: 62.9,
        totalFat: 4.55,
      },
      {
        userId: EVAL_USER_ID,
        loggedAt: new Date(daysAgo(2).getTime() + 12.5 * 3600 * 1000),
        mealType: "lunch",
        items: [
          { fdcId: 171705, description: "Chicken, broiler, roasted", referenceGrams: 100, grams: 200, calories: 239, protein: 27.3, carbs: 0, fat: 14.1 },
          { fdcId: 169098, description: "Rice, white, cooked", referenceGrams: 100, grams: 200, calories: 130, protein: 2.4, carbs: 28.2, fat: 0.3 },
        ],
        totalCal: 738.0,
        totalProtein: 59.4,
        totalCarbs: 56.4,
        totalFat: 28.8,
      },
      {
        userId: EVAL_USER_ID,
        loggedAt: new Date(daysAgo(1).getTime() + 8 * 3600 * 1000),
        mealType: "breakfast",
        items: [{ fdcId: 174270, description: "Greek yogurt, plain, nonfat", referenceGrams: 100, grams: 200, calories: 59, protein: 10.2, carbs: 3.6, fat: 0.7 }],
        totalCal: 118.0,
        totalProtein: 20.4,
        totalCarbs: 7.2,
        totalFat: 1.4,
      },
      {
        userId: EVAL_USER_ID,
        loggedAt: new Date(daysAgo(1).getTime() + 19 * 3600 * 1000),
        mealType: "dinner",
        items: [
          { fdcId: 175168, description: "Salmon, Atlantic, cooked", referenceGrams: 100, grams: 200, calories: 208, protein: 20.4, carbs: 0, fat: 13.4 },
          { fdcId: 170288, description: "Broccoli, raw", referenceGrams: 100, grams: 150, calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
        ],
        totalCal: 467.0,
        totalProtein: 44.9,
        totalCarbs: 10.5,
        totalFat: 27.4,
      },
      {
        userId: EVAL_USER_ID,
        loggedAt: new Date(daysAgo(0).getTime() + 8 * 3600 * 1000),
        mealType: "breakfast",
        items: [
          { fdcId: 171688, description: "Egg, whole, cooked, scrambled", referenceGrams: 100, grams: 100, calories: 149, protein: 10.1, carbs: 1.6, fat: 11.2 },
          { fdcId: 172422, description: "Whole wheat bread", referenceGrams: 100, grams: 60, calories: 247, protein: 12.5, carbs: 41.3, fat: 3.4 },
        ],
        totalCal: 297.2,
        totalProtein: 17.6,
        totalCarbs: 26.4,
        totalFat: 13.24,
      },
    ],
  });

  await prisma.weightLog.deleteMany({ where: { userId: EVAL_USER_ID } });
  await prisma.weightLog.createMany({
    data: [
      { userId: EVAL_USER_ID, weightKg: 68.4, date: daysAgo(6) },
      { userId: EVAL_USER_ID, weightKg: 68.3, date: daysAgo(4) },
      { userId: EVAL_USER_ID, weightKg: 68.1, date: daysAgo(2) },
      { userId: EVAL_USER_ID, weightKg: 68.0, date: daysAgo(0) },
    ],
  });

  console.log(`Seeded eval fixture for user "${EVAL_USER_ID}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
