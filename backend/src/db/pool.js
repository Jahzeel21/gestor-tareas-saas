const { Pool } = require('pg');

// RDS (PostgreSQL 15+) exige conexion cifrada. Se activa con DB_SSL=true.
const useSsl = process.env.DB_SSL === 'true';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
