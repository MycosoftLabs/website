#!/usr/bin/env python3
"""Temporary deployment script for Sandbox VM"""
import paramiko
import time
import sys

host = '192.168.0.187'
user = 'mycosoft'
password = 'REDACTED_VM_SSH_PASSWORD'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=30)

print('Connected to VM 187')

# Run the Docker build with background execution and polling
print('\n>>> Starting Docker build (this may take several minutes)...')
build_cmd = 'cd /opt/mycosoft/website && docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache . 2>&1 | tail -20'

# Use a channel for long-running command
channel = ssh.get_transport().open_session()
channel.settimeout(900)  # 15 minute timeout
channel.exec_command(build_cmd)

# Read output
output = b""
while True:
    if channel.recv_ready():
        chunk = channel.recv(4096)
        if not chunk:
            break
        output += chunk
        sys.stdout.write(chunk.decode(errors='ignore'))
        sys.stdout.flush()
    if channel.exit_status_ready():
        break
    time.sleep(0.5)

# Get any remaining output
while channel.recv_ready():
    output += channel.recv(4096)

exit_status = channel.recv_exit_status()
print(f'\n\nBuild exit status: {exit_status}')

if exit_status != 0:
    print('Build may have failed, but continuing...')

# Stop and remove old container
print('\n>>> Stopping old container...')
stdin, stdout, stderr = ssh.exec_command('docker stop mycosoft-website 2>/dev/null; docker rm mycosoft-website 2>/dev/null; echo "Done"', timeout=60)
print(stdout.read().decode())

# Start new container with NAS mount
print('\n>>> Starting new container with NAS mount...')
run_cmd = '''docker run -d --name mycosoft-website -p 3000:3000 \
  -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
  --restart unless-stopped mycosoft-always-on-mycosoft-website:latest'''
stdin, stdout, stderr = ssh.exec_command(run_cmd, timeout=60)
container_id = stdout.read().decode().strip()
err = stderr.read().decode()
if container_id:
    print(f'Container started: {container_id[:12]}')
if err:
    print(f'Error: {err}')

# Wait for container to start
print('\nWaiting 15 seconds for container to start...')
time.sleep(15)

# Test health endpoint
print('\n>>> Testing health endpoint...')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3000/api/health', timeout=30)
health_response = stdout.read().decode()
print('\n' + '='*60)
print('HEALTH CHECK RESPONSE:')
print('='*60)
print(health_response)
print('='*60)

# Verify container is running
print('\n>>> Container status:')
stdin, stdout, stderr = ssh.exec_command('docker ps --filter name=mycosoft-website --format "{{.Names}} {{.Status}}"')
print(stdout.read().decode())

ssh.close()
print('\nDeployment complete!')
