# Deploy Website to Sandbox VM
# Robust PowerShell deployment script

param(
    [string]$VMHost = "192.168.0.187",
    [string]$VMUser = "mycosoft"
)

# Load credentials
$credsFile = Join-Path $PSScriptRoot ".credentials.local"
if (Test-Path $credsFile) {
    Get-Content $credsFile | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$password = $env:VM_SSH_PASSWORD

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "DEPLOYING WEBSITE TO SANDBOX VM" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

# Test SSH connectivity first
Write-Host "`n[TEST] Checking SSH connectivity..." -ForegroundColor Cyan
$sshTest = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$VMUser@$VMHost" "echo OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cannot connect to VM via SSH" -ForegroundColor Red
    Write-Host "The VM may have hung Docker processes from a previous deployment." -ForegroundColor Yellow
    Write-Host "`nManual recovery steps:" -ForegroundColor Yellow
    Write-Host "1. Access VM via Proxmox console (https://192.168.0.100:8006)" -ForegroundColor White
    Write-Host "2. Login as mycosoft / REDACTED_VM_SSH_PASSWORD" -ForegroundColor White
    Write-Host "3. Run: sudo killall -9 dockerd docker" -ForegroundColor White
    Write-Host "4. Run: sudo systemctl restart docker" -ForegroundColor White
    Write-Host "5. Run: sudo systemctl restart sshd" -ForegroundColor White
    Write-Host "6. Re-run this script" -ForegroundColor White
    exit 1
}

Write-Host "[OK] SSH connection successful" -ForegroundColor Green

# Deploy steps
Write-Host "`n[STEP 1] Pull latest code" -ForegroundColor Cyan
ssh "$VMUser@$VMHost" "cd /opt/mycosoft/website && git fetch origin && git reset --hard origin/main"

Write-Host "`n[STEP 2] Stop old container (force kill)" -ForegroundColor Cyan
ssh "$VMUser@$VMHost" "docker kill mycosoft-website 2>/dev/null || true"
ssh "$VMUser@$VMHost" "docker rm -f mycosoft-website 2>/dev/null || true"
Start-Sleep -Seconds 2

Write-Host "`n[STEP 3] Build Docker image (10-15 minutes)" -ForegroundColor Cyan
Write-Host "Building with --no-cache..." -ForegroundColor Yellow
ssh "$VMUser@$VMHost" "cd /opt/mycosoft/website && docker build --no-cache -t mycosoft-always-on-mycosoft-website:latest ."

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n[STEP 4] Start new container" -ForegroundColor Cyan
$containerCmd = @"
docker run -d --name mycosoft-website -p 3000:3000 \
  -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
  -e MAS_API_URL=http://192.168.0.188:8001 \
  --restart unless-stopped \
  mycosoft-always-on-mycosoft-website:latest
"@

$containerId = ssh "$VMUser@$VMHost" $containerCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Container start failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Container started: $($containerId.Substring(0, 12))" -ForegroundColor Green

Write-Host "`n[STEP 5] Verify deployment" -ForegroundColor Cyan
Start-Sleep -Seconds 5

$status = ssh "$VMUser@$VMHost" "docker ps --filter name=mycosoft-website --format '{{.Status}}'"
if ($status -like "*Up*") {
    Write-Host "[OK] Container running: $status" -ForegroundColor Green
} else {
    Write-Host "[WARN] Container may not be healthy" -ForegroundColor Yellow
}

$httpCode = ssh "$VMUser@$VMHost" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
if ($httpCode -eq "200") {
    Write-Host "[OK] Website responding with HTTP 200" -ForegroundColor Green
} else {
    Write-Host "[WARN] HTTP status: $httpCode" -ForegroundColor Yellow
}

Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Purge Cloudflare cache for sandbox.mycosoft.com" -ForegroundColor White
Write-Host "2. Verify: https://sandbox.mycosoft.com/natureos/devices" -ForegroundColor White
Write-Host "3. Check MycoBrain devices display correctly" -ForegroundColor White
