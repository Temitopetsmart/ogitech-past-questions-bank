/* Public academic calendar listing and PDF downloads. */
(function () {
  var list = document.getElementById("calendar-list");
  var count = document.getElementById("calendar-count");

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "text") node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child)
        node.appendChild(
          typeof child === "string" ? document.createTextNode(child) : child,
        );
    });
    return node;
  }

  function empty(title, message) {
    list.replaceChildren(
      el("div", { class: "empty-state" }, [
        el("span", { class: "empty-icon" }, [
          el("i", {
            class: "fa-solid fa-calendar-xmark",
            "aria-hidden": "true",
          }),
        ]),
        el("h2", { text: title }),
        el("p", { class: "muted", text: message }),
      ]),
    );
  }

  function load() {
    OGA.api("GET", "public/calendars").then(
      function (res) {
        var calendars = res.data || [];
        list.replaceChildren();

        count.textContent =
          calendars.length +
          (calendars.length === 1
            ? " academic calendar available"
            : " academic calendars available");

        if (!calendars.length) {
          empty(
            "No academic calendars are available",
            "Published academic calendars will appear here when they are uploaded.",
          );
          return;
        }

        calendars.forEach(function (calendar) {
          var title = String(calendar.title || "Academic Calendar");
          var session = String(calendar.session || "Academic session");
          var original = String(calendar.originalName || "PDF document");

          var preview = el("iframe", {
            class: "calendar-pdf-preview",
            src:
              OGA.API +
              "public/calendars/" +
              encodeURIComponent(calendar.id) +
              "/file",
            title: "Academic Calendar PDF",
            loading: "lazy",
          });

          var download = el("a", {
            class: "btn",
            href:
              OGA.API +
              "public/calendars/" +
              encodeURIComponent(calendar.id) +
              "/file?download=1",
            text: "Download PDF",
          });

          var details = [
            session,
            original,
            calendar.fileSize ? formatSize(Number(calendar.fileSize)) : "",
          ]
            .filter(Boolean)
            .join(" · ");

          list.appendChild(
            el("article", { class: "card" }, [
              el("div", { class: "q-main" }, [
                el("h2", { text: title }),
                el("p", { class: "muted", text: details }),
              ]),
              el("div", { class: "calendar-preview" }, [preview, download]),
            ]),
          );
        });
      },
      function (err) {
        count.textContent = "Unable to load academic calendars.";
        empty(
          "Calendars could not be loaded",
          err.message || "Please refresh the page and try again.",
        );
      },
    );
  }

  function formatSize(bytes) {
    return bytes >= 1048576
      ? (bytes / 1048576).toFixed(1) + " MB"
      : Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  load();
})();
