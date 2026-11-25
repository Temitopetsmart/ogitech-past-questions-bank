/* Question details: loads one published question from the API. */
(function () {
  var UI = OGAUI,
    h = UI.h;
  var box = document.getElementById("detail");

  function message(title, text, withRetry) {
    UI.clear(box);
    var kids = [h("h1", { text: title }), h("p", { text: text })];
    if (withRetry) {
      var retry = h("button", {
        class: "btn alt",
        type: "button",
        text: "Try again",
      });
      retry.addEventListener("click", load);
      kids.push(retry);
    } else {
      kids.push(
        h("a", { class: "btn", href: "browse.html", text: "Browse questions" }),
      );
    }
    var attrs = { class: "empty" };
    if (withRetry) attrs.role = "alert";
    box.appendChild(h("div", attrs, kids));
  }

  function show(x) {
    document.title =
      x.courseCode + " " + x.courseTitle + " | " + OGA.getSettings().siteName;
    var rows = [
      ["Department", x.department],
      ["Programme", x.programme],
      ["Level", x.level],
      ["Semester", x.semester],
      ["Academic session", x.session || "Not set"],
      ["Examination year", String(x.examYear)],
      [
        "Document",
        x.hasDocument ? "PDF available" : "No document attached yet",
      ],
    ];
    if (x.notes) rows.push(["Notes", x.notes]);
    var dl = h("dl", { class: "meta" });
    rows.forEach(function (r) {
      dl.appendChild(h("dt", { text: r[0] }));
      dl.appendChild(h("dd", { text: r[1] }));
    });

    var downloadHref = OGA.fileUrl(x.id, true),
      previewHref = OGA.fileUrl(x.id, false);
    var action = x.hasDocument
      ? h("a", { class: "btn", href: downloadHref, text: "Download" })
      : h("button", {
          class: "btn",
          type: "button",
          disabled: "",
          text: "Download unavailable",
        });
    var preview = x.hasDocument
      ? h("div", { class: "preview" }, [
          h("iframe", {
            src: previewHref,
            title: "Preview of " + x.courseCode,
            loading: "lazy",
          }),
        ])
      : h("div", { class: "preview" }, [
          h("div", {}, [
            h("strong", { text: "No document to preview" }),
            h("p", {
              class: "muted",
              text: "The document for this question has not been uploaded yet.",
            }),
          ]),
        ]);
    UI.clear(box);
    box.appendChild(
      h("div", {}, [
        h("h1", { text: x.courseCode + " – " + x.courseTitle }),
        h("div", { class: "detail" }, [
          h("div", {}, [dl, h("p", {}, [action])]),
          h("div", {}, [
            h("h2", { text: "Preview" }),
            preview,
            x.hasDocument
              ? h("p", { class: "muted" }, [
                  h("a", {
                    href: previewHref,
                    target: "_blank",
                    rel: "noopener",
                    text: "Preview blank? Open the file in a new tab.",
                  }),
                ])
              : null,
          ]),
        ]),
      ]),
    );
  }

  function load() {
    var back = document.getElementById("back"),
      saved = "";
    try {
      saved = sessionStorage.getItem("oga_last_browse") || "";
    } catch (e) {}
    back.href = "browse.html" + (saved ? "?" + saved : "");

    var id = new URLSearchParams(location.search).get("id") || "";
    if (!/^\d{1,10}$/.test(id)) {
      document.title = "Question not found";
      return message(
        "Question not found",
        "This question may have been removed or is not published.",
      );
    }
    UI.clear(box);
    box.appendChild(
      h("p", { class: "muted", role: "status", text: "Loading…" }),
    );
    OGA.question(id).then(show, function (err) {
      if (err && err.status === 404) {
        document.title = "Question not found";
        return message(
          "Question not found",
          "This question may have been removed or is not published.",
        );
      }
      message(
        "Question could not be loaded",
        (err && err.message) || "Please try again.",
        true,
      );
    });
  }

  window.OGAPage = { render: function () {} };
  load();
})();
