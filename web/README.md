# OPAQUE Web

This is the consolidated OPAQUE frontend. It keeps the restrained Next/React visual system from `react-frontend` and restores the useful dashboard editing flow from the older Svelte app.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

- `MONGO_URL`: MongoDB connection string. The app uses the `opaque` database.
- `JWT_SECRET`: Secret used to sign session tokens.
- `SERVER_INGEST_TOKEN`: Shared token accepted by `/api/server/metrics` for server status ingestion.

## Notes

- Login accepts either email or username, so old Svelte-era accounts can still be used.
- Dashboard data is stored in `dashboards.forest`. Older records without `forest` are normalized on read.
- Bookmark groups, applications, and servers can be edited, reordered where supported, added, removed, reset, and saved from the header edit controls.

## Server Metrics

OPAQUE shows near-live server status with an agent push model:

- Each remote server runs a lightweight agent.
- The agent posts metrics to `POST /api/server/metrics` every few seconds.
- The dashboard polls `GET /api/server/metrics` every 5 seconds and merges fresh stats into the visible server cards.
- Server cards are marked stale when no fresh metrics have arrived for more than 30 seconds.

### 1. Configure OPAQUE

Set these variables on the machine running the web app:

```bash
MONGO_URL=mongodb://127.0.0.1:27017/opaque
JWT_SECRET=replace-with-a-long-random-string
SERVER_INGEST_TOKEN=replace-with-a-long-random-token
```

Restart the web app after changing environment variables.

### 2. Add a server in the dashboard

1. Open the dashboard and enter edit mode.
2. Add a server card.
3. Fill in `Name`, `URL`, and `SVG icon`.
4. Copy the `Agent id` shown in the server edit panel.
5. Save the dashboard.

Saving matters: `/api/server/metrics` can only update server cards that already exist in MongoDB.

### 3. Test locally with the mock agent

Start the web app, then run the mock agent in another terminal:

```bash
SERVER_ID=copied-agent-id \
SERVER_INGEST_TOKEN=replace-with-the-same-token-used-by-the-web-app \
OPAQUE_URL=http://localhost:3000 \
npm run mock:server-agent
```

The mock agent posts changing CPU, memory, network, load, and uptime values every 2 seconds. Leave the dashboard open; the server card should update without refreshing the browser.

### 4. Test one manual metrics push

From the remote server, replace the host, token, and copied agent id:

```bash
curl -fsS -X POST https://your-opaque-host/api/server/metrics \
  -H "Authorization: Bearer $SERVER_INGEST_TOKEN" \
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

### 5. Linux agent script

Copy `scripts/opaque-agent.sh` to `/usr/local/bin/opaque-agent` on each Linux server:

```bash
sudo cp scripts/opaque-agent.sh /usr/local/bin/opaque-agent
sudo chmod +x /usr/local/bin/opaque-agent
```

The agent runs continuously. It reads:

- `OPAQUE_URL`: OPAQUE web app URL.
- `SERVER_ID`: copied Agent id from the dashboard.
- `SERVER_INGEST_TOKEN`: same token configured on the web app.
- `OPAQUE_INTERVAL_SECONDS`: optional push interval, default `5`.

### 6. Run the Linux agent with systemd

Create `/etc/opaque-agent.env`:

```bash
OPAQUE_URL=https://your-opaque-host
SERVER_ID=copied-agent-id
SERVER_INGEST_TOKEN=replace-with-the-same-token-used-by-the-web-app
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

### API shape

Agents write metrics:

```http
POST /api/server/metrics
Authorization: Bearer <SERVER_INGEST_TOKEN>
```

Logged-in dashboards read metrics:

```http
GET /api/server/metrics
Cookie: jwt_token=...
```

Response:

```json
{
  "servers": [
    {
      "id": "copied-agent-id",
      "stats": {
        "status": "online",
        "uptime": "5d 03h",
        "cores": 8,
        "load": [0.3, 0.5, 0.6],
        "cpu": 24.5,
        "memory": { "used": 8589934592, "total": 17179869184 },
        "disk": { "used": 120000000000, "total": 512000000000 },
        "network": { "in": 42000, "out": 21000 },
        "temperature": 48,
        "updatedAt": "2026-05-27T12:00:00.000Z"
      }
    }
  ]
}
```

### Troubleshooting

- `401 unauthorized`: `SERVER_INGEST_TOKEN` is missing or does not match between the web app and the remote server.
- `404 server not found`: the `SERVER_ID` is wrong, or the dashboard was not saved after creating the server card.
- Server shows `stale`: the remote script has not posted successfully in the last 30 seconds.
- `500 failed to ingest metrics`: check the web app logs and MongoDB connectivity.
- `Network in/out` is bytes per second measured over the script's 1-second sample window.
