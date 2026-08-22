const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// @route GET /api/groceries
const getGroceryItems = asyncHandler(async (req, res) => {
  const items = await prisma.groceryItem.findMany({
    where: { userId: req.user.id },
    orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, count: items.length, items });
});

// @route POST /api/groceries   { label, quantity? }  — manual add
const addGroceryItem = asyncHandler(async (req, res) => {
  const { label, quantity } = req.body;
  if (!label || !String(label).trim()) {
    return res.status(400).json({ success: false, message: 'Enter what to add to the list.' });
  }
  const item = await prisma.groceryItem.create({
    data: { userId: req.user.id, label: label.trim(), quantity: quantity || null },
  });
  res.status(201).json({ success: true, item });
});

// @route POST /api/groceries/from-recipe/:recipeId — add all ingredients
const addFromRecipe = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.recipeId, userId: req.user.id },
    include: { ingredients: true },
  });
  if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

  const items = await prisma.$transaction(
    recipe.ingredients.map((ing) =>
      prisma.groceryItem.create({
        data: {
          userId: req.user.id,
          label: ing.name,
          quantity: `${ing.quantity} ${ing.unit}`,
          sourceRecipeId: recipe.id,
        },
      })
    )
  );

  res.status(201).json({ success: true, count: items.length, items });
});

// @route PATCH /api/groceries/:id   { checked? }
const updateGroceryItem = asyncHandler(async (req, res) => {
  const existing = await prisma.groceryItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

  const item = await prisma.groceryItem.update({
    where: { id: existing.id },
    data: { checked: req.body.checked !== undefined ? Boolean(req.body.checked) : undefined },
  });
  res.json({ success: true, item });
});

// @route DELETE /api/groceries/:id
const deleteGroceryItem = asyncHandler(async (req, res) => {
  const existing = await prisma.groceryItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Item not found' });

  await prisma.groceryItem.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Removed' });
});

module.exports = { getGroceryItems, addGroceryItem, addFromRecipe, updateGroceryItem, deleteGroceryItem };
