import axios, { AxiosInstance } from 'axios';

const YAHOO_TOKEN_ENDPOINT = 'https://api.login.yahoo.com/oauth2/get_token';
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

export type YahooTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export class YahooClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: YAHOO_API_BASE,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  private getBasicAuthHeader(): string {
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Missing Yahoo OAuth credentials in environment variables.');
    }

    return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }

  async getInitialToken(authCode: string): Promise<YahooTokenResponse> {
    const response = await axios.post(
      YAHOO_TOKEN_ENDPOINT,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: process.env.YAHOO_REDIRECT_URI || 'oob',
      }),
      {
        headers: {
          Authorization: `Basic ${this.getBasicAuthHeader()}`,
        },
      },
    );

    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<YahooTokenResponse> {
    const response = await axios.post(
      YAHOO_TOKEN_ENDPOINT,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: process.env.YAHOO_REDIRECT_URI || 'oob',
      }),
      {
        headers: {
          Authorization: `Basic ${this.getBasicAuthHeader()}`,
        },
      },
    );

    return response.data;
  }

  async getLeagueTeams(leagueKey: string, accessToken: string) {
    const response = await this.client.get(`/league/${leagueKey}/teams`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  async getLeagueScoreboard(leagueKey: string, week: number, accessToken: string) {
    const response = await this.client.get(`/league/${leagueKey}/scoreboard;week=${week}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }
}
