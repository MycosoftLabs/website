# ============================================================
# Register Dev Server Watchdog as a Windows Scheduled Task
# Feb 17, 2026
# ============================================================
# Run once (as admin or current user) to install the watchdog.
# After install it starts on login and auto-restarts on failure.
# ============================================================

$TaskName    = "Mycosoft-DevServerWatchdog"
$WatchdogScript = Join-Path $PSScriptRoot "dev-server-watchdog.ps1"
$Description = "Monitors localhost:3010 and auto-restarts the Next.js dev server if it crashes."

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$WatchdogScript`""

# Trigger: on login
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Settings: restart on failure, run indefinitely
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 10 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -Hidden

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description $Description `
    -Force

Write-Host ""
Write-Host "Scheduled task '$TaskName' registered successfully."
Write-Host "  - Starts automatically at login"
Write-Host "  - Monitors http://localhost:3010 every 30 seconds"
Write-Host "  - Auto-restarts dev server on crash"
Write-Host "  - Logs to: website/logs/dev-server-watchdog.log"
Write-Host ""

# Start it now immediately
Write-Host "Starting watchdog now..."
Start-ScheduledTask -TaskName $TaskName
Write-Host "Watchdog is running in the background."
