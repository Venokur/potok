#!/bin/sh
set -eu

: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"

CONFIG_FILE=/usr/share/nginx/html/config.js

# Адрес Supabase по умолчанию не задаём: фронтенд берёт текущий origin,
# поэтому приложение работает на localhost без привязки к конкретному адресу.
cat > "$CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  supabaseUrl: "${SUPABASE_URL:-}",
  supabaseAnonKey: "${SUPABASE_ANON_KEY}"
};
EOF
