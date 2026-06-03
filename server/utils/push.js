import webpush from "web-push";
import admin from "firebase-admin";
import User from "../models/User.js";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

const pushReady = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushReady) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const firebaseServiceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";

const parseServiceAccount = () => {
  if (!firebaseServiceAccountRaw) return null;

  try {
    const parsed = JSON.parse(firebaseServiceAccountRaw);
    if (parsed?.project_id && parsed?.client_email && parsed?.private_key) {
      return {
        ...parsed,
        private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
      };
    }
  } catch {
    // Continue to base64 parsing fallback
  }

  try {
    const decoded = Buffer.from(firebaseServiceAccountRaw, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (parsed?.project_id && parsed?.client_email && parsed?.private_key) {
      return {
        ...parsed,
        private_key: String(parsed.private_key).replace(/\\n/g, "\n"),
      };
    }
  } catch {
    return null;
  }

  return null;
};

const firebaseServiceAccount = parseServiceAccount();
const fcmPublicConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseServiceAccount?.project_id || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || "",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
  vapidKey: process.env.FIREBASE_WEB_PUSH_CERTIFICATE_KEY || "",
};

if (firebaseServiceAccount && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseServiceAccount),
      projectId: fcmPublicConfig.projectId || firebaseServiceAccount.project_id,
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error?.message || error);
  }
}

const fcmReady = Boolean(admin.apps.length);

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

const isStaleFcmError = (error) => {
  const code = String(error?.code || "");
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
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
    .select("pushSubscriptions fcmTokens")
    .lean();

  const recipients = {
    webpush: [],
    fcm: [],
  };

  users.forEach((user) => {
    (user.pushSubscriptions || []).forEach((sub) => {
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return;
      recipients.webpush.push({
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

    (user.fcmTokens || []).forEach((tokenEntry) => {
      const token = String(tokenEntry?.token || "").trim();
      if (!token) return;
      recipients.fcm.push({
        userId: String(user._id),
        token,
      });
    });
  });

  return recipients;
};

const pruneStaleSubscriptions = async (staleByUser, path = "pushSubscriptions") => {
  const entries = Object.entries(staleByUser);
  if (!entries.length) return;

  await Promise.all(
    entries.map(([userId, values]) => {
      if (path === "fcmTokens") {
        return User.updateOne(
          { _id: userId },
          { $pull: { fcmTokens: { token: { $in: values } } } }
        );
      }

      return User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: values } } } }
      );
    })
  );
};

const sendFcmBatch = async (items, payload) => {
  if (!fcmReady || !items.length) return { sent: 0 };

  const tokens = items.map((item) => item.token);
  const result = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: String(payload?.title || "Civil Elite Update"),
      body: String(payload?.body || "You have a new portal update."),
    },
    webpush: {
      notification: {
        title: String(payload?.title || "Civil Elite Update"),
        body: String(payload?.body || "You have a new portal update."),
        icon: "/pwa-192.png",
        badge: "/favicon-32x32.png",
        tag: String(payload?.tag || "ces-update"),
      },
      fcmOptions: {
        link: String(payload?.url || "/"),
      },
    },
    data: {
      url: String(payload?.url || "/"),
      tag: String(payload?.tag || "ces-update"),
      title: String(payload?.title || "Civil Elite Update"),
      body: String(payload?.body || "You have a new portal update."),
    },
  });

  let sent = 0;
  const staleByUser = {};

  result.responses.forEach((response, index) => {
    if (response.success) {
      sent += 1;
      return;
    }

    const item = items[index];
    if (!item) return;

    if (isStaleFcmError(response.error)) {
      if (!staleByUser[item.userId]) staleByUser[item.userId] = [];
      staleByUser[item.userId].push(item.token);
      return;
    }

    console.error("FCM send failed:", response.error?.message || response.error);
  });

  await pruneStaleSubscriptions(staleByUser, "fcmTokens");
  return { sent };
};

export const isPushEnabled = () => pushReady;

export const isFcmEnabled = () => fcmReady;

export const getPushPublicKey = () => vapidPublicKey;

export const getFcmPublicConfig = () => {
  if (!fcmPublicConfig.apiKey || !fcmPublicConfig.projectId || !fcmPublicConfig.messagingSenderId || !fcmPublicConfig.appId) {
    return null;
  }
  return fcmPublicConfig;
};

export const sendPushByFilter = async (userFilter, payload) => {
  if (!pushReady && !fcmReady) return { sent: 0, skipped: true };

  const recipients = await collectRecipients(userFilter);
  if (!recipients.webpush.length && !recipients.fcm.length) {
    return { sent: 0, skipped: false };
  }

  let sent = 0;
  const staleWebpushByUser = {};

  if (pushReady) {
    for (const item of recipients.webpush) {
      const result = await sendToSubscription(item.subscription, payload);
      if (result.ok) {
        sent += 1;
        continue;
      }

      if (result.stale) {
        if (!staleWebpushByUser[item.userId]) staleWebpushByUser[item.userId] = [];
        staleWebpushByUser[item.userId].push(item.subscription.endpoint);
      }
    }

    await pruneStaleSubscriptions(staleWebpushByUser, "pushSubscriptions");
  }

  if (fcmReady && recipients.fcm.length) {
    const fcmResult = await sendFcmBatch(recipients.fcm, payload);
    sent += fcmResult.sent;
  }

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
