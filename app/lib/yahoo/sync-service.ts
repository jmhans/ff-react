import { YahooClient } from './client';

export type SyncRequest = {
  season: number;
  week: number;
  leagueKeys: string[];
};

export type SyncResult = {
  success: boolean;
  season: number;
  week: number;
  syncedLeagueCount: number;
  notes: string[];
};

export class YahooSyncService {
  private yahooClient = new YahooClient();

  async syncWeek(input: SyncRequest): Promise<SyncResult> {
    // Step 1 will be persisted credentials in Postgres; currently we rely on env token.
    const accessToken = process.env.YAHOO_ACCESS_TOKEN;

    if (!accessToken) {
      return {
        success: false,
        season: input.season,
        week: input.week,
        syncedLeagueCount: 0,
        notes: [
          'YAHOO_ACCESS_TOKEN is missing. Add token handling before enabling scheduled sync.',
        ],
      };
    }

    const notes: string[] = [];

    for (const leagueKey of input.leagueKeys) {
      await this.yahooClient.getLeagueTeams(leagueKey, accessToken);
      await this.yahooClient.getLeagueScoreboard(leagueKey, input.week, accessToken);
      notes.push(`Fetched league teams and scoreboard for ${leagueKey}.`);
    }

    return {
      success: true,
      season: input.season,
      week: input.week,
      syncedLeagueCount: input.leagueKeys.length,
      notes,
    };
  }
}
