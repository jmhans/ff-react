import { getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import DataRefreshWidget from './DataRefreshWidget';

export const dynamic = 'force-dynamic';

export default async function AdminDataRefreshPage() {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Data Refresh</h1>
        <p className="text-sm text-gray-600">Admins only.</p>
      </main>
    );
  }

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Data Refresh</h1>
        <p className="mt-1 text-sm text-gray-600">
          The daily cron already runs roster sync + win probability together every morning — use these to force a refresh sooner.
        </p>
      </div>

      <DataRefreshWidget />
    </main>
  );
}
