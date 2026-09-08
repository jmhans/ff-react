import { sql } from '@vercel/postgres';
import { CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import GenerateScheduleForm from './GenerateScheduleForm';

export const dynamic = 'force-dynamic';

export default async function AdminSchedulePage() {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-gray-600">Admins only.</p>
      </main>
    );
  }

  const scheduleCheck = await sql`
    SELECT count(*) as total, count(*) FILTER (WHERE status = 'final') as final_count
    FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON}
  `;
  const hasSchedule = Number(scheduleCheck.rows[0].total) > 0;
  const hasFinalWeeks = Number(scheduleCheck.rows[0].final_count) > 0;

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="mt-1 text-sm text-gray-600">
          {hasSchedule
            ? `${CURRENT_SEASON} schedule is set — see Standings for the generated matchups.`
            : `No ${CURRENT_SEASON} schedule generated yet.`}
        </p>
      </div>

      <GenerateScheduleForm hasFinalWeeks={hasFinalWeeks} />
    </main>
  );
}
