# Start BOTH dev server (3010) and CREP server (3020) in EXTERNAL windows
# NEVER run these inside Cursor — causes memory problems and can crash Cursor.
# Feb 11, 2026

$WebsiteRoot = $PSScriptRoot + "\.."
$WebsitePath = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website"

# Free ports if stale
$conn3010 = Get-NetTCPConnection -LocalPort 3010 -ErrorAction SilentlyContinue
$conn3020 = Get-NetTCPConnection -LocalPort 3020 -ErrorAction SilentlyContinue
if ($conn3010) {
    $conn3010 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Write-Host "Freed port 3010"
}
if ($conn3020) {
    $conn3020 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Write-Host "Freed port 3020"
}
Start-Sleep -Seconds 2

# Launch dev server hidden (no window pop-up)
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-NoExit", "-Command", "Set-Location '$WebsitePath'; npm run dev:next-only"
Write-Host "Started dev server (hidden) at http://localhost:3010"

# Launch CREP server hidden (no window pop-up)
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-NoExit", "-Command", "Set-Location '$WebsitePath'; npm run dev:crep"
Write-Host "Started CREP server (hidden) at http://localhost:3020/dashboard/crep"

Write-Host ""
Write-Host "Both servers are running in separate windows. Do NOT run them inside Cursor."
