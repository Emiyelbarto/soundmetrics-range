#!/usr/bin/env python3
import time
import sys
import json
# pip install pyjwt
import jwt

SECRET = "tollpay-signing-key-2026"

claims = json.loads(sys.argv[1])
claims["scope"] = sys.argv[2]

now = int(time.time())
claims["iat"] = now
claims["nbf"] = now
claims["exp"] = now + 3600

print(jwt.encode(claims, SECRET, algorithm="HS256"))
