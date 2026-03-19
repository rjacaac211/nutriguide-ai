/**
 * USDA FoodData Central API proxy service.
 * https://fdc.nal.usda.gov/api-guide
 */

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

// Nutrient IDs: https://fdc.nal.usda.gov/api-spec/fdc_api.html
const NUTRIENT_IDS = {
  CALORIES: 208,
  PROTEIN: 203,
  CARBS: 205,
  FAT: 204,
};

function getNutrient(foodNutrients, nutrientId) {
  if (!Array.isArray(foodNutrients)) return 0;
  const n = foodNutrients.find(
    (x) =>
      x.nutrientId === nutrientId ||
      Number(x.nutrientNumber) === nutrientId ||
      String(x.nutrientNumber) === String(nutrientId) ||
      x.number === nutrientId ||
      x.nutrient?.number === nutrientId ||
      Number(x.nutrient?.number) === nutrientId ||
      String(x.nutrient?.number) === String(nutrientId)
  );
  return (n?.amount ?? n?.value) ?? 0;
}

function extractPer100g(food) {
  const nutrients = food.foodNutrients ?? [];
  const per100g = {
    calories: getNutrient(nutrients, NUTRIENT_IDS.CALORIES),
    protein: getNutrient(nutrients, NUTRIENT_IDS.PROTEIN),
    carbs: getNutrient(nutrients, NUTRIENT_IDS.CARBS),
    fat: getNutrient(nutrients, NUTRIENT_IDS.FAT),
  };

  // Fallback: Branded foods with empty foodNutrients but populated labelNutrients
  const allZero = per100g.calories === 0 && per100g.protein === 0 && per100g.carbs === 0 && per100g.fat === 0;
  const label = food.labelNutrients;
  const servingVal = Number(food.servingSize);
  const unit = (food.servingSizeUnit ?? "g").toLowerCase();

  if (allZero && label && servingVal > 0 && !isNaN(servingVal)) {
    const gramWeight = unit === "g" ? servingVal : unit === "oz" ? servingVal * 28.35 : servingVal;
    return {
      calories: ((label.calories?.value ?? 0) * 100) / gramWeight,
      protein: ((label.protein?.value ?? 0) * 100) / gramWeight,
      carbs: ((label.carbohydrates?.value ?? 0) * 100) / gramWeight,
      fat: ((label.fat?.value ?? 0) * 100) / gramWeight,
    };
  }

  return per100g;
}

/**
 * Build portions array from FDC food (Foundation/Survey foodPortions or Branded servingSize).
 */
function buildPortions(food) {
  const portions = [];
  const dataType = food.dataType ?? "";

  // Foundation/Survey: use foodPortions
  const foodPortions = food.foodPortions ?? [];
  for (const p of foodPortions) {
    const gramWeight = Number(p.gramWeight);
    if (gramWeight <= 0 || isNaN(gramWeight)) continue;
    const amount = Number(p.amount) || 1;
    const measureUnit = p.measureUnit ?? {};
    const baseDesc = p.portionDescription ?? `${amount} ${measureUnit?.name ?? measureUnit?.abbreviation ?? "portion"}`;
    portions.push({
      amount,
      gramWeight,
      portionDescription: `${baseDesc} (${Math.round(gramWeight)}g)`,
      measureUnit: {
        id: measureUnit.id,
        abbreviation: (measureUnit.abbreviation ?? "").toLowerCase(),
        name: (measureUnit.name ?? "").toLowerCase(),
      },
    });
  }

  // Branded: add serving as synthetic portion
  if (dataType === "Branded" && food.servingSize != null) {
    const servingVal = Number(food.servingSize);
    const unit = (food.servingSizeUnit ?? "g").toLowerCase();
    if (servingVal > 0 && !isNaN(servingVal)) {
      const gramWeight = unit === "g" ? servingVal : unit === "oz" ? servingVal * 28.35 : servingVal;
      const unitDisplay = unit === "g" ? `${Math.round(servingVal)}g` : `${servingVal} ${unit}`;
      const desc = food.householdServingFullText
        ? `${food.householdServingFullText} (${unitDisplay})`
        : `1 serving (${unitDisplay})`;
      portions.push({
        amount: 1,
        gramWeight,
        portionDescription: desc,
        measureUnit: { id: null, abbreviation: "serving", name: "serving" },
      });
    }
  }

  return portions;
}

/**
 * Normalize FDC food to our format.
 * - Foundation/SR Legacy/Survey: nutrients are per 100g
 * - Branded: may have servingSize in g; otherwise use 100g as reference
 */
