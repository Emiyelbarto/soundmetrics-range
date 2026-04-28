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
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, isadmin INTEGER)");
  db.run("INSERT INTO users (username, password, isadmin) VALUES ('admin', 'M3_GU5T4_Much0_CSM', 1)");
  db.run("INSERT INTO users (username, password, isadmin) VALUES ('nano', '5ATURDAY12345!', 0)");
  db.run("INSERT INTO users (username, password, isadmin) VALUES ('zerodante7', '03332mMamc@2013temp@321', 0)");
  db.run("INSERT INTO users (username, password, isadmin) VALUES ('emielferoz', '04mulesystems', 0)");
});

const requireInternalSecret = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret === process.env.REAL_INTERNAL_SECRET || secret === 'sm-internal-2026') {
    next();
  } else {
    res.status(403).json({ error: 'Access Denied: Invalid Gateway Secret' });
  }
};

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
  });
});

app.get('/api/v1/artists', (req, res) => {
  const searchQuery = req.query.q || '';
  db.all(
    "SELECT id, name, streams FROM artists WHERE name LIKE ?",
    [`%${searchQuery}%`],
    (err, rows) => res.json(rows)
  );
});

app.post('/api/v2/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Database fault' });
      if (user) {
        res.json({ status: 'SUCCESS', isadmin: user.isadmin === 1 });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
  );
});

app.get('/api/v1/users', (req, res) => {
  db.all("SELECT * FROM users", (err, rows) => res.json(rows));
});

app.get('/api/v2/revenue', requireInternalSecret, (req, res) => {
  db.all("SELECT * FROM artists", (err, rows) => res.json(rows));
});

app.post('/api/v2/upload', requireInternalSecret, (req, res) => {
  res.json({
    status: 'SUCCESS',
    message: 'File successfully uploaded and queued for backend processing.',
    path: `/var/www/uploads/temp_${Date.now()}.png`,
  });
});

app.get('/api/v2/pipeline', requireInternalSecret, (req, res) => {
  res.json({
    pipeline_id: 'pipe-20260312-0041',
    project: 'soundmetrics/ui',
    ref: 'main',
    status: 'failed',
    created_at: '2026-03-12T03:11:04Z',
    finished_at: '2026-03-12T03:14:37Z',
    duration_seconds: 213,
    triggered_by: 'svc_deploy_admin',
    runner: 'gitlab-runner-prod-03',
    stages: [
      {
        name: 'build',
        status: 'success',
        jobs: [
          {
            name: 'compile:next',
            status: 'success',
            duration_seconds: 98,
            log_excerpt: 'SWC compiled 42 modules. DefinePlugin substitution complete.',
          },
        ],
      },
      {
        name: 'publish',
        status: 'failed',
        jobs: [
          {
            name: 'publish:artifactory',
            status: 'failed',
            duration_seconds: 12,
            error: 'Authentication failure uploading to Artifactory.',
            build_env: {
              ARTIFACTORY_URL: 'http://artifactory:8081',
              ARTIFACTORY_USR: 'jenkins-build-bot',
              ARTIFACTORY_PWS: 'artifactory_p@ssw0rd_8821!',
            },
          },
        ],
      },
    ],
    next_action: 'Manual re-trigger required. Check Artifactory credentials.',
  });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`[SoundMetrics API] Vault locked on port ${PORT}`));