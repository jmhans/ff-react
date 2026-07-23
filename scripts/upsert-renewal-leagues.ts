import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';
import { YahooClient } from '@/app/lib/yahoo/client';

loadEnv({ path: '.env.local' });
loadEnv();

type LeagueRow = {
  id: string;
  season: number;
  yahoo_league_key: string;
  display_name: string | null;
};

type TeamLeagueRow = {
  yahoo_league_key: string;
};

type LeagueMetadata = {
  league_key?: string;
  season?: string;
  renew?: string;
  renewed?: string;
  name?: string;
};

const SOURCE_SEASON = Number(process.env.SEASON_SOURCE || '2025');
const TARGET_SEASON = Number(process.env.SEASON_TARGET || '2026');

function translateYahooRenewalKey(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const asLeague = value.trim();
  if (/^\d+\.l\.\d+$/.test(asLeague)) {
    return asLeague;
  }

  const underscored = asLeague.match(/^(\d+)_([0-9]+)$/);
  if (!underscored) {
    return null;
  }

  return `${underscored[1]}.l.${underscored[2]}`;
}

function extractLeagueMetadata(payload: unknown): LeagueMetadata {
  const empty: LeagueMetadata = {};
  if (!payload || typeof payload !== 'object') {
    return empty;
  }

  const root = payload as Record<string, unknown>;
  const fantasyContent = root.fantasy_content as Record<string, unknown> | undefined;
  const leagueNode = fantasyContent?.league;

  if (Array.isArray(leagueNode) && leagueNode.length > 0 && typeof leagueNode[0] === 'object' && leagueNode[0]) {
    const league = leagueNode[0] as Record<string, unknown>;
    return {
      league_key: typeof league.league_key === 'string' ? league.league_key : undefined,
      season: typeof league.season === 'string' ? league.season : undefined,
      renew: typeof league.renew === 'string' ? league.renew : undefined,
      renewed: typeof league.renewed === 'string' ? league.renewed : undefined,
      name: typeof league.name === 'string' ? league.name : undefined,
    };
  }

  return empty;
}

async function getAccessToken(yahooClient: YahooClient): Promise<string | null> {
  const refreshToken = process.env.YAHOO_REFRESH_TOKEN?.trim();
  if (refreshToken) {
    const refreshed = await yahooClient.refreshToken(refreshToken);
    return refreshed.access_token;
  }

  const directToken = process.env.YAHOO_ACCESS_TOKEN?.trim();
  if (directToken) {
    return directToken;
  }

  return null;
}

async function resolveLeagueForTargetSeason(
  yahooClient: YahooClient,
  accessToken: string,
  startLeagueKey: string,
  targetSeason: number,
): Promise<{ leagueKey: string | null; season: number | null; displayName: string | null; note: string }> {
  const seen = new Set<string>();
  let currentKey: string | null = startLeagueKey;

  for (let hop = 0; hop < 12 && currentKey; hop += 1) {
    if (seen.has(currentKey)) {
      return { leagueKey: null, season: null, displayName: null, note: 'Detected renewal loop while traversing league chain.' };
    }
    seen.add(currentKey);

    const payload = await yahooClient.getLeagueMetadata(currentKey, accessToken);
    const metadata = extractLeagueMetadata(payload);
    const season = metadata.season ? Number(metadata.season) : null;

    if (season === targetSeason) {
      return {
        leagueKey: metadata.league_key ?? currentKey,
        season,
        displayName: metadata.name ?? null,
        note: 'Found target season league via renewal chain.',
      };
    }

    if (season !== null && season < targetSeason) {
      const nextKey = translateYahooRenewalKey(metadata.renewed);
      if (!nextKey) {
        return { leagueKey: null, season: null, displayName: null, note: 'Reached older season with no renewed league pointer.' };
      }
      currentKey = nextKey;
      continue;
    }

    if (season !== null && season > targetSeason) {
      const priorKey = translateYahooRenewalKey(metadata.renew);
      if (!priorKey) {
        return { leagueKey: null, season: null, displayName: null, note: 'Reached newer season with no renew pointer.' };
      }
      currentKey = priorKey;
      continue;
    }

    return { leagueKey: null, season: null, displayName: null, note: 'League metadata missing season value.' };
  }

  return { leagueKey: null, season: null, displayName: null, note: 'Exceeded renewal traversal depth.' };
}

