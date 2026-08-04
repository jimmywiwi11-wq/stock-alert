$ErrorActionPreference = "Stop"

$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppHtml = Join-Path $InstallDir "tax_invoice_app.html"
$IconPath = Join-Path $InstallDir "assets\icons\icon.ico"
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Tax Invoice App.lnk"

if (!(Test-Path -LiteralPath $AppHtml)) {
  throw "Cannot find tax_invoice_app.html in $InstallDir"
}
if (!(Test-Path -LiteralPath $IconPath)) {
  throw "Cannot find app icon at $IconPath"
}

$OldUrl = Join-Path $Desktop "Tax Invoice App V22.url"
$OldUrl2 = Join-Path $Desktop "Tax Invoice App.url"
foreach ($OldShortcut in @($ShortcutPath, $OldUrl, $OldUrl2)) {
  if (Test-Path -LiteralPath $OldShortcut) {
    Remove-Item -LiteralPath $OldShortcut -Force
  }
}

$EdgeCandidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$EdgePath = $EdgeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

if ($EdgePath) {
  $AppUrl = ([System.Uri]$AppHtml).AbsoluteUri
  $Shortcut.TargetPath = $EdgePath
  $Shortcut.Arguments = "--app=`"$AppUrl`""
} else {
  $Shortcut.TargetPath = $AppHtml
  $Shortcut.Arguments = ""
}

$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Description = "Tax Invoice App - Chok Anan Hardware"
$Shortcut.Save()

Write-Host "Created shortcut: $ShortcutPath"
Write-Host "Icon: $IconPath"
