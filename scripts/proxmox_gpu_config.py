#!/usr/bin/env python3
"""
Configure GPU passthrough on Proxmox for Sandbox VM
Uses Proxmox API
"""
import requests
import urllib3
import sys

# Disable SSL warnings for self-signed cert
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Proxmox configuration
PROXMOX_HOST = "192.168.0.202"
PROXMOX_URL = f"https://{PROXMOX_HOST}:8006/api2/json"
API_TOKEN = "root@pam!cursor_agent=bc1c9dc7-6fca-4e89-8a1d-557a9d117a3e"

# Find the Sandbox VM (192.168.0.187)
SANDBOX_VM_NAME = "mycosoft-sandbox"

def get_headers():
    return {
        "Authorization": f"PVEAPIToken={API_TOKEN}",
        "Content-Type": "application/json"
    }

def api_get(endpoint):
    """GET request to Proxmox API"""
    url = f"{PROXMOX_URL}{endpoint}"
    print(f"GET {endpoint}")
    try:
        resp = requests.get(url, headers=get_headers(), verify=False, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("data", [])
        else:
            print(f"  Error: {resp.status_code} - {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"  Exception: {e}")
        return None

def main():
    print("=" * 60)
    print("  Proxmox GPU Passthrough Configuration")
    print("=" * 60)
    
    # 1. Test connection
    print("\n>>> Testing Proxmox API connection...")
    version = api_get("/version")
    if version:
        print(f"  Connected! Proxmox version: {version.get('version', 'unknown')}")
    else:
        print("  Failed to connect to Proxmox API")
        print(f"  URL: {PROXMOX_URL}")
        print("  Check if:")
        print("    - Proxmox host is accessible")
        print("    - API token is valid")
        return 1
    
    # 2. Get nodes
    print("\n>>> Getting cluster nodes...")
    nodes = api_get("/nodes")
    if nodes:
        for node in nodes:
            print(f"  Node: {node.get('node')} - Status: {node.get('status')}")
    
    # 3. Get VMs
    print("\n>>> Getting VMs...")
    if nodes:
        node_name = nodes[0].get('node', 'pve')
        vms = api_get(f"/nodes/{node_name}/qemu")
        if vms:
            sandbox_vmid = None
            for vm in vms:
                name = vm.get('name', 'unknown')
                vmid = vm.get('vmid')
                status = vm.get('status')
                print(f"  VM {vmid}: {name} ({status})")
                if 'sandbox' in name.lower() or name == SANDBOX_VM_NAME:
                    sandbox_vmid = vmid
            
            if sandbox_vmid:
                print(f"\n>>> Found Sandbox VM: VMID {sandbox_vmid}")
                
                # Get VM config
                config = api_get(f"/nodes/{node_name}/qemu/{sandbox_vmid}/config")
                if config:
                    print("\n>>> Current VM Configuration:")
                    for key, value in config.items():
                        if key in ['hostpci0', 'hostpci1', 'cpu', 'cores', 'memory', 'machine']:
                            print(f"  {key}: {value}")
                    
                    if 'hostpci0' in config:
                        print("\n  [OK] GPU passthrough already configured!")
                    else:
                        print("\n  [INFO] No GPU passthrough configured")
                        print("  To add GPU passthrough, run on Proxmox host:")
                        print(f"    qm set {sandbox_vmid} -hostpci0 <pci-address>,pcie=1")
    
    # 4. Check for NVIDIA GPU on host
    print("\n>>> Checking for GPUs on Proxmox host...")
    print("  (This requires shell access - using API endpoints)")
    
    # Try to get hardware info via API
    if nodes:
        node_name = nodes[0].get('node', 'pve')
        # Get hardware PCI devices
        pci_devices = api_get(f"/nodes/{node_name}/hardware/pci")
        if pci_devices:
            nvidia_devices = [d for d in pci_devices if 'nvidia' in d.get('vendor_name', '').lower() 
                            or '10de' in d.get('vendor', '').lower()]
            if nvidia_devices:
                print(f"  Found {len(nvidia_devices)} NVIDIA device(s):")
                for dev in nvidia_devices:
                    print(f"    {dev.get('id')}: {dev.get('device_name', 'Unknown')}")
                    print(f"      Vendor: {dev.get('vendor_name', dev.get('vendor', 'Unknown'))}")
            else:
                print("  No NVIDIA GPUs found on Proxmox host")
                print("  The RTX 5090 may be on the Windows Dev PC, not Proxmox")
    
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print("""
Based on the infrastructure:
- RTX 5090 is on Windows Dev PC (192.168.0.172)
- Sandbox VM is on Proxmox without GPU passthrough
- GPU passthrough would require moving the GPU to a Proxmox host

For Earth-2 RTX with GPU:
1. Run GPU services on Windows Dev PC (has RTX 5090)
2. Run coordination services on Sandbox VM
3. Connect via API calls

Or for full VM deployment:
1. Move RTX 5090 to Proxmox server
2. Configure IOMMU and passthrough
3. Attach to Sandbox VM
""")

if __name__ == "__main__":
    main()
