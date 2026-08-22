const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const SESSION_INCLUDE = {
  recipe: { select: { id: true, title: true, coverImage: true } },
  steps: { orderBy: { recipeStep: { order: 'asc' } }, include: { recipeStep: true, photos: true } },
  finalPhoto: true,
};

// @route POST /api/sessions   { recipeId }
// §13: starting Cook/Bake Mode creates a Session/Bake record. bakeNumber is
// sequential per recipe (§13 example: "Bake #4") — computed as
// (count of existing sessions for this recipe) + 1. This is a simple
// read-then-write rather than a dedicated counter table: session creation
// is a low-frequency, single-user action (nothing like the concurrent
// tracking-number generation problem in a multi-admin system), so the
// extra concurrency machinery isn't warranted here.
const startSession = asyncHandler(async (req, res) => {
  const { recipeId } = req.body;

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId: req.user.id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });
  if (!recipe.steps.length) {
    return res.status(400).json({ success: false, message: 'This recipe has no steps yet — add a Method before starting a Bake.' });
  }

  const existingCount = await prisma.cookingSession.count({ where: { recipeId } });

  const session = await prisma.cookingSession.create({
    data: {
      userId: req.user.id,
      recipeId,
      bakeNumber: existingCount + 1,
      currentStepOrder: recipe.steps[0].order,
      steps: { create: recipe.steps.map((s) => ({ recipeStepId: s.id })) },
    },
    include: SESSION_INCLUDE,
  });

  res.status(201).json({ success: true, session });
});

// @route GET /api/sessions/:id
const getSessionById = asyncHandler(async (req, res) => {
  const session = await prisma.cookingSession.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: SESSION_INCLUDE,
  });
  if (!session) return res.status(404).json({ success: false, message: 'Bake session not found' });
  res.json({ success: true, session });
});

// @route GET /api/sessions/continue
// §9/§14: "Continue Your Journey" — the most recently touched in-progress
// session, if any. Returns null rather than 404 when there isn't one, since
// "no unfinished bake" is a normal Dashboard state, not an error.
const getContinuableSession = asyncHandler(async (req, res) => {
  const session = await prisma.cookingSession.findFirst({
    where: { userId: req.user.id, status: 'in_progress' },
    include: SESSION_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, session: session || null });
});

// @route PATCH /api/sessions/:id/progress
// §14: autosave — the frontend calls this on every meaningful change
// (step completed, note typed, current step navigated to) rather than
// requiring an explicit Save button. Accepts a partial payload:
//   { currentStepOrder?, stepUpdates?: [{ sessionStepId, completed?, notes? }] }
const updateProgress = asyncHandler(async (req, res) => {
  const existing = await prisma.cookingSession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Bake session not found' });
  if (existing.status !== 'in_progress') {
    return res.status(400).json({ success: false, message: `This bake is already ${existing.status} — progress can't be changed.` });
  }

  const { currentStepOrder, stepUpdates = [] } = req.body;

  await prisma.$transaction(async (tx) => {
    if (currentStepOrder !== undefined) {
      await tx.cookingSession.update({ where: { id: existing.id }, data: { currentStepOrder: Number(currentStepOrder) } });
    }
    for (const upd of stepUpdates) {
      const data = {};
      if (upd.completed !== undefined) {
        data.completed = Boolean(upd.completed);
        data.completedAt = upd.completed ? new Date() : null;
      }
      if (upd.notes !== undefined) data.notes = upd.notes;
      if (Object.keys(data).length) {
        await tx.sessionStep.update({ where: { id: upd.sessionStepId }, data });
      }
    }
  });

  const session = await prisma.cookingSession.findUnique({ where: { id: existing.id }, include: SESSION_INCLUDE });
  res.json({ success: true, session });
});

// @route PATCH /api/sessions/:id/step-photo   { sessionStepId, mediaAssetId }
const attachStepPhoto = asyncHandler(async (req, res) => {
  const { sessionStepId, mediaAssetId } = req.body;

  const session = await prisma.cookingSession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!session) return res.status(404).json({ success: false, message: 'Bake session not found' });

  await prisma.sessionStep.update({
    where: { id: sessionStepId },
    data: { photos: { connect: { id: mediaAssetId } } },
  });

  const updated = await prisma.cookingSession.findUnique({ where: { id: session.id }, include: SESSION_INCLUDE });
  res.json({ success: true, session: updated });
});

// @route PATCH /api/sessions/:id/complete
// §18: Final Step -> Complete Bake -> Bake Summary. Captures final photo,
// notes, rating, and "what to change next time," then finalizes into
// Journal (§17) — same underlying record, no separate Journal table.
const completeSession = asyncHandler(async (req, res) => {
  const existing = await prisma.cookingSession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Bake session not found' });
  if (existing.status !== 'in_progress') {
    return res.status(400).json({ success: false, message: `This bake is already ${existing.status}.` });
  }

  const { finalPhotoId, finalNotes, rating, whatToChangeNextTime } = req.body;

  if (rating !== undefined && rating !== null) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
    }
  }

  const session = await prisma.cookingSession.update({
    where: { id: existing.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      finalPhotoId: finalPhotoId || null,
      finalNotes: finalNotes || null,
      rating: rating ? Number(rating) : null,
      whatToChangeNextTime: whatToChangeNextTime || null,
    },
    include: SESSION_INCLUDE,
  });

  res.json({ success: true, session });
});

// @route PATCH /api/sessions/:id/abandon
// §14: "Do not assume an interrupted cooking session has been completed."
// Explicit abandon action, distinct from simply not touching it — a session
// left untouched stays `in_progress` (and keeps showing under Continue Your
// Journey) unless Chef Kats deliberately marks it abandoned.
const abandonSession = asyncHandler(async (req, res) => {
  const existing = await prisma.cookingSession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Bake session not found' });
  if (existing.status !== 'in_progress') {
    return res.status(400).json({ success: false, message: `This bake is already ${existing.status}.` });
  }

  const session = await prisma.cookingSession.update({ where: { id: existing.id }, data: { status: 'abandoned' } });
  res.json({ success: true, session });
});

// @route GET /api/journal
// §17: chronological list of sessions, global view.
const getJournal = asyncHandler(async (req, res) => {
  const where = { userId: req.user.id, status: { in: ['completed', 'abandoned'] } };
  const sessions = await prisma.cookingSession.findMany({
    where,
    include: { recipe: { select: { id: true, title: true, coverImage: true } }, finalPhoto: true },
    orderBy: { completedAt: 'desc' },
  });
  res.json({ success: true, count: sessions.length, sessions });
});

// @route GET /api/journal/:sessionId
const getJournalEntry = asyncHandler(async (req, res) => {
  const session = await prisma.cookingSession.findFirst({
    where: { id: req.params.sessionId, userId: req.user.id },
    include: SESSION_INCLUDE,
  });
  if (!session) return res.status(404).json({ success: false, message: 'Journal entry not found' });
  res.json({ success: true, session });
});

// @route GET /api/recipes/:id/bakes
// §17 contextual access: Recipe -> Bake History, same underlying records.
const getRecipeBakeHistory = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });

  const sessions = await prisma.cookingSession.findMany({
    where: { recipeId: recipe.id },
    orderBy: { bakeNumber: 'desc' },
  });
  res.json({ success: true, count: sessions.length, sessions });
});

module.exports = {
  startSession,
  getSessionById,
  getContinuableSession,
  updateProgress,
  attachStepPhoto,
  completeSession,
  abandonSession,
  getJournal,
  getJournalEntry,
  getRecipeBakeHistory,
};
