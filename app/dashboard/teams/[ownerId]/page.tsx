import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import RosterView from '../RosterView';

export const dynamic = 'force-dynamic';

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
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

  return (
    <RosterView
      ownerId={ownerId}
      ownerName={owner.display_name as string}
      teamName={owner.team_name as string | null}
      canEdit={canEdit}
    />
  );
}
