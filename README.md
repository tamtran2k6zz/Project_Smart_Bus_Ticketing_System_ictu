# Smart Bus Ticketing System — ICTU

React/Vite frontend and Express API, deployed together on Vercel, with Supabase PostgreSQL as the database.

## Setup

See [Supabase + Vercel deployment](docs/supabase-vercel.md) for the target projects, environment variables, schema installation, data import, and cutover checks.

- API: `backend/src/app.ts`; local HTTP entry: `backend/src/server.ts`.
- Vercel function: `api/index.ts`; requests under `/api/*` reach Express before the SPA fallback.
- PostgreSQL schema: `supabase/migrations/`.
- Existing bcrypt passwords and Express JWT authentication are retained. Supabase Auth is not used.
- Tables are accessible through the backend only; Supabase anonymous/authenticated Data API roles have no table access.

## Local development

Copy `backend/.env.example` to `backend/.env` and fill in PostgreSQL URLs and a random JWT secret. Keep these values private.

```sh
npm --prefix backend ci
cd backend
npm run db:migrate
npm run db:create-admin  # Set ADMIN_EMAIL and ADMIN_PASSWORD first, for an empty database
npm run start:express
```

In another terminal:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

For an isolated local database, copy the root `.env.example` to `.env`, set both secrets, then run `docker compose up -d --build`. PostgreSQL is available on localhost:5433, API on 5000 and frontend on 3000. A fresh PostgreSQL volume initializes the schema automatically; no demo passwords are installed. Existing MySQL volumes are not migrated or deleted by this command.

## Verification

```sh
npm --prefix backend run build
npm --prefix backend run test:postgres
npm --prefix frontend run build
```

The integration suite runs the migration and API against embedded PostgreSQL, including authorization and booking constraints. It needs no hosted credentials. Production pooler/TLS and multi-session locking still require a live smoke test.

## Historical code

The original Nest/Prisma implementation is a separate, incompatible MySQL model. It is retained for reference and its scripts are explicitly marked `:legacy`; it is not part of the deployed Express build. Do not run its Prisma migrations against the Supabase database. Historical MySQL setup and demo accounts are documented in [the archived guide](docs/legacy-mysql-setup.md); they do not describe the new deployment.
