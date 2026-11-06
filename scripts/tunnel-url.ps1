$ErrorActionPreference = 'Stop'

$line = docker compose logs tunnel 2>$null |
  Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' |
  Select-Object -Last 1

if (-not $line) {
  Write-Host 'Ссылка ещё не появилась. Подождите 10-20 секунд и запустите снова.'
  exit 1
}

$url = [regex]::Match($line.Line, 'https://[a-z0-9-]+\.trycloudflare\.com').Value
Write-Host $url
