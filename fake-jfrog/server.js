const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const VALID_USER = 'jenkins-build-bot';
const VALID_PASS = 'artifactory_p@ssw0rd_8821!';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="JFrog Artifactory"');
    return res.status(401).json({
      errors: [{ status: 401, message: 'Unauthorized: missing credentials' }],
    });
  }

  const b64 = authHeader.slice('Basic '.length);
  const decoded = Buffer.from(b64, 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');

  if (user === VALID_USER && pass === VALID_PASS) {
    req.authedUser = user;
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="JFrog Artifactory"');
  return res.status(401).json({
    errors: [{ status: 401, message: 'Unauthorized: bad credentials' }],
  });
};

app.get('/artifactory/api/system/ping', (req, res) => {
  res.set('X-Artifactory-Id', 'soundmetrics-artifactory@01JFROGLAB2026');
  res.set('X-Artifactory-Node-Id', 'artifactory-node-1');
  res.type('text/plain').send('OK');
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'SoundMetrics Artifactory',
    version: '7.55.2',
    revision: '75502900',
    addons: [],
    license: {
      type: 'Trial',
      validThrough: '2026-06-01',
      licensedTo: 'SoundMetrics Internal',
    },
    hint: 'Authenticate via Basic Auth to access repositories. See /artifactory/api/system/ping',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
  });
});

app.get('/artifactory/libs-release-local', requireAuth, (req, res) => {
  res.json({
    repo: 'libs-release-local',
    path: '/',
    created: '2025-11-03T09:00:00.000Z',
    lastModified: '2026-03-11T22:14:03.000Z',
    children: [
      { uri: '/soundmetrics-ui-1.4.2.tar.gz', folder: false },
      { uri: '/soundmetrics-api-2.1.0.jar', folder: false },
      { uri: '/soundmetrics-worker-0.9.1.tar.gz', folder: false },
    ],
  });
});

app.get('/artifactory/libs-release-local/:artifact', requireAuth, (req, res) => {
  res.json({
    repo: 'libs-release-local',
    path: `/${req.params.artifact}`,
    downloadUri: `http://artifactory:8081/artifactory/libs-release-local/${req.params.artifact}`,
    mimeType: 'application/octet-stream',
    size: '14823042',
    checksums: {
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  });
});

app.post('/api/deploy', requireAuth, (req, res) => {
  return res.status(410).json({
    error: 'Direct execution endpoint removed.',
    hint: 'Pipeline workflow required. Upload script via POST /api/pipeline/upload, then trigger via POST /api/pipeline/run.',
  });
});

const fs = require('fs');
const path = require('path');
const BUILDS_DIR = '/var/jenkins_home/builds';

app.post('/api/pipeline/upload', requireAuth, (req, res) => {
  const { filename, content } = req.body;

  if (!filename || !content) {
    return res.status(400).json({
      error: 'Missing required fields: filename, content',
      hint: 'Body must contain { "filename": "exploit.py", "content": "<python code>" }',
    });
  }

  const jobId = `job-${Date.now()}`;
  const savedName = `${jobId}_${filename}`;
  const filePath = path.join(BUILDS_DIR, savedName);

  try {
    fs.mkdirSync(BUILDS_DIR, { recursive: true });
    fs.writeFileSync(filePath, content);
    res.json({
      status: 'QUEUED',
      job_id: jobId,
      filename: savedName,
      message: 'Script queued for deployment. Trigger execution via POST /api/pipeline/run.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to write script', detail: e.message });
  }
});

app.post('/api/pipeline/run', requireAuth, (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({
      error: 'Missing required field: filename',
      hint: 'Body must contain { "filename": "<uploaded_script_name>" }',
    });
  }

  const filePath = path.join(BUILDS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Script not found.',
      hint: 'Upload first via POST /api/pipeline/upload',
    });
  }

  const { exec } = require('child_process');
  exec(`python3 ${filePath}`, { timeout: 5000 }, (error, stdout, stderr) => {
    const lines = [
      `[deploy-agent] Received deployment job at ${new Date().toISOString()}`,
      `[deploy-agent] Runner: gitlab-runner-prod-03`,
      `[deploy-agent] Executing: python3 ${filename}`,
      ...stdout.split('\n').filter(l => l.trim()).map(l => `[stdout] ${l}`),
      ...(stderr ? stderr.split('\n').filter(l => l.trim()).map(l => `[stderr] ${l}`) : []),
      `[deploy-agent] Job completed with exit code ${error ? (error.code || 1) : 0}.`,
    ];

    res.json({
      status: 'EXECUTED',
      pipeline_id: `pipe-${Date.now()}`,
      filename,
      output: lines,
      exit_code: error ? (error.code || 1) : 0,
    });
  });
});

const PORT = 8081;
app.listen(PORT, () =>
  console.log(`[Fake JFrog Artifactory] Repository online on port ${PORT}`)
);