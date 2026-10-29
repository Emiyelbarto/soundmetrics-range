// TollPay shared crypto. Intentionally vulnerable lab code.
//
// Two secrets are relevant to the lab and BOTH are leaked in the frontend bundle:
//   AES_KEY     - AES-256-ECB key used to wrap the token envelope returned to the browser.
//   JWT_SECRET  - HS256 secret used to sign access/refresh tokens (labelled "signingKey"
//                 in the client bundle, where it is mis-described as a request signer).
const crypto = require('crypto');

const AES_KEY = Buffer.from(process.env.TP_AES_KEY || 'T0llP4y_C1ient_K3y_AES256_2026!!', 'utf8'); // 32 bytes
const JWT_SECRET = process.env.TP_JWT_SECRET || 'tollpay-signing-key-2026';

// --- AES-256-ECB token envelope (matches the ZipCash finding) ---
function aesEncrypt(plaintext) {
  const c = crypto.createCipheriv('aes-256-ecb', AES_KEY, null);
  return Buffer.concat([c.update(plaintext, 'utf8'), c.final()]).toString('base64');
}
function aesDecrypt(b64) {
  const d = crypto.createDecipheriv('aes-256-ecb', AES_KEY, null);
  return Buffer.concat([d.update(Buffer.from(b64, 'base64')), d.final()]).toString('utf8');
}

// --- Minimal JWT HS256 (no external deps) ---
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}
function signJwt(claims) {
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = b64urlJson(claims);
  const data = `${header}.${payload}`;
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
  return `${data}.${sig}`;
}
function verifyJwt(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
  // constant-time compare, but accept any payload the leaked secret can sign (that is the bug)
  if (expected.length !== parts[2].length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) {
    return null;
  }
  let claims;
  try { claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')); } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && now > claims.exp) return { expired: true, claims };
  return { claims };
}

module.exports = { AES_KEY, JWT_SECRET, aesEncrypt, aesDecrypt, signJwt, verifyJwt };
