# OPAQUE

OPAQUE is a self-hosted personal start page and homelab dashboard. It combines
bookmarks, applications, server metrics, weather, calendar, markets, media
services, and post feeds into a configurable dashboard.

The active application lives in [`web/`](web/). It is built with Next.js,
React, Postgres, Drizzle, and Auth.js.

## Features

- Personal dashboard with editable sections and draggable layout.
- Bookmark, application, and server cards with inline SVG icons.
- Server metrics pushed by a lightweight Linux agent.
- Today modules: weather, month calendar, and markets.
- Media modules: Plex, Jellyfin, Emby, Radarr, and Sonarr.
- Posts module with tabbed RSS, Hacker News, and Reddit sources.
- Auth.js credentials login with optional GitHub OAuth.
- Docker Compose deployment with Postgres and metric retention worker.

## Project Layout

```text
.
|-- web/                  # Next.js app
|   |-- src/              # App routes, components, data providers, db code
|   |-- drizzle/          # Database migrations
|   |-- scripts/          # Server agent and maintenance scripts
|   |-- Dockerfile
|   `-- docker-compose.yml
`-- README.md
```

## Requirements

- Node.js 22+
- npm
- Postgres 16+
- Docker and Docker Compose for container deployment

## Local Development

Start Postgres:

```bash
cd web
cp .env.example .env.local
docker compose up -d postgres
```

Edit `.env.local` and set at least:

```bash
DATABASE_URL=postgres://opaque:change-me@localhost:5432/opaque
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=http://localhost:3000
```

Generate a secret with:

```bash
openssl rand -base64 32
```

Install dependencies and run migrations:

```bash
npm install
npm run db:ensure
npm run db:migrate
npm run db:upgrade
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Deployment

The compose stack starts three services:

- `postgres`: Postgres database.
- `web`: Next.js app. It ensures the database exists, runs migrations, then starts.
- `retention`: hourly cleanup for old server metric samples.

Create a production env file:

```bash
cd web
cp .env.example .env
```

Edit `.env`:

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
AUTH_GITHUB_ID=your-github-oauth-client-id
AUTH_GITHUB_SECRET=your-github-oauth-client-secret
```

Start the stack:

```bash
docker compose up -d --build
```

Check logs:

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

Delete the database volume only when you intentionally want to erase all data:

```bash
docker compose down -v
```

### Reverse Proxy

Put OPAQUE behind HTTPS in production and set `AUTH_URL` to the public URL.
For example:

```text
https://opaque.example.com -> http://127.0.0.1:3000
```

## Dashboard Modules

Configure modules in dashboard edit mode, save the dashboard, then exit edit
mode to load live data.

- Weather: Open-Meteo forecast data. No API key required.
- Calendar: local month grid.
- Markets: Yahoo Finance chart data for symbols such as `SPY`, `BTC-USD`,
  `NVDA`, `AAPL`, and `MSFT`.
- Plex: Plex Media Server URL and Plex token.
- Jellyfin / Emby: server URL and API key.
- Radarr / Sonarr: server URL and API key.
- RSS: one or more RSS or Atom feed URLs.
- Reddit: subreddit Atom feeds.
- Hacker News: public Hacker News Firebase API.

Media service URLs are fetched by the server process, not the browser. They
must be reachable from the app container. Recent media poster images are served
through OPAQUE's authenticated image proxy so media tokens are not exposed in
browser image URLs.

## Server Metrics Agent

OPAQUE uses a push model for server telemetry. The dashboard never SSHes into
your machines; each monitored Linux server runs a lightweight agent that POSTs
metrics to OPAQUE with a per-server token.

Setup flow:

1. Add a server card in dashboard edit mode.
2. Save the dashboard so OPAQUE creates the server record.
3. Re-open the server editor and rotate an agent token.
4. Copy the generated `Agent id` and token to the target server.
5. Install the Linux systemd agent below.

The agent reports CPU, memory, root disk usage, aggregate non-loopback network
throughput, load average, uptime, cores, and temperature when Linux exposes it
through `/sys`.

For local development, run the mock agent from `web/`:

```bash
SERVER_ID=copied-agent-id \
SERVER_AGENT_TOKEN=copied-agent-token \
OPAQUE_URL=http://localhost:3000 \
npm run mock:server-agent
```

Run the bundled Linux agent:

```bash
sudo cp web/scripts/opaque-agent.sh /usr/local/bin/opaque-agent
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
journalctl -u opaque-agent.service -f
```

Troubleshooting:

- `401 unauthorized`: rotate a fresh token and update `/etc/opaque-agent.env`.
- `404 server not found`: save the dashboard after creating the server card,
  then rotate a token.
- Server card shows stale: the agent has not posted in the last 30 seconds.
- Temperature stays `0`: the host may not expose readable thermal sensors.

## Useful Commands

Run from `web/`:

```bash
npm run dev
npm run build
npm run lint
npm run check
npm run db:ensure
npm run db:migrate
npm run db:upgrade
npm run db:validate
npm run metrics:retention
```

Run the contract test while the app is running:

```bash
CONTRACT_BASE_URL=http://localhost:3000 npm run test:contract
```

Run the local mock server agent:

```bash
SERVER_ID=copied-agent-id \
SERVER_AGENT_TOKEN=copied-agent-token \
OPAQUE_URL=http://localhost:3000 \
npm run mock:server-agent
```

## Security Notes

- Do not commit `.env`, `.env.local`, service tokens, OAuth secrets, or agent
  tokens.
- Generate unique `AUTH_SECRET` and `POSTGRES_PASSWORD` values before deploying.
- Use dedicated API keys for Plex, Jellyfin, Emby, Radarr, and Sonarr when
  possible.
- OPAQUE stores dashboard module credentials in the database. Treat database
  backups as sensitive.
- Serve production deployments over HTTPS.

## License

No license has been declared yet. Add one before encouraging third-party reuse
or contributions.
