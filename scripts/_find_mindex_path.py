#!/usr/bin/env python3
"""Find MINDEX path on VM and apply migrations."""
import paramiko
import sys

VM_HOST = "192.168.0.189"
VM_USER = "mycosoft"
VM_PASSWORD = "REDACTED_VM_SSH_PASSWORD"

def main():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VM_HOST, username=VM_USER, password=VM_PASSWORD, timeout=15)
        
        # Find where mindex code is
        print("[*] Finding MINDEX code location...")
        stdin, stdout, stderr = ssh.exec_command("find /home /opt -name 'mindex_api' -type d 2>/dev/null | head -5", timeout=30)
        paths = stdout.read().decode().strip()
        print(f"Found paths:\n{paths}")
        
        # Check docker compose setup
        print("\n[*] Checking docker-compose...")
        stdin, stdout, stderr = ssh.exec_command("find /home /opt -name 'docker-compose.yml' -path '*/mindex/*' 2>/dev/null | head -3", timeout=30)
        compose_paths = stdout.read().decode().strip()
        print(f"Compose files:\n{compose_paths}")
        
        # Check migration mount in postgres container
        print("\n[*] Checking postgres container migration mount...")
        stdin, stdout, stderr = ssh.exec_command("docker exec mindex-postgres ls -la /docker-entrypoint-initdb.d/ 2>&1 | tail -10", timeout=30)
        mount_check = stdout.read().decode()
        print(f"Mounted files:\n{mount_check}")
        
        # Check if tables already exist
        print("\n[*] Checking if tables exist...")
        stdin, stdout, stderr = ssh.exec_command("""docker exec mindex-postgres psql -U mycosoft -d mindex -c "\\dt bio.*" 2>&1""", timeout=30)
        tables = stdout.read().decode()
        print(f"bio schema tables:\n{tables}")
        
        ssh.close()
        return 0
        
    except Exception as e:
        print(f"[!] Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
