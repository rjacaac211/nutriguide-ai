import express from "express";
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function computeTotals(items) {
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

function validateItem(item) {
  if (!item || typeof item !== "object") return false;
  const { fdcId, description, referenceGrams, grams, calories, protein, carbs, fat } = item;
  if (fdcId == null || !description || referenceGrams == null || grams == null) return false;
  if (typeof grams !== "number" || grams <= 0) return false;
  return true;
}

function serializeLog(log) {
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
 * GET /api/users/:id/food-logs?date=YYYY-MM-DD
 */
router.get("/:id/food-logs", async (req, res) => {
  try {
    const userId = req.params.id;
    const dateStr = req.query.date;
    if (!dateStr) {
      return res.status(400).json({ error: "Query 'date' (YYYY-MM-DD) is required" });
    }
    const date = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const logs = await prisma.foodLog.findMany({
      where: {
        userId,
        loggedAt: { gte: date, lt: nextDay },
      },
      orderBy: { loggedAt: "asc" },
    });

    res.json({ logs: logs.map(serializeLog) });
  } catch (err) {
    console.error("Food logs fetch error:", err);
    res.status(500).json({ error: "Failed to fetch food logs" });
  }
});

/**
 * POST /api/users/:id/food-logs
 * Body: { mealType, items, loggedAt? }
 */
router.post("/:id/food-logs", async (req, res) => {
  try {
    const userId = req.params.id;
    const { mealType, items, loggedAt } = req.body;

    if (!mealType || !MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({ error: "mealType must be one of: breakfast, lunch, dinner, snack" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }
    for (const it of items) {
      if (!validateItem(it)) {
        return res.status(400).json({ error: "Invalid item: requires fdcId, description, referenceGrams, grams, calories, protein, carbs, fat" });
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

    res.status(201).json(serializeLog(log));
  } catch (err) {
    console.error("Food log create error:", err);
    res.status(500).json({ error: "Failed to create food log" });
  }
});

/**
 * PUT /api/users/:id/food-logs/:logId
 * Body: { mealType?, items? }
 */
router.put("/:id/food-logs/:logId", async (req, res) => {
  try {
    const userId = req.params.id;
    const logId = req.params.logId;
    const { mealType, items } = req.body;

    const existing = await prisma.foodLog.findFirst({
      where: { id: logId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Food log not found" });
    }

    const updates = {};
    if (mealType !== undefined) {
      if (!MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: "mealType must be one of: breakfast, lunch, dinner, snack" });
      }
      updates.mealType = mealType;
    }
    if (items !== undefined) {
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "items must be an array" });
      }
      for (const it of items) {
        if (!validateItem(it)) {
          return res.status(400).json({ error: "Invalid item" });
        }
      }
      const totals = computeTotals(items);
      updates.items = items;
      updates.totalCal = new Prisma.Decimal(totals.cal);
      updates.totalProtein = new Prisma.Decimal(totals.protein);
      updates.totalCarbs = new Prisma.Decimal(totals.carbs);
      updates.totalFat = new Prisma.Decimal(totals.fat);
    }

    const log = await prisma.foodLog.update({
      where: { id: logId },
      data: updates,
    });

    res.json(serializeLog(log));
  } catch (err) {
    console.error("Food log update error:", err);
    res.status(500).json({ error: "Failed to update food log" });
  }
});

/**
 * DELETE /api/users/:id/food-logs/:logId
 */
router.delete("/:id/food-logs/:logId", async (req, res) => {
  try {
    const userId = req.params.id;
    const logId = req.params.logId;

    const existing = await prisma.foodLog.findFirst({
      where: { id: logId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Food log not found" });
    }

    await prisma.foodLog.delete({ where: { id: logId } });
    res.status(204).send();
  } catch (err) {
    console.error("Food log delete error:", err);
    res.status(500).json({ error: "Failed to delete food log" });
  }
});

/**
 * PATCH /api/users/:id/food-logs/:logId/items/:itemIndex
 * Body: { grams?, calories?, protein?, carbs?, fat? } - or full item
 */
router.patch("/:id/food-logs/:logId/items/:itemIndex", async (req, res) => {
  try {
    const userId = req.params.id;
    const logId = req.params.logId;
    const itemIndex = parseInt(req.params.itemIndex, 10);

    const existing = await prisma.foodLog.findFirst({
      where: { id: logId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Food log not found" });
    }

    const items = [...(existing.items ?? [])];
    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(404).json({ error: "Item not found" });
    }

    const patch = req.body;
    const current = items[itemIndex];
    const updated = { ...current, ...patch };

    if (patch.grams != null) {
      const g = Number(patch.grams) || current.grams;
      const ratio = g / (current.grams || 1);
      updated.grams = g;
      updated.calories = Math.round((current.calories ?? 0) * ratio * 10) / 10;
      updated.protein = Math.round((current.protein ?? 0) * ratio * 10) / 10;
      updated.carbs = Math.round((current.carbs ?? 0) * ratio * 10) / 10;
      updated.fat = Math.round((current.fat ?? 0) * ratio * 10) / 10;
    }

    items[itemIndex] = updated;
    const totals = computeTotals(items);

    const log = await prisma.foodLog.update({
      where: { id: logId },
      data: {
        items,
        totalCal: new Prisma.Decimal(totals.cal),
        totalProtein: new Prisma.Decimal(totals.protein),
        totalCarbs: new Prisma.Decimal(totals.carbs),
        totalFat: new Prisma.Decimal(totals.fat),
      },
    });

    res.json(serializeLog(log));
  } catch (err) {
    console.error("Food log item update error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * DELETE /api/users/:id/food-logs/:logId/items/:itemIndex
 */
router.delete("/:id/food-logs/:logId/items/:itemIndex", async (req, res) => {
  try {
    const userId = req.params.id;
    const logId = req.params.logId;
    const itemIndex = parseInt(req.params.itemIndex, 10);

    const existing = await prisma.foodLog.findFirst({
      where: { id: logId, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Food log not found" });
    }

    const items = [...(existing.items ?? [])];
    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(404).json({ error: "Item not found" });
    }

    items.splice(itemIndex, 1);
    const totals = computeTotals(items);

    if (items.length === 0) {
      await prisma.foodLog.delete({ where: { id: logId } });
      return res.status(204).send();
    }

    await prisma.foodLog.update({
      where: { id: logId },
      data: {
        items,
        totalCal: new Prisma.Decimal(totals.cal),
        totalProtein: new Prisma.Decimal(totals.protein),
        totalCarbs: new Prisma.Decimal(totals.carbs),
        totalFat: new Prisma.Decimal(totals.fat),
      },
    });

    res.status(204).send();
  } catch (err) {
    console.error("Food log item delete error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
