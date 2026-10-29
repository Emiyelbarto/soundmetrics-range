/*! TollPay moderator bundle (webpack build) — tasks.9e1d55a0.js
 * Only served on the moderator /tasks page. Contains an internal integration
 * helper that was never meant to reach customer browsers.
 */
(function () {
  "use strict";

  // Internal TollTag provisioning integration. Moderators used this to
  // re-issue online access for a customer's physical TollTag.
  // NOTE(dev): this endpoint mints a token from accountId + SerialNumber only.
  // Do not expose externally. (It is exposed, same-origin under /api.)
  var TollTagAccess = {
    endpoint: "/api/v1/customers/{accountId}/setuponlineaccesstolltag",
    build: function (accountId, serialNumber) {
      return "/api/v1/customers/" + accountId +
        "/setuponlineaccesstolltag?SerialNumber=" + encodeURIComponent(serialNumber) +
        "&ActivitySource=external&PageNumber=1&PageSize=50&SortColumn=serialno&SortDirection=true";
    },
    issue: function (accountId, serialNumber) {
      return fetch(this.build(accountId, serialNumber)).then(function (r) { return r.json(); });
    },
  };

  // Live UI: add a task via the portal proxy.
  window.postTask = function (e) {
    e.preventDefault();
    var f = e.target;
    fetch("/portal/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: f.title.value, body: f.body.value }),
    }).then(function (r) { return r.json(); }).then(function () { window.location.reload(); });
  };

  window.TollPayMod = { TollTagAccess: TollTagAccess };
})();
