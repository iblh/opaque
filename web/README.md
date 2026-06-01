# OPAQUE Web

This is the consolidated OPAQUE web app. It uses Next.js, Postgres, Drizzle,
and Auth.js. Dashboard layout is stored as JSON in Postgres; server metrics are
stored separately so agent writes do not rewrite dashboard documents.

## Run Locally

Start Postgres:

```bash
docker compose up -d postgres
```

Install and run the app:

```bash
cp .env.example .env.local
npm install
npm run db:ensure
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

- `DATABASE_URL`: Postgres connection string.
- `AUTH_SECRET`: Secret used by Auth.js. Generate with `openssl rand -base64 32`.
- `AUTH_URL`: Public app URL, for local development usually `http://localhost:3000`.
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: optional GitHub OAuth credentials.
- `METRICS_RETENTION_DAYS`: number of days to keep metric samples, default `7`.

## Self-host

```bash
cp .env.example .env
docker compose up --build
```

The compose file starts:

- `postgres`: OPAQUE database.
- `web`: Next.js app; runs migrations before starting.
- `retention`: hourly cleanup for old metric samples.

## Server Metrics

OPAQUE uses an agent push model:

- Each remote server runs a lightweight agent.
- The agent posts metrics to `POST /api/server/metrics`.
- The dashboard polls `GET /api/server/metrics` every 5 seconds.
- Server cards are stale when no fresh metric has arrived for more than 30 seconds.

### 1. Add a server and create an agent token

1. Sign in to OPAQUE.
2. Enter edit mode.
3. Add a server card.
4. Save the dashboard.
5. Re-open the server editor and click `Rotate` under `Agent token`.
6. Copy the `Agent id` and the generated `Agent token`.

The token is only shown once. Rotate it again if it is lost.

### 2. Test locally with the mock agent

```bash
SERVER_ID=copied-agent-id \
SERVER_AGENT_TOKEN=copied-agent-token \
OPAQUE_URL=http://localhost:3000 \
npm run mock:server-agent
```

### 3. Manual metrics push

```bash
curl -fsS -X POST https://your-opaque-host/api/server/metrics \
  -H "Authorization: Bearer $SERVER_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "copied-agent-id",
    "stats": {
      "status": "online",
      "uptime": "5d 03h",
      "cores": 8,
      "load": [0.3, 0.5, 0.6],
      "cpu": 24.5,
      "memory": { "used": 8589934592, "total": 17179869184 },
      "disk": { "used": 120000000000, "total": 512000000000 },
      "network": { "in": 42000, "out": 21000 },
      "temperature": 48
    }
  }'
```

### 4. Linux agent script

Copy `scripts/opaque-agent.sh` to `/usr/local/bin/opaque-agent` on each Linux
server:

```bash
sudo cp scripts/opaque-agent.sh /usr/local/bin/opaque-agent
sudo chmod +x /usr/local/bin/opaque-agent
```

Create `/etc/opaque-agent.env`:

```bash
OPAQUE_URL=https://your-opaque-host
SERVER_ID=copied-agent-id
SERVER_AGENT_TOKEN=copied-agent-token
OPAQUE_INTERVAL_SECONDS=5
```

Create `/etc/systemd/system/opaque-agent.service`:

```ini
[Unit]
Description=Push OPAQUE server metrics
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/opaque-agent.env
ExecStart=/usr/local/bin/opaque-agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now opaque-agent.service
sudo systemctl status opaque-agent.service
journalctl -u opaque-agent.service -f
```

## API Shape

Agents write metrics:

```http
POST /api/server/metrics
Authorization: Bearer <SERVER_AGENT_TOKEN>
```

Logged-in dashboards read latest metrics:

```http
GET /api/server/metrics
```

Historical samples:

```http
GET /api/server/metrics/history?serverId=<agent-id>&range=24h
```

Rotate an agent token:

```http
POST /api/server/token/rotate
Content-Type: application/json

{ "serverId": "copied-agent-id" }
```

## Maintenance

Run metric retention manually:

```bash
npm run metrics:retention
```

The Docker Compose `retention` service runs this command hourly.

If your Postgres server is reachable but the configured database has not been
created yet, run:

```bash
npm run db:ensure
npm run db:migrate
```

## Tests

With the app running:

```bash
CONTRACT_BASE_URL=http://localhost:3000 npm run test:contract
```

## Troubleshooting

- `401 unauthorized`: the browser is not signed in, or the agent token is wrong/revoked.
- `404 server not found`: save the dashboard after creating the server card, then rotate a token.
- Server shows `stale`: the agent has not posted successfully in the last 30 seconds.
- `500 failed to ingest metrics`: check app logs and Postgres connectivity.
