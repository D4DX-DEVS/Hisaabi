const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_fallback_secret';

function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Admin authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({ error: 'Admin authorization token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Admin token expired' });
      }
      return res.status(401).json({ error: 'Invalid admin token' });
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Admin authentication failed' });
  }
}

module.exports = { authenticateAdmin };
