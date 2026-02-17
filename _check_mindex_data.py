#!/usr/bin/env python3
"""Check MINDEX database for data and test direct SQL"""
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

# Check taxon table count
print("=== Taxa Count ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT COUNT(*) FROM core.taxon;" """)
print(out or err)

# Check if taxa contain 'Amanita'
print("\n=== Taxa matching 'Amanita' (limit 3) ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT id, scientific_name, common_name FROM core.taxon WHERE scientific_name ILIKE '%Amanita%' OR common_name ILIKE '%Amanita%' LIMIT 3;" """)
print(out or err)

# Check compounds table
print("\n=== Compounds Count ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT COUNT(*) FROM core.compounds;" """)
print(out or err)

# Check genetics table
print("\n=== DNA Sequences Count ===")
out, err = run_ssh("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT COUNT(*) FROM core.dna_sequences;" """)
print(out or err)

# Check unified_search.py in container - see if it has logging
print("\n=== Check unified_search.py in container ===")
out, err = run_ssh("""docker exec mindex-api head -50 /app/mindex_api/routers/unified_search.py | tail -30""")
print(out or err)
