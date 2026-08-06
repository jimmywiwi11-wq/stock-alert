param(
  [string]$Root,
  [int]$Port = 8765,
  [switch]$NoOpen,
  [switch]$NoServer,
  [switch]$DebugMode
)

$ErrorActionPreference = 'Stop'

function Resolve-ProjectRoot {
  param([string]$RequestedRoot)

  if ([string]::IsNullOrWhiteSpace($RequestedRoot)) {
    $RequestedRoot = $PSScriptRoot
  }

  $resolved = (Resolve-Path -LiteralPath $RequestedRoot).Path
  if (-not (Test-Path -LiteralPath (Join-Path $resolved 'index.html') -PathType Leaf)) {
    throw "index.html was not found in $resolved"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $resolved 'Start-ChokAnan-CMS-Server.ps1') -PathType Leaf)) {
    throw "Server script was not found in $resolved"
  }

  return $resolved
}

function Test-LocalServer {
  param(
    [int]$PortToCheck,
    [string]$ExpectedTitle = 'Stock Alert'
  )

  $uri = "http://127.0.0.1:$PortToCheck/version.json?launcherCheck=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  try {
    $request = [System.Net.HttpWebRequest]::Create($uri)
    $request.Method = 'GET'
    $request.Timeout = 1200
    $request.ReadWriteTimeout = 1200
    $request.CachePolicy = [System.Net.Cache.RequestCachePolicy]::new([System.Net.Cache.RequestCacheLevel]::NoCacheNoStore)
    $response = $request.GetResponse()
    try {
      if ([int]$response.StatusCode -ne 200) { return $false }
      $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
      $body = $reader.ReadToEnd()
      return $body -match '"version"\s*:' -and $body -match [regex]::Escape($ExpectedTitle)
    }
    finally {
      if ($reader) { $reader.Dispose() }
      $response.Dispose()
    }
  }
  catch {
    return $false
  }
}

function Get-PortOwnerProcesses {
  param([int]$PortToCheck)

  $processIds = @()
  try {
    $processIds += Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $PortToCheck -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess
  }
  catch {
    try {
      $netstat = & netstat.exe -ano -p tcp 2>$null
      foreach ($line in $netstat) {
        if ($line -match "^\s*TCP\s+127\.0\.0\.1:$PortToCheck\s+\S+\s+LISTENING\s+(\d+)\s*$") {
          $processIds += [int]$matches[1]
        }
      }
    }
    catch {}
  }

  $processIds | Sort-Object -Unique | ForEach-Object {
    $processId = $_
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if ($process) {
      $process
    }
    else {
      $fallback = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if ($fallback) {
        [pscustomobject]@{
          ProcessId = $fallback.Id
          Name = $fallback.ProcessName
          CommandLine = ''
        }
      }
    }
  } | Where-Object { $_ }
}

function Stop-StaleCmsServerOnPort {
  param(
    [int]$PortToCheck,
    [string]$ProjectRoot
  )

  $owners = @(Get-PortOwnerProcesses -PortToCheck $PortToCheck)
  if (-not $owners.Count) { return $false }

  $normalizedRoot = $ProjectRoot.ToLowerInvariant()
  $staleOwners = @($owners | Where-Object {
    $command = [string]($_.CommandLine)
    $name = [string]($_.Name)
    ($command -match 'Start-ChokAnan-CMS-Server\.ps1') -or
    ($command.ToLowerInvariant().Contains($normalizedRoot.ToLowerInvariant()) -and $name -match 'powershell|pwsh')
  })

  if (-not $staleOwners.Count) {
    $details = ($owners | ForEach-Object { "$($_.ProcessId) $($_.Name) $($_.CommandLine)" }) -join "`n"
    throw "Port $PortToCheck is already in use, but it is not the ChokAnan local server. Close that program first.`n$details"
  }

  foreach ($owner in $staleOwners) {
    Write-Host "Stopping stale ChokAnan local server process $($owner.ProcessId)..."
    Stop-Process -Id $owner.ProcessId -Force -ErrorAction Stop
  }

  Start-Sleep -Milliseconds 500
  return $true
}

function Start-CmsServer {
  param(
    [string]$ProjectRoot,
    [int]$PortToUse,
    [switch]$ShowWindow
  )

  $serverScript = Join-Path $ProjectRoot 'Start-ChokAnan-CMS-Server.ps1'
  $powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$serverScript`" -Root `"$ProjectRoot`" -Port $PortToUse"

  $windowStyle = if ($ShowWindow) { 'Normal' } else { 'Hidden' }
  Start-Process -FilePath $powerShell -ArgumentList $arguments -WorkingDirectory $ProjectRoot -WindowStyle $windowStyle | Out-Null
}

function Wait-LocalServerReady {
  param([int]$PortToCheck)

  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalServer -PortToCheck $PortToCheck) { return $true }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Open-CmsBrowser {
  param([string]$UrlToOpen)

  $edgeCandidates = @(
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
  )
  $edge = $edgeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

  if ($edge) {
    Start-Process -FilePath $edge -ArgumentList @("--app=$UrlToOpen") | Out-Null
    return
  }

  Write-Host 'Microsoft Edge was not found. Opening with the default browser instead.'
  Start-Process $UrlToOpen | Out-Null
}

try {
  $ProjectRoot = Resolve-ProjectRoot -RequestedRoot $Root
  $Url = "http://127.0.0.1:$Port/index.html"
  Write-Host "ChokAnan Management System"
  Write-Host "Repository: $ProjectRoot"
  Write-Host "URL: $Url"

  $serverReady = Test-LocalServer -PortToCheck $Port
  if ($serverReady) {
    Write-Host "Local server is already running on port $Port."
  }
  elseif (-not $NoServer) {
    $owners = @(Get-PortOwnerProcesses -PortToCheck $Port)
    if ($owners.Count) {
      Stop-StaleCmsServerOnPort -PortToCheck $Port -ProjectRoot $ProjectRoot | Out-Null
    }

    Write-Host "Starting local server on port $Port..."
    Start-CmsServer -ProjectRoot $ProjectRoot -PortToUse $Port -ShowWindow:$DebugMode

    if (-not (Wait-LocalServerReady -PortToCheck $Port)) {
      $ownersAfterStart = @(Get-PortOwnerProcesses -PortToCheck $Port | ForEach-Object { "$($_.ProcessId) $($_.Name) $($_.CommandLine)" })
      $ownerText = if ($ownersAfterStart.Count) { $ownersAfterStart -join "`n" } else { 'No process is listening on the port.' }
      throw "Local server did not become ready within 10 seconds on port $Port.`n$ownerText"
    }
  }

  if (-not $NoOpen) {
    Open-CmsBrowser -UrlToOpen $Url
  }

  Write-Host "ChokAnan Management System is ready."
  exit 0
}
catch {
  Write-Host ''
  Write-Host 'Could not open ChokAnan Management System'
  Write-Host $_.Exception.Message
  Write-Host ''
  Write-Host 'This window will stay open so you can take a photo of the error.'
  exit 1
}
