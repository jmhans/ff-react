import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import { getCachedPlayers } from '@/app/lib/sleeper/players-cache';

export const dynamic = 'force-dynamic';

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ leagueKey: string; userId: string }>;
}) {
  const { leagueKey, userId } = await params;

  const client = new SleeperClient();
  const league = await client.getLeague(leagueKey);
  if (!league) notFound();

  const [rosters, users] = await Promise.all([
    client.getLeagueRosters(leagueKey),
    client.getLeagueUsers(leagueKey),
  ]);

  const user = users.find((u) => u.user_id === userId);
  if (!user) notFound();

  const teamName = user.metadata?.team_name || user.display_name;
  const roster = rosters.find((r) => r.owner_id === userId);

  // Roster + record — live from Sleeper, not our periodic sync, so this stays current.
  const rosterPlayers: { name: string; position: string | null; badge: string; badgeStyle: string; isStarter: boolean }[] = [];
  if (roster?.players?.length) {
    const players = await getCachedPlayers();

    // `starters` is ordered to match roster_positions with BN/IR filtered out,
    // so zipping the two gives each starter's actual lineup slot (QB, FLEX, etc).
    const startingSlotOrder = league.roster_positions.filter((p) => p !== 'BN' && p !== 'IR');
    const slotByStarterPlayerId = new Map<string, string>();
    (roster.starters ?? []).forEach((playerId, i) => {
      if (playerId && playerId !== '0') slotByStarterPlayerId.set(playerId, startingSlotOrder[i] ?? 'Starter');
    });

    const reserveSet = new Set(roster.reserve ?? []);
    const taxiSet = new Set(roster.taxi ?? []);

    for (const playerId of roster.players) {
      const player = players[playerId];

      let badge = 'BN';
      let badgeStyle = 'bg-gray-100 text-gray-700';
      let isStarter = false;
      if (slotByStarterPlayerId.has(playerId)) {
        badge = slotByStarterPlayerId.get(playerId)!;
        badgeStyle = 'bg-green-100 text-green-800';
        isStarter = true;
      } else if (reserveSet.has(playerId)) {
        badge = 'IR';
        badgeStyle = 'bg-red-100 text-red-700';
      } else if (taxiSet.has(playerId)) {
        badge = 'Taxi';
        badgeStyle = 'bg-purple-100 text-purple-700';
      }

      rosterPlayers.push({
        name: player ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() : playerId,
        position: player?.position ?? null,
        badge,
        badgeStyle,
        isStarter,
      });
    }

    // Starters first (in lineup order), then bench/IR/taxi.
    rosterPlayers.sort((a, b) => (a.isStarter === b.isStarter ? 0 : a.isStarter ? -1 : 1));
  }

  const record = roster
    ? { wins: roster.settings?.wins ?? 0, losses: roster.settings?.losses ?? 0, ties: roster.settings?.ties ?? 0 }
    : null;

  // Next matchup — find our matchup_id for the current week, then whoever shares it.
  let opponent: { teamName: string; winProbability: number | null } | null = null;
  let matchupWeek: number | null = null;

  if (roster) {
    const state = await client.getNflState();
    matchupWeek = state.week;
    const matchups = await client.getMatchups(leagueKey, state.week);
    const ourMatchup = matchups.find((m) => m.roster_id === roster.roster_id);

    if (ourMatchup?.matchup_id != null) {
      const opponentMatchup = matchups.find(
        (m) => m.matchup_id === ourMatchup.matchup_id && m.roster_id !== roster.roster_id,
      );
      const opponentRoster = opponentMatchup ? rosters.find((r) => r.roster_id === opponentMatchup.roster_id) : null;
      const opponentUser = opponentRoster?.owner_id ? users.find((u) => u.user_id === opponentRoster.owner_id) : null;

      if (opponentUser && opponentRoster) {
        // Same win-probability source as everywhere else on the site (the
        // Sleeper Team Pool table, My Roster): the cached result of
        // computeWeeklyMatchup's Monte Carlo lineup simulation, refreshed by
        // app/lib/refresh.ts. Reading it here instead of recomputing our own
        // estimate keeps this page's number consistent with the rest of the
        // site instead of drifting from it.
        const cacheRows = await sql`
          SELECT COALESCE(twc.win_prob, pwc.win_prob) as win_prob
          FROM (SELECT 1 as x) placeholder
          LEFT JOIN ff_draft_picks dp
            ON dp.sleeper_league_key = ${leagueKey} AND dp.sleeper_user_id = ${userId}
            AND dp.draft_id = (SELECT id FROM ff_drafts WHERE season = ${CURRENT_SEASON} LIMIT 1)
          LEFT JOIN ff_team_win_probability_cache twc
            ON twc.pick_id = dp.id AND twc.season = ${CURRENT_SEASON} AND twc.week = ${state.week}
          LEFT JOIN ff_pool_team_win_probability_cache pwc
            ON pwc.league_key = ${leagueKey} AND pwc.sleeper_user_id = ${userId}
            AND pwc.season = ${CURRENT_SEASON} AND pwc.week = ${state.week}
        `;
        const winProb = cacheRows.rows[0]?.win_prob;

        opponent = {
          teamName: opponentUser.metadata?.team_name || opponentUser.display_name,
          winProbability: winProb != null ? Number(winProb) : null,
        };
      }
    }
  }

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{teamName}</h1>
        <p className="mt-1 text-sm text-gray-600">{league.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Record This Season</p>
          {record ? (
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {record.wins}-{record.losses}
              {record.ties > 0 ? `-${record.ties}` : ''}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No roster yet — league hasn&apos;t drafted.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Next Matchup{matchupWeek ? ` (Week ${matchupWeek})` : ''}
          </p>
          {opponent ? (
            <>
              <p className="mt-1 text-lg font-semibold text-gray-900">vs {opponent.teamName}</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {opponent.winProbability != null
                  ? `${(opponent.winProbability * 100).toFixed(0)}% win probability`
                  : 'Win probability unavailable (projections not computed yet)'}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No matchup scheduled.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">Current Roster</h2>
        </div>
        {rosterPlayers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rosterPlayers.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${p.badgeStyle}`}>
                        {p.badge}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.position ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-gray-500">No roster yet — league hasn&apos;t drafted.</p>
        )}
      </div>
    </main>
  );
}
