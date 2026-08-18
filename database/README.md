# Database

The actual runnable schema lives in `backend/migrations/` (SQL files + a
runner script), right next to `backend/config/db.js` which holds the
Postgres connection config.

To build the tables:

```bash
cd backend
npm install
npm run migrate
```

This creates, in order:
- `001_users.sql` — user accounts (auth already reads/writes this table)
- `002_core_schema.sql` — assets (compressors), telemetry, predictions, alerts, maintenance_logs
- `003_seed_assets.sql` — inserts `COMP-001`, matching the default asset the simulator creates
