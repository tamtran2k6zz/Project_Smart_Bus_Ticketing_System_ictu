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
| `DATABASE_URL` | Transaction pooler, port 6543. Must be `postgresql://` | Required |
| `DIRECT_URL` | Session pooler/direct connection (port 5432) for migrations and import | Local only |
| `PORT` | API port, always `5000` in this project | Required |
| `CORS_ORIGIN` | Comma-separated origins, no spaces | Required |
| `JWT_SECRET` | Private random secret, at least 32 characters | Required |
| `LOG_LEVEL` | `debug`, `info` (default), `warn`, `error` | Optional |
| `DB_POOL_MAX` | Per-function pool size; start at `2` | Recommended |
| `MYSQL_SOURCE_URL` | Existing MySQL database for one-time import | Local only |
| `MYSQL_SOURCE_TIMEZONE` | Timezone of old MySQL DATETIME values; defaults to `Asia/Ho_Chi_Minh` | Local only |
| `REDIS_URL` | Shared Redis for cross-instance 10-minute seat locks. Also accepts `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` | Optional; empty means PostgreSQL row locks only |
| `PAYMENT_PUBLIC_BASE_URL` | Public HTTPS origin the gateways call back into (tunnel or Vercel domain). No trailing slash | Required for real gateway tests |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | VNPay merchant credentials for signed payment and refund requests | Required to enable VNPay |
| `VNPAY_RETURN_URL`, `VNPAY_IPN_URL` | VNPay callbacks. Defaults derive from `PAYMENT_PUBLIC_BASE_URL` | Required for sandbox/live gateway tests |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | MoMo merchant credentials for signed payment and refund requests | Required to enable MoMo |
| `MOMO_IPN_URL`, `MOMO_REDIRECT_URL` | MoMo IPN and browser redirect. `MOMO_IPN_URL` must be public | Required for sandbox/live gateway tests |
| `PAYMENT_RESULT_URL` | Frontend result page for legacy gateway callbacks | Required only for legacy gateway flows |
| `PAYMENT_CLIENT_IP`, `PAYMENT_REFUND_IP` | IP sent to the gateway; gateways reject `127.0.0.1` | Optional |
| `PAYMENT_CRON_SECRET` or `CRON_SECRET` | Bearer token shared with the external expired-reservation scheduler | Required in Production |

The current QR booking flow does not require MoMo/VNPay credentials or a bank account. Its QR encodes the pending order, trip, seat, and amount for display/record keeping only; it does not transfer money or confirm payment. A bank QR and payment reconciliation must be added before accepting real payments.

No Supabase service key, publishable key, or `VITE_SUPABASE_*` variable is needed for this architecture. Never put database credentials or JWT secrets in `VITE_*` variables. Rotate the old repository's demo JWT secret; this requires users to sign in again. Rotate or disable any existing demo users whose credentials were previously published.

### 2.1 One variable name per setting

All environment variables are read in exactly one file, `backend/src/config/env.ts`. Nothing else
calls `process.env` for a gateway or database setting. This prevents the historical drift where the
code read `VNP_*` while `.env` declared `VNPAY_*`.

* Canonical names: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAYMENT_URL`,
  `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, `VNPAY_REFUND_URL`, `MOMO_*`, `PAYMENT_*`.
* Legacy aliases `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL`, `VNP_IPN_URL` are
  still accepted so an old `.env` keeps booting. The canonical name always wins, and each fallback
  logs `deprecated_env_alias_used` so it can be removed.

At boot the API prints a configuration summary (`database_target`, `redis_target`,
`payment_callbacks`) and every missing or contradictory setting as `environment_warning` or
`environment_invalid`. `GET /api/health` returns the same information as JSON.

### 2.2 Seat locks and Redis

`REDIS_URL` is optional. When it is empty, the API logs `seat_lock_disabled` with
`fallback=postgres-row-lock` and relies on the `SELECT ... FOR UPDATE` locks in
`backend/src/services/booking.ts`. Redis only adds a cross-instance `SET NX` lock.

The API accepts either `REDIS_URL` or the `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` triplet. It
builds the URL itself, so configuring only the triplet no longer leaves seat locking silently off.
A Redis that is configured but unreachable is a hard error (`503`) rather than a silent fallback,
because silently dropping the lock would allow double booking across instances.

### 2.3 Payment callbacks must be public

VNPay and MoMo call back from their own servers, so `localhost` is never reachable. Set
`PAYMENT_PUBLIC_BASE_URL` to a tunnel or deployed domain:

