import express from "express";
import { searchFoods, getFoodDetails } from "../services/fdc.js";

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

/**
 * GET /api/foods/:fdcId
 * Fetches full food details including portions (cups, servings, etc.).
 */
router.get("/:fdcId", async (req, res) => {
  try {
    const fdcId = parseInt(req.params.fdcId, 10);
    if (isNaN(fdcId) || fdcId <= 0) {
      return res.status(400).json({ error: "Invalid fdcId" });
    }
    const food = await getFoodDetails(fdcId);
    if (!food) {
      return res.status(404).json({ error: "Food not found" });
    }
    res.json(food);
  } catch (err) {
    console.error("Food details error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch food details" });
  }
});

export default router;
