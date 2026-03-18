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
      x.nutrient?.number === nutrientId
  );
  return (n?.amount ?? n?.value) ?? 0;
}

function extractPer100g(food) {
  const nutrients = food.foodNutrients ?? [];
  return {
    calories: getNutrient(nutrients, NUTRIENT_IDS.CALORIES),
    protein: getNutrient(nutrients, NUTRIENT_IDS.PROTEIN),
    carbs: getNutrient(nutrients, NUTRIENT_IDS.CARBS),
    fat: getNutrient(nutrients, NUTRIENT_IDS.FAT),
  };
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
