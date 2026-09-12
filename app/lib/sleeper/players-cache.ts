import { SleeperPlayer, SleeperProjection } from './client';

const PLAYERS_TTL_MS = 24 * 60 * 60 * 1000;
const PROJECTIONS_TTL_MS = 60 * 60 * 1000;
const STATS_TTL_MS = 2 * 60 * 1000; // actuals update live during games, so keep this short

let playersCache: { data: Record<string, SleeperPlayer>; fetchedAt: number } | null = null;
let playersInFlight: Promise<Record<string, SleeperPlayer>> | null = null;

const projectionsCache = new Map<string, { data: SleeperProjection[]; fetchedAt: number }>();
const projectionsInFlight = new Map<string, Promise<SleeperProjection[]>>();

const statsCache = new Map<string, { data: Record<string, Record<string, number>>; fetchedAt: number }>();
const statsInFlight = new Map<string, Promise<Record<string, Record<string, number>>>>();

/**
 * Full player DB (~5-6MB) — too large for Next's fetch data cache, which
 * caps cached items at 2MB and otherwise just logs a "Failed to set fetch
 * cache" error and serves uncached. Rolling a plain in-memory cache instead
 * (persists for the life of the server process), with in-flight
 * deduplication — without this, several concurrent callers (e.g. one per
 * roster pick, computing weekly matchups in parallel) would all miss the
 * cache at once and each kick off their own ~6MB fetch simultaneously.
 */
export async function getCachedPlayers(): Promise<Record<string, SleeperPlayer>> {
  if (playersCache && Date.now() - playersCache.fetchedAt < PLAYERS_TTL_MS) {
    return playersCache.data;
  }
  if (playersInFlight) return playersInFlight;

  playersInFlight = (async () => {
    try {
      const res = await fetch('https://api.sleeper.app/players/nfl', { cache: 'no-store' });
      if (!res.ok) return playersCache?.data ?? {};
      const data = await res.json();
      playersCache = { data, fetchedAt: Date.now() };
      return data;
    } finally {
      playersInFlight = null;
    }
  })();
  return playersInFlight;
}

/**
 * Single-week per-player projections — same in-memory + in-flight-dedup
 * pattern as getCachedPlayers, keyed by season/week, refreshed hourly.
 */
export async function getCachedWeekProjections(season: string, week: number): Promise<SleeperProjection[]> {
  const key = `${season}-${week}`;
  const cached = projectionsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PROJECTIONS_TTL_MS) {
    return cached.data;
  }
  const existingInFlight = projectionsInFlight.get(key);
  if (existingInFlight) return existingInFlight;

  const promise = (async () => {
    try {
      const res = await fetch(`https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`, {
        cache: 'no-store',
      });
      if (!res.ok) return projectionsCache.get(key)?.data ?? [];
      const data = await res.json();
      projectionsCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    } finally {
      projectionsInFlight.delete(key);
    }
  })();
  projectionsInFlight.set(key, promise);
  return promise;
}

/**
 * Single-week per-player ACTUAL stats, keyed by player_id (unlike
 * SleeperClient.getWeekStats, which returns a flat array of {player, stats}
 * entries) — that's the shape every caller here actually wants: "does this
 * player have a stats entry yet, and if so what is it." A short TTL since,
 * unlike season-long projections, these change constantly while games are
 * live.
 */
export async function getCachedWeekStats(season: string, week: number): Promise<Record<string, Record<string, number>>> {
  const key = `${season}-${week}`;
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < STATS_TTL_MS) {
    return cached.data;
  }
  const existingInFlight = statsInFlight.get(key);
  if (existingInFlight) return existingInFlight;

  const promise = (async () => {
    try {
      const res = await fetch(`https://api.sleeper.app/stats/nfl/${season}/${week}?season_type=regular`, {
        cache: 'no-store',
      });
      if (!res.ok) return statsCache.get(key)?.data ?? {};
      const entries: Array<{ player_id?: string; stats?: Record<string, number> }> = await res.json();
      const data: Record<string, Record<string, number>> = {};
      for (const entry of entries) {
        if (entry.player_id && entry.stats && Object.keys(entry.stats).length > 0) {
          data[entry.player_id] = entry.stats;
        }
      }
      statsCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    } finally {
      statsInFlight.delete(key);
    }
  })();
  statsInFlight.set(key, promise);
  return promise;
}
