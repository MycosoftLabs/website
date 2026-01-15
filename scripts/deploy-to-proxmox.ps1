# Mycosoft Proxmox Deployment Script
# Last Updated: 2026-01-15T14:30:00Z
# Version: 2.0.0
#
# This script creates a deployable snapshot and deploys to Proxmox VM
# Usage: .\deploy-to-proxmox.ps1 [-SnapshotOnly] [-DeployOnly]

param(
    [switch]$SnapshotOnly,
    [switch]$DeployOnly,
    [string]$ProxmoxHost = $env:PROXMOX_HOST,
    [string]$ProxmoxUser = $env:PROXMOX_USER,
    [int]$VmId = 200,
    [string]$SnapshotPath = ".\backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Mycosoft Proxmox Deployment Script" -ForegroundColor Cyan
Write-Host "  Timestamp: $timestamp" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Validate environment
if (-not $ProxmoxHost -and -not $SnapshotOnly) {
    Write-Error "PROXMOX_HOST environment variable or -ProxmoxHost parameter required"
}

# Create snapshot directory
if (-not (Test-Path $SnapshotPath)) {
    New-Item -ItemType Directory -Path $SnapshotPath | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage -ForegroundColor $(switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    })
    Add-Content -Path "$SnapshotPath\deployment.log" -Value $logMessage
}

function Create-Snapshot {
    Write-Log "Creating deployment snapshot..."
    
    # Build Docker images
    Write-Log "Building Docker images..."
    docker-compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Docker build failed" "ERROR"
        exit 1
    }
    
    # Export Docker images
    Write-Log "Exporting Docker images..."
    $images = docker-compose config --images
    $imageArchive = "$SnapshotPath\mycosoft-images-$timestamp.tar"
    
    docker save -o $imageArchive $images
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Docker save failed" "ERROR"
        exit 1
    }
    
    # Create configuration archive
    Write-Log "Creating configuration archive..."
    $configArchive = "$SnapshotPath\mycosoft-config-$timestamp.tar.gz"
    
    tar -czvf $configArchive `
        docker-compose.yml `
        .env.production `
        monitoring/ `
        migrations/ `
        services/
    
    # Create deployment manifest
    $manifest = @{
        version = "2.0.0"
        timestamp = $timestamp
        images = $imageArchive
        config = $configArchive
        checksums = @{
            images = (Get-FileHash $imageArchive -Algorithm SHA256).Hash
            config = (Get-FileHash $configArchive -Algorithm SHA256).Hash
        }
    }
    
    $manifest | ConvertTo-Json -Depth 5 | Set-Content "$SnapshotPath\manifest-$timestamp.json"
    
    Write-Log "Snapshot created successfully" "SUCCESS"
    Write-Log "  Images: $imageArchive"
    Write-Log "  Config: $configArchive"
    
    return @{
        ImageArchive = $imageArchive
        ConfigArchive = $configArchive
        Manifest = "$SnapshotPath\manifest-$timestamp.json"
    }
}

function Deploy-ToProxmox {
    param($Snapshot)
    
    Write-Log "Deploying to Proxmox VM $VmId..."
    
    # Upload files to Proxmox
    Write-Log "Uploading snapshot files..."
    scp $Snapshot.ImageArchive "${ProxmoxUser}@${ProxmoxHost}:/tmp/"
    scp $Snapshot.ConfigArchive "${ProxmoxUser}@${ProxmoxHost}:/tmp/"
    scp $Snapshot.Manifest "${ProxmoxUser}@${ProxmoxHost}:/tmp/"
    
    # Execute deployment on Proxmox
    Write-Log "Executing deployment on Proxmox..."
    
    $deployScript = @"
#!/bin/bash
set -e

echo "Stopping existing containers..."
cd /opt/mycosoft
docker-compose down || true

echo "Loading new images..."
docker load -i /tmp/$(Split-Path $Snapshot.ImageArchive -Leaf)

echo "Extracting configuration..."
tar -xzvf /tmp/$(Split-Path $Snapshot.ConfigArchive -Leaf) -C /opt/mycosoft

echo "Starting services..."
cd /opt/mycosoft
docker-compose up -d

echo "Verifying deployment..."
sleep 30
docker-compose ps

echo "Running health checks..."
curl -f http://localhost:3000/api/health || exit 1

echo "Deployment complete!"
"@

    $deployScript | ssh "${ProxmoxUser}@${ProxmoxHost}" "cat > /tmp/deploy.sh && chmod +x /tmp/deploy.sh && /tmp/deploy.sh"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Deployment failed" "ERROR"
        exit 1
    }
    
    Write-Log "Deployment to Proxmox VM $VmId completed successfully" "SUCCESS"
}

function Verify-Deployment {
    Write-Log "Verifying deployment..."
    
    # Check services
    $services = @(
        "http://localhost:3000/api/health",
        "http://localhost:8765/health"
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Log "  $service - OK" "SUCCESS"
            }
        }
        catch {
            Write-Log "  $service - FAILED" "ERROR"
        }
    }
}

# Main execution
try {
    if (-not $DeployOnly) {
        $snapshot = Create-Snapshot
    }
    
    if (-not $SnapshotOnly -and $ProxmoxHost) {
        Deploy-ToProxmox -Snapshot $snapshot
        Verify-Deployment
    }
    
    Write-Log "============================================" "SUCCESS"
    Write-Log "  Deployment completed successfully!" "SUCCESS"
    Write-Log "============================================" "SUCCESS"
}
catch {
    Write-Log "Deployment failed: $_" "ERROR"
    exit 1
}
