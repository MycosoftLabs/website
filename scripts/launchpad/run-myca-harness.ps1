param(
  [ValidateSet('init','once','run','inbox','status')]
  [string]$Command = 'once',
  [switch]$DryRun
)

# Local MYCA harness (WP-3). Config: python -m launchpad_myca_harness init
$Root = Join-Path $PSScriptRoot '..\..\services\launchpad-myca-harness' | Resolve-Path
Set-Location $Root
$extra = @()
if ($DryRun -and ($Command -eq 'once' -or $Command -eq 'run')) { $extra += '--dry-run' }
python -m launchpad_myca_harness $Command @extra
