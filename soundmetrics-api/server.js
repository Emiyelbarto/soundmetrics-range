const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Base de datos en memoria para reinicios limpios en el workshop
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run("CREATE TABLE artists (id INT, name TEXT, streams TEXT, revenue TEXT)");
  db.run("INSERT INTO artists VALUES (1, 'Joji', '1.2B', '$4,500,000')");
  db.run("INSERT INTO artists VALUES (2, 'The Weeknd', '5.4B', '$18,200,000')");
  db.run("INSERT INTO artists VALUES (3, 'Daft Punk', '3.1B', '$11,000,000')");
});

// Middleware mal programado, logic business case por el operador || en lugar de un fallback
const requireInternalSecret = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret === process.env.REAL_INTERNAL_SECRET || secret === 'dev-internal-secret') {
    next();
  } else {
    res.status(403).json({ error: "Access Denied: Invalid Gateway Secret" });
  }
};

app.get('/api/public/artists', (req, res) => {
  db.all("SELECT id, name, streams FROM artists", (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/internal/revenue', requireInternalSecret, (req, res) => {
  db.all("SELECT * FROM artists", (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/internal/artists', requireInternalSecret, (req, res) => {
  const { id, name, streams, revenue } = req.body;
  db.run("INSERT INTO artists VALUES (?, ?, ?, ?)", [id, name, streams, revenue], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: "SUCCESS", message: "Artist financial data added securely." });
  });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`[SoundMetrics API] Vault locked and running on port ${PORT}`));
