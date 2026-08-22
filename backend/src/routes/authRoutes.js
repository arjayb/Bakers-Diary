const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, getMe, forgotPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Single-user app, but still rate-limited — a private diary is still worth
// protecting against a brute-force password guesser hitting the endpoint.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in a few minutes.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', loginLimiter, forgotPassword);

module.exports = router;
