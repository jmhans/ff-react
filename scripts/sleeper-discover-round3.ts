import { readFileSync, writeFileSync } from 'fs';
import { SleeperClient } from '@/app/lib/sleeper/client';

const SEASON = '2026';
const SPORT = 'nfl';
const ORIGINAL_GUILLOTINE_SEED = '1392643460938371072';
const ORIGINAL_SEED_USER_IDS = [
  '582410419730169856', '739357564583735296', '742765882853433344',
  '1000844089228681216', '1098113472203821056', '1261902740276137984',
  '1264816506017939456', '1264996865741438976', '1393016388137795584',
  '1393057595547222016', '1393093238843269120', '1393276039534219264',
  '1393340727026524160', '1394865528522166272', '1395873637403201536',
  '1395940897526411264', '1395941506992312320', '1395997041229844480',
  '1397247980242735104',
];

// Round-3 seeds: a diverse spread of the better redraft/dynasty/keeper
// leagues found so far, deliberately avoiding the guillotine cluster.
const ROUND3_SEED_LEAGUE_IDS = [
  '1337955119911669760', // Die-Nasty
  '1345041454573043712', // GKD
  '1312067258968727552', // Superflex Dynasty
  '1314068066165886976', // BJNFF
  '1315462993789616128', // Playoffs?!
  '1312682912449069056', // Fuel Shop
  '1382948810015141888', // Das Quad
];

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
  bestBall?: boolean;
  draftStatus?: string | null;
  draftDate?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDraftInfo(client: SleeperClient, draftId: string | null) {
  if (!draftId) return { draftStatus: null, draftDate: null };
  try {
    const draft = await client.getDraft(draftId);
    return {
      draftStatus: draft?.status ?? null,
      draftDate: draft?.start_time ? new Date(draft.start_time).toISOString() : null,
    };
  } catch {
    return { draftStatus: null, draftDate: null };
  }
}

async function main() {
  const client = new SleeperClient();
  const existing: CandidateRow[] = JSON.parse(readFileSync('scripts/output/sleeper-candidates.json', 'utf-8'));

  // Reconstruct everything we've already touched, from the persisted data.
  const allSeenUserIds = new Set<string>(ORIGINAL_SEED_USER_IDS);
  const allSeenLeagueIds = new Set<string>([ORIGINAL_GUILLOTINE_SEED]);
  for (const c of existing) {
    allSeenLeagueIds.add(c.leagueId);
    for (const u of c.foundViaUserIds) allSeenUserIds.add(u);
  }

  // --- Backfill draft status/date on existing candidates ---
  console.log('Backfilling draft info on existing candidates...');
  for (const c of existing) {
    if (c.draftStatus !== undefined) continue; // already backfilled
    try {
      const league = await client.getLeague(c.leagueId);
      const info = await fetchDraftInfo(client, league?.draft_id ?? null);
      c.draftStatus = info.draftStatus;
      c.draftDate = info.draftDate;
      c.bestBall = league?.settings?.best_ball === 1;
    } catch {
      c.draftStatus = null;
      c.draftDate = null;
    }
    await sleep(150);
  }

  // --- Round 3: fan out from round-3 seed leagues' users ---
  const newUserIds = new Set<string>();
  for (const leagueId of ROUND3_SEED_LEAGUE_IDS) {
    try {
      const users = await client.getLeagueUsers(leagueId);
      for (const u of users) {
        if (!allSeenUserIds.has(u.user_id)) newUserIds.add(u.user_id);
      }
      console.log(`league ${leagueId}: ${users.length} users`);
    } catch (e: any) {
      console.log(`league ${leagueId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  console.log(`\nCollected ${newUserIds.size} new user_ids. Fanning out to their leagues...\n`);

  const leagueIdToUsers = new Map<string, Set<string>>();
  for (const userId of newUserIds) {
    try {
      const leagues = await client.getUserLeagues(userId, SEASON, SPORT);
      for (const lg of leagues) {
        if (allSeenLeagueIds.has(lg.league_id)) continue;
        if (!leagueIdToUsers.has(lg.league_id)) leagueIdToUsers.set(lg.league_id, new Set());
        leagueIdToUsers.get(lg.league_id)!.add(userId);
      }
    } catch (e: any) {
      console.log(`user ${userId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  console.log(`Found ${leagueIdToUsers.size} new distinct candidate leagues. Fetching details...\n`);

  const newCandidates: CandidateRow[] = [];
  for (const [leagueId, users] of leagueIdToUsers.entries()) {
    try {
      const league = await client.getLeague(leagueId);
      if (!league) continue;

      const history = await client.getLeagueHistory(leagueId);
      const draftInfo = await fetchDraftInfo(client, league.draft_id);

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
        bestBall: league.settings?.best_ball === 1,
        draftStatus: draftInfo.draftStatus,
        draftDate: draftInfo.draftDate,
      });

      console.log(`${leagueId}: "${league.name}" - ${league.total_rosters} teams, type=${league.settings?.type}, ${history.length} seasons, draft=${draftInfo.draftStatus}`);
    } catch (e: any) {
      console.log(`${leagueId}: FAILED (${e?.response?.status ?? e.message})`);
    }
    await sleep(150);
  }

  const merged = [...existing, ...newCandidates];
  writeFileSync('scripts/output/sleeper-candidates.json', JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${merged.length} total candidates (${newCandidates.length} new) to scripts/output/sleeper-candidates.json`);
}

main();
