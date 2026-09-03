import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { readFileSync } from 'fs';
import { sql } from '@vercel/postgres';
import { SleeperClient } from '@/app/lib/sleeper/client';

const SEASON = 2026;

// Guillotine/best-ball leagues can slip through the type field, so also
// exclude by name as a backstop.
const SUSPICIOUS_NAME = /guillotine|best ?ball|chop|snip|widowmaker|decapitat/i;

type CandidateRow = {
  leagueId: string;
  name: string;
  totalRosters: number;
  leagueType: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new SleeperClient();
  const candidates: CandidateRow[] = JSON.parse(readFileSync('scripts/output/sleeper-candidates.json', 'utf-8'));

  const toInsert: { leagueId: string; name: string }[] = [];

  for (const c of candidates) {
    if (c.leagueType !== 0 && c.leagueType !== 1) continue; // redraft or keeper only
    if (SUSPICIOUS_NAME.test(c.name)) continue;

    try {
      const league = await client.getLeague(c.leagueId);
      const history = await client.getLeagueHistory(c.leagueId);
      const isHeadToHead = league?.settings?.league_average_match === 0;
      const isBestBall = league?.settings?.best_ball === 1;

      if (isHeadToHead && !isBestBall && history.length >= 3) {
        toInsert.push({ leagueId: c.leagueId, name: c.name.trim() });
        console.log(`INCLUDE: ${c.name.trim()} (${history.length} seasons)`);
      }
    } catch (e: any) {
      console.log(`SKIP (fetch failed): ${c.name} - ${e?.response?.status ?? e.message}`);
    }
    await sleep(150);
  }

  console.log(`\nInserting ${toInsert.length} leagues into ff_leagues...`);

  for (const league of toInsert) {
    await sql`
      INSERT INTO ff_leagues (season, platform, sleeper_league_key, display_name)
      VALUES (${SEASON}, 'sleeper', ${league.leagueId}, ${league.name})
    `;
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
