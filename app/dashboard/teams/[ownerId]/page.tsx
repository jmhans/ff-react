import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getClaimedOwner, pickDefaultWeek } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import RosterView from '../RosterView';

export const dynamic = 'force-dynamic';

const REGULAR_SEASON_WEEKS = 18;
const AVAILABLE_WEEKS = Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => i + 1);

export default async function OwnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ownerId: string }>;
  searchParams?: Promise<{ week?: string }>;
}) {
  const { ownerId } = await params;

  const ownerResult = await sql`
    SELECT id, display_name, team_name
    FROM ff_owners
    WHERE id = ${ownerId}
  `;
  const owner = ownerResult.rows[0];
  if (!owner) notFound();

  const claimed = await getClaimedOwner();
  const canEdit = !!claimed && (claimed.id === ownerId || claimed.isAdmin);

  const searchParamsResolved = (await searchParams) ?? {};
  let week = searchParamsResolved.week ? Number(searchParamsResolved.week) : null;
  if (!week) {
    const client = new SleeperClient();
    const state = await client.getNflState();
    week = pickDefaultWeek(AVAILABLE_WEEKS, state.week);
  }

  return (
    <RosterView
      ownerId={ownerId}
      ownerName={owner.display_name as string}
      teamName={owner.team_name as string | null}
      canEdit={canEdit}
      week={week}
      basePath={`/dashboard/teams/${ownerId}`}
    />
  );
}
