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
// Verifica que el usuario autenticado sea admin del equipo
async function requireTeamAdmin(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT role FROM memberships WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Solo el admin del equipo puede gestionar miembros' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verificando permisos', detail: error.message });
  }
}

// Listar miembros (cualquier miembro del equipo)
router.get('/:id/members', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, m.role
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.team_id = $1
         AND EXISTS (SELECT 1 FROM memberships WHERE team_id = $1 AND user_id = $2)
       ORDER BY u.name`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar los miembros', detail: error.message });
  }
});

// Agregar miembro por correo (solo admin del equipo)
router.post('/:id/members', requireTeamAdmin, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const role = req.body.role || 'miembro';
  if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });
  if (!['admin', 'miembro'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  try {
    const user = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Ese usuario aún no ha iniciado sesión en la app' });
    }
    const result = await pool.query(
      `INSERT INTO memberships (team_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [req.params.id, user.rows[0].id, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo agregar el miembro', detail: error.message });
  }
});

// Quitar miembro (solo admin del equipo)
router.delete('/:id/members/:userId', requireTeamAdmin, async (req, res) => {
  if (Number(req.params.userId) === req.user.id) {
    return res.status(400).json({ error: 'No puedes quitarte a ti mismo del equipo' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM memberships WHERE team_id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.params.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo quitar el miembro', detail: error.message });
  }
});
module.exports = router;