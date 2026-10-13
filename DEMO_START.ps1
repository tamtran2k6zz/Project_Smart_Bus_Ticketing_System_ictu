param([int]$ApiPort=5010,[int]$WebPort=3010)
$ErrorActionPreference='Stop'
$projectRoot=$PSScriptRoot
$backendPath=Join-Path $projectRoot 'backend'
$frontendPath=Join-Path $projectRoot 'frontend'
$outputPath=Join-Path $backendPath 'demo-output'
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
foreach($port in @($ApiPort,$WebPort)) {
  $client=[System.Net.Sockets.TcpClient]::new()
  try { $client.Connect('127.0.0.1',$port);throw "Port $port đang được dùng. Chạy DEMO_STOP.ps1 hoặc chọn port khác." }
  catch [System.Net.Sockets.SocketException] {}
  finally { $client.Dispose() }
}
Push-Location $backendPath
try { & npm.cmd run build; if($LASTEXITCODE -ne 0){throw 'Backend build failed.'} } finally { Pop-Location }
$nodePath=(Get-Command node.exe).Source
$env:DEMO_API_PORT=[string]$ApiPort
$env:DEMO_FRONTEND_URL="http://127.0.0.1:$WebPort"
$env:VITE_APP_MODE='api'
$env:VITE_LOCAL_DEMO='true'
$env:VITE_API_BASE_URL='/api/smartbus/v1'
$env:VITE_DEV_API_TARGET="http://127.0.0.1:$ApiPort"
$env:VITE_LEGACY_APP='false'
$apiProcess=Start-Process -FilePath $nodePath -ArgumentList @('scripts/demo-api.cjs') -WorkingDirectory $backendPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $outputPath 'api.log') -RedirectStandardError (Join-Path $outputPath 'api-error.log')
$webProcess=Start-Process -FilePath $nodePath -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',[string]$WebPort,'--strictPort') -WorkingDirectory $frontendPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $outputPath 'web.log') -RedirectStandardError (Join-Path $outputPath 'web-error.log')
@{apiPid=$apiProcess.Id;webPid=$webProcess.Id;apiPort=$ApiPort;webPort=$WebPort;nodePath=$nodePath} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'processes.json') -Encoding utf8
Write-Output 'Đang chờ API khởi tạo database và frontend...'
$ready=$false
$deadline=(Get-Date).AddSeconds(60)
while((Get-Date) -lt $deadline) {
  if($apiProcess.HasExited -or $webProcess.HasExited){break}
  try {
    $health=Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/api/health" -TimeoutSec 2
    $web=Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort" -TimeoutSec 2 -UseBasicParsing
    if($health.status -eq 'UP' -and $web.StatusCode -eq 200){$ready=$true;break}
  } catch {}
  Start-Sleep -Milliseconds 500
}
if(-not $ready){ & (Join-Path $projectRoot 'DEMO_STOP.ps1');throw "Không khởi động được demo. Xem $outputPath/api-error.log và web-error.log." }
Write-Output "DEMO SẴN SÀNG: http://127.0.0.1:$WebPort"
& $nodePath (Join-Path $backendPath 'scripts/demo-prepare.cjs')
if($LASTEXITCODE -ne 0){throw 'Demo đã mở nhưng chuẩn bị vé thất bại. Xem log trên và chạy lại demo-prepare.cjs.'}
Write-Output 'Tài khoản: passenger/driver/conductor/manager/finance/admin/marketing@smartbus.demo'
Write-Output 'Mật khẩu demo: SmartBus123!'
Write-Output "Hộp thư demo: http://127.0.0.1:$ApiPort/demo-outbox"
