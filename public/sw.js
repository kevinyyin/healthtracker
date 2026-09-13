self.addEventListener("push", (event) => {
  // `tag` used to be hardcoded to "smart-alarm" here regardless of payload, so any
  // other notification type (e.g. an illness/low-recovery alert) would collide with
  // a same-day alarm under one OS notification. Read it from the payload instead,
  // same as title/body already were, with "notification" as a generic fallback.
  let data = { title: "Wake up", body: "Your Smart Alarm went off.", tag: "notification" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon",
      vibrate: [400, 200, 400, 200, 400],
      tag: data.tag,
      requireInteraction: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/today");
    }),
  );
});
