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

Use the repository-root `.env.example` as a template. Set `DATABASE_URL` to the Transaction pooler URL and `DIRECT_URL` to the Session pooler URL for local migrations/imports. Do not overwrite the old MySQL connection until it has been copied to `MYSQL_SOURCE_URL` for import. Use `sslmode=verify-full`. If the client cannot validate the certificate chain, download the project's CA certificate and set `NODE_EXTRA_CA_CERTS` to its path. Do not turn off certificate validation.

| Variable | Purpose | Vercel runtime |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler, port 6543 | Required |
| `JWT_SECRET` | Private random secret, at least 32 characters | Required |
| `DB_POOL_MAX` | Per-function pool size; start at `2` | Recommended |
| `DIRECT_URL` | Session pooler/direct connection for migrations and import | Local only |
| `MYSQL_SOURCE_URL` | Existing MySQL database for one-time import | Local only |
| `MYSQL_SOURCE_TIMEZONE` | Timezone of old MySQL DATETIME values; defaults to `Asia/Ho_Chi_Minh` | Local only |
| `CORS_ORIGIN` | Comma-separated origins for a separately hosted frontend | Unnecessary on same-origin Vercel |
| `REDIS_URL` | Shared Redis-compatible service for cross-instance 10-minute seat locks | Optional; Docker Compose supplies local Redis |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | VNPay merchant credentials for signed payment and refund requests | Required to enable VNPay |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | MoMo merchant credentials for signed payment and refund requests | Required to enable MoMo |
| `VNPAY_RETURN_URL`, `MOMO_IPN_URL`, `PAYMENT_RESULT_URL` | Public callback/result URLs used by the gateways | Required for sandbox/live gateway tests |
| `PAYMENT_CRON_SECRET` or `CRON_SECRET` | Bearer token shared with the external expired-reservation scheduler | Required in Production |

No Supabase service key, publishable key, or `VITE_SUPABASE_*` variable is needed for this architecture. Never put database credentials or JWT secrets in `VITE_*` variables. Rotate the old repository's demo JWT secret; this requires users to sign in again.

## 3. Apply the schema

```powershell
cd backend
npm ci
npm run db:migrate
```

This runner applies `supabase/migrations/*.sql` in one transaction, uses an advisory lock, and records checksums in `smartbus_private.migrations`. Re-running unchanged migrations is safe. It fails on pre-existing application tables rather than dropping them. Inspect an occupied target and plan reconciliation before running it there.

Use this runner consistently. It stores checksums in `smartbus_private.migrations` and synchronizes version records with `supabase_migrations.schema_migrations` when that Supabase CLI history table exists. A migration already recorded in Supabase history is registered locally without being replayed. Avoid applying the same migration independently through multiple tools, and never edit an already-applied migration file.

All 14 application tables have RLS enabled and deny `anon`/`authenticated` access. The backend connects using the database owner account through the pooler and enforces JWT roles and user ownership. The custom JWT is not a Supabase Auth JWT. Do not expose these tables through a browser Supabase client.

The later payment migration adds the payment transaction ledger and reservation expiry fields. Apply it using the same migration runner before enabling gateway payments. The active Express booking API retains database row-locking and adds Redis `SET NX` locks when `REDIS_URL` is configured. A shared Redis service is needed for those cross-instance locks on Vercel; PostgreSQL seat locking remains the concurrency guard if Redis is not configured.

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

Repository `vercel.json` intentionally does not configure Vercel Cron Jobs. The Hobby plan only supports daily schedules, so use the external scheduler below for minute-by-minute reservation cleanup.

After sign-in, the equivalent CLI workflow from repository root is:

```powershell
npx vercel link --project project-smart-bus-ticketing-system-ictu --scope dtc245220005-9804s-projects
npx vercel env add DATABASE_URL production
npx vercel env add JWT_SECRET production
npx vercel env add DB_POOL_MAX production
npx vercel deploy --prod
```

Enter secrets through the CLI prompt or dashboard, not command-line arguments. Updating environment variables requires a new deployment.

Repository `vercel.json` intentionally does not configure Vercel Cron Jobs. The Hobby plan only supports daily schedules, so use the external scheduler below for minute-by-minute reservation cleanup.

### External reservation cleanup on the free plan

Use [cron-job.org](https://cron-job.org/en/), which supports free execution once per minute and custom HTTP headers.

1. In Vercel **Settings → Environment Variables**, set `PAYMENT_CRON_SECRET` for Production to a private random value of at least 32 characters. Reuse the existing value if already configured. Redeploy after adding or changing it.
2. Sign in to [the cron-job.org Console](https://console.cron-job.org/) and create a job named `Smart Bus - release expired reservations`.
3. Use the stable Production domain shown in Vercel (not a deployment-specific Preview URL), with the path `/api/v1/ticketing/release-expired`.
4. Set the method to **POST**, the schedule to **Every minute**, and the timezone to `Asia/Ho_Chi_Minh`. Leave the request body empty.
5. Under advanced request settings, add the `Authorization` header with value `Bearer <PAYMENT_CRON_SECRET>`. Replace the placeholder with the same private value configured on Vercel. Never put this value in the URL, repository, frontend variables, or screenshots.
6. Run **Test run** before enabling the job. Expect HTTP `200` with `{"success":true,"affectedRows":0}` (or a positive number when reservations have expired). Enable the job and check its execution history after the next minute.

HTTP `401` means the authorization header is missing or incorrect. HTTP `503` with `PAYMENT_CRON_SECRET must be configured.` means the Production environment variable is missing. HTTP `500` means cleanup failed; inspect Vercel runtime logs and database connectivity. If Vercel Deployment Protection intercepts the request, target the public Production domain rather than disabling protection for Preview deployments.

The endpoint supports both POST and GET, accepts either `PAYMENT_CRON_SECRET` or `CRON_SECRET`, and processes up to 100 expired reservations per call. External scheduling replaces Vercel Cron; keep only one active scheduler for this task.

## 6. Validate before reopening traffic

```powershell
npm --prefix backend run build
npm --prefix backend run test:postgres
npm --prefix frontend run build
```

The embedded PostgreSQL suite verifies schema execution, parameterized SQL, registration/login, authorization, route/stop/trip operations, lock ownership/expiry, duplicate-sale constraints, QR verification, feedback, and Data API role denial. It also exercises a signed MoMo callback, ticket cancellation/refund, and expiry cleanup against a local fake gateway. Its single-session adapter serializes test transactions; test real concurrent connections and provider sandbox responses separately.

On Vercel verify `/api/health` reports `CONNECTED_POSTGRESQL`, then test login, route search, booking, and driver verification. Configure gateway sandbox credentials and publicly reachable HTTPS callback URLs before attempting a payment or refund; register the VNPay IPN URL with the merchant. Confirm the external scheduler calls `/api/v1/ticketing/release-expired` every minute with `CRON_SECRET` or `PAYMENT_CRON_SECRET` and receives HTTP `200`. Two concurrent attempts for one seat must produce exactly one ticket. Check imported table counts and timezone-sensitive trip searches. Run Supabase Database Advisors and resolve findings before reopening writes.

## Rollback

Keep the previous deployment and MySQL backup/volume. Before any new PostgreSQL writes, rollback can restore the previous Vercel deployment and its old API configuration. After new writes, reconcile those records before switching back; rolling back application code alone would lose access to newly created data. Do not run `docker compose down -v` against the old installation.

Sources: [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).
