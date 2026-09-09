import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { auth0 } from '@/app/lib/auth0';
import { LoginButton } from '@/app/ui/auth/buttons';
import { buildSnakeOrder, CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import ClaimOwnerBanner from './ClaimOwnerBanner';
import DraftSetupForm, { SetupOwner } from './DraftSetupForm';
import DraftLiveRoom from './DraftLiveRoom';
import { StripSlot } from './DraftOrderStrip';
import { RosterEntry, PickHistoryEntry } from './RosterPanel';
import { AvailableTeamRow } from './AvailableTeamsPanel';

export const dynamic = 'force-dynamic';

const DEFAULT_ROUNDS = 8;

export default async function DraftPage() {
  const session = await auth0.getSession();
  const claimed = await getClaimedOwner();

  const draftResult = await sql`
    SELECT id, rounds, started_at FROM ff_drafts WHERE season = ${CURRENT_SEASON}
  `;
  const draft = draftResult.rows[0];

  if (!session?.user) {
    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Draft Room</h1>
          <p className="mt-1 text-sm text-gray-600">Log in to view or take part in the {CURRENT_SEASON} draft.</p>
        </div>
        <LoginButton />
      </main>
    );
  }

  // --- Setup phase: no draft yet, or order saved but not started ---
  if (!draft?.started_at) {
    const activeOwnersResult = await sql`
      SELECT id, display_name, team_name FROM ff_owners WHERE active = true ORDER BY display_name ASC
    `;
    const activeOwners: SetupOwner[] = activeOwnersResult.rows.map((o) => ({
      id: o.id as string,
      displayName: o.display_name as string,
      teamName: o.team_name as string | null,
    }));

    let initialOrder: string[] = [];
    if (draft) {
      const draftersResult = await sql`
        SELECT owner_id FROM ff_draft_drafters WHERE draft_id = ${draft.id} ORDER BY pick ASC
      `;
      initialOrder = draftersResult.rows.map((r) => r.owner_id as string);
    }

    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Draft Room</h1>
          <p className="mt-1 text-sm text-gray-600">The {CURRENT_SEASON} draft hasn&apos;t started yet.</p>
        </div>

        {!claimed ? <ClaimOwnerBanner /> : null}

        <DraftSetupForm
          activeOwners={activeOwners}
          initialOrder={initialOrder}
          initialRounds={(draft?.rounds as number | undefined) ?? DEFAULT_ROUNDS}
          isAdmin={claimed?.isAdmin ?? false}
          hasSavedOrder={initialOrder.length > 0}
        />
      </main>
    );
  }

  // --- Live or complete: draft has been started ---
  const rounds = draft.rounds as number;

  const [draftersResult, picksResult] = await Promise.all([
    sql`
      SELECT dd.pick, dd.owner_id, o.display_name, o.team_name
      FROM ff_draft_drafters dd
      JOIN ff_owners o ON o.id = dd.owner_id
      WHERE dd.draft_id = ${draft.id}
      ORDER BY dd.pick ASC
    `,
    sql`
      SELECT pick_number, drafter_owner_id, sleeper_league_key, sleeper_user_id, picked_name
      FROM ff_draft_picks
      WHERE draft_id = ${draft.id}
      ORDER BY pick_number ASC
    `,
  ]);

  const ownerIds = draftersResult.rows.map((r) => r.owner_id as string);
  const ownerNamesById: Record<string, string> = {};
  for (const r of draftersResult.rows) {
    ownerNamesById[r.owner_id as string] = (r.team_name as string) || (r.display_name as string);
  }

  const totalPicks = ownerIds.length * rounds;
  const currentPickNumber = picksResult.rows.length + 1;
  const snakeOrder = buildSnakeOrder(ownerIds, rounds);

  const pickedTeamByPickNumber = new Map(
    picksResult.rows.map((p) => [p.pick_number as number, p.picked_name as string]),
  );

  const slots: StripSlot[] = snakeOrder.map((s) => ({
    pickNumber: s.pickNumber,
    round: s.round,
    ownerId: s.ownerId,
    ownerName: ownerNamesById[s.ownerId] ?? 'Unknown',
    pickedTeamName: pickedTeamByPickNumber.get(s.pickNumber) ?? null,
  }));

  const rostersByOwnerId: Record<string, RosterEntry[]> = {};
  for (const p of picksResult.rows) {
    const ownerId = p.drafter_owner_id as string;
    if (!rostersByOwnerId[ownerId]) rostersByOwnerId[ownerId] = [];
    rostersByOwnerId[ownerId].push({
      pickNumber: p.pick_number as number,
      teamName: p.picked_name as string,
      leagueKey: p.sleeper_league_key as string,
      userId: p.sleeper_user_id as string,
    });
  }

  // Most-recent-first, for the Pick History tab.
  const pickHistory: PickHistoryEntry[] = [...picksResult.rows]
    .reverse()
    .map((p) => ({
      pickNumber: p.pick_number as number,
      ownerName: ownerNamesById[p.drafter_owner_id as string] ?? 'Unknown',
      teamName: p.picked_name as string,
      leagueKey: p.sleeper_league_key as string,
      userId: p.sleeper_user_id as string,
    }));

  const isComplete = currentPickNumber > totalPicks;

  if (isComplete) {
    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Draft Room</h1>
          <p className="mt-1 text-sm text-gray-600">The {CURRENT_SEASON} draft is complete.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ownerIds.map((ownerId) => (
            <div key={ownerId} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-gray-900">{ownerNamesById[ownerId]}</p>
              <ul className="mt-2 space-y-1">
                {(rostersByOwnerId[ownerId] ?? []).map((p) => (
                  <li key={p.pickNumber} className="text-sm text-gray-700">
                    <span className="mr-1 text-xs text-gray-400">#{p.pickNumber}</span>
                    <Link
                      href={`/dashboard/sleeper-pool/${p.leagueKey}/${p.userId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {p.teamName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const currentSlot = slots.find((s) => s.pickNumber === currentPickNumber);
  const isMyTurn = !!claimed && currentSlot?.ownerId === claimed.id;

  // Available teams pool — same shape/source as the Sleeper Team Pool page,
  // minus whatever's already been drafted in this draft.
  type PoolRow = {
    league_key: string;
    sleeper_user_id: string | null;
    team_name: string | null;
    league_name: string | null;
    projected_points: string | null;
    hist_win_pct: string | null;
    composite_raw_z: string | null;
    overall_rank: string | null;
  };

  const [poolResult, historyResult] = await Promise.all([
    sql<PoolRow>`
      SELECT
        tr.root_league_key as league_key,
        tr.sleeper_user_id,
        COALESCE(r.team_name, tr.display_name) as team_name,
        l.display_name as league_name,
        p.projected_points,
        tr.win_pct as hist_win_pct,
        p.composite_raw_z,
        RANK() OVER (ORDER BY p.composite_raw_z DESC NULLS LAST) as overall_rank
      FROM ff_team_rankings tr
      JOIN ff_leagues l ON l.sleeper_league_key = tr.root_league_key AND l.platform = 'sleeper' AND l.include_in_pool = true
      LEFT JOIN ff_sleeper_rosters r ON r.league_key = tr.root_league_key AND r.sleeper_user_id = tr.sleeper_user_id
      LEFT JOIN ff_team_projections p ON p.league_key = tr.root_league_key AND p.sleeper_user_id = tr.sleeper_user_id
      LEFT JOIN ff_draft_picks dp ON dp.draft_id = ${draft.id}
        AND dp.sleeper_league_key = tr.root_league_key AND dp.sleeper_user_id = tr.sleeper_user_id
      WHERE tr.sleeper_user_id IS NOT NULL AND dp.id IS NULL
    `,
    sql`
      SELECT root_league_key, sleeper_user_id, string_agg(finishing_rank::text, ';' ORDER BY season ASC) as hist_ranks
      FROM ff_sleeper_owner_history
      GROUP BY root_league_key, sleeper_user_id
    `,
  ]);

  const historyByKey = new Map(
    historyResult.rows.map((h) => [`${h.root_league_key}:${h.sleeper_user_id}`, h.hist_ranks as string | null]),
  );

  const poolRows: AvailableTeamRow[] = poolResult.rows.map((row) => ({
    key: `${row.league_key}-${row.sleeper_user_id}`,
    leagueKey: row.league_key,
    userId: row.sleeper_user_id!,
    overallRank: row.overall_rank ? Number(row.overall_rank) : null,
    teamName: row.team_name ?? 'Unnamed team',
    leagueName: row.league_name ?? '-',
    projectedPoints: row.projected_points ? Number(row.projected_points) : null,
    histRanksDisplay: historyByKey.get(`${row.league_key}:${row.sleeper_user_id}`) ?? '',
    histWinPct: row.hist_win_pct ? Number(row.hist_win_pct) : null,
    compositeZ: row.composite_raw_z ? Number(row.composite_raw_z) : null,
  }));

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Draft Room</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pick {currentPickNumber} of {totalPicks} — {currentSlot?.ownerName ?? 'Unknown'} is on the clock.
        </p>
      </div>

      {!claimed ? <ClaimOwnerBanner /> : null}

      <DraftLiveRoom
        slots={slots}
        currentPickNumber={currentPickNumber}
        viewerOwnerId={claimed?.id ?? null}
        isMyTurn={isMyTurn}
        isAdmin={claimed?.isAdmin ?? false}
        draftId={draft.id as string}
        poolRows={poolRows}
        rostersByOwnerId={rostersByOwnerId}
        ownerNamesById={ownerNamesById}
        hasPicks={picksResult.rows.length > 0}
        pickHistory={pickHistory}
      />
    </main>
  );
}
