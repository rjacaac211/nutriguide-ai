import express from "express";
import {
  listWeightLogs,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog,
} from "../services/weightLogs.js";

const router = express.Router();

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/users/:id/weight-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 * List weight logs in date range. Default: last 30 days.
 */
router.get("/:id/weight-logs", async (req, res) => {
  try {
    const userId = req.params.id;
    const fromStr = req.query.from;
    const toStr = req.query.to;

    let from;
    let to;
    if (fromStr && toStr) {
      from = parseDate(fromStr);
      to = parseDate(toStr);
      if (!from || !to) {
        return res.status(400).json({ error: "from and to must be valid dates (YYYY-MM-DD)" });
      }
      if (from > to) {
        return res.status(400).json({ error: "from must be before or equal to to" });
      }
    } else {
      to = new Date();
      from = new Date();
      from.setDate(from.getDate() - 30);
    }

    const logs = await listWeightLogs(userId, from, to);
    res.json({ logs });
  } catch (err) {
    console.error("Weight logs fetch error:", err);
    res.status(500).json({ error: "Failed to fetch weight logs" });
  }
});

/**
 * POST /api/users/:id/weight-logs
 * Body: { weightKg, date, notes? }
 * Create or replace log for given date (one per day).
 */
router.post("/:id/weight-logs", async (req, res) => {
  try {
    const userId = req.params.id;
    const { weightKg, date, notes } = req.body;

    if (weightKg == null || date == null) {
      return res.status(400).json({ error: "weightKg and date are required" });
    }

    const log = await createWeightLog(userId, { weightKg, date, notes });
    res.status(201).json(log);
  } catch (err) {
    if (err.message?.includes("weightKg") || err.message?.includes("date")) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Weight log create error:", err);
    res.status(500).json({ error: "Failed to create weight log" });
  }
});

/**
 * PUT /api/users/:id/weight-logs/:logId
 * Body: { weightKg?, notes? }
 */
router.put("/:id/weight-logs/:logId", async (req, res) => {
  try {
    const userId = req.params.id;
    const logId = req.params.logId;
    const { weightKg, notes } = req.body;

    const log = await updateWeightLog(userId, logId, { weightKg, notes });
    if (!log) {
      return res.status(404).json({ error: "Weight log not found" });
    }
    res.json(log);
  } catch (err) {
    if (err.message?.includes("weightKg")) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Weight log update error:", err);
    res.status(500).json({ error: "Failed to update weight log" });
  }
});

/**
 * DELETE /api/users/:id/weight-logs/:logId
 */
router.delete("/:id/weight-logs/:logId", async (req, res) => {
  try {
    const userId = req.params.id;
    const logId = req.params.logId;

    const deleted = await deleteWeightLog(userId, logId);
    if (!deleted) {
      return res.status(404).json({ error: "Weight log not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Weight log delete error:", err);
    res.status(500).json({ error: "Failed to delete weight log" });
  }
});

export default router;
