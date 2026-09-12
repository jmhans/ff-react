import { SleeperPlayer, SleeperProjection } from './client';

// Which fantasy_positions satisfy each roster slot type.
export const SLOT_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  FLEX: ['RB', 'WR', 'TE'],
  REC_FLEX: ['WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
};

export function computeCustomPoints(
  stats: Record<string, number> | undefined,
  scoringSettings: Record<string, number>,
): number {
  if (!stats) return 0;
  let total = 0;
  for (const [statKey, weight] of Object.entries(scoringSettings)) {
    if (!weight) continue;
    const statValue = stats[statKey];
    if (statValue) total += statValue * weight;
  }
  return total;
}

export type StarterPick = {
  slot: string;
  playerId: string;
  name: string;
  points: number; // pure pre-game projection — never changes once projections are snapshotted
  livePoints: number; // actual (if that player's game has started/finished) else same as points
  isActual: boolean;
  position: string | null;
};

/**
 * Greedily fills concrete slots first (QB/RB/WR/TE/K/DEF), then flex-type
 * slots from whoever's left, always taking the highest-projected eligible
 * player. Same algorithm used for both season-long and single-week lineups —
 * just pass in the relevant projection stats for whichever window you want.
 * Lineup selection is always projection-based (who you'd optimally start
 * going into the week); actualStatsByPlayerId only affects each starter's
 * scored points once selected, not who gets selected.
 */
export function pickOptimalStarters(
  playerIds: string[],
  players: Record<string, SleeperPlayer>,
  projectionsByPlayerId: Map<string, SleeperProjection>,
  scoringSettings: Record<string, number>,
  rosterPositions: string[],
  actualStatsByPlayerId?: Map<string, Record<string, number>>,
): { totalPoints: number; liveTotalPoints: number; starters: StarterPick[] } {
  const startingSlots = rosterPositions.filter((p) => p !== 'BN' && p !== 'IR');
  const concreteSlots = startingSlots.filter((p) => (SLOT_ELIGIBILITY[p]?.length ?? 0) === 1);
  const flexSlots = startingSlots.filter((p) => (SLOT_ELIGIBILITY[p]?.length ?? 0) > 1);

  const candidates = playerIds.map((playerId) => {
    const player = players[playerId];
    const projection = projectionsByPlayerId.get(playerId);
    const actualStats = actualStatsByPlayerId?.get(playerId);
    const points = computeCustomPoints(projection?.stats, scoringSettings);
    return {
      playerId,
      fantasyPositions: player?.fantasy_positions ?? (player?.position ? [player.position] : []),
      points,
      livePoints: actualStats ? computeCustomPoints(actualStats, scoringSettings) : points,
      isActual: actualStats != null,
      name: player ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() : playerId,
      position: player?.position ?? null,
    };
  });

  const used = new Set<string>();
  const starters: StarterPick[] = [];

  for (const slot of concreteSlots) {
    const eligible = SLOT_ELIGIBILITY[slot] ?? [];
    const best = candidates
      .filter((c) => !used.has(c.playerId) && c.fantasyPositions.some((p) => eligible.includes(p)))
      .sort((a, b) => b.points - a.points)[0];
    if (best) {
      used.add(best.playerId);
      starters.push({ slot, playerId: best.playerId, name: best.name, points: best.points, livePoints: best.livePoints, isActual: best.isActual, position: best.position });
    }
  }

  for (const slot of flexSlots) {
    const eligible = SLOT_ELIGIBILITY[slot] ?? [];
    const best = candidates
      .filter((c) => !used.has(c.playerId) && c.fantasyPositions.some((p) => eligible.includes(p)))
      .sort((a, b) => b.points - a.points)[0];
    if (best) {
      used.add(best.playerId);
      starters.push({ slot, playerId: best.playerId, name: best.name, points: best.points, livePoints: best.livePoints, isActual: best.isActual, position: best.position });
    }
  }

  return {
    totalPoints: starters.reduce((sum, s) => sum + s.points, 0),
    liveTotalPoints: starters.reduce((sum, s) => sum + s.livePoints, 0),
    starters,
  };
}
