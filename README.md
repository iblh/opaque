## OPAQUE

`web` is the current consolidated app for active development.

- `web`: merged Next/React version with the retained visual direction and restored dashboard editing.
- `react-frontend`: earlier Next/React version kept for reference.
- `front-end`: older SvelteKit version kept for reference.

Start the current app:

```bash
cd web
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

For a self-hosted stack with Postgres:

```bash
cd web
cp .env.example .env
docker compose up --build
```

This repository remains the upstream for the self-hosted product. Hosted product
work can be layered in a private downstream repository while keeping the core
Postgres schema and API contracts compatible.
