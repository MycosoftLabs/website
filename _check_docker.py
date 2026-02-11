#!/usr/bin/env python3
"""Check Docker on sandbox VM"""

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

# Check running containers
print('Running containers:')
stdin, stdout, stderr = ssh.exec_command('docker ps --format "{{.Names}}: {{.Image}}"', timeout=30)
print(stdout.read().decode())

# Check docker compose projects
print('\nDocker compose projects:')
stdin, stdout, stderr = ssh.exec_command('docker compose ls', timeout=30)
print(stdout.read().decode())

# Check website container specifically
print('\nWebsite container details:')
stdin, stdout, stderr = ssh.exec_command('docker inspect mycosoft-website --format "Image: {{.Config.Image}}\nCreated: {{.Created}}"', timeout=30)
out = stdout.read().decode()
err = stderr.read().decode()
print(out if out else err)

ssh.close()
