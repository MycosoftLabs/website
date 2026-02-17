#!/usr/bin/env python3
"""Check the search_taxa function in MINDEX container"""
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

# Check search_taxa function
print("=== search_taxa function in container ===")
out, err = run_ssh("""docker exec mindex-api grep -A 40 "async def search_taxa" /app/mindex_api/routers/unified_search.py""")
print(out or err)
