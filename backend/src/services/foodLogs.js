/**
 * Food log service - shared logic for creating food logs.
 * Used by both public and internal API routes.
 */

import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function computeTotals(items) {
  if (!Array.isArray(items)) return { cal: 0, protein: 0, carbs: 0, fat: 0 };
  return items.reduce(
    (acc, it) => ({
      cal: acc.cal + (Number(it.calories) || 0),
      protein: acc.protein + (Number(it.protein) || 0),
      carbs: acc.carbs + (Number(it.carbs) || 0),
      fat: acc.fat + (Number(it.fat) || 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Validates a food log item. Required: fdcId, description, referenceGrams, grams, calories, protein, carbs, fat.
 * Optional (for display): portionDescription, portionAmount.
 */
export function validateItem(item) {
  if (!item || typeof item !== "object") return false;
  const { fdcId, description, referenceGrams, grams, calories, protein, carbs, fat } = item;
  if (fdcId == null || !description || referenceGrams == null || grams == null) return false;
  if (typeof grams !== "number" || grams <= 0) return false;
  return true;
}

export function serializeLog(log) {
  return {
    id: log.id,
    userId: log.userId,
    loggedAt: log.loggedAt,
    mealType: log.mealType,
    items: log.items ?? [],
    totalCal: toNum(log.totalCal),
    totalProtein: toNum(log.totalProtein),
    totalCarbs: toNum(log.totalCarbs),
    totalFat: toNum(log.totalFat),
    createdAt: log.createdAt,
  };
}

/**
 * Create a food log for a user.
 * @param {string} userId - User ID
 * @param {{ mealType: string, items: Array, loggedAt?: Date|string }} params
 * @returns {Promise<Object>} Serialized food log
 * @throws {Error} If validation fails (mealType invalid, items invalid)
 */
export async function createFoodLog(userId, { mealType, items, loggedAt }) {
  if (!mealType || !MEAL_TYPES.includes(mealType)) {
    throw new Error("mealType must be one of: breakfast, lunch, dinner, snack");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array");
  }
  for (const it of items) {
    if (!validateItem(it)) {
      throw new Error("Invalid item: requires fdcId, description, referenceGrams, grams, calories, protein, carbs, fat");
    }
  }

  const totals = computeTotals(items);
  let logDate = new Date();
  if (loggedAt) {
    const d = new Date(loggedAt);
    if (!isNaN(d.getTime())) logDate = d;
  }
  logDate.setUTCHours(0, 0, 0, 0);

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });

  const log = await prisma.foodLog.create({
    data: {
      userId,
      mealType,
      items,
      loggedAt: logDate,
      totalCal: new Prisma.Decimal(totals.cal),
      totalProtein: new Prisma.Decimal(totals.protein),
      totalCarbs: new Prisma.Decimal(totals.carbs),
      totalFat: new Prisma.Decimal(totals.fat),
    },
  });

  return serializeLog(log);
}

/**
 * Append items to an existing food log for the given date and meal type, or create a new one.
 * Used by the AI agent so multiple foods for the same meal merge into one log.
 * @param {string} userId - User ID
 * @param {{ mealType: string, items: Array, loggedAt?: Date|string }} params
 * @returns {Promise<Object>} Serialized food log
 * @throws {Error} If validation fails (mealType invalid, items invalid)
 */
export async function appendFoodLog(userId, { mealType, items, loggedAt }) {
  if (!mealType || !MEAL_TYPES.includes(mealType)) {
    throw new Error("mealType must be one of: breakfast, lunch, dinner, snack");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array");
  }
  for (const it of items) {
    if (!validateItem(it)) {
      throw new Error("Invalid item: requires fdcId, description, referenceGrams, grams, calories, protein, carbs, fat");
    }
  }

  let logDate = new Date();
  if (loggedAt) {
    const d = new Date(loggedAt);
    if (!isNaN(d.getTime())) logDate = d;
  }
  logDate.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(logDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });

  const existing = await prisma.foodLog.findFirst({
    where: {
      userId,
      mealType,
      loggedAt: { gte: logDate, lt: nextDay },
    },
  });

  if (existing) {
    const mergedItems = [...(existing.items ?? []), ...items];
    const totals = computeTotals(mergedItems);
    const log = await prisma.foodLog.update({
      where: { id: existing.id },
      data: {
        items: mergedItems,
        totalCal: new Prisma.Decimal(totals.cal),
        totalProtein: new Prisma.Decimal(totals.protein),
        totalCarbs: new Prisma.Decimal(totals.carbs),
        totalFat: new Prisma.Decimal(totals.fat),
      },
    });
    return serializeLog(log);
  }

  return createFoodLog(userId, { mealType, items, loggedAt });
}
