import { readFileSync, writeFileSync } from 'fs';
import { SleeperClient } from '@/app/lib/sleeper/client';

// Round 2: fan out from the users of the round-1 redraft-flavored leagues
// (not the guillotine ones, to avoid re-clustering on the same crowd).
const ROUND1_SEED_LEAGUE_IDS = [
  '1388422987174141952', // Auction Action
  '1314056411600125952', // Cardiac League
  '1400151461563752448', // FF MN League
  '1397804415267663872', // Besty Ball 25
];

const ALREADY_SEEN_LEAGUE_IDS = new Set([
  '1392643460938371072', // original guillotine seed league
  '1323881432589799424', '1389720444369637376', '1389375262294020096',
  '1388422987174141952', '1346961544537194496', '1314056411600125952',
  '1383890267160997888', '1400151461563752448', '1394477033030967296',
  '1350887523039088640', '1312617084613595136', '1397804415267663872',
  '1392005092189675520', '1389480393421393921', '1385727262967468032',
]);

const ALREADY_SEEN_USER_IDS = new Set([
  '582410419730169856', '739357564583735296', '742765882853433344',
  '1000844089228681216', '1098113472203821056', '1261902740276137984',
  '1264816506017939456', '1264996865741438976', '1393016388137795584',
  '1393057595547222016', '1393093238843269120', '1393276039534219264',
  '1393340727026524160', '1394865528522166272', '1395873637403201536',
  '1395940897526411264', '1395941506992312320', '1395997041229844480',
  '1397247980242735104',
]);

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
  leagueType: number;
  scoringType: string;
  historicalSeasonsCount: number;
  rosterPositions: string[];
  foundViaUserIds: string[];
};

async function main() {
  const client = new SleeperClient();

  // Step 1: collect new user_ids from round-1 leagues' rosters.
  const newUserIds = new Set<string>();
  for (const leagueId of ROUND1_SEED_LEAGUE_IDS) {
    try {
      const users = await client.getLeagueUsers(leagueId);
      for (const u of users) {
        if (!ALREADY_SEEN_USER_IDS.has(u.user_id)) {
          newUserIds.add(u.user_id);
        }
      }
      console.log(`league ${leagueId}: ${users.length} users`);
    } catch (e: any) {
      console.log(`league ${leagueId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  console.log(`\nCollected ${newUserIds.size} new user_ids. Fanning out to their leagues...\n`);

  // Step 2: fan out each new user to their 2026 leagues.
  const leagueIdToUsers = new Map<string, Set<string>>();
  for (const userId of newUserIds) {
    try {
      const leagues = await client.getUserLeagues(userId, SEASON, SPORT);
      for (const lg of leagues) {
        if (ALREADY_SEEN_LEAGUE_IDS.has(lg.league_id)) continue;
        if (!leagueIdToUsers.has(lg.league_id)) {
          leagueIdToUsers.set(lg.league_id, new Set());
        }
        leagueIdToUsers.get(lg.league_id)!.add(userId);
      }
    } catch (e: any) {
      console.log(`user ${userId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  console.log(`Found ${leagueIdToUsers.size} new distinct candidate leagues. Fetching details...\n`);

  // Step 3: fetch details for each new candidate.
  const newCandidates: CandidateRow[] = [];
  for (const [leagueId, users] of leagueIdToUsers.entries()) {
    try {
      const league = await client.getLeague(leagueId);
      if (!league) continue;

      const history = await client.getLeagueHistory(leagueId);

      newCandidates.push({
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

  // Merge with round-1 output.
  const round1: CandidateRow[] = JSON.parse(readFileSync('scripts/output/sleeper-candidates.json', 'utf-8'));
  const merged = [...round1, ...newCandidates];
  writeFileSync('scripts/output/sleeper-candidates.json', JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${merged.length} total candidates (${newCandidates.length} new) to scripts/output/sleeper-candidates.json`);
}

main();
