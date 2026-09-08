import { sql } from '@vercel/postgres';
import { claimOwner } from '@/app/lib/ff-draft-actions';

export default async function ClaimOwnerBanner() {
  const unclaimed = await sql`
    SELECT o.id, o.display_name, o.team_name
    FROM ff_owners o
    WHERE NOT EXISTS (SELECT 1 FROM ff_owner_logins l WHERE l.owner_id = o.id)
    ORDER BY o.display_name ASC
  `;

  if (unclaimed.rows.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p className="text-sm text-amber-900">
          Every owner has already been claimed, but your login isn&apos;t linked to one. Ask an admin for help.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <p className="font-semibold text-amber-900">Which owner are you?</p>
      <p className="mt-1 text-sm text-amber-800">Claim your Fantasy Fantasy owner to draft and vote on your own picks.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {unclaimed.rows.map((owner) => (
          <form key={owner.id as string} action={claimOwner.bind(null, owner.id as string)}>
            <button
              type="submit"
              className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              I&apos;m {owner.display_name as string}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
