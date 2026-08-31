# Register a daily Launchpad collector task (SAM/radar). Honest-empty if SAM_API_KEY is unset.
# Does not invent opportunities. Run from the website repo.
#
#   powershell -File scripts/launchpad/register-collector-schedule.ps1

$ErrorActionPreference = "Stop"
$taskName = "Mycosoft-LaunchpadCollectors"
$website = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$tsx = Join-Path $website "scripts\launchpad\run-nightly-collectors.ts"
$log = Join-Path $website "data\launchpad-collectors.log"

New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

$action = "cd `"$website`"; npx --yes tsx `"$tsx`" *>> `"$log`""
$arg = "-NoProfile -ExecutionPolicy Bypass -Command $action"

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$sta = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
$stt = New-ScheduledTaskTrigger -Daily -At 2:15AM
$stp = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $sta -Trigger $stt -Principal $stp -Description "Launchpad SAM/radar collectors. Honest-empty without SAM_API_KEY." | Out-Null
Write-Host "Registered $taskName (daily 02:15). Log: $log"
Write-Host "SAM_API_KEY unset => collector exits 0 with no mock awards."
