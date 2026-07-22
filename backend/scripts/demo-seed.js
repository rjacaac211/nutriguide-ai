/**
 * Seed a demo account ("Alex Demo") with ~2 weeks of realistic food and
 * weight logs, for portfolio screenshots/GIFs and local demos. Log in
 * through the real UI via the name-only login ("Alex Demo").
 *
 * Unlike eval-seed.js (whose items hold per-100g reference values), items
 * here store macros scaled to the actual grams — matching what the real
 * UI (AddFoodModal) and agent (request_food_log_confirmation) produce, so
 * the dashboard renders believable per-item calories. Totals come from the
 * same computeTotals the API uses. loggedAt is midnight UTC, matching
 * createFoodLog's normalization.
 *
 * Today is seeded with breakfast + lunch only — dinner is left open so a
 * live "log 200 grams of white rice for dinner" chat demo lands on a
 * believable in-progress day.
 *
 * Idempotent and deterministic relative to the run date: re-running
 * refreshes the same data shifted to "today".
 *
 * Local-only: refuses to run against an amazonaws.com DATABASE_URL unless
 * DEMO_SEED_ALLOW_REMOTE=1 is set.
 *
 * Usage (host): cd backend && node scripts/demo-seed.js
 * (Inside Docker: docker compose exec backend node scripts/demo-seed.js —
 * requires a rebuilt image, since compose has no volume mounts.)
 */
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { prisma } from "../src/db.js";
import { computeTotals } from "../src/services/foodLogs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Guard: never seed a remote/prod database by accident.
const dbUrl = process.env.DATABASE_URL ?? "";
if (/amazonaws\.com/i.test(dbUrl) && process.env.DEMO_SEED_ALLOW_REMOTE !== "1") {
  console.error(
    "DATABASE_URL points at amazonaws.com — refusing to seed demo data into a remote database.\n" +
      "Set DEMO_SEED_ALLOW_REMOTE=1 to override (you almost certainly don't want to)."
  );
  process.exit(1);
}

// .env uses host.docker.internal for Docker Compose; when run from the host,
// rewrite to localhost. Safe here because PrismaClient resolves DATABASE_URL
// lazily at first query, not at import (same ordering eval-seed.js relies on).
if (!existsSync("/.dockerenv") && dbUrl.includes("host.docker.internal")) {
  process.env.DATABASE_URL = dbUrl.replace("host.docker.internal", "localhost");
}

const DEMO_USER_ID = "demo-user";
const DEMO_NAME = "Alex Demo";
const BIRTH_DATE = new Date("1998-05-14");

