const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run("CREATE TABLE artists (id INT, name TEXT, streams TEXT, revenue TEXT)");
  db.run("INSERT INTO artists VALUES (1, 'Joji', '1.2B', '$4,500,000')");
  db.run("INSERT INTO artists VALUES (2, 'The Weeknd', '5.4B', '$18,200,000')");
  db.run("INSERT INTO artists VALUES (3, 'Daft Punk', '3.1B', '$11,000,000')");
});

const requireInternalSecret = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret === process.env.REAL_INTERNAL_SECRET || secret === 'dev-internal-secret') {
    next();
  } else {
    res.status(403).json({ error: "Access Denied: Invalid Gateway Secret" });
  }
};

app.get('/api/public/artists', (req, res) => {
  const searchQuery = req.query.q || '';
  db.all("SELECT id, name, streams FROM artists WHERE name LIKE ?", [`%${searchQuery}%`], (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/internal/revenue', requireInternalSecret, (req, res) => {
  db.all("SELECT * FROM artists", (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/internal/upload', requireInternalSecret, (req, res) => {
  res.json({ 
    status: "SUCCESS", 
    message: "File successfully uploaded and queued for backend processing.", 
    path: `/var/www/uploads/temp_${Date.now()}.png` 
  });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`[SoundMetrics API] Vault locked on port ${PORT}`));
