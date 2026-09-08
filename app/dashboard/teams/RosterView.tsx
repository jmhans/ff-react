import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import StarterToggle from '@/app/dashboard/my-roster/StarterToggle';
import TeamNameEditor from './TeamNameEditor';

type RosterRow = {
  id: string;
  pick_number: number;
  picked_name: string;
  is_starter: boolean;
  league_name: string | null;
  opponent_name: string | null;
  proj_for: string | null;
  proj_against: string | null;
  win_prob: string | null;
};

/**
 * The full roster view for one owner's drafted teams — starter/bench status,
 * league, this-week matchup (opponent, proj for/against, win%). Used both by
 * /dashboard/my-roster (the logged-in owner, canEdit always true) and
 * /dashboard/teams/[ownerId] (anyone's team, canEdit only for that owner or
 * an admin) — same page, different identity/edit-permission.
 *
 * Matchup data comes from ff_team_win_probability_cache (refreshed by a
 * Vercel Cron job), not live Sleeper calls — this page used to call
 * computeWeeklyMatchup once per pick on every render (and again after every
 * starter/bench toggle, since Next re-renders the page after a Server
 * Action), which was the real source of multi-second loads/toggles.
 */
export default async function RosterView({
  ownerId,
  ownerName,
  teamName,
  canEdit,
}: {
  ownerId: string;
  ownerName: string;
  teamName: string | null;
  canEdit: boolean;
}) {
  const draftResult = await sql`SELECT id FROM ff_drafts WHERE season = ${CURRENT_SEASON}`;
  const draft = draftResult.rows[0];

  if (!draft) {
    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">{teamName ?? ownerName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            The {CURRENT_SEASON} draft hasn&apos;t been set up yet — check the Draft Room.
          </p>
        </div>
      </main>
    );
  }

  const client = new SleeperClient();
  const state = await client.getNflState();
  const currentWeek = state.week;

  const picks = await sql<RosterRow>`
    SELECT
      dp.id,
      dp.pick_number,
      dp.picked_name,
      dp.is_starter,
      l.display_name as league_name,
      c.opponent_name,
      c.proj_for,
      c.proj_against,
      c.win_prob
    FROM ff_draft_picks dp
    LEFT JOIN ff_leagues l ON l.sleeper_league_key = dp.sleeper_league_key AND l.platform = 'sleeper'
    LEFT JOIN ff_team_win_probability_cache c
      ON c.pick_id = dp.id AND c.season = ${CURRENT_SEASON} AND c.week = ${currentWeek}
    WHERE dp.draft_id = ${draft.id} AND dp.drafter_owner_id = ${ownerId}
    ORDER BY dp.pick_number ASC
  `;

  const starters = picks.rows.filter((p) => p.is_starter);
  const bench = picks.rows.filter((p) => !p.is_starter);

  return (
    <main className="space-y-5">
      <div>
        {canEdit ? (
          <TeamNameEditor ownerId={ownerId} teamName={teamName} fallbackLabel={ownerName} />
        ) : (
          <h1 className="text-3xl font-semibold text-gray-900">{teamName ?? ownerName}</h1>
        )}
        <p className="mt-1 text-sm text-gray-600">{ownerName}</p>
      </div>

      {picks.rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">No picks on this roster yet — the draft may still be in progress.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900">
              Roster ({starters.length} starters, {bench.length} bench)
              <span className="ml-2 font-normal text-gray-500">— Week {currentWeek} matchups</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">League</th>
                  <th className="px-4 py-3">This Week Opponent</th>
                  <th className="px-4 py-3">Proj For</th>
                  <th className="px-4 py-3">Proj Against</th>
                  <th className="px-4 py-3">Win %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {picks.rows.map((pick) => (
                  <tr key={pick.id}>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <StarterToggle pickId={pick.id} isStarter={pick.is_starter} />
                      ) : (
                        <span
                          className={
                            pick.is_starter
                              ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                              : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
                          }
                        >
                          {pick.is_starter ? 'Starter' : 'Bench'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{pick.picked_name}</td>
                    <td className="px-4 py-3 text-gray-700">{pick.league_name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{pick.opponent_name ?? '-'}</td>
                    <td className="px-4 py-3">{pick.proj_for != null ? Number(pick.proj_for).toFixed(1) : '-'}</td>
                    <td className="px-4 py-3">{pick.proj_against != null ? Number(pick.proj_against).toFixed(1) : '-'}</td>
                    <td className="px-4 py-3">{pick.win_prob != null ? `${(Number(pick.win_prob) * 100).toFixed(0)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
