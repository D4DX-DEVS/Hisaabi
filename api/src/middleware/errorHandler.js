// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // A request the client got wrong (bad dates, range too long, ...): a 400,
  // not worth a stack trace in the logs.
  if (err.name === 'InputError') {
    return res.status(400).json({ error: err.message });
  }

  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ error: `Duplicate value for ${field}` });
  }

  // Cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
