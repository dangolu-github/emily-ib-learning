(function () {
  "use strict";

  function render() {
    const classes = Array.isArray(window.EMILY_CLASSES) ? window.EMILY_CLASSES : [];
    const list = document.querySelector("#class-list");
    const count = document.querySelector("#class-count");
    if (!list || !count) return;

    list.replaceChildren();
    count.textContent = String(classes.length).padStart(2, "0");

    if (!classes.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No class materials are available yet.";
      list.append(empty);
      return;
    }

    classes.forEach((lesson) => {
      const link = document.createElement("a");
      link.className = "class-card";
      link.href = `class/?date=${encodeURIComponent(lesson.date)}`;

      const number = document.createElement("div");
      number.className = "class-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(lesson.number).padStart(2, "0");

      const content = document.createElement("div");
      const meta = document.createElement("div");
      meta.className = "class-meta";
      const time = document.createElement("time");
      time.dateTime = lesson.date;
      time.textContent = lesson.displayDate;
      const label = document.createElement("span");
      label.textContent = lesson.homework ? "Homework available" : "Class materials";
      meta.append(time, label);
      const title = document.createElement("h3");
      title.textContent = lesson.title;
      content.append(meta, title);

      const mark = document.createElement("span");
      mark.className = "open-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "↗";

      link.append(number, content, mark);
      list.append(link);
    });
  }

  document.addEventListener("DOMContentLoaded", render);
})();
