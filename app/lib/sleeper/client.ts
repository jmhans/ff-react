import axios, { AxiosInstance } from 'axios';

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1';

export type SleeperUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata: { team_name?: string } | null;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  sport: string;
  status: string; // pre_draft | drafting | in_season | complete
  total_rosters: number;
  draft_id: string | null;
  previous_league_id: string | null;
  settings: Record<string, number>;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  league_id: string;
  players: string[] | null;
  settings: Record<string, number>;
};

export type SleeperMatchup = {
  matchup_id: number | null;
  roster_id: number;
  points: number;
  starters: string[];
  players: string[];
};

export type SleeperDraft = {
  draft_id: string;
  league_id: string;
  status: string; // pre_draft | drafting | complete
  type: string; // snake | linear | auction
  start_time: number | null;
  settings: Record<string, number>;
};

/**
 * Read-only client for Sleeper's public Fantasy API. No auth required —
 * everything here is a plain GET against api.sleeper.app.
 */
export type SleeperPlayer = {
  player_id: string;
  position: string | null;
  fantasy_positions: string[] | null;
  first_name: string | null;
  last_name: string | null;
  team: string | null;
};

export type SleeperProjection = {
  player_id: string;
  week: number | null;
  season: string;
  stats: Record<string, number>;
};

export class SleeperClient {
  private client: AxiosInstance;
  private rootClient: AxiosInstance; // projections/players live outside /v1

  constructor() {
    this.client = axios.create({
      baseURL: SLEEPER_API_BASE,
      timeout: 15000,
    });
    this.rootClient = axios.create({
      baseURL: 'https://api.sleeper.app',
      timeout: 30000,
    });
  }

  /** Full NFL player database (~5-10MB). Cache this — Sleeper asks that it not be called more than once a day. */
  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    const response = await this.rootClient.get('/players/nfl');
    return response.data ?? {};
  }

  /** Season-long (week omitted) or single-week per-player projections. */
  async getSeasonProjections(season: string): Promise<SleeperProjection[]> {
    const response = await this.rootClient.get(`/projections/nfl/${season}`, {
      params: { season_type: 'regular' },
    });
    return response.data ?? [];
  }

  async getUserByUsername(username: string): Promise<SleeperUser | null> {
    const response = await this.client.get(`/user/${username}`);
    return response.data ?? null;
  }

  async getUserLeagues(userId: string, season: string, sport = 'nfl'): Promise<SleeperLeague[]> {
    const response = await this.client.get(`/user/${userId}/leagues/${sport}/${season}`);
    return response.data ?? [];
  }

  async getLeague(leagueId: string): Promise<SleeperLeague | null> {
    const response = await this.client.get(`/league/${leagueId}`);
    return response.data ?? null;
  }

  async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const response = await this.client.get(`/league/${leagueId}/rosters`);
    return response.data ?? [];
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const response = await this.client.get(`/league/${leagueId}/users`);
    return response.data ?? [];
  }

  async getLeagueMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    const response = await this.client.get(`/league/${leagueId}/matchups/${week}`);
    return response.data ?? [];
  }

  async getDraft(draftId: string): Promise<SleeperDraft | null> {
    const response = await this.client.get(`/draft/${draftId}`);
    return response.data ?? null;
  }

  /**
   * Winners bracket matchups. Entries with a `p` field are placement games —
   * p:1 is the championship (winner=1st, loser=2nd), p:3 is the 3rd place
   * game, etc. Entries without `p` are earlier rounds with no fixed placement.
   */
  async getWinnersBracket(leagueId: string): Promise<Array<{ r: number; m: number; t1: number | null; t2: number | null; w: number | null; l: number | null; p?: number }>> {
    const response = await this.client.get(`/league/${leagueId}/winners_bracket`);
    return response.data ?? [];
  }

  /**
   * Walk a league's `previous_league_id` chain to find every prior season on
   * record for it. Each hop is a separate league object with its own id, so
   * this makes one request per season back until the chain ends.
   */
  async getLeagueHistory(leagueId: string): Promise<SleeperLeague[]> {
    const history: SleeperLeague[] = [];
    let currentId: string | null = leagueId;

    while (currentId) {
      const league = await this.getLeague(currentId);
      if (!league) break;
      history.push(league);
      currentId = league.previous_league_id;
    }

    return history;
  }
}
