$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $ProjectRoot 'Start-ChokAnan-CMS.ps1'
$Icon = Join-Path $ProjectRoot 'desktop\tax-invoice\chokanan_cms_logo.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'ChokAnan Management System.lnk'

try {
  if (-not (Test-Path $Launcher)) {
    throw "Launcher was not found: $Launcher"
  }

  $powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $powerShell
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`""
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.Description = 'Open ChokAnan Management System'
  $shortcut.WindowStyle = 7
  if (Test-Path $Icon) {
    $shortcut.IconLocation = "$Icon,0"
  }
  $shortcut.Save()

  Write-Host "Shortcut created: $ShortcutPath"
}
catch {
  Write-Host ''
  Write-Host 'Could not create shortcut'
  Write-Host $_.Exception.Message
  exit 1
}
