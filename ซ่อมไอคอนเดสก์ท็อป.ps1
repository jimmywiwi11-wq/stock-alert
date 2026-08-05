$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "ChokAnan Management System.lnk"
$Launcher = Join-Path $ProjectRoot "start_cms.bat"

if (!(Test-Path -LiteralPath $Launcher)) {
  throw "ไม่พบ start_cms.bat ใน $ProjectRoot"
}

$IconCandidates = @(
  (Join-Path $ProjectRoot "desktop\tax-invoice\assets\icons\icon.ico"),
  (Join-Path $ProjectRoot "icons\icon.ico"),
  (Join-Path $ProjectRoot "desktop\tax-invoice\assets\icons\favicon.ico")
)
$IconPath = $IconCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $Launcher
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description = "ChokAnan Management System"
if ($IconPath) {
  $Shortcut.IconLocation = "$IconPath,0"
}
$Shortcut.Save()

Write-Host "สร้างไอคอนใหม่แล้ว: $ShortcutPath"
