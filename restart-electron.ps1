param(
  [switch]$UseExistingServers
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPort = 3001

function Stop-ScadaProcesses {
  $processes = Get-CimInstance Win32_Process |
    Where-Object {
      ($_.Name -match 'electron|node|esbuild|cmd') -and
      $_.CommandLine -like '*scada-water-pumping-station*'
    }

  if (-not $processes) {
    Write-Host 'No SCADA processes to stop.'
    return
  }

  $ids = $processes | Select-Object -ExpandProperty ProcessId -Unique
  Write-Host "Stopping SCADA processes: $($ids -join ', ')"
  Stop-Process -Id $ids -Force
  Start-Sleep -Seconds 2
}

function Start-DevServer {
  param(
    [string]$Title,
    [string]$Command
  )

  Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$projectRoot'; $Command"
  ) -WindowStyle Minimized | Out-Null
}

function Wait-ForHttp {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 2
      if ($response.StatusCode -ge 200) {
        return
      }
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Timeout waiting for HTTP server on port $Port."
}

function Wait-ForTcp {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
      if ($async.AsyncWaitHandle.WaitOne(1000) -and $client.Connected) {
        $client.EndConnect($async)
        $client.Close()
        return
      }
      $client.Close()
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Timeout waiting for TCP port $Port."
}

if (-not $UseExistingServers) {
  Stop-ScadaProcesses

  Write-Host 'Starting backend...'
  Start-DevServer -Title 'SCADA Backend' -Command 'cmd /c "npm --prefix backend run start"'

  Write-Host 'Starting frontend...'
  Start-DevServer -Title 'SCADA Frontend' -Command "cmd /c `"set ELECTRON_DEV=1&& set FRONTEND_PORT=$frontendPort&& npm --prefix frontend run start`""

  Write-Host 'Waiting for backend on port 3000...'
  Wait-ForTcp -Port 3000 -TimeoutSeconds 45

  Write-Host "Waiting for frontend on port $frontendPort..."
  Wait-ForHttp -Port $frontendPort -TimeoutSeconds 45
}

Write-Host 'Launching Electron...'
$env:ELECTRON_RUN_AS_NODE = $null
$env:ELECTRON_DEV = '1'
$env:FRONTEND_PORT = "$frontendPort"

Set-Location $projectRoot
cmd /c "npx electron ."
