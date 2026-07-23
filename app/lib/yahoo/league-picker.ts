import { YahooClient } from '@/app/lib/yahoo/client';

export type LeaguePickerRow = {
  season: number;
  leagueKey: string;
  leagueName: string | null;
  numTeams: number | null;
  playoffStartWeek: number | null;
  historicalSeasons: string | null;
  matchupsPerWeek: number | null;
  draftDateScheduled: string | null;
  draftStatus: string | null;
  rosterPositions: string | null;
  note: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findFirstValue(node: unknown, key: string): unknown {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findFirstValue(item, key);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  if (!isObject(node)) {
    return undefined;
  }

  if (key in node) {
    return node[key];
  }

  for (const value of Object.values(node)) {
    const found = findFirstValue(value, key);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function toText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function extractRosterPositions(settingsPayload: unknown): string | null {
  const rosterPositionsNode = findFirstValue(settingsPayload, 'roster_positions');
  const rosterPositionNode = findFirstValue(rosterPositionsNode, 'roster_position') ?? rosterPositionsNode;
  const rows: string[] = [];

  for (const item of asArray(rosterPositionNode)) {
    if (!isObject(item)) {
      continue;
    }

    const position = toText(item.position);
    if (!position) {
      continue;
    }

    const count = toNumber(item.count);
    rows.push(count !== null ? `${position} (${count})` : position);
  }

  if (rows.length === 0) {
    return null;
  }

  return rows.join(', ');
}

function formatDraftDate(rawDraftTime: unknown): string | null {
  const unix = toNumber(rawDraftTime);
  if (unix === null || unix <= 0) {
    return null;
  }

  const date = new Date(unix * 1000);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

export async function getYahooAccessTokenForServer(): Promise<string | null> {
  const refreshToken = process.env.YAHOO_REFRESH_TOKEN?.trim();
  const directToken = process.env.YAHOO_ACCESS_TOKEN?.trim();

  const yahooClient = new YahooClient();

  if (refreshToken) {
    const refreshed = await yahooClient.refreshToken(refreshToken);
    return refreshed.access_token;
  }

  if (directToken) {
    return directToken;
  }

  return null;
}

export async function buildLeaguePickerRows(
  leagues: Array<{ season: number; yahooLeagueKey: string; displayName: string | null }>,
): Promise<LeaguePickerRow[]> {
  const accessToken = await getYahooAccessTokenForServer();

  if (!accessToken) {
    return leagues.map((league) => ({
      season: league.season,
      leagueKey: league.yahooLeagueKey,
      leagueName: league.displayName,
      numTeams: null,
      playoffStartWeek: null,
      historicalSeasons: 'TBD',
      matchupsPerWeek: null,
      draftDateScheduled: null,
      draftStatus: null,
      rosterPositions: null,
      note: 'Yahoo token is not configured.',
    }));
  }

  const yahooClient = new YahooClient();

  const rows = await Promise.all(
    leagues.map(async (league) => {
      try {
        const [metadataPayload, settingsPayload] = await Promise.all([
          yahooClient.getLeagueMetadata(league.yahooLeagueKey, accessToken),
          yahooClient.getLeagueSettings(league.yahooLeagueKey, accessToken),
        ]);

        const numTeams =
          toNumber(findFirstValue(metadataPayload, 'num_teams')) ??
          toNumber(findFirstValue(settingsPayload, 'num_teams'));

        const playoffStartWeek = toNumber(findFirstValue(settingsPayload, 'playoff_start_week'));
        const draftStatus = toText(findFirstValue(metadataPayload, 'draft_status'));
        const draftDateScheduled = formatDraftDate(findFirstValue(settingsPayload, 'draft_time'));
        const rosterPositions = extractRosterPositions(settingsPayload);
        const yahooLeagueName = toText(findFirstValue(metadataPayload, 'name'));

        return {
          season: league.season,
          leagueKey: league.yahooLeagueKey,
          leagueName: yahooLeagueName ?? league.displayName,
          numTeams,
          playoffStartWeek,
          historicalSeasons: 'TBD',
          matchupsPerWeek: numTeams ? Math.floor(numTeams / 2) : null,
          draftDateScheduled,
          draftStatus,
          rosterPositions,
          note: null,
        } satisfies LeaguePickerRow;
      } catch (error) {
        return {
          season: league.season,
          leagueKey: league.yahooLeagueKey,
          leagueName: league.displayName,
          numTeams: null,
          playoffStartWeek: null,
          historicalSeasons: 'TBD',
          matchupsPerWeek: null,
          draftDateScheduled: null,
          draftStatus: null,
          rosterPositions: null,
          note: `Yahoo lookup failed: ${String(error)}`,
        } satisfies LeaguePickerRow;
      }
    }),
  );

  return rows;
}
