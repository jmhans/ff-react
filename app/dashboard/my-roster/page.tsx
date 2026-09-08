import { auth0 } from '@/app/lib/auth0';
import { LoginButton } from '@/app/ui/auth/buttons';
import { CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import ClaimOwnerBanner from '@/app/dashboard/draft/ClaimOwnerBanner';
import RosterView from '@/app/dashboard/teams/RosterView';

export const dynamic = 'force-dynamic';

export default async function MyRosterPage() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">My Roster</h1>
          <p className="mt-1 text-sm text-gray-600">Log in to see your {CURRENT_SEASON} Fantasy Fantasy roster.</p>
        </div>
        <LoginButton />
      </main>
    );
  }

  const claimed = await getClaimedOwner();
  if (!claimed) {
    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">My Roster</h1>
          <p className="mt-1 text-sm text-gray-600">Claim your owner identity to see your roster.</p>
        </div>
        <ClaimOwnerBanner />
      </main>
    );
  }

  return <RosterView ownerId={claimed.id} ownerName={claimed.displayName} teamName={claimed.teamName} canEdit={true} />;
}
