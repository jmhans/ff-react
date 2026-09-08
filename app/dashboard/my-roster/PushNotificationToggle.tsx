'use client';

import { useEffect, useState } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '@/app/lib/push-actions';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Status = 'checking' | 'unsupported' | 'subscribed' | 'unsubscribed' | 'denied';

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setStatus('unsubscribed'));
  }, []);

  async function handleSubscribe() {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError('Push notifications are not configured on this deployment yet.');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const result = await subscribeToPush(subscription.toJSON() as any);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus('subscribed');
    } catch {
      setError('Could not enable notifications — please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus('unsubscribed');
    } catch {
      setError('Could not disable notifications — please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'checking') return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900">Push Notifications</h2>

      {status === 'unsupported' ? (
        <p className="mt-1 text-sm text-gray-500">
          Your browser doesn&apos;t support push notifications. On iPhone, add this site to your Home Screen first
          (Share → Add to Home Screen), then try again from there.
        </p>
      ) : status === 'denied' ? (
        <p className="mt-1 text-sm text-gray-500">
          Notifications are blocked for this site — enable them in your browser/device settings to turn this on.
        </p>
      ) : status === 'subscribed' ? (
        <>
          <p className="mt-1 text-sm text-gray-600">You&apos;ll get a notification when it&apos;s your turn to draft.</p>
          <button
            type="button"
            onClick={handleUnsubscribe}
            disabled={busy}
            className="mt-3 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Turn off notifications
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">Get notified on this device when it&apos;s your turn to draft.</p>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={busy}
            className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Enable notifications
          </button>
        </>
      )}

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
