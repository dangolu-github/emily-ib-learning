(function () {
  "use strict";

  function endpoint() {
    return window.EMILY_PORTAL_CONFIG?.serviceEndpoint || "";
  }

  function ready() {
    const value = endpoint();
    return Boolean(value && !value.includes("__EMILY_"));
  }

  function jsonp(action, parameters) {
    return new Promise((resolve, reject) => {
      if (!ready()) {
        reject(new Error("The private portal service is not configured."));
        return;
      }
      const callbackName =
        "__emilyPortal" + Date.now() + Math.random().toString(16).slice(2);
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("The private portal service did not respond."));
      }, 12000);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("The private portal service is unavailable."));
      };

      const query = new URLSearchParams({
        ...parameters,
        action,
        callback: callbackName,
        _: String(Date.now()),
      });
      script.src = `${endpoint()}?${query.toString()}`;
      document.head.append(script);
    });
  }

  async function post(payload, keepalive) {
    if (!ready()) throw new Error("The private portal service is not configured.");
    await fetch(endpoint(), {
      method: "POST",
      mode: "no-cors",
      keepalive: Boolean(keepalive),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  }

  window.EmilyPortalApi = { jsonp, post, ready };
})();
