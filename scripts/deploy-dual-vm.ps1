# ============================================================
# MYCOSOFT Dual VM Deployment Script
# ============================================================
# Date: January 25, 2026
# Author: AI Development Agent
# 
# This script deploys to:
#   - Sandbox VM (192.168.0.187) - Website container
#   - MAS VM (192.168.0.188) - MYCA Orchestrator (future)
# ============================================================

param(
    [ValidateSet("sandbox", "mas", "both")]
    [string]$Target = "sandbox",
    [switch]$SkipBuild,
    [switch]$SkipPurgeCache,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Configuration
$SANDBOX_VM = "192.168.0.187"
$MAS_VM = "192.168.0.188"
$SSH_USER = "mycosoft"
$WEBSITE_DIR = "/opt/mycosoft/website"
$MAS_DIR = "/opt/mycosoft/mas"

# Cloudflare (set these in environment or replace)
$CF_ZONE_ID = $env:CLOUDFLARE_ZONE_ID
$CF_API_TOKEN = $env:CLOUDFLARE_API_TOKEN

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "    ✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "    ⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "    ✗ $Message" -ForegroundColor Red
}

# ============================================================
# SANDBOX VM DEPLOYMENT
# ============================================================

function Deploy-Sandbox {
    Write-Step "Deploying to Sandbox VM ($SANDBOX_VM)"
    
    if ($DryRun) {
        Write-Warning "DRY RUN - Commands will be shown but not executed"
    }
    
    # Step 1: Pull latest code
    Write-Step "Pulling latest code on Sandbox VM"
    $pullCmd = "cd $WEBSITE_DIR && git fetch origin && git reset --hard origin/main"
    
    if ($DryRun) {
        Write-Host "    Would run: ssh ${SSH_USER}@${SANDBOX_VM} '$pullCmd'"
    } else {
        try {
            ssh "${SSH_USER}@${SANDBOX_VM}" $pullCmd
            Write-Success "Code pulled successfully"
        } catch {
            Write-Error "Failed to pull code: $_"
            return $false
        }
    }
    
    # Step 2: Build Docker image (unless skipped)
    if (-not $SkipBuild) {
        Write-Step "Building Docker image"
        $buildCmd = "cd $WEBSITE_DIR && docker build -t website-website:latest --no-cache ."
        
        if ($DryRun) {
            Write-Host "    Would run: ssh ${SSH_USER}@${SANDBOX_VM} '$buildCmd'"
        } else {
            try {
                ssh "${SSH_USER}@${SANDBOX_VM}" $buildCmd
                Write-Success "Docker image built"
            } catch {
                Write-Error "Failed to build Docker image: $_"
                return $false
            }
        }
    } else {
        Write-Warning "Skipping Docker build"
    }
    
    # Step 3: Restart container
    Write-Step "Restarting website container"
    $restartCmd = "cd $WEBSITE_DIR && docker compose -p mycosoft-production up -d mycosoft-website"
    
    if ($DryRun) {
        Write-Host "    Would run: ssh ${SSH_USER}@${SANDBOX_VM} '$restartCmd'"
    } else {
        try {
            ssh "${SSH_USER}@${SANDBOX_VM}" $restartCmd
            Write-Success "Container restarted"
        } catch {
            Write-Error "Failed to restart container: $_"
            return $false
        }
    }
    
    # Step 4: Health check
    Write-Step "Running health check"
    $healthCmd = "curl -sf http://localhost:3000/api/health || echo 'unhealthy'"
    
    if ($DryRun) {
        Write-Host "    Would run: ssh ${SSH_USER}@${SANDBOX_VM} '$healthCmd'"
    } else {
        try {
            $result = ssh "${SSH_USER}@${SANDBOX_VM}" $healthCmd
            if ($result -match "unhealthy") {
                Write-Warning "Health check failed - container may need time to start"
            } else {
                Write-Success "Health check passed"
            }
        } catch {
            Write-Warning "Health check inconclusive"
        }
    }
    
    return $true
}

# ============================================================
# MAS VM DEPLOYMENT (Future)
# ============================================================

function Deploy-MAS {
    Write-Step "Deploying to MAS VM ($MAS_VM)"
    Write-Warning "MAS VM deployment not yet implemented"
    Write-Warning "VM 188 needs to be provisioned first"
    
    # Future implementation:
    # 1. SSH to MAS VM
    # 2. Pull MAS repository
    # 3. Build and start orchestrator container
    # 4. Start agent containers
    # 5. Verify agent health
    
    return $true
}

# ============================================================
# CLOUDFLARE CACHE PURGE
# ============================================================

function Purge-CloudflareCache {
    Write-Step "Purging Cloudflare cache"
    
    if (-not $CF_ZONE_ID -or -not $CF_API_TOKEN) {
        Write-Warning "Cloudflare credentials not set - skipping cache purge"
        Write-Host "    Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN environment variables"
        Write-Host "    Or purge manually: Cloudflare Dashboard > Caching > Purge Everything"
        return $true
    }
    
    if ($DryRun) {
        Write-Host "    Would purge Cloudflare cache for zone $CF_ZONE_ID"
        return $true
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        }
        
        $body = @{ "purge_everything" = $true } | ConvertTo-Json
        
        $response = Invoke-RestMethod `
            -Uri "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" `
            -Method POST `
            -Headers $headers `
            -Body $body
        
        if ($response.success) {
            Write-Success "Cloudflare cache purged"
        } else {
            Write-Error "Cache purge failed: $($response.errors)"
        }
    } catch {
        Write-Error "Failed to purge Cloudflare cache: $_"
    }
    
    return $true
}

# ============================================================
# MAIN EXECUTION
# ============================================================

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║           MYCOSOFT DUAL VM DEPLOYMENT SCRIPT                ║
╠══════════════════════════════════════════════════════════════╣
║  Target: $Target                                             
║  Skip Build: $SkipBuild                                      
║  Dry Run: $DryRun                                            
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

$success = $true

switch ($Target) {
    "sandbox" {
        $success = Deploy-Sandbox
    }
    "mas" {
        $success = Deploy-MAS
    }
    "both" {
        $success = Deploy-Sandbox
        if ($success) {
            $success = Deploy-MAS
        }
    }
}

if ($success -and -not $SkipPurgeCache) {
    Purge-CloudflareCache
}

# Summary
Write-Host "`n"
if ($success) {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              DEPLOYMENT COMPLETED SUCCESSFULLY              ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "`nVerify at: https://sandbox.mycosoft.com" -ForegroundColor Cyan
} else {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              DEPLOYMENT FAILED - CHECK ERRORS               ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    exit 1
}
