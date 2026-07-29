const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiration } = require('../config/auth');

function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token signature');
  }
}

module.exports = { generateToken, verifyToken };
