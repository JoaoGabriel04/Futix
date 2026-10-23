# Futix

Football match organizer — create a room, invite players, draw balanced teams, and track live matches.

## Tech stack

- **Frontend:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, SWR, Socket.IO client
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (Neon), Socket.IO
- **Auth:** Google and Discord OAuth via Passport.js, JWT in httpOnly cookies
- **Monorepo:** pnpm workspaces (`web`, `api`, `shared`)

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (local or [Neon](https://neon.tech))

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example api/.env
cp .env.example web/.env.local   # only NEXT_PUBLIC_* vars are used here

# 3. Push database schema
pnpm --filter api exec prisma migrate deploy

# 4. Start dev servers (web on :3000, api on :4000)
pnpm dev
```

## Useful commands

```bash
pnpm typecheck        # type-check all packages
pnpm test             # run api tests (Vitest)
pnpm build            # build all packages
pnpm --filter api exec prisma studio   # open Prisma Studio
```

## Project structure

```
futix/
├── api/          Express + Prisma backend
│   ├── src/
│   │   ├── modules/   Feature modules (auth, rooms, members, matches…)
│   │   ├── lib/       Shared utilities (jwt, prisma, cloudinary)
│   │   └── middlewares/
│   └── prisma/    Schema and migrations
├── web/          Next.js frontend
│   ├── app/       App Router pages
│   ├── components/  UI + domain components
│   ├── hooks/     SWR data hooks
│   └── lib/       API client, socket, keys
└── shared/       Zod schemas and constants shared across packages
```

## Environment variables

See `.env.example` for the full list. Critical variables for production:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (use Neon pool URL) |
| `JWT_SECRET` | Random string ≥ 32 characters |
| `WEB_URL` | Production frontend URL (e.g. `https://futix.vercel.app`) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth app credentials |
| `DISCORD_CLIENT_ID/SECRET` | Discord OAuth app credentials |
| `CLOUDINARY_*` | Cloudinary credentials for avatar uploads |
| `NEXT_PUBLIC_API_URL` | Backend URL for the browser |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL (same as API URL) |

## Deployment

- **Frontend:** Vercel — connect repo, set root directory to `web`, add `NEXT_PUBLIC_*` env vars
- **Backend:** Render — connect repo, set root directory to `api`, build command `pnpm install && pnpm build`, start command `node dist/server.js`, add all API env vars
- **Database:** Neon — use the pooled connection string for `DATABASE_URL`

Update OAuth redirect URIs in Google Console and Discord Developer Portal to point to your production API URL.
