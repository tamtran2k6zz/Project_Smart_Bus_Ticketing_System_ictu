# Supabase PostgreSQL + Vercel deployment

Target database: [uhoznqcpaasartfvdynx](https://supabase.com/dashboard/project/uhoznqcpaasartfvdynx).
Target app: [project-smart-bus-ticketing-system-ictu](https://vercel.com/dtc245220005-9804s-projects/project-smart-bus-ticketing-system-ictu).

The code migration covers the Express API selected by the repository's start command and Dockerfile. The historical Nest/Prisma model is not used by this deployment. Authentication remains Express JWT + bcrypt; existing users do not need to be recreated in Supabase Auth.

## 1. Authenticate tooling

The Supabase MCP server is configured separately from the application database connection. MCP login does not supply a PostgreSQL password or configure Vercel.

```powershell
codex mcp login supabase
npx vercel login
```

Complete each browser authorization. Confirm MCP authentication using `/mcp` in Codex. The Supabase skills are already installed in `.agents/skills`.

## 2. Configure private connection strings

In the Supabase project's **Connect** dialog, copy the **Transaction pooler** URL for `DATABASE_URL` and the **Session pooler** URL for `DIRECT_URL`. Keep the provided host and username; do not infer the pooler host from the region. Percent-encode special characters in the database password.

Use `backend/.env.example` as a template. Do not overwrite the old MySQL connection until it has been copied to `MYSQL_SOURCE_URL` for import. Use `sslmode=verify-full`. If the client cannot validate the certificate chain, download the project's CA certificate and set `NODE_EXTRA_CA_CERTS` to its path. Do not turn off certificate validation.

| Variable | Purpose | Vercel runtime |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler, port 6543 | Required |
| `JWT_SECRET` | Private random secret, at least 32 characters | Required |
| `DB_POOL_MAX` | Per-function pool size; start at `2` | Recommended |
| `DIRECT_URL` | Session pooler/direct connection for migrations and import | Local only |
| `MYSQL_SOURCE_URL` | Existing MySQL database for one-time import | Local only |
| `MYSQL_SOURCE_TIMEZONE` | Timezone of old MySQL DATETIME values; defaults to `Asia/Ho_Chi_Minh` | Local only |
| `CORS_ORIGIN` | Comma-separated origins for a separately hosted frontend | Unnecessary on same-origin Vercel |

No Supabase service key, publishable key, or `VITE_SUPABASE_*` variable is needed for this architecture. Never put database credentials or JWT secrets in `VITE_*` variables. Rotate the old repository's demo JWT secret; this requires users to sign in again.

## 3. Apply the schema

```powershell
cd backend
npm ci
npm run db:migrate
```

This runner applies `supabase/migrations/*.sql` in one transaction, uses an advisory lock, and records checksums in `smartbus_private.migrations`. Re-running unchanged migrations is safe. It fails on pre-existing application tables rather than dropping them. Inspect an occupied target and plan reconciliation before running it there.

Use this runner consistently; do not also apply the same files with `supabase db push`, because the two migration-history tables are different. The CLI generated the initial migration filename; this project's runner owns application of it.

All 13 application tables have RLS enabled and deny `anon`/`authenticated` access. The backend connects using the database owner account through the pooler and enforces JWT roles and user ownership. The custom JWT is not a Supabase Auth JWT. Do not expose these tables through a browser Supabase client.

## 4. Import existing data or bootstrap an empty project

Back up MySQL and stop application writes during the final import/cutover. Keep the source running for read access. From `backend`:

```powershell
npm run db:import:mysql
```

The importer supports the deployed 13-table `init.sql` model. It reads a consistent MySQL snapshot, writes a single PostgreSQL transaction, retains IDs and bcrypt hashes, converts booleans/timestamps, and verifies row counts. It requires empty destination application tables (the four seeded roles are allowed). Unknown source tables/columns, conflicting emails, duplicate active seat sales, orphaned references, or a different role mapping abort the import. It never deletes or updates source data. The separate Prisma schema needs an explicit mapping and will be rejected rather than silently losing its extra tables.

If starting empty, skip import. Set private `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) locally, then run:

```powershell
npm run db:create-admin
```

Remove `ADMIN_PASSWORD` afterward. This creates a new administrator and never overwrites an existing user's password. Create routes, stops, buses/trips through the admin UI. Seats initialize automatically. No published demo credentials are installed.

## 5. Configure and deploy Vercel

Use repository root as the Vercel **Root Directory**, **Other** as the framework preset, and Node.js 22. Repository `vercel.json` supplies installation/build/output settings:

- Install root, backend, and frontend packages using their lockfiles.
- Compile the Express backend and build the frontend to `frontend/dist`.
- Route `/api/*` to `api/index.ts` before the SPA fallback.

In the target project's **Settings → Environment Variables**, set `DATABASE_URL`, `JWT_SECRET`, and `DB_POOL_MAX=2` for Production. Set Preview separately to a test database. Remove old `VITE_API_URL`/`VITE_API_BASE_URL` overrides so requests use the same Vercel origin. The Supabase URL is a database endpoint, not a replacement for the Express API URL.

After sign-in, the equivalent CLI workflow from repository root is:

```powershell
npx vercel link --project project-smart-bus-ticketing-system-ictu --scope dtc245220005-9804s-projects
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET production
npx vercel env add DB_POOL_MAX production
npx vercel deploy --prod
```

Enter secrets through the CLI prompt or dashboard, not command-line arguments. Updating environment variables requires a new deployment.

## 6. Validate before reopening traffic

```powershell
npm --prefix backend run build
npm --prefix backend run test:postgres
npm --prefix frontend run build
```

The embedded PostgreSQL suite verifies schema execution, parameterized SQL, registration/login, authorization, route/stop/trip operations, lock ownership/expiry, duplicate-sale constraints, QR verification, feedback, and Data API role denial. Its single-session adapter serializes test transactions; test real concurrent connections separately on the deployed database.

On Vercel verify `/api/health` reports `CONNECTED_POSTGRESQL`, then test login, route search, booking, and driver verification. Two concurrent attempts for one seat must produce exactly one ticket. Check imported table counts and timezone-sensitive trip searches. Run Supabase Database Advisors and resolve findings before reopening writes.

## Rollback

Keep the previous deployment and MySQL backup/volume. Before any new PostgreSQL writes, rollback can restore the previous Vercel deployment and its old API configuration. After new writes, reconcile those records before switching back; rolling back application code alone would lose access to newly created data. Do not run `docker compose down -v` against the old installation.

Sources: [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).
