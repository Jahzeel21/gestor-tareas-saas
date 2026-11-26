const express = require('express');
const pool = require('../db/pool');
const { requireGroup } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireGroup('admin'), async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const team = await client.query(
      'INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    await client.query(
      'INSERT INTO memberships (team_id, user_id, role) VALUES ($1, $2, $3)',
      [team.rows[0].id, req.user.id, 'admin']
    );
    await client.query('COMMIT');
    res.status(201).json(team.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'No se pudo crear el equipo', detail: error.message });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.created_at, m.role
       FROM teams t
       JOIN memberships m ON m.team_id = t.id
       WHERE m.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar los equipos', detail: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, t.created_at, m.role
       FROM teams t
       JOIN memberships m ON m.team_id = t.id
       WHERE t.id = $1 AND m.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener el equipo', detail: error.message });
  }
});

module.exports = router;