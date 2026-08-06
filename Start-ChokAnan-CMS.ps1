param(
  [int]$Port = 8765,
  [switch]$NoOpen,
  [switch]$NoServer
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = "http://127.0.0.1:$Port/index.html"

function Update-ProjectFromGit {
  param([string]$Root)

  try {
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if (-not $git) { return $false }
    if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) { return $false }

    $status = & $git.Source -C $Root status --porcelain 2>$null
    if ($LASTEXITCODE -ne 0) { return $false }

    # Never overwrite local edits. Pull only when the working tree is clean.
    if ($status) {
      Write-Host 'Git update skipped because local files have uncommitted changes.'
      return $false
    }

    & $git.Source -C $Root fetch origin --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { return $false }

    $branch = (& $git.Source -C $Root rev-parse --abbrev-ref HEAD 2>$null).Trim()
    if (-not $branch -or $branch -eq 'HEAD') { $branch = 'main' }

    & $git.Source -C $Root merge --ff-only "origin/$branch" --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'Git update was not applied because the branch cannot fast-forward safely.'
      return $false
    }

    Write-Host 'Program files are updated from Git.'
    return $true
  }
  catch {
    Write-Host "Git update skipped: $($_.Exception.Message)"
    return $false
  }
}

function Test-LocalServer {
  param([int]$PortToCheck)
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync('127.0.0.1', $PortToCheck)
    if (-not $task.Wait(500)) { return $false }
    if (-not $client.Connected) { return $false }

    $stream = $client.GetStream()
    $stream.ReadTimeout = 1000
    $request = [System.Text.Encoding]::ASCII.GetBytes("GET /version.json HTTP/1.1`r`nHost: 127.0.0.1`r`nConnection: close`r`n`r`n")
    $stream.Write($request, 0, $request.Length)

    $buffer = [byte[]]::new(12)
    $count = $stream.Read($buffer, 0, $buffer.Length)
    if ($count -le 0) { return $false }

    $status = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $count)
    return $status.StartsWith('HTTP/1.1 200')
  }
  catch {
    return $false
  }
  finally {
    $client.Dispose()
  }
}

try {
  if (-not (Test-Path (Join-Path $ProjectRoot 'index.html'))) {
    throw "index.html was not found in $ProjectRoot"
  }

  # Refresh application source files before opening. This does not touch
  # browser localStorage, IndexedDB, Firestore, products, or customers.
  Update-ProjectFromGit -Root $ProjectRoot | Out-Null

  $isRunning = Test-LocalServer -PortToCheck $Port
  if (-not $isRunning -and -not $NoServer) {
    $serverScript = Join-Path $ProjectRoot 'Start-ChokAnan-CMS-Server.ps1'
    if (-not (Test-Path -LiteralPath $serverScript)) {
      throw "Server script was not found: $serverScript"
    }

    $powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$serverScript`" -Root `"$ProjectRoot`" -Port $Port"

    Start-Process -FilePath $powerShell -ArgumentList $arguments -WorkingDirectory $ProjectRoot -WindowStyle Hidden | Out-Null

    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
      Start-Sleep -Milliseconds 250
      if (Test-LocalServer -PortToCheck $Port) {
        $ready = $true
        break
      }
    }

    if (-not $ready) {
      throw "Could not start local server on port $Port"
    }
  }

  if (-not $NoOpen) {
    $cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $openUrl = "$Url?desktopBuild=$cacheBust"
    $edgeCandidates = @(
      "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
    )
    $edge = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($edge) {
      Start-Process -FilePath $edge -ArgumentList @("--app=$openUrl")
    }
    else {
      Start-Process $openUrl
    }
  }

  Write-Host "ChokAnan Management System is ready: $Url"
}
catch {
  Write-Host ''
  Write-Host 'Could not open ChokAnan Management System'
  Write-Host $_.Exception.Message
  Write-Host ''
  Write-Host 'Please check that the selected port is available.'
  exit 1
}
