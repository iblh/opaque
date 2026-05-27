#!/usr/bin/env bash
set -euo pipefail

: "${OPAQUE_URL:?missing OPAQUE_URL}"
: "${SERVER_ID:?missing SERVER_ID}"
: "${SERVER_INGEST_TOKEN:?missing SERVER_INGEST_TOKEN}"

interval="${OPAQUE_INTERVAL_SECONDS:-5}"
if ! [[ "$interval" =~ ^[0-9]+$ ]] || (( interval < 2 )); then
  interval=5
fi

json_escape() {
  sed 's/\\/\\\\/g; s/"/\\"/g'
}

read_cpu() {
  awk '/^cpu / {print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat
}

read_net() {
  awk -F'[: ]+' 'NR > 2 && $2 != "lo" {rx += $3; tx += $11} END {print rx+0, tx+0}' /proc/net/dev
}

collect_and_push() {
  local total1 idle1 total2 idle2 rx1 tx1 rx2 tx2
  read -r total1 idle1 < <(read_cpu)
  read -r rx1 tx1 < <(read_net)
  sleep 1
  read -r total2 idle2 < <(read_cpu)
  read -r rx2 tx2 < <(read_net)

  local cpu_percent
  cpu_percent="$(
    awk \
      -v total1="$total1" -v idle1="$idle1" \
      -v total2="$total2" -v idle2="$idle2" \
      'BEGIN {
        total = total2 - total1;
        idle = idle2 - idle1;
        printf "%.1f", total > 0 ? (100 * (total - idle) / total) : 0;
      }'
  )"

  local network_in=$((rx2 - rx1))
  local network_out=$((tx2 - tx1))
  (( network_in < 0 )) && network_in=0
  (( network_out < 0 )) && network_out=0

  local memory_total memory_used disk_total disk_used load1 load5 load15 ignored cores uptime_text
  read -r memory_total memory_used < <(free -b | awk '/Mem:/ {print $2, $3}')
  read -r disk_total disk_used < <(df -B1 / | awk 'NR == 2 {print $2, $3}')
  read -r load1 load5 load15 ignored < /proc/loadavg
  cores="$(nproc)"
  uptime_text="$(uptime -p | sed 's/^up //')"

  local escaped_server_id escaped_uptime payload
  escaped_server_id="$(printf '%s' "$SERVER_ID" | json_escape)"
  escaped_uptime="$(printf '%s' "$uptime_text" | json_escape)"

  payload="$(cat <<JSON
{
  "serverId": "$escaped_server_id",
  "stats": {
    "status": "online",
    "uptime": "$escaped_uptime",
    "cores": $cores,
    "load": [$load1, $load5, $load15],
    "cpu": $cpu_percent,
    "memory": { "used": $memory_used, "total": $memory_total },
    "disk": { "used": $disk_used, "total": $disk_total },
    "network": { "in": $network_in, "out": $network_out },
    "temperature": 0
  }
}
JSON
)"

  curl -fsS -X POST "$OPAQUE_URL/api/server/metrics" \
    -H "Authorization: Bearer $SERVER_INGEST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

while true; do
  if ! collect_and_push; then
    printf 'opaque-agent: metrics push failed\n' >&2
  fi

  sleep "$(( interval - 1 ))"
done
