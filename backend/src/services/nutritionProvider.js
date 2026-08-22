// Nutrition provider abstraction (Â§20). Two adapters behind one interface so
// UI code never imports 'usda' or 'openfoodfacts' directly â€” it only calls
// resolveIngredient() and gets back a normalized shape or `unmatched`.
//
// Â§20 is explicit: "Do not ask an LLM to invent nutritional values." Nothing
// in this file or its callers generates a nutrition number â€” every value
// either comes from a provider response or is arithmetic on provider
// values (see calculateRecipeNutrition below).

const fetch = require('node-fetch');

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

// USDA FoodData Central nutrient IDs we care about (per 100g basis, which is
// how FDC reports foundation/SR-legacy foods).
const USDA_NUTRIENT_IDS = {
  calories: 1008, protein: 1003, fat: 1004, carbs: 1005,
  fiber: 1079, sugar: 2000, sodium: 1093, satFat: 1258, cholesterol: 1253,
};

function extractUsdaNutrient(food, nutrientId) {
  const hit = (food.foodNutrients || []).find((n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId);
  return hit ? (hit.value ?? hit.amount ?? null) : null;
}

/**
 * Queries USDA FoodData Central for the best textual match. Returns a
 * normalized-per-100g shape, or null if unmatched/unavailable. Never
 * throws for "no results" â€” only for actual network/config failure, which
 * callers treat the same as "provider unavailable" (Â§20 UX failure state).
 */
async function searchUsda(query) {
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey || apiKey === 'replace-me') {
    return { unavailable: true, reason: 'USDA_FDC_API_KEY is not configured.' };
  }

  const url = `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=1&dataType=Foundation,SR%20Legacy`;
  const response = await fetch(url);
  if (!response.ok) {
    return { unavailable: true, reason: `USDA API returned ${response.status}` };
  }
  const data = await response.json();
  const food = data.foods?.[0];
  if (!food) return null;

  return {
    provider: 'usda',
    providerFoodId: String(food.fdcId),
    matchedLabel: food.description,
    caloriesPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.calories),
    proteinPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.protein),
    fatPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.fat),
    carbsPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.carbs),
    fiberPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.fiber),
    sugarPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.sugar),
    sodiumMgPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.sodium),
    satFatPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.satFat),
    cholesterolMgPer100g: extractUsdaNutrient(food, USDA_NUTRIENT_IDS.cholesterol),
  };
}

/**
 * Open Food Facts â€” supplementary, for branded products (Â§22). No API key
 * required. Used as fallback when USDA has no match, and as the intended
 * path for a future barcode flow (architecture only in v0.1 â€” see Â§22).
 */
async function searchOpenFoodFacts(query) {
  const url = `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=1`;
  const response = await fetch(url);
  if (!response.ok) {
    return { unavailable: true, reason: `Open Food Facts returned ${response.status}` };
  }
  const data = await response.json();
  const product = data.products?.[0];
  if (!product || !product.nutriments) return null;

  // Conservative semantic guard:
  // Open Food Facts search ranking alone is not enough evidence that the
  // returned product represents the requested ingredient.
  const normalizeMatchText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

  const queryText = normalizeMatchText(query);
  const labelText = normalizeMatchText(product.product_name || '');

  const queryTokens = queryText
    .split(' ')
    .filter(Boolean);

  const semanticMatch =
    queryText.length > 0 &&
    labelText.length > 0 &&
    (
      labelText.includes(queryText) ||
      queryTokens.every((token) => labelText.split(' ').includes(token))
    );

  if (!semanticMatch) return null;

  const n = product.nutriments;
  return {
    provider: 'openfoodfacts',
    providerFoodId: product.code,
    matchedLabel: product.product_name || query,
    caloriesPer100g: n['energy-kcal_100g'] ?? null,
    proteinPer100g: n.proteins_100g ?? null,
    fatPer100g: n.fat_100g ?? null,
    carbsPer100g: n.carbohydrates_100g ?? null,
    fiberPer100g: n.fiber_100g ?? null,
    sugarPer100g: n.sugars_100g ?? null,
    sodiumMgPer100g: n.sodium_100g != null ? n.sodium_100g * 1000 : null,
    satFatPer100g: n['saturated-fat_100g'] ?? null,
    cholesterolMgPer100g: n.cholesterol_100g != null ? n.cholesterol_100g * 1000 : null,
  };
}

/**
 * Resolves one ingredient name to a normalized nutrition match, trying USDA
 * first then Open Food Facts (Â§20 primary + Â§22 supplementary). Returns
 * { provider: 'unmatched', matchedLabel: null, ... } â€” never throws for a
 * legitimate "nothing found," so callers can persist and display an
 * unmatched state honestly (Â§21) instead of erroring the whole recipe.
 */
