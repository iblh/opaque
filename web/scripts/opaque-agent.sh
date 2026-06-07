#!/usr/bin/env bash
set -euo pipefail

: "${OPAQUE_URL:?missing OPAQUE_URL}"
: "${SERVER_ID:?missing SERVER_ID}"
: "${SERVER_AGENT_TOKEN:?missing SERVER_AGENT_TOKEN}"

opaque_url="${OPAQUE_URL%/}"
interval="${OPAQUE_INTERVAL_SECONDS:-5}"
if ! [[ "$interval" =~ ^[0-9]+$ ]] || (( interval < 2 )); then
  interval=5
fi

for command in awk curl df nproc sed sleep uptime; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'opaque-agent: missing required command: %s\n' "$command" >&2
    exit 1
  fi
done

json_escape() {
  sed 's/\\/\\\\/g; s/"/\\"/g'
}

read_cpu() {
  awk '/^cpu / {
    total = 0;
    for (i = 2; i <= NF; i++) total += $i;
    print total, $5;
  }' /proc/stat
}

read_memory() {
  awk '
    /^MemTotal:/ { total = $2 * 1024 }
    /^MemAvailable:/ { available = $2 * 1024 }
    END {
      if (!total) total = 0;
      if (!available) available = 0;
      used = total - available;
      if (used < 0) used = 0;
      printf "%.0f %.0f\n", total, used;
    }
  ' /proc/meminfo
}

read_net() {
  awk -F'[: ]+' '
    NR > 2 && $2 != "lo" {
      rx += $3;
      tx += $11;
    }
    END { print rx + 0, tx + 0 }
  ' /proc/net/dev
}

read_temperature() {
  local path raw value

  for path in /sys/class/thermal/thermal_zone*/temp /sys/class/hwmon/hwmon*/temp*_input; do
    [[ -r "$path" ]] || continue
    read -r raw < "$path" || continue
    [[ "$raw" =~ ^-?[0-9]+$ ]] || continue

    value="$(
      awk -v raw="$raw" 'BEGIN {
      value = raw;
      if (value > 1000 || value < -1000) value = value / 1000;
      if (value >= -50 && value <= 150) {
        printf "%.1f\n", value;
        exit 0;
      }
    }'
    )"
    if [[ -n "$value" ]]; then
      printf '%s\n' "$value"
      return 0
    fi
  done

  printf '0\n'
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

  local memory_total memory_used disk_total disk_used load1 load5 load15 ignored cores uptime_text temperature
  read -r memory_total memory_used < <(read_memory)
  read -r disk_total disk_used < <(df -B1 / | awk 'NR == 2 {print $2, $3}')
  read -r load1 load5 load15 ignored < /proc/loadavg
  cores="$(nproc)"
  uptime_text="$(uptime -p | sed 's/^up //')"
  temperature="$(read_temperature)"

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
    "temperature": $temperature
  }
}
JSON
)"

  curl -fsS --connect-timeout 5 --max-time 10 -X POST "$opaque_url/api/server/metrics" \
    -H "Authorization: Bearer $SERVER_AGENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

while true; do
  if ! collect_and_push; then
    printf 'opaque-agent: metrics push failed\n' >&2
  fi

  sleep "$(( interval - 1 ))"
done
