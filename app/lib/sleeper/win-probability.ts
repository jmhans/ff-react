import { StarterPick } from './lineup-optimizer';

/**
 * Coefficient of variation (stdev / mean) by position, applied to each
 * starter's own projection to get a per-player spread. These are rough
 * industry-standard figures (QBs are the steadiest fantasy scorers, WR/TE
 * the boomiest) — not yet calibrated from our own data. Once `ff_player_stat_log`
 * (see scripts/snapshot-week-projections.ts + record-week-actuals.ts) has
 * enough weeks logged, swap these for measured per-position residual stdevs.
 */
const POSITION_CV: Record<string, number> = {
  QB: 0.15,
  RB: 0.30,
  WR: 0.35,
  TE: 0.30,
  K: 0.25,
  DEF: 0.25,
};
const DEFAULT_CV = 0.30;

function sampleNormal(mean: number, sd: number): number {
  if (sd <= 0) return mean;
  const u1 = Math.random() || Number.MIN_VALUE; // avoid log(0)
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, mean + z * sd);
}

function simulateTeamTotal(starters: StarterPick[], useLive: boolean): number {
  let total = 0;
  for (const starter of starters) {
    const points = useLive ? starter.livePoints : starter.points;
    // Once a player's actual points are known, they're locked in — no more
    // variance to simulate for that player.
    const cv = useLive && starter.isActual ? 0 : (starter.position ? POSITION_CV[starter.position] : undefined) ?? DEFAULT_CV;
    total += sampleNormal(points, points * cv);
  }
  return total;
}

/**
 * Monte Carlo win probability for "our" lineup vs. an opponent's, sampling
 * each starter independently (normal, truncated at 0) around their own
 * projection. Returns our win probability in [0, 1]; ties split 50/50.
 * Pass useLive=true to simulate off each starter's live (actual-if-played,
 * else projected) points instead of the pure pre-game projection.
 */
export function simulateWinProbability(
  ourStarters: StarterPick[],
  theirStarters: StarterPick[],
  trials = 5000,
  useLive = false,
): number | null {
  if (ourStarters.length === 0 || theirStarters.length === 0) return null;

  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const ours = simulateTeamTotal(ourStarters, useLive);
    const theirs = simulateTeamTotal(theirStarters, useLive);
    if (ours > theirs) wins += 1;
    else if (ours === theirs) wins += 0.5;
  }
  return wins / trials;
}

/**
 * Monte Carlo win probability for a Fantasy Fantasy matchup, modeled as
 * "whoever's teams win more of their own individual matchups this week" —
 * not point totals (leagues have wildly different scoring scales, so summed
 * points aren't comparable across an owner's 7 teams). Each team's own win
 * probability (from simulateWinProbability against its real opponent) is
 * treated as an independent Bernoulli trial; each side's simulated win count
 * is compared per trial. Ties split 50/50.
 */
export function simulateTeamCountWinProbability(
  homeTeamWinProbs: number[],
  awayTeamWinProbs: number[],
  trials = 5000,
): number | null {
  if (homeTeamWinProbs.length === 0 || awayTeamWinProbs.length === 0) return null;

  let wins = 0;
  for (let i = 0; i < trials; i++) {
    let homeWins = 0;
    for (const p of homeTeamWinProbs) if (Math.random() < p) homeWins += 1;
    let awayWins = 0;
    for (const p of awayTeamWinProbs) if (Math.random() < p) awayWins += 1;
    if (homeWins > awayWins) wins += 1;
    else if (homeWins === awayWins) wins += 0.5;
  }
  return wins / trials;
}
