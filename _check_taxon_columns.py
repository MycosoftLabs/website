#!/usr/bin/env python3
"""Check actual column names in core.taxon table"""
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

# Check taxon table columns
print("=== core.taxon columns ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'core' AND table_name = 'taxon' ORDER BY ordinal_position;" """)
print(out or err)

# Test the exact query that search_taxa would run
print("\n=== Test search query with canonical_name ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT id, canonical_name, common_name FROM core.taxon WHERE canonical_name ILIKE '%Amanita%' LIMIT 3;" 2>&1""")
print(out or err)

# Test with scientific_name
print("\n=== Test search query with scientific_name ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT id, scientific_name, common_name FROM core.taxon WHERE scientific_name ILIKE '%Amanita%' LIMIT 3;" 2>&1""")
print(out or err)
