(function () {
  "use strict";

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function labeledLine(className, label, text) {
    const line = document.createElement("p");
    line.className = className;
    const tag = document.createElement("span");
    tag.textContent = label;
    line.append(tag, document.createTextNode(text));
    return line;
  }

  function renderTemplate(template, container) {
    const wrap = document.createElement("section");
    wrap.className = "homework-template";
    if (template.heading) wrap.append(textElement("h4", "template-heading", template.heading));
    if (template.intro) wrap.append(textElement("p", "template-intro", template.intro));
    template.steps.forEach((step) => {
      const row = document.createElement("article");
      row.className = "template-step";
      row.append(textElement("span", "template-label", step.label));
      const fields = document.createElement("div");
      fields.className = "template-fields";
      fields.append(textElement("p", "template-lead", step.leadIn));
      if (step.keyWords) fields.append(labeledLine("template-keys", "Key words", step.keyWords));
      if (step.hint) fields.append(labeledLine("template-hint", "Hint", step.hint));
      row.append(fields);
      wrap.append(row);
    });
    container.append(wrap);
  }

  function renderHomework(homework, container) {
    if (!homework) {
      container.append(
        textElement("p", "empty-state", "No homework was assigned on this class page."),
      );
      return;
    }

    container.append(textElement("h3", "", homework.title));
    container.append(textElement("p", "", homework.prompt));
    if (homework.template) renderTemplate(homework.template, container);
    if (Array.isArray(homework.templates)) {
      homework.templates.forEach((template) => renderTemplate(template, container));
    }
    const list = document.createElement("ul");
    list.className = "homework-checklist";
    homework.checklist.forEach((item) => list.append(textElement("li", "", item)));
    container.append(list);

    const form = document.createElement("form");
    form.className = "homework-form";
    form.dataset.assignmentId = homework.assignmentId;
    form.noValidate = true;

    const label = textElement("label", "", homework.responseLabel);
    label.htmlFor = "homework-response";
    const textarea = document.createElement("textarea");
    textarea.id = "homework-response";
    textarea.dataset.responseId = "analytical-paragraph";
    textarea.maxLength = homework.maxLength;
    textarea.rows = 13;
    textarea.placeholder = homework.responsePlaceholder;

    const meta = document.createElement("div");
    meta.className = "homework-meta";
    meta.innerHTML = `
      <span id="homework-version">Version 1</span>
      <span id="homework-count">0 / ${homework.maxLength}</span>`;

    const actions = document.createElement("div");
    actions.className = "homework-actions";
    const status = textElement("p", "form-status", "");
    status.id = "homework-status";
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
    const submit = textElement("button", "", "Submit to teacher");
    submit.type = "submit";
    submit.id = "homework-submit";
    submit.disabled = true;
    actions.append(status, submit);

    const review = document.createElement("section");
    review.className = "teacher-review";
    review.id = "teacher-review";
    review.hidden = true;
    review.setAttribute("aria-live", "polite");

    form.append(label, textarea, meta, actions, review);
    container.append(form);
    window.EMILY_HOMEWORK_CONFIG = homework;
    window.dispatchEvent(new Event("emily-homework-ready"));
  }

  function renderReview(review, container) {
    if (!review) {
      container.append(
        textElement("p", "empty-state", "No post-class review has been released for this class."),
      );
      return;
    }

    if (Array.isArray(review.groups)) {
      review.groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "review-group";
        section.append(textElement("h3", "", group.title));
        const list = document.createElement("ul");
        group.items.forEach((item) => list.append(textElement("li", "", item)));
        section.append(list);
        container.append(section);
      });
      return;
    }

    if (review.introduction) container.append(textElement("p", "", review.introduction));
  }

  function render() {
    const date = new URLSearchParams(location.search).get("date") || "";
    const classes = Array.isArray(window.EMILY_CLASSES) ? window.EMILY_CLASSES : [];
    const lesson = classes.find((item) => item.date === date);
    const error = document.querySelector("#lesson-error");
    const materials = document.querySelector("#materials-list");

    if (!lesson) {
      document.querySelector("#lesson-title").textContent = "Class unavailable";
      error.hidden = false;
      materials.hidden = true;
      return;
    }

    document.title = `${lesson.title} · Emily IB Learning`;
    document.querySelector("#lesson-meta").textContent =
      `Class ${lesson.number} · ${lesson.displayDate}`;
    document.querySelector("#lesson-title").textContent = lesson.title;
    document.querySelector("#handout-title").textContent = lesson.handoutTitle;
    document.querySelector("#handout-link").href = `../handouts/${lesson.handoutUrl}`;

    renderHomework(lesson.homework, document.querySelector("#homework-content"));
    renderReview(lesson.review, document.querySelector("#review-content"));
    materials.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", render);
})();
