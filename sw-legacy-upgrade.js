/* Upgrade the original PWA, whose registerSW.js had no update prompt.
 * Only activate the waiting worker; never clear IndexedDB or reload a page.
 * Current releases keep the normal, explicit update confirmation flow.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const indexURL = new URL("index.html", self.registration.scope);
      for (const name of await caches.keys()) {
        if (!name.startsWith("workbox-precache")) continue;
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const url = new URL(request.url);
          if (
            url.origin !== indexURL.origin ||
            url.pathname !== indexURL.pathname
          )
            continue;
          const response = await cache.match(request);
          if (
            response &&
            (await response.text()).includes("vite-plugin-pwa:register-sw")
          ) {
            await self.skipWaiting();
            return;
          }
        }
      }
    })(),
  );
});

// Notifications created while VSPACE is open return to the daily dashboard.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      let target = new URL("#day", self.registration.scope).href;
      try {
        const requested = new URL(event.notification.data?.url || target);
        if (
          requested.origin === self.location.origin &&
          requested.href.startsWith(self.registration.scope)
        )
          target = requested.href;
      } catch {}
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find((client) =>
        client.url.startsWith(self.registration.scope),
      );
      if (existing) {
        existing.postMessage({ type: "VSPACE_OPEN_DAY" });
        await existing.focus();
      } else await self.clients.openWindow(target);
    })(),
  );
});
