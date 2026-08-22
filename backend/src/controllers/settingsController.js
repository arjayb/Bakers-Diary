const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// @route GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
  res.json({ success: true, settings });
});

// @route PATCH /api/settings   { theme?, showDedicationOnLogin? }
// §5: "Theme selection must persist between visits." §8: dedication
// on/off preference. Both live on the same row since they're both
// per-user, rarely-changed preferences.
const updateSettings = asyncHandler(async (req, res) => {
  const { theme, showDedicationOnLogin } = req.body;
  if (theme && !['night', 'day'].includes(theme)) {
    return res.status(400).json({ success: false, message: 'Theme must be "night" or "day".' });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: req.user.id },
    create: {
      userId: req.user.id,
      theme: theme || 'night',
      showDedicationOnLogin: showDedicationOnLogin !== undefined ? Boolean(showDedicationOnLogin) : true,
    },
    update: {
      ...(theme !== undefined && { theme }),
      ...(showDedicationOnLogin !== undefined && { showDedicationOnLogin: Boolean(showDedicationOnLogin) }),
    },
  });

  res.json({ success: true, settings });
});

module.exports = { getSettings, updateSettings };
