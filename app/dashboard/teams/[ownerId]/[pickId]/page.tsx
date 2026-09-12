import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { computeWeeklyMatchup } from '@/app/lib/sleeper/weekly-matchup';
import { getCachedPlayers } from '@/app/lib/sleeper/players-cache';

export const dynamic = 'force-dynamic';

const POSITION_ORDER: Record<string, number> = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DEF: 5 };

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ ownerId: string; pickId: string }>;
}) {
  const { ownerId, pickId } = await params;

  const pickResult = await sql`
    SELECT
      dp.id,
      dp.picked_name,
      dp.sleeper_league_key as league_key,
      dp.sleeper_user_id,
      o.display_name as owner_name,
      l.display_name as league_name
    FROM ff_draft_picks dp
    JOIN ff_owners o ON o.id = dp.drafter_owner_id
    LEFT JOIN ff_leagues l ON l.sleeper_league_key = dp.sleeper_league_key AND l.platform = 'sleeper'
    WHERE dp.id = ${pickId} AND dp.drafter_owner_id = ${ownerId}
  `;
  const pick = pickResult.rows[0];
  if (!pick || !pick.league_key || !pick.sleeper_user_id) notFound();

  const weekly = await computeWeeklyMatchup(pick.league_key as string, pick.sleeper_user_id as string);

  // Full roster — from our own cached ff_sleeper_rosters (synced daily / via
  // the manual refresh button), not a live Sleeper call. That cache only has
  // player_ids, so names/positions come from the (separately cached) full
  // player DB.
  const rosterResult = await sql`
    SELECT player_ids, synced_at
    FROM ff_sleeper_rosters
    WHERE league_key = ${pick.league_key as string} AND sleeper_user_id = ${pick.sleeper_user_id as string}
  `;
  const rosterRow = rosterResult.rows[0];
  const rosterPlayerIds = (rosterRow?.player_ids as string[] | undefined) ?? [];
  const syncedAt = rosterRow?.synced_at as string | undefined;

  let rosterPlayers: { playerId: string; name: string; position: string | null; team: string | null }[] = [];
  if (rosterPlayerIds.length > 0) {
    const players = await getCachedPlayers();
    rosterPlayers = rosterPlayerIds
      .map((playerId) => {
        const player = players[playerId];
        return {
          playerId,
          name: player ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() : playerId,
          position: player?.position ?? null,
          team: player?.team ?? null,
        };
      })
      .sort((a, b) => {
        const posA = a.position ? POSITION_ORDER[a.position] ?? 99 : 99;
        const posB = b.position ? POSITION_ORDER[b.position] ?? 99 : 99;
        return posA !== posB ? posA - posB : a.name.localeCompare(b.name);
      });
  }

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{pick.picked_name as string}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Drafted by {pick.owner_name as string} — {(pick.league_name as string) ?? 'Unknown league'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">
            {weekly?.week ? `Week ${weekly.week} Matchup` : 'This Week'}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Opponent</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{weekly?.opponentName ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Live For</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {weekly?.liveFor != null ? weekly.liveFor.toFixed(1) : '-'}
              {weekly?.projFor != null ? <span className="ml-1 text-xs text-gray-400">(opened {weekly.projFor.toFixed(1)})</span> : null}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Live Against</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {weekly?.liveAgainst != null ? weekly.liveAgainst.toFixed(1) : '-'}
              {weekly?.projAgainst != null ? <span className="ml-1 text-xs text-gray-400">(opened {weekly.projAgainst.toFixed(1)})</span> : null}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Win %</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {weekly?.liveWinProb != null ? `${(weekly.liveWinProb * 100).toFixed(0)}%` : '-'}
              {weekly?.winProb != null ? <span className="ml-1 text-xs text-gray-400">(opened {(weekly.winProb * 100).toFixed(0)}%)</span> : null}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">Starting Lineup</h2>
        </div>
        {weekly?.ourStarters?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Proj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weekly.ourStarters.map((starter) => (
                  <tr key={starter.playerId}>
                    <td className="px-4 py-2.5 text-gray-600">{starter.slot}</td>
                    <td className="px-4 py-2.5 text-gray-900">{starter.name}</td>
                    <td className="px-4 py-2.5 text-gray-900">
                      {starter.livePoints.toFixed(1)}
                      {starter.isActual ? <span className="ml-1 text-xs text-green-600">final</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{starter.points.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-gray-500">No lineup data available.</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">Full Roster</h2>
          {syncedAt ? (
            <p className="text-xs text-gray-500">Synced {new Date(syncedAt).toLocaleString()}</p>
          ) : null}
        </div>
        {rosterPlayers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">NFL Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rosterPlayers.map((p) => (
                  <tr key={p.playerId}>
                    <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.position ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.team ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-gray-500">
            No roster synced yet — check back after the next daily refresh.
          </p>
        )}
      </div>
    </main>
  );
}
