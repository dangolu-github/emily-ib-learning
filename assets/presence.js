(function () {
  "use strict";

  const api = window.EmilyPortalApi;
  const access = window.EmilyPortalAccess;
  const deviceKey = "emilyIbViewerDeviceV1";
  const roleKey = "emilyIbDeviceRoleV1";
  const heartbeatMilliseconds = 25000;
  const sessionId = randomId();
  let timer = 0;

  if (!api || !access) return;

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }

  function stored(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function deviceId() {
    const existing = stored(deviceKey);
    if (existing) return existing;
    const created = randomId();
    try {
      localStorage.setItem(deviceKey, created);
    } catch {
      // Presence remains best-effort for this visit.
    }
    return created;
  }

  function isTeacherDevice() {
    return stored(roleKey) === "teacher";
  }

  function send(action, keepalive) {
    const accessToken = access.getToken();
    if (!accessToken || !api.ready()) return;
    api.post(
      {
        action,
        accessToken,
        deviceId: deviceId(),
        sessionId,
      },
      keepalive,
    ).catch(() => {
      // Presence never interrupts study.
    });
  }

  function clearSession(keepalive) {
    window.clearInterval(timer);
    timer = 0;
    send("clearViewerPresence", keepalive);
  }

  function heartbeat() {
    if (document.hidden || isTeacherDevice()) {
      clearSession(false);
      return;
    }
    send("updateViewerPresence", false);
  }

  function start() {
    if (isTeacherDevice()) {
      clearSession(false);
      return;
    }
    heartbeat();
    window.clearInterval(timer);
    timer = window.setInterval(heartbeat, heartbeatMilliseconds);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearSession(true);
    else start();
  });
  window.addEventListener("pagehide", () => clearSession(true));
  window.addEventListener("storage", (event) => {
    if (event.key === roleKey && event.newValue === "teacher") clearSession(false);
  });
  access.ready.then(start);
})();
