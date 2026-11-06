#!/bin/sh
set -eu

docker compose logs tunnel 2>/dev/null |
  grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' |
  tail -n 1 ||
  {
    echo "Ссылка ещё не появилась. Подождите 10-20 секунд и запустите снова."
    exit 1
  }
