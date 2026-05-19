import webpush from "web-push";
import User from "../models/User.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

const pushReady = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushReady) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const buildPayload = (payload = {}) =>
  JSON.stringify({
    title: String(payload.title || "Civil Elite Update"),
    body: String(payload.body || "You have a new portal update."),
    url: String(payload.url || "/"),
    tag: String(payload.tag || "ces-update"),
  });

const isGoneSubscriptionError = (error) => {
  const status = Number(error?.statusCode || 0);
  return status === 404 || status === 410;
};

const sendToSubscription = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, buildPayload(payload));
    return { ok: true };
  } catch (error) {
    if (isGoneSubscriptionError(error)) {
      return { ok: false, stale: true };
    }
    console.error("Push send failed:", error?.message || error);
    return { ok: false, stale: false };
  }
};

const collectRecipients = async (userFilter) => {
  const users = await User.find(userFilter)
    .select("pushSubscriptions")
    .lean();

  const recipients = [];
  users.forEach((user) => {
    (user.pushSubscriptions || []).forEach((sub) => {
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return;
      recipients.push({
        userId: String(user._id),
        subscription: {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime || null,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
      });
    });
  });

  return recipients;
};

const pruneStaleSubscriptions = async (staleByUser) => {
  const entries = Object.entries(staleByUser);
  if (!entries.length) return;

  await Promise.all(
    entries.map(([userId, endpoints]) =>
      User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: endpoints } } } }
      )
    )
  );
};

export const isPushEnabled = () => pushReady;

export const getPushPublicKey = () => vapidPublicKey;

export const sendPushByFilter = async (userFilter, payload) => {
  if (!pushReady) return { sent: 0, skipped: true };

  const recipients = await collectRecipients(userFilter);
  if (!recipients.length) return { sent: 0, skipped: false };

  let sent = 0;
  const staleByUser = {};

  for (const item of recipients) {
    const result = await sendToSubscription(item.subscription, payload);
    if (result.ok) {
      sent += 1;
      continue;
    }

    if (result.stale) {
      if (!staleByUser[item.userId]) staleByUser[item.userId] = [];
      staleByUser[item.userId].push(item.subscription.endpoint);
    }
  }

  await pruneStaleSubscriptions(staleByUser);

  return { sent, skipped: false };
};

export const sendPushToUserIds = async (userIds, payload) => {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length) return { sent: 0, skipped: false };
  return sendPushByFilter({ _id: { $in: ids } }, payload);
};

export const sendPushToRole = async (role, payload, extraFilter = {}) => {
  return sendPushByFilter({ role, ...extraFilter }, payload);
};
