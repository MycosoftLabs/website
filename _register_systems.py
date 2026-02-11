import os
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load credentials from environment variables
mindex_host = os.environ.get("MINDEX_VM_HOST", "192.168.0.189")
user = os.environ.get("MINDEX_VM_USER", "mycosoft")
passwd = os.environ.get("VM_PASSWORD")

if not passwd:
    print("ERROR: VM_PASSWORD environment variable is not set.")
    print("Please set it with: $env:VM_PASSWORD = 'your-password'")
    sys.exit(1)

print("Registering missing systems in MINDEX database...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(mindex_host, username=user, password=passwd, timeout=30)

# Register missing systems
sql = '''
-- Register PersonaPlex Bridge
INSERT INTO registry.systems (name, type, url, description, status)
VALUES ('PersonaPlex', 'voice', 'http://localhost:8999', 'PersonaPlex Voice Bridge - Moshi 7B Integration', 'active')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, description = EXCLUDED.description;

-- Register Moshi Server
INSERT INTO registry.systems (name, type, url, description, status)
VALUES ('Moshi', 'voice', 'http://localhost:8998', 'Moshi 7B Voice Model Server - RTX 5090', 'active')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, description = EXCLUDED.description;

-- Register n8n Workflow
INSERT INTO registry.systems (name, type, url, description, status)
VALUES ('n8n', 'automation', 'http://192.168.0.188:5678', 'n8n Workflow Automation Engine', 'active')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, description = EXCLUDED.description;

-- Register Proxmox Host
INSERT INTO registry.systems (name, type, url, description, status)
VALUES ('Proxmox', 'infrastructure', 'https://192.168.0.202:8006', 'Proxmox VE Hypervisor Host', 'active')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, description = EXCLUDED.description;

-- Register Grafana
INSERT INTO registry.systems (name, type, url, description, status)
VALUES ('Grafana', 'monitoring', 'http://192.168.0.187:3002', 'Grafana Metrics Dashboard', 'active')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, description = EXCLUDED.description;

-- Register Prometheus
INSERT INTO registry.systems (name, type, url, description, status)
VALUES ('Prometheus', 'monitoring', 'http://192.168.0.187:9090', 'Prometheus Metrics Collection', 'active')
ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, description = EXCLUDED.description;

-- Show all registered systems
SELECT name, type, url, status FROM registry.systems ORDER BY name;
'''

cmd = f"docker exec mindex-postgres psql -U mycosoft -d mindex -c \"{sql}\""
stdin, stdout, stderr = ssh.exec_command(cmd)
time.sleep(10)
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

ssh.close()
print("\nSystem registration complete!")
