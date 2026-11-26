const pool = require('../db/pool');

async function loadUser(req, res, next) {
  try {
    const { sub, email, name } = req.user;
    const result = await pool.query(
      `INSERT INTO users (cognito_sub, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (cognito_sub)
       DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
       RETURNING id`,
      [sub, email || `${sub}@sin-correo.local`, name || null]
    );
    req.user.id = result.rows[0].id;
    next();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar el usuario', detail: error.message });
  }
}

module.exports = { loadUser };