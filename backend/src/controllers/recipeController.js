const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const RECIPE_INCLUDE = {
  ingredients: { orderBy: { order: 'asc' } },
  steps: { orderBy: { order: 'asc' } },
  coverImage: true,
};

// @route GET /api/recipes
const getRecipes = asyncHandler(async (req, res) => {
  const where = { userId: req.user.id };
  if (req.query.favorite === 'true') where.favorite = true;
  if (req.query.status) where.status = req.query.status;

  const recipes = await prisma.recipe.findMany({
    where,
    include: { coverImage: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, count: recipes.length, recipes });
});

// @route GET /api/recipes/:id
const getRecipeById = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: RECIPE_INCLUDE,
  });
  if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });
  res.json({ success: true, recipe });
});

// @route POST /api/recipes
// §11: guided creation flow (Basics -> Ingredients -> Method -> Review ->
// Save), but "not a hard lock" — this single endpoint accepts a full recipe
// payload (basics + ingredients[] + steps[]) so the frontend can call it
// once at final Save, or incrementally via PATCH while drafting. `status`
// defaults to draft so "Save Draft" mid-flow is just this same endpoint
// with status left as draft.
const createRecipe = asyncHandler(async (req, res) => {
  const { title, description, category, yield: recipeYield, servings, prepTimeMin, cookTimeMin, status, ingredients = [], steps = [], coverImageId } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: 'A recipe needs a title.' });
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId: req.user.id,
      title: title.trim(),
      description,
      category,
      yield: recipeYield,
      servings: servings ? Number(servings) : null,
      prepTimeMin: prepTimeMin ? Number(prepTimeMin) : null,
      cookTimeMin: cookTimeMin ? Number(cookTimeMin) : null,
      status: status === 'published' ? 'published' : 'draft',
      coverImageId: coverImageId || null,
      ingredients: {
        create: ingredients.map((i, idx) => ({
          name: i.name,
          quantity: Number(i.quantity),
          unit: i.unit,
          note: i.note || null,
          order: i.order ?? idx,
        })),
      },
      steps: {
        create: steps.map((s, idx) => ({
          instruction: s.instruction,
          timerSeconds: s.timerSeconds ? Number(s.timerSeconds) : null,
          referenceImageId: s.referenceImageId || null,
          order: s.order ?? idx,
        })),
      },
    },
    include: RECIPE_INCLUDE,
  });

  res.status(201).json({ success: true, recipe });
});

// @route PATCH /api/recipes/:id
// §11: "Existing recipes must subsequently be editable." Full-replace
// semantics for ingredients/steps when those arrays are provided (delete
// then recreate, inside one transaction) — simpler and less error-prone
// than diffing individual rows for a single-user v0.1, at the cost of
// regenerating ids for ingredient/step rows on every edit. Documented as a
// deliberate simplicity tradeoff, not an oversight.
const updateRecipe = asyncHandler(async (req, res) => {
  const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Recipe not found' });

  const { title, description, category, yield: recipeYield, servings, prepTimeMin, cookTimeMin, status, favorite, ingredients, steps, coverImageId } = req.body;

  const recipe = await prisma.$transaction(async (tx) => {
    if (ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
    }
    let preserveHistoricalSteps = false;

    if (steps) {
      const sessionCount = await tx.cookingSession.count({
        where: { recipeId: existing.id }
      });

      if (sessionCount > 0) {
        const existingSteps = await tx.recipeStep.findMany({
          where: { recipeId: existing.id },
          orderBy: { order: 'asc' }
        });

        if (steps.length !== existingSteps.length) {
          throw Object.assign(
            new Error(
              'This recipe has bake history. Existing Method steps may be edited, but steps cannot be added or removed.'
            ),
            { status: 409 }
          );
        }

        for (let idx = 0; idx < existingSteps.length; idx++) {
          const incoming = steps[idx];
          const current = existingSteps[idx];
          const incomingOrder = incoming.order ?? idx;

          if (Number(incomingOrder) !== Number(current.order)) {
            throw Object.assign(
              new Error(
                'This recipe has bake history. Existing Method steps cannot be reordered.'
              ),
              { status: 409 }
            );
          }

          await tx.recipeStep.update({
            where: { id: current.id },
            data: {
              instruction: incoming.instruction,
              timerSeconds:
                incoming.timerSeconds !== null &&
                incoming.timerSeconds !== undefined &&
                incoming.timerSeconds !== ''
                  ? Number(incoming.timerSeconds)
                  : null
            }
          });
        }

        preserveHistoricalSteps = true;
      } else {
        await tx.recipeStep.deleteMany({
          where: { recipeId: existing.id }
        });
      }
    }

    return tx.recipe.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(recipeYield !== undefined && { yield: recipeYield }),
        ...(servings !== undefined && { servings: servings ? Number(servings) : null }),
        ...(prepTimeMin !== undefined && { prepTimeMin: prepTimeMin ? Number(prepTimeMin) : null }),
        ...(cookTimeMin !== undefined && { cookTimeMin: cookTimeMin ? Number(cookTimeMin) : null }),
        ...(status !== undefined && { status }),
        ...(favorite !== undefined && { favorite: Boolean(favorite) }),
        ...(coverImageId !== undefined && { coverImageId }),
        ...(ingredients && {
          ingredients: { create: ingredients.map((i, idx) => ({ name: i.name, quantity: Number(i.quantity), unit: i.unit, note: i.note || null, order: i.order ?? idx })) },
        }),
        ...(steps && !preserveHistoricalSteps && {
          steps: { create: steps.map((s, idx) => ({ instruction: s.instruction, timerSeconds: s.timerSeconds ? Number(s.timerSeconds) : null, referenceImageId: s.referenceImageId || null, order: s.order ?? idx })) },
        }),
      },
      include: RECIPE_INCLUDE,
    });
  });

  res.json({ success: true, recipe });
});

// @route DELETE /api/recipes/:id
const deleteRecipe = asyncHandler(async (req, res) => {
  const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Recipe not found' });

  const sessionCount = await prisma.cookingSession.count({ where: { recipeId: existing.id } });
  if (sessionCount > 0) {
    return res.status(409).json({
      success: false,
      message: `This recipe has ${sessionCount} bake${sessionCount === 1 ? '' : 's'} in your Journal. Deleting it would delete that history too — not allowed in v0.1.`,
    });
  }

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } }),
    prisma.recipeStep.deleteMany({ where: { recipeId: existing.id } }),
    prisma.nutritionResolution.deleteMany({ where: { recipeId: existing.id } }),
    prisma.recipe.delete({ where: { id: existing.id } }),
  ]);

  res.json({ success: true, message: 'Recipe deleted' });
});

module.exports = { getRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe };
