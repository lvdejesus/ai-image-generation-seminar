#!/usr/bin/env bash
# Start the live proxy and a Cloudflare quick tunnel to it, then print the
# fragment to add to the site's address. Ctrl+C stops both.
#
# A quick tunnel needs no Cloudflare account. Its address is random and
# changes on every start, so run this before the talk and use the address
# it prints.
set -euo pipefail
cd "$(dirname "$0")/.."

export SEMINAR_TOKEN="${SEMINAR_TOKEN:-$(openssl rand -hex 16)}"
export SEMINAR_PORT="${SEMINAR_PORT:-8765}"
cloudflared="$(command -v cloudflared || echo server/.bin/cloudflared)"
log="$(mktemp)"

uv run server/proxy.py >/dev/null &
proxy=$!
"$cloudflared" tunnel --no-autoupdate --url "http://127.0.0.1:$SEMINAR_PORT" >"$log" 2>&1 &
tunnel=$!
trap 'kill "$proxy" "$tunnel" 2>/dev/null; rm -f "$log"' EXIT

url=""
for _ in $(seq 60); do
  url="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$log" | head -1 || true)"
  [ -n "$url" ] && break
  sleep 0.5
done
if [ -z "$url" ]; then
  echo "The tunnel did not come up:" >&2
  cat "$log" >&2
  exit 1
fi

echo "Live demo is reachable. Add this to the end of the site's address:"
echo
echo "#live=wss://${url#https://}/ws&token=$SEMINAR_TOKEN"
echo
wait
