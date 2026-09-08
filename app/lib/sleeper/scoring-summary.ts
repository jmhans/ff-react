/**
 * Sleeper's scoring_settings is ~150 mostly-zero stat categories. This picks
 * out the handful that actually describe a league's scoring format for a
 * human, rather than dumping the raw object.
 */
export function summarizeScoringSettings(settings: Record<string, number>): string[] {
  const lines: string[] = [];

  const rec = settings.rec ?? 0;
  if (rec >= 1) lines.push('Full PPR (1 pt/reception)');
  else if (rec >= 0.5) lines.push(`Half PPR (${rec} pt/reception)`);
  else if (rec > 0) lines.push(`${rec} pt/reception`);
  else lines.push('Standard (no PPR)');

  const passParts: string[] = [];
  if (settings.pass_yd) passParts.push(`${settings.pass_yd}/yd`);
  if (settings.pass_td) passParts.push(`${settings.pass_td}/TD`);
  if (settings.pass_int) passParts.push(`${settings.pass_int}/INT`);
  if (passParts.length) lines.push(`Passing: ${passParts.join(', ')}`);

  const rushParts: string[] = [];
  if (settings.rush_yd) rushParts.push(`${settings.rush_yd}/yd`);
  if (settings.rush_td) rushParts.push(`${settings.rush_td}/TD`);
  if (rushParts.length) lines.push(`Rushing: ${rushParts.join(', ')}`);

  const recParts: string[] = [];
  if (settings.rec_yd) recParts.push(`${settings.rec_yd}/yd`);
  if (settings.rec_td) recParts.push(`${settings.rec_td}/TD`);
  if (recParts.length) lines.push(`Receiving: ${recParts.join(', ')}`);

  if (settings.fum_lost) lines.push(`Fumble lost: ${settings.fum_lost}`);

  const bonusEntries = Object.entries(settings).filter(
    ([key, value]) => key.startsWith('bonus_') && value !== 0,
  );
  for (const [key, value] of bonusEntries) {
    lines.push(`Bonus (${key.replace('bonus_', '').replace(/_/g, ' ')}): +${value}`);
  }

  if (settings.pts_allow_0) lines.push('Uses points-allowed defense scoring');

  return lines;
}
