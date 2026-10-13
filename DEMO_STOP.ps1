$ErrorActionPreference='Stop'
$manifestPath=Join-Path $PSScriptRoot 'backend/demo-output/processes.json'
if(-not(Test-Path -LiteralPath $manifestPath)){Write-Output 'Chưa có tiến trình demo được ghi nhận.';exit}
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach($processId in @($manifest.apiPid,$manifest.webPid)){
  $process=Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  if($process -and $process.ExecutablePath -eq $manifest.nodePath -and ($process.CommandLine -match 'demo-api.cjs|vite/bin/vite.js')){
    Stop-Process -Id $processId
  }
}
Remove-Item -LiteralPath $manifestPath
Write-Output 'Đã dừng các tiến trình demo do DEMO_START.ps1 tạo. Database demo được tạo lại khi khởi động.'
