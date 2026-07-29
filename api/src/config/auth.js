require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  jwtExpiration: process.env.JWT_EXPIRATION || '30d',
};
