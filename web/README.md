# OPAQUE Web

This directory contains the active OPAQUE web application.

Stack:

- Next.js 15 and React 19
- Postgres
- Drizzle ORM and migrations
- Auth.js
- Tailwind CSS

## Local Development

```bash
cp .env.example .env.local
docker compose up -d postgres
npm install
npm run db:ensure
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required local env:

```bash
DATABASE_URL=postgres://opaque:change-me@localhost:5432/opaque
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=http://localhost:3000
```

Generate a secret:

```bash
openssl rand -base64 32
```

## Docker Deployment

Create and edit the deploy env file:

```bash
cp .env.example .env
```

Set production values:

```bash
POSTGRES_DB=opaque
POSTGRES_USER=opaque
POSTGRES_PASSWORD=<generate-a-strong-password>
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=https://opaque.example.com
METRICS_RETENTION_DAYS=7
```

Optional GitHub OAuth:

```bash
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

Start the stack:

```bash
docker compose up -d --build
```

Inspect logs:

```bash
docker compose logs -f web
```

Upgrade:

```bash
git pull
docker compose up -d --build
```

Stop:

```bash
docker compose down
```

Delete all persisted database data:

```bash
docker compose down -v
```

## Environment Variables

- `DATABASE_URL`: local Postgres connection string used outside Docker.
- `POSTGRES_DB`: Docker Compose database name.
- `POSTGRES_USER`: Docker Compose database user.
- `POSTGRES_PASSWORD`: Docker Compose database password.
- `AUTH_SECRET`: Auth.js secret. Required.
- `AUTH_URL`: public application URL.
- `AUTH_GITHUB_ID`: optional GitHub OAuth client id.
- `AUTH_GITHUB_SECRET`: optional GitHub OAuth client secret.
- `METRICS_RETENTION_DAYS`: metric sample retention window, default `7`.

Do not commit `.env` or `.env.local`.

## Modules

The dashboard loads module data through authenticated server routes. Configure
a module in edit mode, save, then exit edit mode.

- Weather: Open-Meteo, no API key required.
- Calendar: local month view.
- Markets: Yahoo Finance chart data with compact sparklines.
- Plex: libraries, active streams, and recently added items with posters.
- Jellyfin / Emby: media folders, active streams, and recent items with posters.
- Radarr / Sonarr: collection status, missing queue, and recent posters.
- RSS: RSS or Atom feeds.
- Reddit: subreddit Atom feeds.
- Hacker News: public Firebase API.

Media images are loaded through `/api/modules/image` so service credentials do
not appear in browser image URLs.

## Server Metrics

OPAQUE uses an agent push model. The app does not SSH into your machines; each
monitored Linux server runs a lightweight agent that POSTs metrics to OPAQUE
with a per-server token.

1. Add a server card in edit mode.
2. Save the dashboard.
3. Re-open the server editor and rotate an agent token.
4. Copy the `Agent id` and generated token.
5. Configure the remote server agent.

The Linux agent reports CPU, memory, root disk usage, aggregate non-loopback
network throughput, load average, uptime, cores, and temperature when readable
thermal sensors are available.

Run the mock agent locally:

```bash
SERVER_ID=copied-agent-id \
SERVER_AGENT_TOKEN=copied-agent-token \
OPAQUE_URL=http://localhost:3000 \
npm run mock:server-agent
```

Install the Linux agent:

```bash
sudo cp scripts/opaque-agent.sh /usr/local/bin/opaque-agent
sudo chmod +x /usr/local/bin/opaque-agent
```

Create `/etc/opaque-agent.env`:

```bash
OPAQUE_URL=https://opaque.example.com
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

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test:contract
npm run db:ensure
npm run db:migrate
npm run metrics:retention
npm run mock:server-agent
```

Run contract tests with the app running:

```bash
CONTRACT_BASE_URL=http://localhost:3000 npm run test:contract
```

## Troubleshooting

- `set POSTGRES_PASSWORD in .env`: create `web/.env` and set `POSTGRES_PASSWORD`.
- `set AUTH_SECRET in .env`: set a generated `AUTH_SECRET`.
- `401 unauthorized`: sign in again, or check the server agent token.
- `404 server not found`: save the dashboard after creating a server card, then rotate a token.
- Server card shows stale: the agent has not posted in the last 30 seconds.
- Temperature stays `0`: the host may not expose readable thermal sensors.
- Media service cannot connect: confirm the URL is reachable from the app container.
