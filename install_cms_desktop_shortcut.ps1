$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$Launcher = Join-Path $ProjectRoot 'start_cms.bat'
$Icon = Join-Path $ProjectRoot 'desktop\tax-invoice\chokanan_cms_logo.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'ChokAnan Management System.lnk'

try {
  if (-not (Test-Path -LiteralPath $Launcher -PathType Leaf)) {
    throw "Launcher was not found: $Launcher"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'index.html') -PathType Leaf)) {
    throw "index.html was not found in $ProjectRoot"
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $Launcher
  $shortcut.Arguments = ''
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.Description = 'Open ChokAnan Management System'
  $shortcut.WindowStyle = 1
  if (Test-Path -LiteralPath $Icon -PathType Leaf) {
    $shortcut.IconLocation = "$Icon,0"
  }
  $shortcut.Save()

  Write-Host "Shortcut created: $ShortcutPath"
  Write-Host "Target: $Launcher"
  Write-Host "Start in: $ProjectRoot"
}
catch {
  Write-Host ''
  Write-Host 'Could not create shortcut'
  Write-Host $_.Exception.Message
  exit 1
}
