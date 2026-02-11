"""
Wait for build and restart container
Feb 5, 2026
"""

import paramiko
import time
from _cloudflare_cache import purge_everything

HOST = "192.168.0.187"
USER = "mycosoft"
PASS = "REDACTED_VM_SSH_PASSWORD"

def run_cmd(ssh, cmd):
    """Simple command runner"""
    channel = ssh.get_transport().open_session()
    channel.settimeout(30)
    channel.exec_command(cmd)
    while not channel.exit_status_ready():
        time.sleep(0.5)
    out = b""
    while channel.recv_ready():
        out += channel.recv(4096)
    exit_code = channel.recv_exit_status()
    channel.close()
    try:
        return out.decode("utf-8", errors="replace").strip(), exit_code
    except:
        return str(out), exit_code

def main():
    print("Connecting...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS)
    print("Connected!")
    
    # Wait for builds to finish
    print("\nWaiting for Docker builds to complete...")
    for i in range(180):  # 15 minutes max
        out, _ = run_cmd(ssh, "ps aux | grep 'docker build' | grep -v grep | wc -l")
        count = out.strip()
        if count == "0":
            print(f"\nBuild completed! (waited ~{i*5}s)")
            break
        if i % 12 == 0:
            print(f"  Building... (count={count}, {i*5}s)")
        time.sleep(5)
    else:
        print("Build still running after 15 min, proceeding anyway...")
    
    # Restart container
    print("\nStopping old container...")
    run_cmd(ssh, "docker stop mycosoft-website 2>/dev/null || true")
    
    print("Removing old container...")
    run_cmd(ssh, "docker rm mycosoft-website 2>/dev/null || true")
    
    print("Starting new container...")
    out, code = run_cmd(ssh, """docker run -d --name mycosoft-website -p 3000:3000 \
        -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
        --restart unless-stopped \
        mycosoft-always-on-mycosoft-website:latest""")
    
    if code == 0:
        print(f"Container started: {out[:12]}")
    else:
        print(f"Error: {out}")
        return
    
    # Wait and test
    print("\nWaiting for container...")
    time.sleep(10)
    
    print("\nTesting pages...")
    for page in ["/", "/test-fluid-search", "/api/search/unified?q=test"]:
        out, _ = run_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000{page}")
        status = "OK" if out == "200" else "FAIL"
        print(f"  {status}: {page} -> HTTP {out}")
    
    ssh.close()
    print("\nDone!")
    purge_everything()

if __name__ == "__main__":
    main()
