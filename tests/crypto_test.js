// Fast offline gate test: AES envelope round-trip, JWT sign/verify, flag value.
// Run: node tests/crypto_test.js   (no server required)
const assert = require('assert');
const crypto = require('crypto');
const c = require('../tollpay-api/crypto');
const db = require('../tollpay-api/db');

let n = 0; const ok = (m) => { console.log('  PASS', m); n++; };

// AES-256-ECB round-trip with the shipped key.
const sample = c.signJwt({ accountId: '1', scope: 'EXTERNAL', type: 'access_token', exp: Math.floor(Date.now()/1e3)+60 });
assert.strictEqual(c.aesDecrypt(c.aesEncrypt(sample)), sample, 'aes round-trip');
ok('AES-256-ECB wrap/unwrap round-trips');

// Key length is exactly 32 bytes (AES-256).
assert.strictEqual(c.AES_KEY.length, 32, 'aes key 32 bytes');
ok('AES key is 32 bytes');

// Valid signature verifies; tampered scope with the KNOWN secret still verifies (the bug);
// tampered signature with a wrong secret does not.
assert.ok(c.verifyJwt(sample).claims, 'valid jwt verifies');
const forged = c.signJwt({ accountId: '1', scope: 'ADMIN', type: 'access_token', exp: Math.floor(Date.now()/1e3)+60 });
assert.strictEqual(c.verifyJwt(forged).claims.scope, 'ADMIN', 'resign with leaked secret verifies');
const badSecretTok = (() => {
  const b64 = (b) => Buffer.from(b).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const data = b64(JSON.stringify({alg:'HS256',typ:'JWT'})) + '.' + b64(JSON.stringify({scope:'ADMIN'}));
  return data + '.' + b64(crypto.createHmac('sha256','not-the-secret').update(data).digest());
})();
assert.strictEqual(c.verifyJwt(badSecretTok), null, 'wrong-secret signature rejected');
ok('JWT verify: leaked secret forges any scope, wrong secret is rejected');

// Expired token is reported expired.
const expired = c.signJwt({ accountId: '1', scope: 'EXTERNAL', exp: Math.floor(Date.now()/1e3)-10 });
assert.strictEqual(c.verifyJwt(expired).expired, true, 'expired detected');
ok('expired tokens are detected');

// Flag is md5 of a rockyou word.
assert.strictEqual(db.FLAG_MD5, crypto.createHash('md5').update('iloveyou').digest('hex'), 'flag md5');
ok('flag == md5("iloveyou") (crackable with rockyou.txt)');

console.log(`\n${n} checks passed.`);
