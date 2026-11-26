require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');
const { authenticate } = require('./middleware/auth');
const { loadUser } = require('./middleware/loadUser');
const teamsRoutes = require('./routes/teams');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS ahora');
    res.json({ status: 'ok', ahora: result.rows[0].ahora });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.use('/teams', authenticate, loadUser, teamsRoutes);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});