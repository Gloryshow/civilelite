const CACHE_NAME = "ces-portal-v2";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/favicon.ico",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/apple-touch-icon.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/manifest.webmanifest"
];

const DEFAULT_NOTIFICATION = {
  title: "Civil Elite Update",
  body: "You have a new notification.",
  url: "/",
  tag: "ces-update",
};

const showPortalNotification = (payload = {}) => {
  const data = {
    ...DEFAULT_NOTIFICATION,
    ...payload,
    url: payload?.url || payload?.link || "/",
  };

  return self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/pwa-192.png",
    badge: "/favicon-32x32.png",
    tag: data.tag,
    data: { url: data.url },
  });
};

const loadFcmConfig = async () => {
  try {
    const response = await fetch("/api/auth/fcm/config", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const initFirebaseMessaging = async () => {
  try {
    importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

    const config = await loadFcmConfig();
    if (!config?.apiKey || !config?.projectId || !config?.messagingSenderId || !config?.appId) {
      return;
    }

    if (!self.firebase?.apps?.length) {
      self.firebase.initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId,
      });
    }

    const messaging = self.firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const notification = {
        title: payload?.notification?.title || payload?.data?.title,
        body: payload?.notification?.body || payload?.data?.body,
        url: payload?.data?.url || payload?.fcmOptions?.link || "/",
        tag: payload?.data?.tag || "ces-update",
      };

      self.registration.showNotification(notification.title || DEFAULT_NOTIFICATION.title, {
        body: notification.body || DEFAULT_NOTIFICATION.body,
        icon: "/pwa-192.png",
        badge: "/favicon-32x32.png",
        tag: notification.tag,
        data: { url: notification.url },
      });
    });
  } catch {
    // Firebase messaging is optional; keep SW functional when unavailable.
  }
};

initFirebaseMessaging();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});

self.addEventListener("push", (event) => {
  let payload = { ...DEFAULT_NOTIFICATION };

  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch {
    // Ignore malformed payloads and fall back to defaults.
  }

  event.waitUntil(showPortalNotification(payload));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => w.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    })
  );
});
