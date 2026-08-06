param(
  [string]$Root,
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'

if (-not $Root) {
  $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$Root = (Resolve-Path -LiteralPath $Root).Path
if (-not (Test-Path -LiteralPath (Join-Path $Root 'index.html') -PathType Leaf)) {
  throw "index.html was not found in $Root"
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), $Port)
try {
  $listener.Start()
  Write-Host "ChokAnan local server listening at http://127.0.0.1:$Port/ from $Root"
}
catch {
  throw "Could not listen on port $Port. $($_.Exception.Message)"
}

function Get-MimeType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8'; break }
    '.js' { 'text/javascript; charset=utf-8'; break }
    '.css' { 'text/css; charset=utf-8'; break }
    '.json' { 'application/json; charset=utf-8'; break }
    '.png' { 'image/png'; break }
    '.ico' { 'image/x-icon'; break }
    '.svg' { 'image/svg+xml'; break }
    '.webmanifest' { 'application/manifest+json; charset=utf-8'; break }
    default { 'application/octet-stream' }
  }
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000
    $stream.WriteTimeout = 5000
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    do {
      $headerLine = $reader.ReadLine()
      if ($null -eq $headerLine) { break }
    } while ($headerLine.Length -gt 0)

    if (-not $requestLine) {
      continue
    }

    $parts = $requestLine.Split(' ')
    if ($parts.Length -lt 2 -or $parts[0] -notin @('GET', 'HEAD')) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
      Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' $body
      continue
    }

    $requestPath = [System.Uri]::UnescapeDataString(($parts[1] -split '\?')[0])
    if ($requestPath -eq '/') {
      $requestPath = '/index.html'
    }

    $relativePath = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $filePath = [System.IO.Path]::GetFullPath((Join-Path $Root $relativePath))

    if (-not $filePath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' $body
      continue
    }

    $bytes = if ($parts[0] -eq 'HEAD') { [byte[]]::new(0) } else { [System.IO.File]::ReadAllBytes($filePath) }
    Send-Response $stream 200 'OK' (Get-MimeType $filePath) $bytes
  }
  catch {
    try {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Server error')
      Send-Response $stream 500 'Internal Server Error' 'text/plain; charset=utf-8' $body
    }
    catch {}
  }
  finally {
    $client.Close()
  }
}
