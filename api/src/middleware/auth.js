const { verifyToken } = require('../utils/jwtUtils');
const { User } = require('../models');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.message === 'Token expired') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // A mismatch means this token was issued before the user's last
    // revocation (e.g. a lost-phone token_version bump) — tokens are now
    // long-lived, so this is the only way to kill an already-issued one.
    if ((decoded.v || 0) !== (user.token_version || 0)) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticate };
