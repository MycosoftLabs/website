#!/usr/bin/env python3
"""Quick check of Sandbox VM status"""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Try direct connection first
host = '192.168.0.187'
user = 'mycosoft'
password = 'REDACTED_VM_SSH_PASSWORD'

print(f"Connecting directly to {host}...")

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=10)
    print("Connected directly!")
    
    # Check image creation time
    print("\n--- Docker Images ---")
    stdin, stdout, stderr = ssh.exec_command('docker images mycosoft-always-on-mycosoft-website --format "{{.Repository}}:{{.Tag}} Created: {{.CreatedSince}}"', timeout=30)
    print(stdout.read().decode())
    
    # Check container status
    print("\n--- Container Status ---")
    stdin, stdout, stderr = ssh.exec_command('docker ps -a --filter name=mycosoft-website --format "{{.Names}} {{.Status}}"', timeout=30)
    print(stdout.read().decode())
    
    # Check git commit
    print("\n--- Current Git Commit ---")
    stdin, stdout, stderr = ssh.exec_command('cd /opt/mycosoft/website && git log -1 --oneline', timeout=30)
    print(stdout.read().decode())
    
    ssh.close()
    
except Exception as e:
    print(f"Direct connection failed: {e}")
    print("\nTrying via MAS jump host...")
    
    try:
        mas_ssh = paramiko.SSHClient()
        mas_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        mas_ssh.connect('192.168.0.188', username=user, password=password, timeout=10)
        print("Connected to MAS")
        
        # Create channel to sandbox
        transport = mas_ssh.get_transport()
        channel = transport.open_channel("direct-tcpip", (host, 22), ('192.168.0.188', 22))
        
        sandbox_ssh = paramiko.SSHClient()
        sandbox_ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        sandbox_ssh.connect(host, username=user, password=password, sock=channel, timeout=10)
        print("Connected to Sandbox via MAS")
        
        # Check container status
        print("\n--- Container Status ---")
        stdin, stdout, stderr = sandbox_ssh.exec_command('docker ps -a --filter name=mycosoft-website --format "{{.Names}} {{.Status}}"', timeout=30)
        print(stdout.read().decode())
        
        # Check git commit
        print("\n--- Current Git Commit ---")
        stdin, stdout, stderr = sandbox_ssh.exec_command('cd /opt/mycosoft/website && git log -1 --oneline', timeout=30)
        print(stdout.read().decode())
        
        sandbox_ssh.close()
        mas_ssh.close()
        
    except Exception as e2:
        print(f"Jump connection also failed: {e2}")
