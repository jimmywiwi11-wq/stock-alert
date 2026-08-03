param(
  [int]$Port = 8765,
  [switch]$NoOpen,
  [switch]$NoServer
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = "http://127.0.0.1:$Port/index.html"

function Test-LocalPort {
  param([int]$PortToCheck)
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync('127.0.0.1', $PortToCheck)
    if (-not $task.Wait(500)) { return $false }
    return $client.Connected
  }
  catch {
    return $false
  }
  finally {
    $client.Dispose()
  }
}

function Find-PythonCommand {
  $commands = @(
    @{ File = 'py'; Args = @('-3') },
    @{ File = 'python'; Args = @() },
    @{ File = 'python3'; Args = @() }
  )

  foreach ($candidate in $commands) {
    $cmd = Get-Command $candidate.File -ErrorAction SilentlyContinue
    if ($cmd) {
      return @{
        File = $cmd.Source
        Args = $candidate.Args
      }
    }
  }

  return $null
}

try {
  if (-not (Test-Path (Join-Path $ProjectRoot 'index.html'))) {
    throw "index.html was not found in $ProjectRoot"
  }

  $isRunning = Test-LocalPort -PortToCheck $Port
  if (-not $isRunning -and -not $NoServer) {
    $python = Find-PythonCommand
    if (-not $python) {
      throw 'Python was not found. Please install Python or start a local server manually.'
    }

    $arguments = @()
    $arguments += $python.Args
    $arguments += @('-m', 'http.server', "$Port", '--bind', '127.0.0.1')

    Start-Process -FilePath $python.File -ArgumentList $arguments -WorkingDirectory $ProjectRoot -WindowStyle Hidden | Out-Null

    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
      Start-Sleep -Milliseconds 250
      if (Test-LocalPort -PortToCheck $Port) {
        $ready = $true
        break
      }
    }

    if (-not $ready) {
      throw "Could not start local server on port $Port"
    }
  }

  if (-not $NoOpen) {
    $edgeCandidates = @(
      "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
    )
    $edge = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($edge) {
      Start-Process -FilePath $edge -ArgumentList @("--app=$Url")
    }
    else {
      Start-Process $Url
    }
  }

  Write-Host "ChokAnan Management System is ready: $Url"
}
catch {
  Write-Host ''
  Write-Host 'Could not open ChokAnan Management System'
  Write-Host $_.Exception.Message
  Write-Host ''
  Write-Host 'Please check that Python is installed and the selected port is available.'
  exit 1
}
