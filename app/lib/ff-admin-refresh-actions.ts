'use server';

import { revalidatePath } from 'next/cache';
import { getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import { syncAllLeagueRosters, refreshAllWinProbabilities, refreshPoolWinProbabilities, recordWeekActuals } from '@/app/lib/refresh';

export type AdminRefreshResult = { success: true; message: string } | { success: false; error: string };

async function requireAdmin(): Promise<AdminRefreshResult | null> {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) return { success: false, error: 'Admins only.' };
  return null;
}

export async function adminRefreshRosters(): Promise<AdminRefreshResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await syncAllLeagueRosters();
  revalidatePath('/dashboard/sleeper-pool');
  revalidatePath('/dashboard/my-roster');
  return { success: true, message: `Synced ${result.synced} leagues, skipped ${result.skipped}, ${result.failed} failed.` };
}

export async function adminRefreshActuals(): Promise<AdminRefreshResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const client = new SleeperClient();
  const state = await client.getNflState();
  const result = await recordWeekActuals(Number(state.season), state.week);
  return { success: true, message: `Recorded actual stats for ${result.updated} players (week ${state.week}).` };
}

export async function adminRefreshWinProbabilities(): Promise<AdminRefreshResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await refreshAllWinProbabilities();
  revalidatePath('/dashboard/matchups');
  revalidatePath('/dashboard/my-roster');
  revalidatePath('/dashboard/teams');
  return { success: true, message: `Updated ${result.updated}/${result.total} teams (week ${result.week}), ${result.failed} failed.` };
}

export async function adminRefreshPoolWinProbabilities(): Promise<AdminRefreshResult> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await refreshPoolWinProbabilities();
  revalidatePath('/dashboard/sleeper-pool');
  return { success: true, message: `Updated ${result.updated}/${result.total} pool teams (week ${result.week}), ${result.failed} failed.` };
}
