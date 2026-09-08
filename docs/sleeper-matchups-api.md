# Sleeper Matchups API

Official docs: https://docs.sleeper.com/ (Matchups section). No API key or auth
required — same as the rest of Sleeper's public API used throughout this app
(`app/lib/sleeper/client.ts`).

## Endpoint

```
GET https://api.sleeper.app/v1/league/{league_id}/matchups/{week}
```

Returns an array with one entry per **roster** (not per matchup) — two
entries share the same `matchup_id` to form one head-to-head pairing.

## Response shape

Verified directly against both a not-yet-started week (2026 preseason) and a
completed week with real final scores (2025 season) — the fields are
identical in both cases:

```json
{
  "points": 47.17,
  "players": ["11564", "11620", "12507", "...", "PHI"],
  "roster_id": 1,
  "custom_points": null,
  "matchup_id": 2,
  "starters": ["11564", "9224", "12507", "5872", "8137", "12518", "12711", "PHI"],
  "starters_points": [3.48, 3.0, 4.38, 12.0, 9.56, 8.75, 4.0, 2.0],
  "players_points": {
    "11564": 3.48,
    "11620": 0.0,
    "...": "..."
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `roster_id` | number | Which roster this entry belongs to. |
| `matchup_id` | number \| null | Two rosters sharing this value are playing each other. `null` on a bye week. |
| `points` | number | Total for the roster's **starters**, per the league's own scoring settings. |
| `custom_points` | number \| null | Commissioner manual override, if set. |
| `players` | string[] | Every player_id on the roster this week (starters + bench). |
| `starters` | string[] | Ordered player_ids in starting lineup slots — the order matches the league's `roster_positions` with `BN`/`IR` filtered out (see `app/lib/sleeper/lineup-optimizer.ts` for how we use this ordering). |
| `starters_points` | number[] | Per-starter points, same order as `starters`. |
| `players_points` | object | Per-player points for every player on the roster (starters and bench). |

Bench players = `players` minus `starters` (Sleeper's own docs note this
explicitly rather than providing a separate bench array).

## No win probability field, anywhere

Checked three independent ways, all in agreement:

1. **A not-yet-started week** (2026 preseason, all projected/zero) — no such field.
2. **A completed week with real final scores** (2025 season) — identical field set, still no such field.
3. **Sleeper's own official docs** — the matchups page documents exactly the
   fields above and nothing else; no mention of win probability or
   projected win percentage anywhere.

Sleeper's own app/website does display a win probability during the season,
but it isn't backed by this public endpoint — it's almost certainly computed
client-side (or via a private, non-public endpoint) by Sleeper's own app
using an internal model we don't have access to. Any "win probability" this
app shows (e.g. on the Sleeper Team Pool detail page) is **our own**
estimate — a normal-distribution model over each team's `points_raw_z`
(season-strength z-score), not Sleeper's number. See
`app/dashboard/sleeper-pool/[leagueKey]/[userId]/page.tsx` for that
calculation.

## Related endpoints used elsewhere in this app

- `GET /v1/state/nfl` — current NFL week/season (`app/lib/sleeper/client.ts`'s `getNflState`).
- `GET /v1/league/{league_id}` — league settings, `scoring_settings`, `roster_positions`.
- `GET /v1/league/{league_id}/rosters` — roster player lists, `starters`/`reserve`/`taxi`.
- `GET /v1/league/{league_id}/users` — owner display names / custom team names.
- `GET /projections/nfl/{season}` and `/projections/nfl/{season}/{week}` — season-long and single-week per-player projections (not under `/v1`, see `rootClient` in `client.ts`).
