/**
 * Utility functions for calculating player costs based on odds and pool configuration
 */

export interface PlayerWithCost {
  id: string;
  name: string;
  oddsToWin: string;
  probability: number;
  cost: number;
}

/**
 * Parse odds string to probability
 * Supports fractional ("12/1") and American ("+490", "-110") odds
 * @param oddsString - Odds in format "X/1" or "+X" or "-X"
 * @returns Probability as decimal (0-1)
 */
export function parseOddsToProbability(oddsString: string): number {
  try {
    if (!oddsString) {
      console.log('⚠️ Empty odds string');
      return 0.001;
    }
    
    console.log(`🔍 Parsing odds: "${oddsString}" (type: ${typeof oddsString})`);
    
    // Check if American odds (starts with + or -)
    if (oddsString.startsWith('+') || oddsString.startsWith('-')) {
      const americanOdds = parseInt(oddsString, 10);
      console.log(`  → American odds detected, parsed as: ${americanOdds}`);
      if (isNaN(americanOdds)) {
        console.log(`  → NaN! Returning 0.001`);
        return 0.001;
      }
      
      if (americanOdds > 0) {
        // Positive odds: +490 → probability = 100 / (490 + 100)
        const prob = 100 / (americanOdds + 100);
        console.log(`  → Positive odds, prob = 100 / (${americanOdds} + 100) = ${prob}`);
        return prob;
      } else {
        // Negative odds: -110 → probability = 110 / (110 + 100)
        const absOdds = Math.abs(americanOdds);
        const prob = absOdds / (absOdds + 100);
        console.log(`  → Negative odds, prob = ${absOdds} / (${absOdds} + 100) = ${prob}`);
        return prob;
      }
    }
    
    // Fractional odds (X/Y) — e.g. "7/1", "77/20", "5/2"
    const parts = oddsString.split('/');
    if (parts.length !== 2) {
      console.log(`  → Not American or fractional, returning 0.001`);
      return 0.001;
    }
    
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (isNaN(num) || isNaN(den) || num < 0 || den <= 0) return 0.001;
    
    // probability = denominator / (numerator + denominator)
    return den / (num + den);
  } catch {
    return 0.001;
  }
}

/**
 * Calculate costs for all players given participant count and pool budget
 * Uses the same algorithm as initializeDraft
 * 
 * @param players - Array of players with oddsToWin strings
 * @param participantCount - Number of pool participants
 * @param budgetPerParticipant - Pool budget per participant (default $20 from master budget)
 * @returns Array of players with calculated costs
 */
export function calculatePlayerCosts(
  players: Array<{ id: string; name: string; oddsToWin: string }>,
  participantCount: number,
  budgetPerParticipant: number = 20,
  options?: { capPlayersAtBudget?: boolean; includeCappedInNormalization?: boolean }
): PlayerWithCost[] {
  if (participantCount === 0 || players.length === 0) {
    return players.map((p) => ({
      ...p,
      probability: 0,
      cost: 0,
    }));
  }

  const topPlayerCount = 4 * participantCount; // 4 players per participant
  const totalBudgetForTopPlayers = budgetPerParticipant * participantCount; // $20 per participant
  const { capPlayersAtBudget = true, includeCappedInNormalization = true } = options ?? {};
  const capAmount = budgetPerParticipant;

  // Convert odds to probability
  const playersWithProbs = players.map((player) => {
    const probability = parseOddsToProbability(player.oddsToWin);
    return {
      ...player,
      probability,
    };
  });

  // Sum all probabilities and normalize to total 100%
  const totalProbability = playersWithProbs.reduce((sum, p) => sum + p.probability, 0);
  const normalizedPlayers = playersWithProbs.map((p) => ({
    ...p,
    probability: p.probability / totalProbability,
  }));

  // Sort by normalized probability to identify top players
  const sortedByProb = [...normalizedPlayers].sort((a, b) => b.probability - a.probability);

  // Get top 4*P players and calculate their total probability
  const topPlayers = sortedByProb.slice(0, topPlayerCount);

  // Determine scaling factor, respecting cap settings
  const cappedPlayerIds = new Set<string>();
  let scalingFactor: number;

  if (!capPlayersAtBudget) {
    // No cap: scale all top players proportionally to fill the full budget
    const topProbSum = topPlayers.reduce((sum, p) => sum + p.probability, 0);
    scalingFactor = totalBudgetForTopPlayers / topProbSum;
  } else {
    // Iteratively pin players that exceed the cap:
    //   includeCappedInNormalization = true  → capped players' $20 reduces remaining budget
    //   includeCappedInNormalization = false → survivors keep the full budget (cap is a hard ceiling only)
    scalingFactor = 1;
    for (let iter = 0; iter < 20; iter++) {
      const survivors = topPlayers.filter((p) => !cappedPlayerIds.has(p.id));
      const survivorProbSum = survivors.reduce((sum, p) => sum + p.probability, 0);
      if (survivorProbSum <= 0) break;

      const remainingBudget = includeCappedInNormalization
        ? totalBudgetForTopPlayers
        : totalBudgetForTopPlayers - cappedPlayerIds.size * capAmount;
      scalingFactor = remainingBudget / survivorProbSum;

      const newlyCapped = survivors.filter((p) => p.probability * scalingFactor > capAmount);
      if (newlyCapped.length === 0) break; // stable

      newlyCapped.forEach((p) => cappedPlayerIds.add(p.id));
    }
  }

  // Assign costs to ALL players based on normalized probability
  const resultMap = new Map<string, PlayerWithCost>();

  players.forEach((player) => {
    const playerWithProb = normalizedPlayers.find((p) => p.id === player.id)!;

    let cost: number;
    if (cappedPlayerIds.has(player.id)) {
      cost = capAmount; // Hard cap at $20
    } else {
      const rawCost = playerWithProb.probability * scalingFactor;
      cost = Math.round(rawCost * 4) / 4; // Round to nearest 0.25
      cost = Math.max(0.25, cost); // Floor at $0.25
    }

    resultMap.set(player.id, {
      id: player.id,
      name: player.name,
      oddsToWin: player.oddsToWin,
      probability: playerWithProb.probability,
      cost,
    });
  });

  // Return in original order
  return players.map((p) => resultMap.get(p.id)!);
}

/**
 * Check if odds string is in valid format
 */
export function isValidOdds(oddsString: string): boolean {
  if (!oddsString) return false;
  const parts = oddsString.split('/');
  if (parts.length !== 2) return false;
  const num = parseInt(parts[0], 10);
  return !isNaN(num) && num >= 0;
}
