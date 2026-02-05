#!/usr/bin/env python3
"""Test sandbox pages - Feb 5, 2026"""

import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.0.187', username='mycosoft', password='REDACTED_VM_SSH_PASSWORD', timeout=30)

pages = [
    "/",
    "/test-fluid-search",
    "/search?q=mushroom",
    "/api/search/unified?q=amanita&limit=3",
]

print("Testing sandbox pages:\n")
for page in pages:
    stdin, stdout, stderr = ssh.exec_command(f'curl -s -o /dev/null -w "%{{http_code}}" http://localhost:3000{page}', timeout=30)
    code = stdout.read().decode().strip()
    status = "✅" if code == "200" else "❌"
    print(f"  {status} {page}: HTTP {code}")

ssh.close()
print("\n Done!")
