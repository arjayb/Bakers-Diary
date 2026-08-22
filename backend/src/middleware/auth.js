const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// §7: real backend authentication, protected routes. There is exactly one
// user in v0.1, but this still goes through a real token + DB lookup rather
// than a hardcoded bypass, so the auth code path is honest and the same
// shape it would be with more users later.
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, displayName: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ success: false, message: 'Session is no longer valid' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Your session expired. Please sign in again.' });
  }
};

module.exports = { authenticate };
