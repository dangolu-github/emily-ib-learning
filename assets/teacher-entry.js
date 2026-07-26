(function () {
  "use strict";

  const config = window.EMILY_PORTAL_CONFIG || {};
  const api = window.EmilyPortalApi;
  const deviceKey = "emilyIbViewerDeviceV1";
  const roleKey = "emilyIbDeviceRoleV1";

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }

  function deviceId() {
    try {
      const existing = localStorage.getItem(deviceKey);
      if (existing) return existing;
      const created = randomId();
      localStorage.setItem(deviceKey, created);
      return created;
    } catch {
      return randomId();
    }
  }

  function configured(value) {
    return Boolean(value && !value.includes("__EMILY_"));
  }

  function dashboardHref(extra) {
    const url = new URL(config.teacherDashboardUrl);
    url.searchParams.set("view", "teacher");
    Object.entries(extra || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  async function claimTeacherDevice(bridge) {
    const status = document.querySelector("#teacher-entry-status");
    status.textContent = "Confirming teacher device…";
    try {
      const result = await api.jsonp("claimTeacherDevice", {
        bridge,
        deviceId: deviceId(),
      });
      if (!result?.ok || !result.allowed) throw new Error("Teacher access was not accepted.");
      localStorage.setItem(roleKey, "teacher");
      location.replace(dashboardHref({ presenceReady: "1" }));
    } catch (reason) {
      status.textContent =
        reason instanceof Error ? reason.message : "Teacher access could not be confirmed.";
      status.dataset.state = "error";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const link = document.querySelector("#teacher-dashboard-link");
    const status = document.querySelector("#teacher-entry-status");
    if (
      !configured(config.teacherDashboardUrl) ||
      !configured(config.serviceEndpoint)
    ) {
      link.setAttribute("aria-disabled", "true");
      status.textContent = "Teacher access is being configured.";
      return;
    }

    const bridge = new URLSearchParams(location.search).get("bridge");
    if (bridge) {
      link.hidden = true;
      claimTeacherDevice(bridge);
      return;
    }

    link.href = dashboardHref({
      returnUrl: config.teacherReturnUrl,
    });
  });
})();
