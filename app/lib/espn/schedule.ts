type EspnScoreboardResponse = {
  week?: { number: number };
  events?: { id: string; shortName: string; date: string }[];
};

/**
 * Real NFL kickoff times for one week, sorted ascending. Uses ESPN's public
 * unofficial scoreboard API (no auth). Must use fetch, not curl/axios with a
 * bare user-agent — Akamai's bot detection blocks curl-style clients on some
 * networks; a normal fetch (matching a browser's TLS/HTTP2 fingerprint more
 * closely) works fine. Returns [] rather than throwing on a bad/empty
 * response — a bye or not-yet-scheduled week shouldn't break a sync loop.
 */
export async function getWeekGameTimes(season: number, week: number): Promise<Date[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&year=${season}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as EspnScoreboardResponse;
    const events = data.events ?? [];
    if (events.length === 0) return [];

    return events
      .map((e) => new Date(e.date))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
  } catch {
    return [];
  }
}
