require('dotenv').config();

const config = {
  development: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/Hisabi',
  },
  production: {
    uri: process.env.MONGODB_URI,
  },
  test: {
    uri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/Hisabi_test',
  },
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
