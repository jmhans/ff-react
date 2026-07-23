const POINTS_TABLES: Record<number, number[]> = {
  2: [20, -20],
  3: [20, 0, -20],
  4: [20, 10, -10, -20],
  5: [20, 10, 0, -10, -20],
  6: [20, 10, 5, -5, -10, -20],
};

export function calculateBedBetPoints(
  players: { golferId: string; rank: number }[],
  isHalf = false,
): { golferId: string; rank: number; points: number }[] {
  const n = players.length;
  const base = POINTS_TABLES[n];
  if (!base) throw new Error(`Unsupported player count: ${n}. Supported: 2–6.`);

  const multiplier = isHalf ? 0.5 : 1;

  const byRank = new Map<number, string[]>();
  for (const p of players) {
    if (!byRank.has(p.rank)) byRank.set(p.rank, []);
    byRank.get(p.rank)!.push(p.golferId);
  }

  let idx = 0;
  const pointsMap = new Map<string, number>();
  for (const [, ids] of [...byRank.entries()].sort(([a], [b]) => a - b)) {
    const slice = base.slice(idx, idx + ids.length);
    const avg = (slice.reduce((a, b) => a + b, 0) / ids.length) * multiplier;
    for (const id of ids) pointsMap.set(id, avg);
    idx += ids.length;
  }

  return players.map((p) => ({ ...p, points: pointsMap.get(p.golferId)! }));
}
