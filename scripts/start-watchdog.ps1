# Start the Dev Server Watchdog as a background process - Feb 17, 2026
# Run this to launch the watchdog manually; it auto-starts on login via Windows Startup.

$ScriptDir   = $PSScriptRoot
$WatchdogScript = Join-Path $ScriptDir "dev-server-watchdog.ps1"
$WebsiteRoot = Split-Path $ScriptDir -Parent

# Kill any existing watchdog instances
$existing = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | 
    Where-Object { $_.CommandLine -match "dev-server-watchdog" }
foreach ($p in $existing) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Killed previous watchdog (PID $($p.ProcessId))"
}
Start-Sleep -Milliseconds 500

# Launch new watchdog
$proc = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", $WatchdogScript) `
    -WorkingDirectory $WebsiteRoot `
    -WindowStyle Hidden `
    -PassThru

Start-Sleep -Seconds 3

$running = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "Dev Server Watchdog is RUNNING (PID $($proc.Id))"
    Write-Host "  Monitors: http://localhost:3010"
    Write-Host "  Interval: every 30 seconds"
    Write-Host "  Log:      $WebsiteRoot\logs\dev-server-watchdog.log"
} else {
    Write-Host "ERROR: Watchdog exited immediately. Check the script for errors."
    exit 1
}
