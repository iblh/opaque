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

Create a server in dashboard edit mode, copy its agent id, then post metrics from that remote machine:

```bash
curl -X POST https://your-opaque-host/api/server/metrics \
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