async function getSourceLeagues(): Promise<Array<{ yahoo_league_key: string; display_name: string | null }>> {
  const leagues = await sql<LeagueRow>`
    SELECT id, season, yahoo_league_key, display_name
    FROM ff_leagues
    WHERE season = ${SOURCE_SEASON}
    ORDER BY yahoo_league_key ASC
  `;

  if ((leagues.rowCount ?? 0) > 0) {
    return leagues.rows.map((l) => ({ yahoo_league_key: l.yahoo_league_key, display_name: l.display_name }));
  }

  const teamLeagues = await sql<TeamLeagueRow>`
    SELECT DISTINCT yahoo_league_key
    FROM ff_teams
    WHERE season = ${SOURCE_SEASON}
    ORDER BY yahoo_league_key ASC
  `;

  return teamLeagues.rows.map((row) => ({ yahoo_league_key: row.yahoo_league_key, display_name: null }));
}

async function main() {
  const sourceLeagues = await getSourceLeagues();
  if (sourceLeagues.length === 0) {
    console.log(`No league keys found for source season ${SOURCE_SEASON}.`);
    return;
  }

  const yahooClient = new YahooClient();
  const accessToken = await getAccessToken(yahooClient);
  if (!accessToken) {
    throw new Error('Yahoo token is missing. Set YAHOO_REFRESH_TOKEN or YAHOO_ACCESS_TOKEN.');
  }

  const upserted = new Set<string>();
  const unresolved: Array<{ source: string; note: string }> = [];

  for (const source of sourceLeagues) {
    try {
      const resolved = await resolveLeagueForTargetSeason(
        yahooClient,
        accessToken,
        source.yahoo_league_key,
        TARGET_SEASON,
      );

      if (!resolved.leagueKey || resolved.season !== TARGET_SEASON) {
        unresolved.push({ source: source.yahoo_league_key, note: resolved.note });
        continue;
      }

      await sql`
        INSERT INTO ff_leagues (season, yahoo_league_key, display_name, include_in_pool)
        VALUES (${TARGET_SEASON}, ${resolved.leagueKey}, ${resolved.displayName ?? source.display_name}, true)
        ON CONFLICT (season, yahoo_league_key)
        DO UPDATE SET
          display_name = COALESCE(EXCLUDED.display_name, ff_leagues.display_name),
          include_in_pool = ff_leagues.include_in_pool,
          updated_at = now()
      `;

      upserted.add(resolved.leagueKey);
    } catch (error) {
      unresolved.push({ source: source.yahoo_league_key, note: `Yahoo lookup failed: ${String(error)}` });
    }
  }

  const countResult = await sql<{ count: string }>`
    SELECT COUNT(*)::text AS count
    FROM ff_leagues
    WHERE season = ${TARGET_SEASON}
  `;

  console.log(
    `Processed ${sourceLeagues.length} source leagues. Upserted ${upserted.size} unique ${TARGET_SEASON} leagues. ` +
      `${unresolved.length} sources unresolved.`,
  );
  console.log(`ff_leagues now has ${countResult.rows[0].count} row(s) for season ${TARGET_SEASON}.`);

  if (unresolved.length > 0) {
    console.table(unresolved.slice(0, 25));
    if (unresolved.length > 25) {
      console.log(`...and ${unresolved.length - 25} more unresolved source league(s).`);
    }
  }
}

main().catch((error) => {
  console.error('upsert-renewal-leagues failed:', error);
  process.exit(1);
});
