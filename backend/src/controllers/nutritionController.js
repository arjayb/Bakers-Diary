const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { resolveIngredient, calculateRecipeNutrition } = require('../services/nutritionProvider');

// @route GET /api/recipes/:id/nutrition
// §20/§21: resolves any ingredient that hasn't been resolved yet (persisting
// the match so it isn't re-queried on every page load), then computes
// deterministic per-serving nutrition from stored per-100g values.
const getRecipeNutrition = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { ingredients: true, nutritionResolutions: true },
  });
  if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

  const resolvedNames = new Set(recipe.nutritionResolutions.map((r) => r.ingredientName));
  const toResolve = recipe.ingredients.filter((i) => !resolvedNames.has(i.name));

  for (const ingredient of toResolve) {
    const result = await resolveIngredient(ingredient.name);
    await prisma.nutritionResolution.upsert({
      where: { recipeId_ingredientName: { recipeId: recipe.id, ingredientName: ingredient.name } },
      create: { recipeId: recipe.id, ingredientName: ingredient.name, ...result },
      update: { ...result },
    });
  }

  const resolutions = await prisma.nutritionResolution.findMany({ where: { recipeId: recipe.id } });
  const calculation = calculateRecipeNutrition(recipe.ingredients, resolutions, recipe.servings || 1);

  res.json({
    success: true,
    recipe: { id: recipe.id, title: recipe.title, servings: recipe.servings || 1 },
    resolutions,
    ...calculation,
    sourceNotice: 'Nutrition is calculated using USDA food composition data where matched, with Open Food Facts as a supplementary source for branded items. Values are approximate.',
  });
});

// @route PATCH /api/recipes/:id/nutrition/:ingredientName/rematch
// §21: "Change Match" — lets Chef Kats override an uncertain/wrong match by
// re-resolving, or by manually setting a provider match. For v0.1 this
// simply re-runs resolution (a fresh search) rather than offering a full
// search-and-pick UI, which is deferred (see handoff DEFERRED section).
const rematchIngredient = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

  const ingredientName = decodeURIComponent(req.params.ingredientName);
  const result = await resolveIngredient(ingredientName);

  const resolution = await prisma.nutritionResolution.upsert({
    where: { recipeId_ingredientName: { recipeId: recipe.id, ingredientName } },
    create: { recipeId: recipe.id, ingredientName, ...result },
    update: { ...result },
  });

  res.json({ success: true, resolution });
});

module.exports = { getRecipeNutrition, rematchIngredient };