function normalizeFood(food) {
  const dataType = food.dataType ?? "";
  const per100g = extractPer100g(food);

  let referenceGrams = 100;
  if (dataType === "Branded" && food.servingSize != null && food.servingSizeUnit?.toLowerCase() === "g") {
    referenceGrams = Number(food.servingSize);
  }
  // For branded with oz/cup etc., keep 100g as reference (simplest approach)

  return {
    fdcId: food.fdcId,
    description: food.description ?? "",
    brandOwner: food.brandOwner ?? null,
    referenceGrams,
    per100g,
  };
}

/**
 * Normalize FDC food with portions (for full food response from GET /food/:fdcId).
 */
function normalizeFoodWithPortions(food) {
  const base = normalizeFood(food);
  base.portions = buildPortions(food);
  return base;
}

// Unit aliases for matching (normalized to canonical key)
const UNIT_ALIASES = {
  g: ["g", "gram", "grams", "gr"],
  cup: ["cup", "cups"],
  serving: ["serving", "servings", "serv"],
  oz: ["oz", "ounce", "ounces"],
  tbsp: ["tbsp", "tablespoon", "tablespoons", "tb"],
  tsp: ["tsp", "teaspoon", "teaspoons"],
  piece: ["piece", "pieces", "pc", "pcs"],
  slice: ["slice", "slices"],
  ml: ["ml", "milliliter", "milliliters"],
};

function normalizeUnitForMatch(unit) {
  const u = String(unit || "").toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
    if (aliases.includes(u)) return canonical;
  }
  return u;
}

/**
 * Convert amount + unit to grams using food's portions.
 * @param {Object} food - Normalized food with portions
 * @param {number} amount - User-entered amount
 * @param {string} unit - Unit (g, cup, serving, oz, tbsp, tsp, piece, slice, etc.)
 * @returns {{ grams: number, portionDescription?: string, portionAmount?: number } | null}
 */
export function convertToGrams(food, amount, unit) {
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) return null;

  const u = normalizeUnitForMatch(unit);
  if (u === "g") {
    return { grams: amt };
  }

  const portions = food.portions ?? [];
  for (const p of portions) {
    const desc = (p.portionDescription ?? "").toLowerCase();
    const abbrev = (p.measureUnit?.abbreviation ?? "").toLowerCase();
    const name = (p.measureUnit?.name ?? "").toLowerCase();

    const matches =
      desc.includes(u) ||
      abbrev === u ||
      name === u ||
      (u === "serving" && (desc.includes("serving") || abbrev === "serving" || name === "serving")) ||
      (u === "cup" && (desc.includes("cup") || abbrev === "cup" || name === "cup")) ||
      (u === "oz" && (desc.includes("oz") || desc.includes("ounce") || abbrev === "oz")) ||
      (u === "tbsp" && (desc.includes("tablespoon") || desc.includes("tbsp") || abbrev === "tb")) ||
      (u === "tsp" && (desc.includes("teaspoon") || desc.includes("tsp")));

    if (matches) {
      const grams = amt * p.gramWeight;
      return {
        grams,
        portionDescription: p.portionDescription,
        portionAmount: amt,
      };
    }
  }

  return null;
}

/**
 * Search foods via FDC API.
 * @param {string} query - Search terms
 * @param {number} pageSize - Max results (default 25)
 * @returns {Promise<Array>} Normalized food items
 */
export async function searchFoods(query, pageSize = 25) {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_FDC_API_KEY is not configured");
  }

  const url = `${FDC_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: String(query).trim(),
      pageSize: Math.min(Math.max(1, pageSize), 50),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FDC API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const foods = data.foods ?? [];
  return foods.map(normalizeFood);
}

/**
 * Fetch food details by FDC ID (for full nutrient data if search returns abridged).
 * @param {number} fdcId - FDC food ID
 * @returns {Promise<Object>} Normalized food
 */
export async function getFoodById(fdcId) {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_FDC_API_KEY is not configured");
  }

  const url = `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text();
    throw new Error(`FDC API error: ${res.status} ${text}`);
  }

  const food = await res.json();
  return normalizeFood(food);
}

/**
 * Fetch full food details by FDC ID including portions (foodPortions, servingSize).
 * Use this when the user needs to select a unit (cups, servings, etc.).
 * @param {number} fdcId - FDC food ID
 * @returns {Promise<Object|null>} Normalized food with portions array, or null if not found
 */
export async function getFoodDetails(fdcId) {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_FDC_API_KEY is not configured");
  }

  const url = `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) return null;
    const text = await res.text();
    throw new Error(`FDC API error: ${res.status} ${text}`);
  }

  const food = await res.json();
  return normalizeFoodWithPortions(food);
}
