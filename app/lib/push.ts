import webpush from 'web-push';
import { sql } from '@vercel/postgres';

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

/**
 * Sends a push notification to every subscribed browser/device for one
 * owner. Best-effort — no subscriptions, missing VAPID config, or a send
 * failure should never throw and block whatever triggered it (a draft
 * pick, etc.). A 404/410 response means the browser unsubscribed or the
 * subscription expired — that row gets cleaned up automatically.
 */
export async function sendPushToOwner(
  ownerId: string,
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; failed: number }> {
  if (!ensureConfigured()) {
    console.warn('Push not sent — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT not configured.');
    return { sent: 0, failed: 0 };
  }

  const subs = await sql`SELECT id, endpoint, p256dh, auth FROM ff_push_subscriptions WHERE owner_id = ${ownerId}`;

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error: any) {
        failed += 1;
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await sql`DELETE FROM ff_push_subscriptions WHERE id = ${sub.id}`;
        } else {
          console.error('Push send failed:', error);
        }
      }
    }),
  );

  return { sent, failed };
}
