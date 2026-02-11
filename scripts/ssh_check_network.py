#!/usr/bin/env python3
"""
Check network and firewall on Sandbox VM
"""
import os
import paramiko
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Load credentials from environment variables
VM_HOST = os.environ.get("SANDBOX_VM_HOST", "192.168.0.187")
VM_USER = os.environ.get("SANDBOX_VM_USER", "mycosoft")
VM_PASS = os.environ.get("VM_PASSWORD")

if not VM_PASS:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

def run_cmd(client, cmd, desc=""):
    if desc:
        print(f"\n>>> {desc}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:20]:
            print(line.encode('ascii', 'replace').decode('ascii'))
    if err:
        print(f"[err] {err[:150].encode('ascii', 'replace').decode('ascii')}")
    return exit_code, out, err

def run_sudo(client, cmd, desc=""):
    return run_cmd(client, f"echo '{VM_PASS}' | sudo -S {cmd}", desc)

def main():
    print("=" * 60)
    print("  Checking Network Configuration")
    print("=" * 60)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VM_HOST, username=VM_USER, password=VM_PASS, timeout=30)
    print("Connected!")
    
    # Check Docker container
    run_cmd(client, "docker ps --filter 'name=earth2' --format '{{.Names}} {{.Ports}}'", "Earth2 containers")
    
    # Test localhost access
    run_cmd(client, "curl -s http://127.0.0.1:8210/ 2>&1 | head -3", "Test localhost:8210")
    run_cmd(client, "curl -s http://0.0.0.0:8210/ 2>&1 | head -3", "Test 0.0.0.0:8210")
    
    # Check netstat
    run_cmd(client, "netstat -tlpn 2>/dev/null | grep 8210 || ss -tlpn | grep 8210", "Port 8210 binding")
    
    # Check UFW
    run_sudo(client, "ufw status 2>/dev/null || echo 'UFW not installed'", "UFW firewall status")
    
    # Check iptables
    run_sudo(client, "iptables -L INPUT -n | head -15", "iptables INPUT rules")
    
    # Check if Docker has network access
    run_cmd(client, "docker inspect earth2-api-gateway --format '{{.NetworkSettings.Ports}}' 2>/dev/null", "Docker port mapping")
    
    # Try with the VM's IP
    run_cmd(client, "curl -s http://192.168.0.187:8210/ 2>&1 | head -3", "Test external IP:8210")
    
    client.close()
    
    print("\n" + "=" * 60)
    print("  Network Check Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
