'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { getClaimedOwner } from '@/app/lib/ff-draft-helpers';

export type ActionResult = { success: true } | { success: false; error: string };

type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: PushSubscriptionInput): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed) {
    return { success: false, error: 'You need to claim your owner identity first.' };
  }

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { success: false, error: 'Invalid subscription.' };
  }

  await sql`
    INSERT INTO ff_push_subscriptions (owner_id, endpoint, p256dh, auth)
    VALUES (${claimed.id}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET owner_id = EXCLUDED.owner_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;

  revalidatePath('/dashboard/my-roster');
  return { success: true };
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed) {
    return { success: false, error: 'You need to claim your owner identity first.' };
  }

  await sql`DELETE FROM ff_push_subscriptions WHERE endpoint = ${endpoint} AND owner_id = ${claimed.id}`;

  revalidatePath('/dashboard/my-roster');
  return { success: true };
}
