(function () {
  "use strict";

  const storageKey = "emilyIbPortalAccessV1";
  const api = window.EmilyPortalApi;
  let memoryToken = "";
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  function storedToken() {
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return memoryToken;
    }
  }

  function revealPage() {
    document.documentElement.classList.add("portal-unlocked");
    document.querySelectorAll(".protected-page").forEach((element) => {
      element.hidden = false;
    });
    document.querySelector(".access-gate")?.remove();
    resolveReady(memoryToken || storedToken());
  }

  async function digest(value) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function buildGate() {
    const gate = document.createElement("div");
    gate.className = "access-gate";
    gate.innerHTML = `
      <section class="access-panel" aria-labelledby="access-title">
        <p class="eyebrow">Emily · IB English</p>
        <h1 id="access-title">Welcome to your learning space.</h1>
        <p>Enter the access word once on this browser. You will be asked again only if this browser’s site data is cleared.</p>
        <form class="access-form">
          <label for="portal-word">Access word</label>
          <div class="access-row">
            <input id="portal-word" name="portal-word" type="password" autocomplete="current-password" required autofocus>
            <button type="submit">Enter</button>
          </div>
          <small class="access-hint">Hint: your teacher’s first name, in lowercase.</small>
          <p class="access-error" role="alert" hidden></p>
        </form>
      </section>`;

    const form = gate.querySelector("form");
    const input = gate.querySelector("input");
    const button = gate.querySelector("button");
    const error = gate.querySelector(".access-error");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      button.textContent = "Checking…";
      error.hidden = true;
      try {
        const answerHash = await digest(input.value.trim().toLowerCase());
        const result = await api.jsonp("verifyPortalAccess", { answerHash });
        if (!result?.ok || !result.allowed || !result.accessToken) {
          throw new Error("That access word is not correct.");
        }
        memoryToken = result.accessToken;
        try {
          localStorage.setItem(storageKey, result.accessToken);
        } catch {
          // The in-memory token still opens this visit.
        }
        input.value = "";
        revealPage();
      } catch (reason) {
        error.textContent =
          reason instanceof Error
            ? reason.message
            : "The portal could not check access. Please try again.";
        error.hidden = false;
        button.disabled = false;
        button.textContent = "Try again";
        input.select();
      }
    });

    document.body.prepend(gate);
  }

  window.EmilyPortalAccess = {
    ready,
    getToken: () => memoryToken || storedToken(),
  };

  document.addEventListener("DOMContentLoaded", () => {
    const token = storedToken();
    if (token) {
      memoryToken = token;
      revealPage();
    } else {
      buildGate();
    }
  });
})();
