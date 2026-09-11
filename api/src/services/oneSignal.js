/**
 * Sends push notifications via OneSignal.
 *
 * The app already has the receiving side fully wired — a foreground
 * listener, a tap handler, per-type muting — it just never had anything
 * on the server actually calling OneSignal to send one. This is that.
 *
 * Targeting works by OneSignal "External ID", which the app sets to our
 * own user id (OneSignal.login(uid) on sign-in, OneSignal.logout() on
 * sign-out) — so sending here never needs a device/player id of our own
 * to keep track of. A user who hasn't opened the app on this build yet,
 * or who is signed out, simply isn't subscribed; OneSignal reports that
 * back rather than erroring, and it's treated as nothing to deliver.
 */
const APP_ID = process.env.ONESIGNAL_APP_ID;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const SEND_URL = 'https://api.onesignal.com/notifications';

const configured = !!(APP_ID && REST_API_KEY);
if (!configured) {
  console.warn('[oneSignal] ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY not set — push notifications are disabled.');
}

/**
 * Sends one push to one or more users by their external id (our own user
 * id). Never throws — a failed or unconfigured send must not break the
 * action that triggered it (a reaction, a completed goal, a reminder).
 *
 * @param {string[]} userIds - our own user ids (as strings)
 * @param {{title: string, body: string, data?: object}} message
 */
async function sendToUsers(userIds, { title, body, data }) {
  const ids = [...new Set((userIds || []).map(String))].filter(Boolean);
  if (!configured || ids.length === 0) return { sent: false, reason: !configured ? 'not_configured' : 'no_recipients' };

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: APP_ID,
        target_channel: 'push',
        include_aliases: { external_id: ids },
        headings: { en: title },
        contents: { en: body },
        data: data || {},
      }),
    });

    const json = await res.json().catch(() => ({}));
    // "not subscribed" isn't a real failure — it just means no device is
    // currently reachable for that user (signed out, notifications off,
    // never opened this build). Every other error is worth logging.
    const notSubscribed = Array.isArray(json.errors) &&
      json.errors.some((e) => /not subscribed/i.test(String(e)));
    if (!res.ok && !notSubscribed) {
      console.warn('[oneSignal] send failed:', res.status, JSON.stringify(json));
    }
    return { sent: res.ok, status: res.status, response: json };
  } catch (err) {
    console.warn('[oneSignal] send threw:', err.message);
    return { sent: false, reason: 'error', error: err.message };
  }
}

function sendToUser(userId, message) {
  return sendToUsers([userId], message);
}

module.exports = { sendToUsers, sendToUser, isConfigured: () => configured };
