// Seeds the single Chef Kats account and demo content per §31. Password
// comes from SEED_ADMIN_PASSWORD — never hardcoded here.
//
// Usage: SEED_ADMIN_PASSWORD="..." npm run seed
//
// NOT RUN as part of this BUILD — no live database in this environment.
// See PROVE.md P3/P4 for how to run and verify this.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

async function run() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.error('Set SEED_ADMIN_PASSWORD before running the seed script.');
    process.exit(1);
  }

  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log('A user already exists — seed script only creates the initial account. Nothing changed.');
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      displayName: 'Chef Kats',
      passwordHash,
      settings: { create: { theme: 'night', showDedicationOnLogin: true } },
    },
  });

  // --- Demo recipe 1: Chocolate Babka (fully structured, with an
  // in-progress bake, so Dashboard's "Continue Your Journey" has real data)
  const babka = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: 'Chocolate Babka',
      description: 'Rich chocolate-swirled yeasted bread, twisted and braided before its second rise.',
      category: 'Bread',
      yield: '1 loaf',
      servings: 12,
      prepTimeMin: 45,
      cookTimeMin: 35,
      status: 'published',
      favorite: true,
      ingredients: {
        create: [
          { name: 'All-purpose flour', quantity: 500, unit: 'g', order: 1 },
          { name: 'Whole milk', quantity: 180, unit: 'ml', order: 2 },
          { name: 'Butter', quantity: 100, unit: 'g', order: 3 },
          { name: 'Dark chocolate', quantity: 200, unit: 'g', order: 4, note: 'chopped' },
          { name: 'Eggs', quantity: 2, unit: 'piece', order: 5 },
          { name: 'Sugar', quantity: 90, unit: 'g', order: 6 },
          { name: 'Active dry yeast', quantity: 7, unit: 'g', order: 7 },
        ],
      },
      steps: {
        create: [
          { order: 1, instruction: 'Make the dough: combine flour, milk, eggs, sugar, and yeast. Knead until smooth.', timerSeconds: null },
          { order: 2, instruction: 'Knead the dough for 10 minutes until elastic.', timerSeconds: 600 },
          { order: 3, instruction: 'First rise: cover and let rise until doubled.', timerSeconds: 5400 },
          { order: 4, instruction: 'Roll the dough into a large rectangle and spread the chocolate filling evenly.', timerSeconds: null },
          { order: 5, instruction: 'Twist and braid the filled dough into a loaf shape.', timerSeconds: null },
          { order: 6, instruction: 'Second rise: cover and let rise until puffy.', timerSeconds: 3600 },
          { order: 7, instruction: 'Bake at 180°C until deep golden brown.', timerSeconds: 2100 },
          { order: 8, instruction: 'Cool completely, then glaze.', timerSeconds: 1800 },
        ],
      },
    },
    include: { steps: true },
  });

  await prisma.cookingSession.create({
    data: {
      userId: user.id,
      recipeId: babka.id,
      bakeNumber: 4,
      status: 'in_progress',
      currentStepOrder: 4,
      steps: {
        create: babka.steps.map((s) => ({
          recipeStepId: s.id,
          completed: s.order < 4,
          notes: s.order === 4 ? 'Added a little extra cinnamon today. Smells amazing!' : null,
          completedAt: s.order < 4 ? new Date() : null,
        })),
      },
    },
  });

  // --- Demo recipe 2: Classic Croissants
  await prisma.recipe.create({
    data: {
      userId: user.id,
      title: 'Classic Croissants',
      description: 'Laminated butter dough, folded and shaped into the classic crescent.',
      category: 'Pastry',
      yield: '8 croissants',
      servings: 8,
      prepTimeMin: 90,
      cookTimeMin: 20,
      status: 'published',
      ingredients: {
        create: [
          { name: 'Bread flour', quantity: 500, unit: 'g', order: 1 },
          { name: 'Butter', quantity: 280, unit: 'g', order: 2, note: 'for laminating' },
          { name: 'Whole milk', quantity: 120, unit: 'ml', order: 3 },
          { name: 'Sugar', quantity: 55, unit: 'g', order: 4 },
          { name: 'Active dry yeast', quantity: 11, unit: 'g', order: 5 },
        ],
      },
      steps: {
        create: [
          { order: 1, instruction: 'Make the détrempe (base dough) and chill.', timerSeconds: 3600 },
          { order: 2, instruction: 'Laminate: fold in the butter block in three turns, chilling between each.', timerSeconds: null },
          { order: 3, instruction: 'Roll out and cut into triangles.', timerSeconds: null },
          { order: 4, instruction: 'Shape into crescents and proof until jiggly.', timerSeconds: 7200 },
          { order: 5, instruction: 'Egg wash and bake until deep golden.', timerSeconds: 1200 },
        ],
      },
    },
  });

  // --- Demo recipe 3: Sourdough Country Loaf
  await prisma.recipe.create({
    data: {
      userId: user.id,
      title: 'Sourdough Country Loaf',
      description: 'Naturally leavened, long fermented, baked in a Dutch oven.',
      category: 'Bread',
      yield: '1 loaf',
      servings: 14,
      prepTimeMin: 30,
      cookTimeMin: 45,
      status: 'published',
      ingredients: {
        create: [
          { name: 'Bread flour', quantity: 450, unit: 'g', order: 1 },
          { name: 'Whole wheat flour', quantity: 50, unit: 'g', order: 2 },
          { name: 'Water', quantity: 375, unit: 'ml', order: 3 },
          { name: 'Active sourdough starter', quantity: 100, unit: 'g', order: 4 },
          { name: 'Salt', quantity: 10, unit: 'g', order: 5 },
        ],
      },
      steps: {
        create: [
          { order: 1, instruction: 'Mix flour and water, autolyse 30 minutes.', timerSeconds: 1800 },
          { order: 2, instruction: 'Add starter and salt, mix thoroughly.', timerSeconds: null },
          { order: 3, instruction: 'Bulk ferment with periodic folds.', timerSeconds: 14400 },
          { order: 4, instruction: 'Shape and cold proof overnight.', timerSeconds: null },
          { order: 5, instruction: 'Bake covered, then uncovered, in a Dutch oven.', timerSeconds: 2700 },
        ],
      },
    },
  });

  // --- Demo recipe 4: Lemon Blueberry Cake, with one COMPLETED bake so
  // Journal (§17) has a real entry to display.
  const cake = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: 'Lemon Blueberry Cake',
      description: 'Bright, tender crumb cake studded with fresh blueberries.',
      category: 'Cake',
      yield: '1 cake',
      servings: 10,
      prepTimeMin: 25,
      cookTimeMin: 50,
      status: 'published',
      ingredients: {
        create: [
          { name: 'All-purpose flour', quantity: 300, unit: 'g', order: 1 },
          { name: 'Butter', quantity: 170, unit: 'g', order: 2 },
          { name: 'Sugar', quantity: 220, unit: 'g', order: 3 },
          { name: 'Eggs', quantity: 3, unit: 'piece', order: 4 },
          { name: 'Blueberries', quantity: 200, unit: 'g', order: 5, note: 'fresh' },
          { name: 'Lemon', quantity: 1, unit: 'piece', order: 6, note: 'zested and juiced' },
        ],
      },
      steps: {
        create: [
          { order: 1, instruction: 'Cream butter and sugar until pale and fluffy.', timerSeconds: 300 },
          { order: 2, instruction: 'Beat in eggs one at a time, then fold in lemon zest and juice.', timerSeconds: null },
          { order: 3, instruction: 'Fold in flour, then blueberries.', timerSeconds: null },
          { order: 4, instruction: 'Bake at 175°C until a skewer comes out clean.', timerSeconds: 3000 },
        ],
      },
    },
    include: { steps: true },
  });

  await prisma.cookingSession.create({
    data: {
      userId: user.id,
      recipeId: cake.id,
      bakeNumber: 1,
      status: 'completed',
      currentStepOrder: 4,
      rating: 5,
      finalNotes: 'Perfect balance of tart and sweet. The lemon glaze really makes it.',
      whatToChangeNextTime: 'Try doubling the blueberries next time.',
      completedAt: new Date(),
      steps: { create: cake.steps.map((s) => ({ recipeStepId: s.id, completed: true, completedAt: new Date() })) },
    },
  });

  console.log('Seeded Chef Kats account and 4 demo recipes (1 in-progress bake, 1 completed bake).');
  console.log('NOTE: this is clearly demo/seed content, not production data — re-run is a no-op once a user exists.');
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
