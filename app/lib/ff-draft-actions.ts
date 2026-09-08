'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { auth0 } from '@/app/lib/auth0';
import { buildSnakeOrder, CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';

export type ActionResult = { success: true } | { success: false; error: string };

export async function claimOwner(ownerId: string): Promise<ActionResult> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    return { success: false, error: 'Not logged in.' };
  }

  try {
    await sql`
      INSERT INTO ff_owner_logins (owner_id, auth0_user_id, email)
      VALUES (${ownerId}, ${session.user.sub}, ${session.user.email ?? null})
    `;
  } catch (error: any) {
    if (error?.code === '23505') {
      return { success: false, error: 'This login is already linked to an owner.' };
    }
    throw error;
  }

  revalidatePath('/dashboard/draft');
  return { success: true };
}

export async function saveDraftOrder(formData: FormData): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) {
    return { success: false, error: 'Only an admin can set the draft order.' };
  }

  const ownerIdsRaw = formData.get('ownerIdsJson');
  const roundsRaw = formData.get('rounds');
  if (typeof ownerIdsRaw !== 'string' || typeof roundsRaw !== 'string') {
    return { success: false, error: 'Missing order or rounds.' };
  }

  let ownerIds: string[];
  try {
    ownerIds = JSON.parse(ownerIdsRaw);
  } catch {
    return { success: false, error: 'Invalid order payload.' };
  }
  const rounds = Number(roundsRaw);
  if (!Array.isArray(ownerIds) || ownerIds.length === 0 || !Number.isInteger(rounds) || rounds < 1) {
    return { success: false, error: 'Invalid order or rounds.' };
  }

  const existing = await sql`SELECT id, started_at FROM ff_drafts WHERE season = ${CURRENT_SEASON}`;
  const existingDraft = existing.rows[0];
  if (existingDraft?.started_at) {
    return { success: false, error: 'Draft has already started — order is locked.' };
  }

  let draftId: string;
  if (existingDraft) {
    draftId = existingDraft.id as string;
    await sql`UPDATE ff_drafts SET rounds = ${rounds}, updated_at = now() WHERE id = ${draftId}`;
    await sql`DELETE FROM ff_draft_drafters WHERE draft_id = ${draftId}`;
  } else {
    const created = await sql`
      INSERT INTO ff_drafts (season, rounds) VALUES (${CURRENT_SEASON}, ${rounds})
      RETURNING id
    `;
    draftId = created.rows[0].id as string;
  }

  for (let i = 0; i < ownerIds.length; i++) {
    await sql`
      INSERT INTO ff_draft_drafters (draft_id, pick, owner_id)
      VALUES (${draftId}, ${i + 1}, ${ownerIds[i]})
    `;
  }

  revalidatePath('/dashboard/draft');
  return { success: true };
}

export async function startDraft(): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) {
    return { success: false, error: 'Only an admin can start the draft.' };
  }

  const draftResult = await sql`SELECT id, started_at, rounds FROM ff_drafts WHERE season = ${CURRENT_SEASON}`;
  const draft = draftResult.rows[0];
  if (!draft) return { success: false, error: 'No draft order has been set yet.' };
  if (draft.started_at) return { success: false, error: 'Draft has already started.' };

  const drafters = await sql`SELECT count(*) FROM ff_draft_drafters WHERE draft_id = ${draft.id}`;
  if (Number(drafters.rows[0].count) === 0) {
    return { success: false, error: 'No draft order has been set yet.' };
  }

  await sql`UPDATE ff_drafts SET started_at = now(), updated_at = now() WHERE id = ${draft.id}`;
  revalidatePath('/dashboard/draft');
  return { success: true };
}

