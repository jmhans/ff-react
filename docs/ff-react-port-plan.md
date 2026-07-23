# ff-react Port Plan

## Recommendation

Use a hybrid approach:
- Keep the existing Next.js/Auth0/layout/deployment shell patterns.
- Rebuild domain layer for FantasyFantasy on Postgres.
- Port logic from FantasyFantasy in thin vertical slices.

## Why Not Full Copy/Convert

- Angular client architecture maps poorly to App Router patterns.
- Mongo document shapes in old models mix presentation and persistence state.
- Direct conversion preserves complexity and hidden coupling.

## Port Slices

1. Season setup and league key management
2. Yahoo team import and weekly score snapshots
3. Draft assignments and roster records
4. Matchup processing and standings
5. Waivers and free agent adds/drops

## Initial Data Model Added

- `ff_owners`
- `ff_leagues`
- `ff_teams`
- `ff_draft_assignments`
- `ff_score_snapshots`
- `ff_weekly_matchups`
- `ff_waiver_claims`

## Immediate Next Implementation Tasks

1. Add SQL migration for `ff_*` tables.
2. Build admin screens for league CRUD + manual sync trigger.
3. Persist Yahoo OAuth tokens in Postgres rather than environment variables.
4. Implement matchup resolver service from synced score snapshots.
5. Implement standings projection view and API endpoint.
