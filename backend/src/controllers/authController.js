const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

// @route POST /api/auth/login
// §7: password field, hashed comparison, real session token. There is
// exactly one user (seeded by scripts/seed.js) — this finds them by being
// the only row, not by a hardcoded credential check.
const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Enter your password.' });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    // Distinct message from "wrong password" — this means the seed script
    // hasn't run yet, not that Chef Kats mistyped anything.
    return res.status(500).json({ success: false, message: 'No account has been set up yet. Run the seed script first.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'That password is not right.' });
  }

  const token = generateToken(user.id);
  res.json({ success: true, token, user: { id: user.id, displayName: user.displayName } });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
  res.json({ success: true, user: req.user, settings });
});

// @route POST /api/auth/forgot-password
// §7: "Either implement a genuine recovery mechanism or omit/disable the
// control clearly." v0.1 has no email/SMS delivery infrastructure, so this
// is honestly disabled rather than faked — it always returns the same
// message and never sends anything or resets anything.
const forgotPassword = asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Password recovery isn't available yet in v0.1. Reset it directly via scripts/seed.js on the server.",
  });
});

module.exports = { login, getMe, forgotPassword };
