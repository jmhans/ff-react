import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { computeMatchupPlayerDetails } from '@/app/lib/ff-player-details';
import MatchupTabs from '../MatchupTabs';
import PlayerDetailsView from './PlayerDetailsView';

export const dynamic = 'force-dynamic';

export default async function MatchupPlayerDetailsPage({
  params,
}: {
  params: Promise<{ matchupId: string }>;
}) {
  const { matchupId } = await params;

  const matchupResult = await sql`
    SELECT id, week, home_owner_id, away_owner_id
    FROM ff_weekly_matchups
    WHERE id = ${matchupId}
  `;
  const matchup = matchupResult.rows[0];
  if (!matchup || !matchup.away_owner_id) notFound();

  const detail = await computeMatchupPlayerDetails(matchup.home_owner_id as string, matchup.away_owner_id as string, matchup.week as number);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Week {matchup.week} Matchup</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {detail.home.ownerName} vs {detail.away.ownerName}
        </p>
      </div>

      <MatchupTabs matchupId={matchupId} active="players" />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Every real player currently starting for one of these owners&apos; teams, or for one of those teams&apos; real
        opponents, sorted by net count for (# For minus # Against). A player can appear on both sides of the same
        owner (or with more than one count) if they&apos;re rostered by more than one of that owner&apos;s
        cross-league teams. <span className="text-gray-400">•</span> marks a player whose NFL game hasn&apos;t
        started yet.
      </p>

      <PlayerDetailsView home={detail.home} away={detail.away} />
    </main>
  );
}
