const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// Read-only export used to migrate the authenticated user's current Baker's Diary
// data into the single-device offline APK. Password hashes, JWTs, environment
// variables, and provider credentials are intentionally excluded.
const exportOfflineData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [user, settings, recipes, sessions, groceries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, createdAt: true, updatedAt: true },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.recipe.findMany({
      where: { userId },
      include: {
        coverImage: true,
        ingredients: { orderBy: { order: 'asc' } },
        steps: {
          orderBy: { order: 'asc' },
          include: { referenceImage: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.cookingSession.findMany({
      where: { userId },
      include: {
        finalPhoto: true,
        steps: {
          include: {
            recipeStep: true,
            photos: true,
          },
        },
      },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.groceryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  res.setHeader('Content-Disposition', `attachment; filename="bakers-diary-offline-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    format: 'bakers-diary-offline-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    settings,
    recipes,
    sessions,
    groceries,
  });
});

module.exports = { exportOfflineData };
