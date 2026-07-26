(function () {
  "use strict";

  const api = window.EmilyPortalApi;
  const access = window.EmilyPortalAccess;
  let initialized = false;

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }

  function initialize() {
    if (initialized) return;
    const page = window.EMILY_HOMEWORK_CONFIG;
    const form = document.querySelector(".homework-form");
    if (!page || !form || !api || !access) return;
    initialized = true;

    const field = form.querySelector("[data-response-id]");
    const submit = form.querySelector("#homework-submit");
    const status = form.querySelector("#homework-status");
    const count = form.querySelector("#homework-count");
    const versionLabel = form.querySelector("#homework-version");
    const reviewPanel = form.querySelector("#teacher-review");
    const storageKey = `emily-homework:${page.assignmentId}`;
    let localTimer = 0;
    let remoteTimer = 0;
    let retryTimer = 0;
    let reviewTimer = 0;
    let state = loadState();

    function freshState(version, parentSubmissionId, response) {
      return {
        assignmentId: page.assignmentId,
        saveId: `${page.assignmentId}-${version}-${randomId()}`,
        version,
        parentSubmissionId: parentSubmissionId || "",
        startedAt: new Date().toISOString(),
        clientUpdatedAt: "",
        response: response || "",
        hasStarted: false,
        remoteStarted: false,
        submittedAt: "",
        submissionId: "",
      };
    }

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        return { ...freshState(1, "", ""), ...saved };
      } catch {
        return freshState(1, "", "");
      }
    }

    function saveLocal() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        setStatus("Draft saved on this device.", "saved");
      } catch {
        setStatus("This browser could not save the draft.", "error");
      }
    }

    function setStatus(message, stateName) {
      if (stateName === "saving" || stateName === "saved" || stateName === "retry") {
        status.textContent = "";
        status.hidden = true;
        status.dataset.state = "";
        return;
      }
      status.textContent = message;
      status.hidden = !message;
      status.dataset.state = stateName || "";
    }

    function updateUi() {
      field.value = state.response || "";
      field.disabled = Boolean(state.submittedAt);
      submit.disabled = Boolean(state.submittedAt) || !field.value.trim();
      submit.textContent = state.submittedAt ? "Submitted" : "Submit to teacher";
      count.textContent = `${field.value.length} / ${page.maxLength}`;
      versionLabel.textContent = `Version ${state.version}`;
      if (state.submittedAt) {
        setStatus("Submission confirmed by your teacher workspace.", "submitted");
      }
    }

    function scheduleSave() {
      window.clearTimeout(localTimer);
      localTimer = window.setTimeout(() => {
        saveLocal();
        scheduleRemoteSave();
      }, 180);
    }

    function shouldSync() {
      return !state.submittedAt && state.hasStarted;
    }

    function scheduleRemoteSave() {
      if (!shouldSync()) return;
      window.clearTimeout(remoteTimer);
      window.clearTimeout(retryTimer);
      remoteTimer = window.setTimeout(saveRemote, 850);
    }

    async function saveRemote() {
      if (!shouldSync()) return;
      setStatus("Syncing draft privately…", "saving");
      try {
        await api.post({
          action: "saveHomeworkDraft",
          accessToken: access.getToken(),
          assignmentId: page.assignmentId,
          saveId: state.saveId,
          version: state.version,
          parentSubmissionId: state.parentSubmissionId,
          startedAt: state.startedAt,
          clientUpdatedAt: state.clientUpdatedAt,
          response: state.response,
        });
        confirmDraft(0);
      } catch {
        scheduleRetry();
      }
    }

    async function confirmDraft(attempt) {
      try {
        const result = await api.jsonp("getHomeworkDraft", {
          accessToken: access.getToken(),
          assignmentId: page.assignmentId,
          saveId: state.saveId,
        });
        if (
          result?.ok &&
          !result.pending &&
          result.clientUpdatedAt === state.clientUpdatedAt
        ) {
          state.remoteStarted = true;
          saveLocal();
          setStatus("Draft synced privately to your teacher.", "saved");
          return;
        }
      } catch {
        // Retry below.
      }
      if (attempt < 4) {
        window.setTimeout(() => confirmDraft(attempt + 1), 850 + attempt * 450);
      } else {
        scheduleRetry();
      }
    }

    function scheduleRetry() {
      if (!shouldSync()) return;
      setStatus("Draft saved here; private sync will retry.", "retry");
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(saveRemote, 5000);
    }

    async function submitHomework(event) {
      event.preventDefault();
      if (state.submittedAt || !field.value.trim()) return;
      state.response = field.value;
      state.clientUpdatedAt = new Date().toISOString();
      saveLocal();
      submit.disabled = true;
      submit.textContent = "Sending…";
      setStatus("Sending your paragraph to the teacher workspace…", "saving");
      const submittedAt = new Date().toISOString();
      try {
        await api.post({
          action: "submitHomework",
          accessToken: access.getToken(),
          assignmentId: page.assignmentId,
          saveId: state.saveId,
          submissionId: state.saveId,
          version: state.version,
          parentSubmissionId: state.parentSubmissionId,
          startedAt: state.startedAt,
          clientUpdatedAt: state.clientUpdatedAt,
          submittedAt,
          response: state.response,
        });
        confirmSubmission(submittedAt, 0);
      } catch {
        submit.disabled = false;
        submit.textContent = "Try sending again";
        setStatus("Your draft is safe, but submission was not confirmed.", "error");
      }
    }

    async function confirmSubmission(submittedAt, attempt) {
      try {
        const result = await api.jsonp("getSubmission", {
          accessToken: access.getToken(),
          assignmentId: page.assignmentId,
          submissionId: state.saveId,
        });
        if (result?.ok && !result.pending) {
          state.submittedAt = result.submittedAt || submittedAt;
          state.submissionId = state.saveId;
          window.clearTimeout(remoteTimer);
          window.clearTimeout(retryTimer);
          saveLocal();
          updateUi();
          checkReview();
          return;
        }
      } catch {
        // Retry below.
      }
      if (attempt < 10) {
        window.setTimeout(
          () => confirmSubmission(submittedAt, attempt + 1),
          900 + attempt * 300,
        );
      } else {
        submit.disabled = false;
        submit.textContent = "Try sending again";
        setStatus("Submission is not confirmed yet. Please try again.", "error");
      }
    }

    function renderReview(result) {
      const released = [];
      if (result.showGrade && (result.grade || result.status)) {
        released.push(["Checked result", [result.grade, result.status].filter(Boolean).join(" · ")]);
      }
      if (result.showComment && result.comment) {
        released.push(["Teacher comment", result.comment]);
      }
      if (result.showCorrection && result.correction) {
        released.push(["Detailed correction", result.correction]);
      }

      reviewPanel.replaceChildren();
      if (!released.length && !result.revisionOpen) {
        reviewPanel.hidden = true;
        return;
      }

      const heading = document.createElement("div");
      heading.className = "teacher-review-heading";
      const title = document.createElement("h3");
      title.textContent = result.revisionOpen ? "Returned for revision" : "Teacher review";
      const chip = document.createElement("span");
      chip.className = "review-chip";
      chip.textContent = result.revisionOpen ? "Revision ready" : "Checked";
      heading.append(title, chip);
      reviewPanel.append(heading);

      if (released.length) {
        const content = document.createElement("div");
        content.className = "released-feedback";
        released.forEach(([label, value]) => {
          const article = document.createElement("article");
          const subheading = document.createElement("h4");
          subheading.textContent = label;
          const body = document.createElement("p");
          body.textContent = value;
          article.append(subheading, body);
          content.append(article);
        });
        reviewPanel.append(content);
      }

      reviewPanel.hidden = false;
    }

    function openRevision(result) {
      if (!result.revisionOpen || Number(result.nextVersion) <= state.version) return;
      const previousSubmission = state.submissionId || state.saveId;
      state = freshState(Number(result.nextVersion), previousSubmission, state.response);
      state.hasStarted = true;
      saveLocal();
      updateUi();
      setStatus(
        `Version ${state.version} is open. Edit your previous answer and resubmit.`,
        "revision",
      );
      scheduleRemoteSave();
    }

    async function checkReview() {
      if (!state.submissionId && !state.submittedAt) return;
      try {
        const result = await api.jsonp("getHomeworkReview", {
          accessToken: access.getToken(),
          assignmentId: page.assignmentId,
          submissionId: state.submissionId || state.saveId,
        });
        if (result?.ok && !result.pending) {
          renderReview(result);
          openRevision(result);
        }
      } catch {
        // A temporary review error never changes submission state.
      }
      window.clearTimeout(reviewTimer);
      reviewTimer = window.setTimeout(checkReview, 30000);
    }

    field.addEventListener("input", () => {
      state.response = field.value;
      state.hasStarted = true;
      state.clientUpdatedAt = new Date().toISOString();
      count.textContent = `${field.value.length} / ${page.maxLength}`;
      submit.disabled = !field.value.trim();
      setStatus("Saving draft…", "saving");
      scheduleSave();
    });
    form.addEventListener("submit", submitHomework);

    updateUi();
    if (state.submittedAt) checkReview();
  }

  window.addEventListener("emily-homework-ready", initialize);
  document.addEventListener("DOMContentLoaded", initialize);
})();
