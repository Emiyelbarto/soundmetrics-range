const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

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

app.get('/', (req, res) => {
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
  const { cmd } = req.body;

  if (!cmd) {
    return res.status(400).json({
      error: 'Missing required field: cmd',
      hint: 'Body must contain { "cmd": "<your_payload>" }',
    });
  }

  const fakeOutput = [
    `[deploy-agent] Received deployment job at 2026-03-12T03:44:12Z`,
    `[deploy-agent] Runner: gitlab-runner-prod-03`,
    `[deploy-agent] Executing pre-deploy hook...`,
    `[deploy-agent] $ python3 -c "${cmd}"`,
    `[stdout] uid=1001(jenkins) gid=1001(jenkins) groups=1001(jenkins),27(sudo)`,
    `[stdout] Linux soundmetrics-prod-01 5.15.0-105-generic #115-Ubuntu SMP`,
    `[stdout] /var/jenkins_home`,
    `[stdout]`,
    `[stdout] total 48`,
    `[stdout] drwxr-xr-x 1 jenkins jenkins 4096 Mar 12 03:12 .`,
    `[stdout] drwxr-xr-x 1 root    root    4096 Nov  3 09:00 ..`,
    `[stdout] -rw-r--r-- 1 jenkins jenkins  220 Nov  3 09:00 .bash_logout`,
    `[stdout] -rw-r--r-- 1 jenkins jenkins 3526 Nov  3 09:00 .bashrc`,
    `[stdout] drwxr-xr-x 2 jenkins jenkins 4096 Mar 12 03:12 builds`,
    `[stdout] drwxr-xr-x 3 jenkins jenkins 4096 Nov  3 09:00 config`,
    `[stdout] -rw------- 1 jenkins jenkins   38 Mar 12 02:58 .secret`,
    `[stdout]`,
    `[stdout] FLAG{webpack_bundle_p0is0ning_sm_2026}`,
    `[deploy-agent] Job completed with exit code 0.`,
  ];

  res.json({
    status: 'EXECUTED',
    pipeline_id: `deploy-${Date.now()}`,
    cmd_received: cmd,
    output: fakeOutput,
    exit_code: 0,
  });
});

const PORT = 8081;
app.listen(PORT, () =>
  console.log(`[Fake JFrog Artifactory] Repository online on port ${PORT}`)
);