/*! TollPay customer bundle (webpack build) — app.4f2a9c7b.js
 * Hand-written to imitate a compiled chunk: live UI helpers sit next to
 * dead code the tree-shaker never removed. Read it like source.
 */
(function () {
  "use strict";

  // API is served same-origin under /api (portal reverse-proxies it).
  // Works unchanged whether you reach the portal by IP, hostname or localhost.
  var API_BASE = "";

  // ---------------------------------------------------------------------------
  // TokenService: legacy client-side token handling.
  // The portal now unwraps tokens server-side, but this class shipped anyway.
  // ---------------------------------------------------------------------------
  function TokenService() {
    // AES-256-ECB key used to wrap the login token envelope. 32 ASCII chars.
    this.tokenFromUI = "T0llP4y_C1ient_K3y_AES256_2026!!";
    // HS256 secret for the request signer. Reused as the API's JWT signing key.
    this.signingKey = "tollpay-signing-key-2026";
  }
  // Dead code: old request signer (never wired to the live fetch path).
  TokenService.prototype.signRequest = function (payload) {
    return "HS256:" + this.signingKey + ":" + btoa(JSON.stringify(payload));
  };
  // Dead code: client-side envelope decrypt (ECB) kept for the old mobile webview.
  TokenService.prototype.decodeEnvelope = function (b64) {
    // Uses this.tokenFromUI as the AES-256-ECB key. See docs/python decoder.
    return "/* decrypt(b64, this.tokenFromUI) */";
  };

  // ---------------------------------------------------------------------------
  // Live UI
  // ---------------------------------------------------------------------------
  window.login = function (e) {
    e.preventDefault();
    var f = e.target;
    var msg = document.getElementById("loginMsg");
    // Authenticate. The API returns an AES-wrapped token envelope, not a JWT.
    fetch(API_BASE + "/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: f.username.value, password: f.password.value }),
    }).then(function (r) { return r.json(); })
      .then(function (env) {
        if (!env.access_token) { msg.textContent = env.error || "login failed"; return; }
        // Hand the envelope back to the portal to open the session.
        return fetch("/portal/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ envelope: env.access_token }),
        }).then(function (r) { return r.json(); })
          .then(function (o) {
            if (o.ok) { window.location = o.redirect || "/dashboard"; }
            else { msg.textContent = o.error || "login failed"; }
          });
      });
  };

  window.register = function (e) {
    e.preventDefault();
    var f = e.target;
    fetch(API_BASE + "/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: f.username.value, password: f.password.value,
        email: f.email.value, plate: f.plate.value, state: f.state.value,
      }),
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        document.getElementById("regMsg").textContent =
          j.accountId ? ("Created. accountId " + j.accountId + ", serial " + j.serialNumber) : (j.error || "error");
      });
  };

  window.payToll = function (e) {
    e.preventDefault();
    // Signed request to a user endpoint: the session JWT is the signed credential.
    fetch("/portal/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: e.target.amount.value }),
    }).then(function (r) { return r.json(); })
      .then(function (j) { document.getElementById("payResult").textContent = JSON.stringify(j); });
  };

  window.TollPay = { TokenService: TokenService, API_BASE: API_BASE || location.origin };
})();
