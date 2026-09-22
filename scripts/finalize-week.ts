import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { finalizeWeek } from '@/app/lib/finalize-week';

async function main() {
  const week = Number(process.argv[2]);
  if (!week) {
    console.error('Usage: npx tsx scripts/finalize-week.ts <week>');
    process.exit(1);
  }

  const result = await finalizeWeek(week);
  console.log(`Week ${result.week}: finalized ${result.finalized} matchup(s), skipped ${result.skipped}.`);
}

main().catch((error) => {
  console.error('Finalize failed:', error);
  process.exit(1);
});
