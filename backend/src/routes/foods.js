import express from "express";
import { searchFoods } from "../services/fdc.js";

const router = express.Router();

/**
 * GET /api/foods/search?q=cheddar&limit=25
 * Proxies to USDA FoodData Central search.
 */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 25), 50);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Query 'q' must be at least 2 characters" });
    }

    const foods = await searchFoods(q, limit);
    res.json({ foods });
  } catch (err) {
    console.error("Food search error:", err);
    res.status(500).json({ error: err.message || "Food search failed" });
  }
});

export default router;