```powershell
ngrok http 5000
# or: cloudflared tunnel --url http://localhost:5000
```

then copy the public origin into `PAYMENT_PUBLIC_BASE_URL`. When it is unset the API falls back to
`VERCEL_URL`, then to `http://localhost:PORT`. Callback URLs that still resolve to `localhost`
produce a startup warning.

Register the exact endpoints below in the merchant portal:

| Channel | Method | Path |
| --- | --- | --- |
| VNPay browser return | `GET` | `/api/v1/ticketing/payments/vnpay/return` |
| VNPay server IPN | `GET` or `POST` | `/api/v1/ticketing/payments/vnpay/ipn` |
| MoMo IPN | `POST` | `/api/v1/ticketing/payments/momo/ipn` |

The API is mounted under both `/api/ticketing` and `/api/v1/ticketing`. The hyphenated aliases
`vnpay-return` and `vnpay-ipn` are still routed so an older merchant-portal configuration keeps
working, but new integrations must use the paths in the table.

### 2.4 `vnp_TxnRef` is the ticket UUID

`vnp_TxnRef` (VNPay) and `orderId` (MoMo) are not free-form codes. `POST /api/v1/ticketing/bookings`
creates the reservation and returns `data.payment.orderId`, which is the `tickets.id` UUID and also
`payment_transactions.order_id`. Use that exact value as the transaction reference; values such as
`ORD-20261002-001` or `TKT-...` match no row and are rejected with `event=vnpay_order_id_invalid`.

There is no separate `bookings` or `payments` table: the ticket id doubles as the order id.

## 3. Apply the schema

```powershell
cd backend
npm ci
npm run db:migrate
```

`supabase/migrations/*.sql` is the single source of truth for the DDL, and `npm run db:migrate` is
the only supported way to apply it.

This runner applies `supabase/migrations/*.sql` in one transaction, uses an advisory lock, and records checksums in `smartbus_private.migrations`. Re-running unchanged migrations is safe. It fails on pre-existing application tables rather than dropping them. Inspect an occupied target and plan reconciliation before running it there.

Use this runner consistently. It stores checksums in `smartbus_private.migrations` and synchronizes version records with `supabase_migrations.schema_migrations` when that Supabase CLI history table exists. A migration already recorded in Supabase history is registered locally without being replayed. Avoid applying the same migration independently through multiple tools, and never edit an already-applied migration file.

### 3.1 No ORM — the API uses node-postgres directly

The backend is plain Express + `pg`. `backend/package.json` no longer ships Prisma, NestJS or any
ORM; CI checks the TypeScript sources with `npm run typecheck` instead of validating a schema file:

* All queries go through `backend/src/config/database.ts` (`pg.Pool`, `query()`, `transaction()`
  with BEGIN/COMMIT/ROLLBACK). No source file imports `@prisma/client`, `typeorm` or `@nestjs/*`.
* There is no `prisma/migrations` directory; the applied history lives in
  `smartbus_private.migrations`. Do not run `prisma migrate` against Supabase.
* The DDL reference for standalone provisioning is `supabase/migrations/*.sql`, with
  `migrations/sprint3_schema.sql` covering the Sprint 3 validation/audit tables and their
  composite indexes.

All 14 application tables have RLS enabled and deny `anon`/`authenticated` access. The backend connects using the database owner account through the pooler and enforces JWT roles and user ownership. The custom JWT is not a Supabase Auth JWT. Do not expose these tables through a browser Supabase client.

The later payment migration adds the payment transaction ledger and reservation expiry fields. Apply it using the same migration runner before enabling gateway payments. The active Express booking API retains database row-locking and adds Redis `SET NX` locks when `REDIS_URL` is configured. A shared Redis service is needed for those cross-instance locks on Vercel; PostgreSQL seat locking remains the concurrency guard if Redis is not configured.

## 4. Import existing data or bootstrap an empty project

Back up MySQL and stop application writes during the final import/cutover. Keep the source running for read access. From `backend`:

```powershell
npm run db:import:mysql
```

The importer supports the legacy MySQL tables listed in `backend/scripts/import-mysql.cjs` (plus the four standard roles). It reads a consistent MySQL snapshot, writes a single PostgreSQL transaction, retains IDs and bcrypt hashes, converts booleans/timestamps, and verifies row counts. It requires empty destination application tables (the four seeded roles are allowed). Unknown source tables/columns, conflicting emails, duplicate active seat sales, orphaned references, or a different role mapping abort the import. It never deletes or updates source data.

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