async function resolveIngredient(ingredientName) {
  try {
    const usdaResult = await searchUsda(ingredientName);
    if (usdaResult && !usdaResult.unavailable) return usdaResult;

    const offResult = await searchOpenFoodFacts(ingredientName);
    if (offResult && !offResult.unavailable) return offResult;

    return {
      provider: 'unmatched',
      providerFoodId: null,
      matchedLabel: null,
      caloriesPer100g: null, proteinPer100g: null, fatPer100g: null, carbsPer100g: null,
      fiberPer100g: null, sugarPer100g: null, sodiumMgPer100g: null, satFatPer100g: null, cholesterolMgPer100g: null,
      unavailableReason: usdaResult?.reason || offResult?.reason || 'No match found.',
    };
  } catch (err) {
    return {
      provider: 'unmatched',
      providerFoodId: null,
      matchedLabel: null,
      caloriesPer100g: null, proteinPer100g: null, fatPer100g: null, carbsPer100g: null,
      fiberPer100g: null, sugarPer100g: null, sodiumMgPer100g: null, satFatPer100g: null, cholesterolMgPer100g: null,
      unavailableReason: `Nutrition provider error: ${err.message}`,
    };
  }
}

// --- Deterministic quantity/serving math (Â§20 diagram) ---------------------
// Ingredient quantity -> grams -> scale per-100g values -> sum -> Ã· servings.
// Pure arithmetic on provider-supplied numbers. No estimation, no LLM call.

const { convert, isWeightUnit, isVolumeUnit } = require('./conversionService');

function ingredientGrams(ingredient) {
  if (isWeightUnit(ingredient.unit)) {
    return convert({ value: ingredient.quantity, fromUnit: ingredient.unit, toUnit: 'g' }).value;
  }
  if (isVolumeUnit(ingredient.unit)) {
    try {
      return convert({ value: ingredient.quantity, fromUnit: ingredient.unit, toUnit: 'g', ingredientName: ingredient.name }).value;
    } catch {
      return null; // no density known â€” this ingredient can't be weighed, so it's excluded from totals, not guessed
    }
  }
  return null; // 'piece'/'pinch' units have no reliable gram equivalent without more data
}

/**
 * calculateRecipeNutrition(ingredients, resolutions, servings)
 * ingredients: RecipeIngredient[] ; resolutions: NutritionResolution[] keyed
 * by ingredientName ; servings: number
 *
 * Returns { totals: {...}, perServing: {...}, unmatchedIngredients: string[],
 * excludedIngredients: string[] } â€” excluded = matched nutritionally but no
 * gram equivalent could be computed (e.g. "2 pieces eggs" without a
 * per-piece weight), so it's left out of totals rather than guessed.
 */
function calculateRecipeNutrition(ingredients, resolutions, servings) {
  const resolutionByName = new Map(resolutions.map((r) => [r.ingredientName, r]));
  const fields = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'sodiumMg', 'satFat', 'cholesterolMg'];
  const totals = Object.fromEntries(fields.map((f) => [f, 0]));

  const unmatchedIngredients = [];
  const excludedIngredients = [];

  for (const ing of ingredients) {
    const resolution = resolutionByName.get(ing.name);
    if (!resolution || resolution.provider === 'unmatched') {
      unmatchedIngredients.push(ing.name);
      continue;
    }
    const grams = ingredientGrams(ing);
    if (grams === null) {
      excludedIngredients.push(ing.name);
      continue;
    }
    const factor = grams / 100;
    totals.calories += (resolution.caloriesPer100g || 0) * factor;
    totals.protein += (resolution.proteinPer100g || 0) * factor;
    totals.fat += (resolution.fatPer100g || 0) * factor;
    totals.carbs += (resolution.carbsPer100g || 0) * factor;
    totals.fiber += (resolution.fiberPer100g || 0) * factor;
    totals.sugar += (resolution.sugarPer100g || 0) * factor;
    totals.sodiumMg += (resolution.sodiumMgPer100g || 0) * factor;
    totals.satFat += (resolution.satFatPer100g || 0) * factor;
    totals.cholesterolMg += (resolution.cholesterolMgPer100g || 0) * factor;
  }

  const round = (n) => Math.round(n * 10) / 10;
  Object.keys(totals).forEach((k) => { totals[k] = round(totals[k]); });

  const safeServings = servings && servings > 0 ? servings : 1;
  const perServing = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round(v / safeServings)]));

  return { totals, perServing, unmatchedIngredients, excludedIngredients };
}

module.exports = { resolveIngredient, calculateRecipeNutrition };
