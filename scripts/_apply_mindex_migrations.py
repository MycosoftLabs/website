#!/usr/bin/env python3
"""
Apply Missing MINDEX Migrations - Feb 2026

Apply compounds and genetics migrations to MINDEX VM via SSH.
"""

import paramiko
import sys
import time

VM_HOST = "192.168.0.189"
VM_USER = "mycosoft"
VM_PASSWORD = "REDACTED_VM_SSH_PASSWORD"

def ssh_exec(ssh, command, description=""):
    """Execute SSH command and return output."""
    if description:
        print(f"\n{description}...")
    stdin, stdout, stderr = ssh.exec_command(command, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    if exit_code != 0:
        print(f"[!] Command failed (exit {exit_code})")
        if err:
            print(f"Error: {err[:500]}")
        return None
    
    if out:
        print(out[:1000])
    return out

def main():
    try:
        print(f"[*] Connecting to MINDEX VM ({VM_HOST})...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VM_HOST, username=VM_USER, password=VM_PASSWORD, timeout=15)
        
        # Check current migrations
        ssh_exec(ssh, "cd /opt/mindex && ls -la migrations/*.sql | tail -5", "Checking migration files")
        
        # Apply 0007_compounds migration
        print("\n[*] Applying 0007_compounds.sql...")
        result = ssh_exec(ssh, """
            docker exec mindex-postgres psql -U mycosoft -d mindex -f /docker-entrypoint-initdb.d/0007_compounds.sql 2>&1
        """, "Running compounds migration")
        
        if result is None:
            print("[!] Compounds migration failed or already applied")
        else:
            print("[+] Compounds migration applied")
        
        time.sleep(1)
        
        # Apply 0012_genetics migration
        print("\n[*] Applying 0012_genetics.sql...")
        result = ssh_exec(ssh, """
            docker exec mindex-postgres psql -U mycosoft -d mindex -f /docker-entrypoint-initdb.d/0012_genetics.sql 2>&1
        """, "Running genetics migration")
        
        if result is None:
            print("[!] Genetics migration failed or already applied")
        else:
            print("[+] Genetics migration applied")
        
        time.sleep(1)
        
        # Verify tables exist
        print("\n[*] Verifying tables...")
        result = ssh_exec(ssh, """
            docker exec mindex-postgres psql -U mycosoft -d mindex -c "SELECT COUNT(*) FROM bio.compound; SELECT COUNT(*) FROM bio.genetic_sequence;" 2>&1
        """, "Checking table counts")
        
        ssh.close()
        print("\n[+] Migration application complete")
        return 0
        
    except Exception as e:
        print(f"\n[!] Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
