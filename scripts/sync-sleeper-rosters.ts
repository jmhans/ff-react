import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { syncAllLeagueRosters } from '@/app/lib/refresh';

async function main() {
  const result = await syncAllLeagueRosters();
  console.log(`Done. Synced ${result.synced}, skipped ${result.skipped}, failed ${result.failed}.`);
}

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
