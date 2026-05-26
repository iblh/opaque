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

## Notes

- Login accepts either email or username, so old Svelte-era accounts can still be used.
- Dashboard data is stored in `dashboards.forest`. Older records without `forest` are normalized on read.
- Bookmark groups and bookmarks can be edited, reordered, added, removed, reset, and saved from the settings menu.
