const express = require('express');
const pool = require('../db/pool');

// mergeParams permite leer :teamId de la ruta padre
const router = express.Router({ mergeParams: true });

const STATUSES = ['pendiente', 'en_progreso', 'completada'];

// Todas las rutas exigen que el usuario pertenezca al equipo
async function requireMember(req, res, next) {
  const teamId = Number(req.params.teamId);
  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ error: 'Id de equipo inválido' });
  }
  try {
    const result = await pool.query(
      'SELECT role FROM memberships WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    req.teamId = teamId;
    req.teamRole = result.rows[0].role;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verificando membresía', detail: error.message });
  }
}

router.use(requireMember);

// Verifica que el usuario asignado pertenezca al mismo equipo
async function isTeamMember(teamId, userId) {
  const r = await pool.query(
    'SELECT 1 FROM memberships WHERE team_id = $1 AND user_id = $2',
    [teamId, userId]
  );
  return r.rows.length > 0;
}

// Listar tareas del equipo (filtro opcional ?status=)
router.get('/', async (req, res) => {
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  try {
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE team_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY created_at DESC`,
      [req.teamId, status || null]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron listar las tareas', detail: error.message });
  }
});

// Crear tarea (cualquier miembro del equipo)
router.post('/', async (req, res) => {
  const title = (req.body.title || '').trim();
  const { description, assigned_to } = req.body;
  const status = req.body.status || 'pendiente';

  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  try {
    if (assigned_to && !(await isTeamMember(req.teamId, assigned_to))) {
      return res.status(400).json({ error: 'El usuario asignado no pertenece al equipo' });
    }
    const result = await pool.query(
      `INSERT INTO tasks (team_id, title, description, status, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.teamId, title, description || null, status, assigned_to || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear la tarea', detail: error.message });
  }
});

// Ver una tarea del equipo
router.get('/:taskId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND team_id = $2',
      [req.params.taskId, req.teamId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener la tarea', detail: error.message });
  }
});

// Actualizar tarea (cualquier miembro del equipo)
router.put('/:taskId', async (req, res) => {
  const { title, description, status, assigned_to } = req.body;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  try {
    if (assigned_to && !(await isTeamMember(req.teamId, assigned_to))) {
      return res.status(400).json({ error: 'El usuario asignado no pertenece al equipo' });
    }
    const result = await pool.query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         assigned_to = COALESCE($4, assigned_to),
         updated_at = NOW()
       WHERE id = $5 AND team_id = $6
       RETURNING *`,
      [title || null, description || null, status || null, assigned_to || null,
       req.params.taskId, req.teamId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la tarea', detail: error.message });
  }
});

// Eliminar tarea (solo admin del equipo)
router.delete('/:taskId', async (req, res) => {
  if (req.teamRole !== 'admin') {
    return res.status(403).json({ error: 'Solo el admin del equipo puede eliminar tareas' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND team_id = $2 RETURNING id',
      [req.params.taskId, req.teamId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar la tarea', detail: error.message });
  }
});

module.exports = router;