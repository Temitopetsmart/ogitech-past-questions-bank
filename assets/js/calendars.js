/* Public academic calendar listing and PDF downloads. */
(function () {
  var list = document.getElementById("calendar-list");
  var count = document.getElementById("calendar-count");
  var page = 1, pageCount = 1;

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

  function load(requestedPage) {
    if (requestedPage) page = requestedPage;
    OGA.api("GET", "public/calendars", { query: { page: page, perPage: 20 } }).then(
      function (res) {
        var calendars = res.data || [];
        list.replaceChildren();

        page = res.meta ? res.meta.page : page;
        pageCount = res.meta ? res.meta.pages : 1;
        count.textContent = res.meta && res.meta.total
          ? "Showing " + res.meta.from + "–" + res.meta.to + " of " + res.meta.total + " academic calendars · Page " + page + " of " + pageCount
          : "0 academic calendars available";

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
        var nav = el("nav", { class: "pagination", "aria-label": "Academic calendar pages" });
        var previous = el("button", { type: "button", class: "btn alt pagination-button", text: "Previous" });
        previous.disabled = page <= 1;
        previous.addEventListener("click", function () { load(page - 1); });
        var pages = el("div", { class: "pagination-pages" });
        var start = Math.max(1, page - 2), end = Math.min(pageCount, start + 4);
        start = Math.max(1, end - 4);
        for (var n = start; n <= end; n++) {
          (function (number) {
            var button = el("button", { type: "button", class: "btn page-number" + (number === page ? " current" : ""), text: String(number) });
            button.disabled = number === page;
            if (button.disabled) button.setAttribute("aria-current", "page");
            button.addEventListener("click", function () { load(number); });
            pages.appendChild(button);
          })(n);
        }
        var next = el("button", { type: "button", class: "btn pagination-button", text: "Next" });
        next.disabled = page >= pageCount;
        next.addEventListener("click", function () { load(page + 1); });
        nav.appendChild(previous);
        nav.appendChild(pages);
        nav.appendChild(next);
        list.appendChild(nav);
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
