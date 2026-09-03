import { writeFileSync } from 'fs';
import { SleeperClient, SleeperLeague } from '@/app/lib/sleeper/client';

// Seed user_ids pulled from a real (guillotine, so excluded) league's user list.
// Fan out to every other league each of these real people plays in, looking
// for standard redraft leagues as candidates.
const SEED_USER_IDS = [
  '582410419730169856',
  '739357564583735296',
  '742765882853433344',
  '1000844089228681216',
  '1098113472203821056',
  '1261902740276137984',
  '1264816506017939456',
  '1264996865741438976',
  '1393016388137795584',
  '1393057595547222016',
  '1393093238843269120',
  '1393276039534219264',
  '1393340727026524160',
  '1394865528522166272',
  '1395873637403201536',
  '1395940897526411264',
  '1395941506992312320',
  '1395997041229844480',
  '1397247980242735104',
];

const EXCLUDE_LEAGUE_IDS = new Set(['1392643460938371072']); // the guillotine league itself
const SEASON = '2026';
const SPORT = 'nfl';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type CandidateRow = {
  leagueId: string;
  name: string;
  season: string;
  status: string;
  totalRosters: number;
  leagueType: number; // 0 = redraft, 1 = keeper, 2 = dynasty (Sleeper convention)
  scoringType: string;
  historicalSeasonsCount: number;
  rosterPositions: string[];
  foundViaUserIds: string[];
};

async function main() {
  const client = new SleeperClient();
  const leagueIdToUsers = new Map<string, Set<string>>();

  for (const userId of SEED_USER_IDS) {
    try {
      const leagues = await client.getUserLeagues(userId, SEASON, SPORT);
      for (const lg of leagues) {
        if (EXCLUDE_LEAGUE_IDS.has(lg.league_id)) continue;
        if (!leagueIdToUsers.has(lg.league_id)) {
          leagueIdToUsers.set(lg.league_id, new Set());
        }
        leagueIdToUsers.get(lg.league_id)!.add(userId);
      }
      console.log(`user ${userId}: ${leagues.length} leagues`);
    } catch (e: any) {
      console.log(`user ${userId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  console.log(`\nFound ${leagueIdToUsers.size} distinct candidate leagues. Fetching details...\n`);

  const candidates: CandidateRow[] = [];

  for (const [leagueId, users] of leagueIdToUsers.entries()) {
    try {
      const league = await client.getLeague(leagueId);
      if (!league) continue;

      const history = await client.getLeagueHistory(leagueId);

      candidates.push({
        leagueId,
        name: league.name,
        season: league.season,
        status: league.status,
        totalRosters: league.total_rosters,
        leagueType: league.settings?.type ?? 0,
        scoringType: league.settings?.type === 2 ? 'median' : 'head-to-head',
        historicalSeasonsCount: history.length,
        rosterPositions: league.roster_positions,
        foundViaUserIds: Array.from(users),
      });

      console.log(`${leagueId}: "${league.name}" - ${league.total_rosters} teams, type=${league.settings?.type}, ${history.length} seasons of history`);
    } catch (e: any) {
      console.log(`${leagueId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  writeFileSync('scripts/output/sleeper-candidates.json', JSON.stringify(candidates, null, 2));
  console.log(`\nWrote ${candidates.length} candidates to scripts/output/sleeper-candidates.json`);
}

main();
