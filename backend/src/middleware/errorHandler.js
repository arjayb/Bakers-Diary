// Centralized error handler (§28) — every controller throws or calls next(err)
// and lands here, so error response shape is consistent app-wide.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.name === 'PrismaClientKnownRequestError' && err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong on our end.' : err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

module.exports = { errorHandler, notFound };
