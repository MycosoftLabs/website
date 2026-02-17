#!/usr/bin/env python3
"""Check MINDEX API logs via SSH"""
import paramiko

VM_IP = "192.168.0.189"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"

def run_ssh(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(VM_IP, username=VM_USER, password=VM_PASS, timeout=30)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        return stdout.read().decode(), stderr.read().decode()
    finally:
        client.close()

# Get last 30 lines of mindex-api logs
print("=== MINDEX API Logs (last 30 lines) ===")
out, err = run_ssh("docker logs mindex-api --tail 30 2>&1")
print(out or err)
