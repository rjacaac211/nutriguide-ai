/**
 * Weight log service - CRUD and current-weight resolution.
 * WeightLog is the source of truth for "current weight"; profile.weightKg is synced when latest.
 */

import { prisma } from "../db.js";

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/**
 * Sync profile.weightKg to the latest WeightLog (or null if none).
 * Keeps profile aligned with the most recent weight for consistency.
 * @param {string} userId
 */
async function syncProfileWeight(userId) {
  const latest = await prisma.weightLog.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { weightKg: true },
  });
  await prisma.profile.updateMany({
    where: { userId },
    data: { weightKg: latest ? latest.weightKg : null },
  });
}

/**
 * Get current weight: latest WeightLog if any, else profile.weightKg.
 * @param {string} userId
 * @returns {Promise<number|null>}
 */
export async function getCurrentWeight(userId) {
  const latest = await prisma.weightLog.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { weightKg: true },
  });
  if (latest) return toNum(latest.weightKg);

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { weightKg: true },
  });
  return profile ? toNum(profile.weightKg) : null;
}

/**
 * List weight logs in date range.
 * @param {string} userId
 * @param {Date} from
 * @param {Date} to
 * @returns {Promise<Object[]>}
 */
export async function listWeightLogs(userId, from, to) {
  const logs = await prisma.weightLog.findMany({
    where: {
      userId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "desc" },
  });
  return logs.map(serializeWeightLog);
}

/**
 * Create or replace weight log for a given date (one per day).
 * @param {string} userId
 * @param {{ weightKg: number, date: string|Date, notes?: string }}
 * @returns {Promise<Object>}
 */
export async function createWeightLog(userId, { weightKg, date, notes }) {
  const w = parseFloat(weightKg);
  if (isNaN(w) || w <= 0) {
    throw new Error("weightKg must be a positive number");
  }

  // Parse YYYY-MM-DD as UTC to avoid server timezone shifting the date
  const dateStr = String(date).split("T")[0];
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error("date must be a valid date (YYYY-MM-DD)");
  }
  const [year, month, day] = parts;
  const dateObj = new Date(Date.UTC(year, month - 1, day));

  const log = await prisma.weightLog.upsert({
    where: {
      userId_date: { userId, date: dateObj },
    },
    create: {
      userId,
      weightKg: w,
      date: dateObj,
      notes: notes?.trim() || null,
    },
    update: {
      weightKg: w,
      notes: notes?.trim() || null,
    },
  });
  await syncProfileWeight(userId);
  return serializeWeightLog(log);
}

/**
 * Update a weight log by id.
 * @param {string} userId
 * @param {string} logId
 * @param {{ weightKg?: number, notes?: string }}
 * @returns {Promise<Object>}
 */
export async function updateWeightLog(userId, logId, { weightKg, notes }) {
  const existing = await prisma.weightLog.findFirst({
    where: { id: logId, userId },
  });
  if (!existing) return null;

  const updates = {};
  if (weightKg != null) {
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) {
      throw new Error("weightKg must be a positive number");
    }
    updates.weightKg = w;
  }
  if (notes !== undefined) {
    updates.notes = notes?.trim() || null;
  }

  const log = await prisma.weightLog.update({
    where: { id: logId },
    data: updates,
  });
  await syncProfileWeight(userId);
  return serializeWeightLog(log);
}

/**
 * Delete a weight log by id.
 * @param {string} userId
 * @param {string} logId
 * @returns {Promise<boolean>} true if deleted
 */
export async function deleteWeightLog(userId, logId) {
  const result = await prisma.weightLog.deleteMany({
    where: { id: logId, userId },
  });
  if (result.count > 0) {
    await syncProfileWeight(userId);
    return true;
  }
  return false;
}

/**
 * Serialize a WeightLog for API response.
 * @param {Object} log - Prisma WeightLog
 * @returns {Object}
 */
export function serializeWeightLog(log) {
  return {
    id: log.id,
    weightKg: toNum(log.weightKg),
    date: log.date instanceof Date ? log.date.toISOString().slice(0, 10) : log.date,
    loggedAt: log.loggedAt,
    notes: log.notes ?? null,
  };
}
