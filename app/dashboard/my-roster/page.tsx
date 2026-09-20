import { auth0 } from '@/app/lib/auth0';
import { LoginButton } from '@/app/ui/auth/buttons';
import { CURRENT_SEASON, getClaimedOwner, pickDefaultWeek } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import ClaimOwnerBanner from '@/app/dashboard/draft/ClaimOwnerBanner';
import RosterView from '@/app/dashboard/teams/RosterView';
import PushNotificationToggle from './PushNotificationToggle';

export const dynamic = 'force-dynamic';

const REGULAR_SEASON_WEEKS = 18;
const AVAILABLE_WEEKS = Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => i + 1);

export default async function MyRosterPage({
  searchParams,
}: {
  searchParams?: Promise<{ week?: string }>;
}) {
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

  const params = (await searchParams) ?? {};
  let week = params.week ? Number(params.week) : null;
  if (!week) {
    const client = new SleeperClient();
    const state = await client.getNflState();
    // Same default-week logic as every other roster/matchup page (see
    // pickDefaultWeek's doc comment) — stays on the current NFL week even
    // after that week's roster lock has passed, instead of jumping ahead to
    // the next editable week. Previously this page used a different
    // function (getNextEditableWeek) that WOULD jump ahead once the current
    // week locked (which happens mid-week, well before the week is over),
    // so My Roster and the Sleeper Team Pool page would silently default to
    // two different weeks and show two different win probabilities for the
    // same team.
    week = pickDefaultWeek(AVAILABLE_WEEKS, state.week);
  }

  return (
    <>
      <RosterView
        ownerId={claimed.id}
        ownerName={claimed.displayName}
        teamName={claimed.teamName}
        canEdit={true}
        week={week}
        basePath="/dashboard/my-roster"
      />
      <div className="mt-5">
        <PushNotificationToggle />
      </div>
    </>
  );
}
