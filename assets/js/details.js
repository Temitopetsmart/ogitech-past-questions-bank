(function () {
  var UI = OGAUI,
    h = UI.h;
  function render() {
    var box = document.getElementById("detail");
    UI.clear(box);
    var back = document.getElementById("back"),
      saved = "";
    try {
      saved = sessionStorage.getItem("oga_last_browse") || "";
    } catch (e) {}
    back.href = "browse.html" + (saved ? "?" + saved : "");
    var id = new URLSearchParams(location.search).get("id") || "";
    var x = /^[\w-]{1,40}$/.test(id) ? OGA.getQuestion(id) : null;
    if (!x || !x.published) {
      box.appendChild(
        h("div", { class: "empty" }, [
          h("h1", { text: "Question not found" }),
          h("p", {
            text: "This question may have been removed or is not published.",
          }),
          h("a", {
            class: "btn",
            href: "browse.html",
            text: "Browse questions",
          }),
        ]),
      );
      document.title = "Question not found";
      return;
    }
    document.title =
      x.courseCode + " " + x.courseTitle + " | " + OGA.getSettings().siteName;
    var dep = OGA.getDepartment(x.departmentId),
      href = UI.safeHref(x.fileUrl),
      hasFile = !!x.fileUrl && href !== "#";
    var rows = [
      ["Department", dep ? dep.name : "Unassigned"],
      ["Programme", x.programme],
      ["Level", x.level],
      ["Semester", x.semester],
      ["Examination year", OGA.session(x.examYear) + " (" + x.examYear + ")"],
      ["Document", hasFile ? "PDF available" : "Not attached (sample record)"],
    ];
    if (x.notes) rows.push(["Notes", x.notes]);
    var dl = h("dl", { class: "meta" });
    rows.forEach(function (r) {
      dl.appendChild(h("dt", { text: r[0] }));
      dl.appendChild(h("dd", { text: r[1] }));
    });

    var dl2 = hasFile
      ? h("a", { class: "btn", href: href, download: "", text: "Download" })
      : h("button", {
          class: "btn",
          type: "button",
          disabled: "",
          text: "Download unavailable",
        });
    var preview = hasFile
      ? h("div", { class: "preview" }, [
          h("iframe", {
            src: href,
            title: "Preview of " + x.courseCode,
            loading: "lazy",
          }),
        ])
      : h("div", { class: "preview" }, [
          h("div", {}, [
            h("strong", { text: "No document to preview" }),
            h("p", {
              class: "muted",
              text: "This is a sample record with no file attached. Nothing can be downloaded in the prototype.",
            }),
          ]),
        ]);
    box.appendChild(
      h("div", {}, [
        h("h1", { text: x.courseCode + " – " + x.courseTitle }),
        h("div", { class: "detail" }, [
          h("div", {}, [dl, h("p", {}, [dl2])]),
          h("div", {}, [
            h("h2", { text: "Preview" }),
            preview,
            hasFile
              ? h("p", { class: "muted" }, [
                  h("a", {
                    href: href,
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
  window.OGAPage = { render: render };
  render();
})();
