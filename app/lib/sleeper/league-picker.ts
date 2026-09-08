import { SleeperClient, SleeperLeague } from '@/app/lib/sleeper/client';

export type SleeperLeaguePickerRow = {
  season: number;
  leagueId: string;
  leagueName: string | null;
  numTeams: number | null;
  playoffStartWeek: number | null;
  historicalSeasonsCount: number;
  matchupsPerWeek: number | null;
  draftStatus: string | null;
  draftDate: string | null;
  rosterPositions: string | null;
  scoringType: string | null;
  leagueType: string | null;
  keeperCount: number | null;
  note: string | null;
};

function summarizeRosterPositions(positions: string[]): string | null {
  if (!positions || positions.length === 0) return null;

  const counts = new Map<string, number>();
  for (const pos of positions) {
    counts.set(pos, (counts.get(pos) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([pos, count]) => (count > 1 ? `${pos} (${count})` : pos))
    .join(', ');
}

/**
 * Summary row for the League Picker admin UI, sourced from Sleeper.
 */
export async function buildSleeperLeaguePickerRow(leagueId: string): Promise<SleeperLeaguePickerRow> {
  const client = new SleeperClient();

  try {
    const league = await client.getLeague(leagueId);

    if (!league) {
      return {
        season: 0,
        leagueId,
        leagueName: null,
        numTeams: null,
        playoffStartWeek: null,
        historicalSeasonsCount: 0,
        matchupsPerWeek: null,
        draftStatus: null,
        draftDate: null,
        rosterPositions: null,
        scoringType: null,
        leagueType: null,
        keeperCount: null,
        note: 'League not found or not public.',
      };
    }

    const history = await client.getLeagueHistory(leagueId);
    const draft = league.draft_id ? await client.getDraft(league.draft_id) : null;
    const leagueTypeLabels: Record<number, string> = { 0: 'redraft', 1: 'keeper', 2: 'dynasty', 3: 'guillotine' };
    const isKeeperLeague = league.settings?.type === 1;

    return {
      season: Number(league.season),
      leagueId: league.league_id,
      leagueName: league.name,
      numTeams: league.total_rosters ?? null,
      playoffStartWeek: league.settings?.playoff_week_start ?? null,
      historicalSeasonsCount: history.length,
      matchupsPerWeek: league.total_rosters ? Math.floor(league.total_rosters / 2) : null,
      draftStatus: draft?.status ?? null,
      draftDate: draft?.start_time ? new Date(draft.start_time).toISOString() : null,
      rosterPositions: summarizeRosterPositions(league.roster_positions),
      scoringType: league.settings?.league_average_match === 1 ? 'median' : 'head-to-head',
      leagueType: leagueTypeLabels[league.settings?.type ?? -1] ?? null,
      keeperCount: isKeeperLeague ? league.settings?.max_keepers ?? null : null,
      note: null,
    };
  } catch (error) {
    return {
      season: 0,
      leagueId,
      leagueName: null,
      numTeams: null,
      playoffStartWeek: null,
      historicalSeasonsCount: 0,
      matchupsPerWeek: null,
      draftStatus: null,
      draftDate: null,
      rosterPositions: null,
      scoringType: null,
      leagueType: null,
      keeperCount: null,
      note: `Sleeper lookup failed: ${String(error)}`,
    };
  }
}

export async function buildSleeperLeaguePickerRows(leagueIds: string[]): Promise<SleeperLeaguePickerRow[]> {
  return Promise.all(leagueIds.map((id) => buildSleeperLeaguePickerRow(id)));
}
