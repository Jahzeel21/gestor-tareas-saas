require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});