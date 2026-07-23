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

type RenewalResult = {
  sourceLeagueKey: string;
  sourceLeagueName: string | null;
  renewalLeagueKey: string | null;
  renewalSeason: number | null;
  note: string;
};

type LeagueMetadata = {
  league_key?: string;
  season?: string;
  renew?: string;
  renewed?: string;
};

const SOURCE_SEASON = Number(process.env.SEASON_SOURCE || '2025');
const TARGET_SEASON = Number(process.env.SEASON_TARGET || '2026');

function parseGameIdFromLeagueKey(leagueKey: string): number | null {
  const match = leagueKey.match(/^(\d+)\.l\.\d+$/);
  if (!match) {
    return null;
  }

  const gameId = Number(match[1]);
  return Number.isFinite(gameId) ? gameId : null;
}

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
    };
  }

  return empty;
}

async function resolveLeagueForTargetSeason(
  yahooClient: YahooClient,
  accessToken: string,
  startLeagueKey: string,
  targetSeason: number,
): Promise<{ leagueKey: string | null; season: number | null; note: string }> {
  const seen = new Set<string>();
  let currentKey: string | null = startLeagueKey;

  for (let hop = 0; hop < 12 && currentKey; hop += 1) {
    if (seen.has(currentKey)) {
      return { leagueKey: null, season: null, note: 'Detected renewal loop while traversing league chain.' };
    }
    seen.add(currentKey);

    const payload = await yahooClient.getLeagueMetadata(currentKey, accessToken);
    const metadata = extractLeagueMetadata(payload);
    const season = metadata.season ? Number(metadata.season) : null;

    if (season === targetSeason) {
      return { leagueKey: currentKey, season, note: 'Found target season league via renewal chain.' };
    }

    if (season !== null && season < targetSeason) {
      const nextKey = translateYahooRenewalKey(metadata.renewed);
      if (!nextKey) {
        return { leagueKey: null, season: null, note: 'Reached older season with no renewed league pointer.' };
      }
      currentKey = nextKey;
      continue;
    }

    if (season !== null && season > targetSeason) {
      const priorKey = translateYahooRenewalKey(metadata.renew);
      if (!priorKey) {
        return { leagueKey: null, season: null, note: 'Reached newer season with no renew pointer.' };
      }
      currentKey = priorKey;
      continue;
    }

    return { leagueKey: null, season: null, note: 'League metadata missing season value.' };
  }

  return { leagueKey: null, season: null, note: 'Exceeded renewal traversal depth.' };
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

async function main() {
  const leagues = await sql<LeagueRow>`
    SELECT id, season, yahoo_league_key, display_name
    FROM ff_leagues
    WHERE season = ${SOURCE_SEASON}
    ORDER BY yahoo_league_key ASC
  `;

  let leagueRows = leagues.rows;

  if (leagues.rowCount === 0) {
    const teamLeagues = await sql<TeamLeagueRow>`
      SELECT DISTINCT yahoo_league_key
      FROM ff_teams
      WHERE season = ${SOURCE_SEASON}
      ORDER BY yahoo_league_key ASC
    `;

    leagueRows = teamLeagues.rows.map((row, index) => ({
      id: `derived-${index}`,
      season: SOURCE_SEASON,
      yahoo_league_key: row.yahoo_league_key,
      display_name: null,
    }));

    console.log(
      `No rows in ff_leagues for ${SOURCE_SEASON}; derived ${leagueRows.length} league key(s) from ff_teams instead.`,
    );
  }

  if (leagueRows.length === 0) {
    console.log(`No league keys found for season ${SOURCE_SEASON} in ff_leagues or ff_teams.`);
    return;
  }

  const yahooClient = new YahooClient();
  const accessToken = await getAccessToken(yahooClient);

  if (!accessToken) {
    console.log(`Found ${leagueRows.length} league(s) for ${SOURCE_SEASON} in DB, but no Yahoo access token is configured.`);
    console.log('Set YAHOO_ACCESS_TOKEN (or YAHOO_REFRESH_TOKEN with client credentials) and rerun this script.');
    console.table(leagueRows.map((l) => ({ yahoo_league_key: l.yahoo_league_key, display_name: l.display_name })));
    return;
  }

  const results: RenewalResult[] = [];

  for (const league of leagueRows) {
    try {
      const resolved = await resolveLeagueForTargetSeason(
        yahooClient,
        accessToken,
        league.yahoo_league_key,
        TARGET_SEASON,
      );

      results.push({
        sourceLeagueKey: league.yahoo_league_key,
        sourceLeagueName: league.display_name,
        renewalLeagueKey: resolved.leagueKey,
        renewalSeason: resolved.season,
        note: resolved.note,
      });
    } catch (error) {
      results.push({
        sourceLeagueKey: league.yahoo_league_key,
        sourceLeagueName: league.display_name,
        renewalLeagueKey: null,
        renewalSeason: null,
        note: `Yahoo lookup failed: ${String(error)}`,
      });
    }
  }

  console.table(results);
}

main().catch((error) => {
  console.error('find-renewal-leagues failed:', error);
  process.exit(1);
});
