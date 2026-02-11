#!/usr/bin/env python3
"""Test sandbox pages - Feb 5, 2026"""

import os
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)

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