export async function makePick(
  draftId: string,
  leagueKey: string,
  sleeperUserId: string,
  teamName: string,
): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed) {
    return { success: false, error: 'You need to claim your owner identity first.' };
  }

  const draftResult = await sql`SELECT rounds FROM ff_drafts WHERE id = ${draftId}`;
  const rounds = draftResult.rows[0]?.rounds as number | undefined;
  if (!rounds) return { success: false, error: 'Draft not found.' };

  const draftersResult = await sql`
    SELECT owner_id FROM ff_draft_drafters WHERE draft_id = ${draftId} ORDER BY pick ASC
  `;
  const ownerIds = draftersResult.rows.map((r) => r.owner_id as string);
  const totalPicks = ownerIds.length * rounds;

  const pickCountResult = await sql`SELECT count(*) FROM ff_draft_picks WHERE draft_id = ${draftId}`;
  const currentPickNumber = Number(pickCountResult.rows[0].count) + 1;

  if (currentPickNumber > totalPicks) {
    return { success: false, error: 'Draft is already complete.' };
  }

  const snakeOrder = buildSnakeOrder(ownerIds, rounds);
  const currentSlot = snakeOrder.find((s) => s.pickNumber === currentPickNumber);
  if (!currentSlot) {
    return { success: false, error: 'Could not determine the current pick.' };
  }
  // Normally only the scheduled owner can pick; an admin can pick on anyone's
  // behalf (e.g. drafting for someone who isn't around), but the pick is
  // still attributed to whoever's turn it actually is, not to the admin.
  if (currentSlot.ownerId !== claimed.id && !claimed.isAdmin) {
    return { success: false, error: "It's not your turn to pick." };
  }

  try {
    const insertResult = await sql`
      INSERT INTO ff_draft_picks (draft_id, pick_number, drafter_owner_id, sleeper_league_key, sleeper_user_id, picked_name, picked_at)
      SELECT ${draftId}, COALESCE(MAX(pick_number), 0) + 1, ${currentSlot.ownerId}, ${leagueKey}, ${sleeperUserId}, ${teamName}, now()
      FROM ff_draft_picks WHERE draft_id = ${draftId}
      RETURNING pick_number
    `;
    if (insertResult.rowCount === 0) {
      return { success: false, error: 'Pick failed unexpectedly — please refresh.' };
    }
  } catch (error: any) {
    if (error?.code === '23505') {
      return { success: false, error: 'Someone just picked — refresh and try again.' };
    }
    throw error;
  }

  revalidatePath('/dashboard/draft');
  return { success: true };
}

/**
 * Undoes only the single most recent pick — picks are strictly sequential,
 * so this is the one undo that can never leave a gap or inconsistent state.
 * Arbitrary/historical pick edits are intentionally not supported.
 */
export async function undoLastPick(draftId: string): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) {
    return { success: false, error: 'Only an admin can undo a pick.' };
  }

  const result = await sql`
    DELETE FROM ff_draft_picks
    WHERE id = (
      SELECT id FROM ff_draft_picks WHERE draft_id = ${draftId} ORDER BY pick_number DESC LIMIT 1
    )
    RETURNING pick_number
  `;

  if (result.rowCount === 0) {
    return { success: false, error: 'No picks to undo.' };
  }

  revalidatePath('/dashboard/draft');
  return { success: true };
}

const MAX_STARTERS = 7;

/**
 * Sets a pick's starter/bench status for one specific week. Per-week, not
 * global — see ff_weekly_starters in ff-schema.ts: a week with no explicit
 * row falls back to the most recent prior week, then to the legacy
 * ff_draft_picks.is_starter flag, which this function no longer writes to.
 */
export async function setPickStarterStatus(pickId: string, week: number, isStarter: boolean): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed) {
    return { success: false, error: 'You need to claim your owner identity first.' };
  }

  const pickRow = await sql`SELECT drafter_owner_id FROM ff_draft_picks WHERE id = ${pickId}`;
  const pick = pickRow.rows[0];
  if (!pick) {
    return { success: false, error: 'Pick not found.' };
  }
  if (!(pick.drafter_owner_id === claimed.id || claimed.isAdmin)) {
    return { success: false, error: 'Not your roster.' };
  }

  const lockRow = await sql`SELECT lock_at FROM ff_nfl_week_locks WHERE season = ${CURRENT_SEASON} AND week = ${week}`;
  const lockAt = lockRow.rows[0]?.lock_at as string | undefined;
  if (lockAt && new Date(lockAt) <= new Date()) {
    return { success: false, error: "This week's roster is locked." };
  }

  if (isStarter) {
    const starterCount = await sql`
      SELECT count(*) FROM ff_draft_picks dp
      JOIN ff_drafts d ON d.id = dp.draft_id
      WHERE dp.drafter_owner_id = ${pick.drafter_owner_id} AND d.season = ${CURRENT_SEASON} AND dp.id != ${pickId}
        AND COALESCE(
          (SELECT ws.is_starter FROM ff_weekly_starters ws
           WHERE ws.pick_id = dp.id AND ws.season = ${CURRENT_SEASON} AND ws.week <= ${week}
           ORDER BY ws.week DESC LIMIT 1),
          dp.is_starter
        ) = true
    `;
    if (Number(starterCount.rows[0].count) >= MAX_STARTERS) {
      return { success: false, error: `You already have ${MAX_STARTERS} starters — bench one before adding another.` };
    }
  }

  await sql`
    INSERT INTO ff_weekly_starters (season, week, pick_id, is_starter)
    VALUES (${CURRENT_SEASON}, ${week}, ${pickId}, ${isStarter})
    ON CONFLICT (season, week, pick_id) DO UPDATE SET is_starter = EXCLUDED.is_starter, updated_at = now()
  `;

  revalidatePath('/dashboard/my-roster');
  revalidatePath('/dashboard/teams');
  return { success: true };
}
