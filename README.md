## ff-react

`ff-react` is a Next.js + Auth0 + Postgres app for a Fantasy Fantasy football league.

Core concept:
- Managers do not draft NFL players directly.
- Managers draft entire Yahoo fantasy teams from selected public Yahoo leagues.
- The app syncs Yahoo scores and calculates Fantasy Fantasy standings, matchups, waivers, and roster state.

## Build Strategy

This project uses a hybrid strategy:
- Keep the proven Next.js/Auth0/Drizzle shell for infrastructure and layout patterns.
- Port FantasyFantasy business logic in focused slices: leagues, roster records, waivers, matchups, standings, score sync.
- Rewrite persistence from Mongo models to Postgres tables and SQL queries.

Why this approach:
- Faster than greenfield for auth/layout/devops.
- Safer than full code conversion from older Angular/Mongo patterns.
- Lets us simplify Yahoo sync and keep domain logic explicit.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Auth0 (`@auth0/nextjs-auth0`)
- Postgres + Drizzle
- Vercel deployment

## Local Setup

1. Install dependencies:

```powershell
npm install
```

2. Add environment values in `.env.local`:

```bash
APP_BASE_URL=http://localhost:3000
AUTH0_SECRET=...
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
POSTGRES_URL=...

# Yahoo OAuth app values for backend sync tasks
YAHOO_CLIENT_ID=...
YAHOO_CLIENT_SECRET=...
YAHOO_REDIRECT_URI=oob
YAHOO_AUTH_CODE=...
```

3. Run the app:

```powershell
npm run dev
```

## Database Workflow

- Apply schema updates:

```powershell
npm run db:push
```

- Generate SQL migrations as needed:

```powershell
npx drizzle-kit generate
```

## Initial Product Scope

- Admin league configuration (store 8-12 Yahoo public league keys)
- Yahoo team/score ingestion per week
- Fantasy Fantasy draft board and assignments
- Owner roster management
- Head-to-head schedule and matchup resolution
- Standings and tie-breakers
- Waiver claims

## Notes

- Legacy golf-specific modules were intentionally removed during initialization cleanup.
- New Fantasy Fantasy domain modules are being introduced under `app/lib/yahoo` and `app/lib/db`.
