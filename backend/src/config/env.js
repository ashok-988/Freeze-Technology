require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'freeze_tech_secret_key_jwt_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/freezetech_db?schema=public'
};
