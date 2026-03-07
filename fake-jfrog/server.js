const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Contraseña: jenkins-build-bot:artifactory_p@ssw0rd_8821! en base64, referencia por si algo falla lol demo gods ayuda
const EXPECTED_AUTH = "Basic amVua2lucy1idWlsZC1ib3Q6YXJ0aWZhY3RvcnlfcEBzc3cwcmRfODgyMSE=";

app.post('/internal/artifactory/npm-local/upload', (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader === EXPECTED_AUTH) {
    // TODO: Cambiar por algo más impactadoso
    console.log(`\n======================================================`);
    console.log(`[!] PWNED - JFROG PWNED`);
    console.log(`======================================================\n`);
    
    return res.status(200).json({ 
      status: "CRITICAL_SUPPLY_CHAIN_COMPROMISE", 
      message: "CRITICAL_SUPPLY_CHAIN_COMPROMISE" 
    });
  }

  console.log(`[x] Intento fallido de inyección. Credenciales incorrectas. Incidente reportado al SOCK.`);
  res.status(401).json({ error: "Unauthorized. Invalid Artifactory Credentials." });
});

const PORT = 8081;
app.listen(PORT, () => console.log(`[Fake JFrog] Honeypot listening on port ${PORT}`));
