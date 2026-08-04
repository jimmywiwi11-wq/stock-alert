$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $ProjectRoot 'start_cms.bat'
$Icon = Join-Path $ProjectRoot 'desktop\tax-invoice\tax_invoice_icon.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'ChokAnan Management System.lnk'

try {
  if (-not (Test-Path $Launcher)) {
    throw "Launcher was not found: $Launcher"
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $Launcher
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.Description = 'Open ChokAnan Management System'
  if (Test-Path $Icon) {
    $shortcut.IconLocation = $Icon
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
