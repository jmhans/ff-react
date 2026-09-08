export type ScheduledMatchup = {
  week: number;
  homeOwnerId: string;
  awayOwnerId: string | null; // null = bye week
};

/**
 * Standard circle-method round robin: fix the first id, rotate the rest each
 * week. An odd owner count gets a synthetic bye slot appended so the owner
 * paired with it that week is emitted with awayOwnerId: null. Produces
 * n-1 distinct pairings per lap; if `weeks` exceeds that, the cycle repeats.
 */
export function buildRoundRobinSchedule(ownerIds: string[], weeks: number, startWeek = 1): ScheduledMatchup[] {
  const ids: (string | null)[] = [...ownerIds];
  if (ids.length % 2 === 1) ids.push(null);
  const n = ids.length;
  const half = n / 2;

  const schedule: ScheduledMatchup[] = [];
  let round = [...ids];

  for (let w = 0; w < weeks; w++) {
    const week = startWeek + w;
    for (let i = 0; i < half; i++) {
      const a = round[i];
      const b = round[n - 1 - i];
      if (a === null || b === null) {
        const present = a === null ? b : a;
        if (present) schedule.push({ week, homeOwnerId: present, awayOwnerId: null });
        continue;
      }
      const [home, away] = w % 2 === 0 ? [a, b] : [b, a];
      schedule.push({ week, homeOwnerId: home, awayOwnerId: away });
    }
    round = [round[0], round[n - 1], ...round.slice(1, n - 1)];
  }

  return schedule;
}
