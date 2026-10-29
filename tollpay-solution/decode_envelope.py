#!/usr/bin/env python3
import base64
# pip install pycryptodome
import sys
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

KEY = b"T0llP4y_C1ient_K3y_AES256_2026!!"

blob = base64.b64decode(sys.argv[1])
jwt = unpad(AES.new(KEY, AES.MODE_ECB).decrypt(blob), AES.block_size)
print(jwt.decode())