function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function ageFromBirthDate(birthDate) {
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

// Per-100g reference values (macros per referenceGrams=100).
const CATALOG = {
  oatmeal: { fdcId: 173410, description: "Oatmeal, regular, cooked", calories: 68, protein: 2.4, carbs: 12, fat: 1.4 },
  banana: { fdcId: 173944, description: "Banana, raw", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  chicken: { fdcId: 171705, description: "Chicken, broiler, roasted", calories: 239, protein: 27.3, carbs: 0, fat: 14.1 },
  whiteRice: { fdcId: 169098, description: "Rice, white, cooked", calories: 130, protein: 2.4, carbs: 28.2, fat: 0.3 },
  greekYogurt: { fdcId: 174270, description: "Greek yogurt, plain, nonfat", calories: 59, protein: 10.2, carbs: 3.6, fat: 0.7 },
  salmon: { fdcId: 175168, description: "Salmon, Atlantic, cooked", calories: 208, protein: 20.4, carbs: 0, fat: 13.4 },
  broccoli: { fdcId: 170288, description: "Broccoli, raw", calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  egg: { fdcId: 171688, description: "Egg, whole, cooked, scrambled", calories: 149, protein: 10.1, carbs: 1.6, fat: 11.2 },
  wheatBread: { fdcId: 172422, description: "Whole wheat bread", calories: 247, protein: 12.5, carbs: 41.3, fat: 3.4 },
  apple: { fdcId: 171689, description: "Apple, raw, with skin", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  almonds: { fdcId: 170567, description: "Almonds, raw", calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  pasta: { fdcId: 168927, description: "Pasta, cooked, enriched", calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9 },
  groundBeef: { fdcId: 174036, description: "Ground beef, 90% lean, cooked", calories: 217, protein: 26.1, carbs: 0, fat: 11.8 },
  sweetPotato: { fdcId: 168483, description: "Sweet potato, baked in skin", calories: 90, protein: 2, carbs: 20.7, fat: 0.2 },
  tuna: { fdcId: 175159, description: "Tuna, light, canned in water", calories: 116, protein: 25.5, carbs: 0, fat: 0.8 },
  avocado: { fdcId: 171706, description: "Avocado, raw", calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  cottageCheese: { fdcId: 173417, description: "Cottage cheese, low-fat", calories: 72, protein: 12.4, carbs: 2.7, fat: 1 },
};

// Same rounding as AddFoodModal.jsx / the agent's confirmation tool.
function scaled(key, grams) {
  const ref = CATALOG[key];
  const ratio = grams / 100;
  const r1 = (v) => Math.round(v * ratio * 10) / 10;
  return {
    fdcId: ref.fdcId,
    description: ref.description,
    referenceGrams: 100,
    grams,
    calories: r1(ref.calories),
    protein: r1(ref.protein),
    carbs: r1(ref.carbs),
    fat: r1(ref.fat),
  };
}

// 7 day-templates cycled across 14 days (~1600-1750 kcal/day, matching a
// "lose" goal). Each entry: mealType -> [catalogKey, grams][].
const DAY_TEMPLATES = [
  {
    breakfast: [["oatmeal", 250], ["banana", 118]],
    lunch: [["chicken", 150], ["whiteRice", 180], ["broccoli", 100]],
    dinner: [["salmon", 170], ["sweetPotato", 200]],
    snack: [["almonds", 30]],
  },
  {
    breakfast: [["greekYogurt", 250], ["banana", 118]],
    lunch: [["tuna", 120], ["wheatBread", 80], ["apple", 182]],
    dinner: [["groundBeef", 150], ["pasta", 220]],
  },
  {
    breakfast: [["egg", 120], ["wheatBread", 70]],
    lunch: [["chicken", 160], ["pasta", 200]],
    dinner: [["salmon", 150], ["broccoli", 150], ["whiteRice", 150]],
    snack: [["apple", 182]],
  },
  {
    breakfast: [["oatmeal", 300], ["almonds", 20]],
    lunch: [["groundBeef", 130], ["sweetPotato", 250]],
    dinner: [["chicken", 170], ["broccoli", 200]],
    snack: [["greekYogurt", 150]],
  },
  {
    breakfast: [["greekYogurt", 200], ["apple", 150]],
    lunch: [["salmon", 140], ["whiteRice", 200]],
    dinner: [["chicken", 120], ["pasta", 250]],
  },
  {
    breakfast: [["egg", 100], ["avocado", 70], ["wheatBread", 60]],
    lunch: [["cottageCheese", 200], ["apple", 182], ["almonds", 25]],
    dinner: [["groundBeef", 160], ["sweetPotato", 220]],
  },
  {
    breakfast: [["oatmeal", 280], ["banana", 100]],
    lunch: [["chicken", 140], ["whiteRice", 170], ["broccoli", 120]],
    dinner: [["tuna", 150], ["pasta", 230], ["avocado", 50]],
    snack: [["almonds", 20]],
  },
];

function foodLogRow(dayOffset, mealType, entries) {
  const items = entries.map(([key, grams]) => scaled(key, grams));
  const totals = computeTotals(items);
  return {
    userId: DEMO_USER_ID,
    loggedAt: daysAgo(dayOffset),
    mealType,
    items,
    totalCal: totals.cal,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
  };
}

async function main() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });

  const profileData = {
    name: DEMO_NAME,
    gender: "female",
    birthDate: BIRTH_DATE,
    age: ageFromBirthDate(BIRTH_DATE),
    heightCm: 168.0,
    weightKg: 76.5,
    goalWeightKg: 70.0,
    goal: "lose",
    // Must be a value the onboarding wizard can actually produce
    // (sedentary/light/active/very_active) so ProfileView maps it to a label.
    activityLevel: "active",
    speedKgPerWeek: 0.5,
    dietaryRestrictions: [],
    // Onboarding vocabulary values (ProfileView maps these to labels via
    // ONBOARDING_QUESTIONS) — free-text strings would render as raw values.
    preferences: ["energy", "cooking"],
    challenges: ["cravings", "portions"],
  };
  await prisma.profile.upsert({
    where: { userId: DEMO_USER_ID },
    update: profileData,
    create: { userId: DEMO_USER_ID, ...profileData },
  });

  const foodLogs = [];
  // Days 13..1: full days from the cycled templates.
  for (let dayOffset = 13; dayOffset >= 1; dayOffset--) {
    const template = DAY_TEMPLATES[(13 - dayOffset) % DAY_TEMPLATES.length];
    for (const [mealType, entries] of Object.entries(template)) {
      foodLogs.push(foodLogRow(dayOffset, mealType, entries));
    }
  }
  // Day 0 (today): breakfast + lunch only — dinner stays open for live demos.
  foodLogs.push(foodLogRow(0, "breakfast", DAY_TEMPLATES[0].breakfast));
  foodLogs.push(foodLogRow(0, "lunch", DAY_TEMPLATES[0].lunch));

  await prisma.foodLog.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.foodLog.createMany({ data: foodLogs });

  await prisma.weightLog.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.weightLog.createMany({
    data: [
      { userId: DEMO_USER_ID, weightKg: 76.5, date: daysAgo(13) },
      { userId: DEMO_USER_ID, weightKg: 76.2, date: daysAgo(11) },
      { userId: DEMO_USER_ID, weightKg: 76.3, date: daysAgo(9) },
      { userId: DEMO_USER_ID, weightKg: 75.8, date: daysAgo(7) },
      { userId: DEMO_USER_ID, weightKg: 75.6, date: daysAgo(5) },
      { userId: DEMO_USER_ID, weightKg: 75.2, date: daysAgo(4) },
      { userId: DEMO_USER_ID, weightKg: 75.1, date: daysAgo(2) },
      { userId: DEMO_USER_ID, weightKg: 74.9, date: daysAgo(0) },
    ],
  });

  console.log(
    `Seeded demo account "${DEMO_NAME}" (${DEMO_USER_ID}): ` +
      `${foodLogs.length} food logs across 14 days, 8 weight logs. ` +
      `Log in by name: "${DEMO_NAME}".`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
