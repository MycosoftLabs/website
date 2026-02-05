#!/usr/bin/env python3
import paramiko
import sys
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

VM_HOST = "192.168.0.187"
VM_USER = "mycosoft"
VM_PASS = "REDACTED_VM_SSH_PASSWORD"

def run_cmd(client, cmd, desc=""):
    if desc:
        print(f"\n>>> {desc}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n'):
            print(line.encode('ascii', 'replace').decode('ascii'))
    return exit_code, out

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    
    run_cmd(client, "docker logs e2cc-stub 2>&1 | tail -20", "E2CC Stub Logs")
    run_cmd(client, "docker logs e2cc-signaling 2>&1 | tail -10", "Signaling Logs")
    
    # Wait and try again
    print("\nWaiting 15 seconds for services to fully start...")
    time.sleep(15)
    
    run_cmd(client, "curl -s http://localhost:8211/health 2>/dev/null || echo 'Still starting...'", "E2CC Health")
    run_cmd(client, "curl -s http://localhost:8211/ 2>/dev/null || echo 'Not ready'", "E2CC Root")
    
    client.close()

if __name__ == "__main__":
    main()
