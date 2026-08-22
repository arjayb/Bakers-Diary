// Wraps an async Express handler so a thrown/rejected error reaches the
// centralized error handler instead of hanging the request.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
