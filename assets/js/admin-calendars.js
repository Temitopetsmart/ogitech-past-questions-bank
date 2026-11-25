/* Academic calendars: upload, publish, edit and delete institution-wide PDFs. */
(function () {
  var A = OGAAdmin,
    h = A.h;

  A.register(
    "calendars",
    "Academic Calendars",
    function (root) {
      return A.loadStructure().then(function () {
        return render(root);
      });
    },
    { icon: "fa-calendar-days", group: "work" },
  );

  function escText(value) {
    return String(value == null ? "" : value);
  }

  function render(root) {
    A.clear(root);

    root.appendChild(
      A.title(
        "Academic calendars",
        "Manage institution-wide academic calendar PDFs for all students.",
        [
          A.btn("Upload calendar", "fa-cloud-arrow-up", "primary", function () {
            form(root, null);
          }),
        ],
      ),
    );

    var box = h("div", { class: "qlist" });
    root.appendChild(box);
    box.appendChild(
      h("p", { class: "loading" }, [A.spinner(), " Loading calendars…"]),
    );

    return A.api("GET", "admin/calendars").then(
      function (res) {
        A.clear(box);
        var rows = res.data || [];

        if (!rows.length) {
          box.appendChild(
            A.empty(
              "fa-calendar-days",
              "No academic calendars yet",
              "Upload the institution's first academic calendar PDF.",
              A.btn("Upload calendar", "fa-plus", "primary", function () {
                form(root, null);
              }),
            ),
          );
          return;
        }

        rows.forEach(function (x) {
          var title = escText(x.title);
          var session = escText(x.session || "Academic session not set");
          var fileName = escText(x.originalName || "PDF document");
          var details = [
            session,
            fileName,
            x.fileSize ? A.fileSize(Number(x.fileSize)) : "",
          ]
            .filter(Boolean)
            .join(" · ");

          var actions = h("div", { class: "q-actions" }, [
            A.btn(
              "",
              "fa-eye",
              "subtle",
              function () {
                window.open(A.calendarFileUrl(x.id), "_blank", "noopener");
              },
              "View " + title,
            ),
            A.btn(
              "",
              "fa-pen-to-square",
              "subtle",
              function () {
                form(root, x);
              },
              "Edit " + title,
            ),
            A.btn(
              x.published ? "Unpublish" : "Publish",
              x.published ? "fa-eye-slash" : "fa-globe",
              "subtle",
              function () {
                togglePublish(x);
              },
            ),
            A.btn(
              "",
              "fa-trash",
              "subtle danger-text",
              function () {
                A.confirm(
                  "Delete this calendar?",
                  "The calendar record and its stored PDF will be deleted.",
                  "Delete calendar",
                  function () {
                    A.api("DELETE", "admin/calendars/" + x.id).then(
                      function () {
                        A.notify("Academic calendar deleted.");
                        render(root);
                      },
                      A.handleError,
                    );
                  },
                );
              },
              "Delete " + title,
            ),
          ]);

          box.appendChild(
            h("article", { class: "q-item" }, [
              h("div", { class: "q-main" }, [
                h("strong", { text: title }),
                h("span", { class: "muted", text: details }),
              ]),
              h("div", { class: "q-tags" }, [
                A.pill(
                  x.published ? "Published" : "Draft",
                  x.published ? "ok" : "warn",
                ),
                A.pill("Academic calendar"),
              ]),
              actions,
            ]),
          );
        });
      },
      function (err) {
        A.clear(box);
        box.appendChild(
          A.empty(
            "fa-triangle-exclamation",
            "Calendars could not be loaded",
            err.message,
            A.btn("Try again", "fa-rotate-right", "ghost", function () {
              render(root);
            }),
          ),
        );
      },
    );
  }

  function togglePublish(x) {
    var fd = new FormData();
    fd.append("title", x.title);
    fd.append("sessionId", String(x.sessionId));
    fd.append("published", x.published ? "0" : "1");

    A.api("POST", "admin/calendars/" + x.id, { form: fd }).then(function () {
      A.notify(x.published ? "Calendar unpublished." : "Calendar published.");
      A.route();
    }, A.handleError);
  }

  function form(root, existing) {
    var sessions = A.structure.sessions || [];
    var fields = {
      title: A.field({
        id: "cal-title",
        label: "Calendar title",
        value: existing ? existing.title : "",
        maxlength: 120,
        required: true,
        hint: "Example: OGITECH Academic Calendar 2026/2027",
      }),
      sessionId: A.field({
        id: "cal-session",
        label: "Academic session",
        type: "select",
        required: true,
        options: [["", "Select academic session"]].concat(
          sessions.map(function (s) {
            return [s.id, s.name];
          }),
        ),
        value: existing ? existing.sessionId : "",
      }),
      published: A.field({
        id: "cal-published",
        label: "Publish this calendar for students",
        type: "checkbox",
        value: existing ? !!existing.published : true,
      }),
    };

    var pdf = h("input", {
      type: "file",
      accept: "application/pdf,.pdf",
    });
    var pdfWrap = h("div", { class: "field" }, [
      h("label", {
        text: existing ? "Replace PDF (optional)" : "Calendar PDF",
      }),
      pdf,
      h("p", {
        class: "hint",
        text: existing
          ? "Leave this empty to keep the current PDF."
          : "Select the academic calendar PDF to upload.",
      }),
      h("p", { class: "err", id: "cal-pdf-error" }),
    ]);

    var progress = A.progress();
    var save = A.btn(
      existing ? "Save changes" : "Upload calendar",
      "fa-floppy-disk",
      "primary",
      submit,
    );
    var cancel = A.btn("Cancel", null, "ghost", function () {
      render(root);
    });

    var panel = A.card(
      existing ? "Edit academic calendar" : "Upload academic calendar",
      [
        fields.title.wrap,
        fields.sessionId.wrap,
        fields.published.wrap,
        pdfWrap,
        progress.el,
        h("div", { class: "page-actions inline" }, [save, cancel]),
      ],
    );

    A.clear(root);
    root.appendChild(
      A.title(
        existing ? "Edit academic calendar" : "Upload academic calendar",
        "This document will be available to all OGITECH students when published.",
      ),
    );
    root.appendChild(panel);

    function submit() {
      var title = fields.title.get();
      var sessionId = fields.sessionId.get();
      var file = pdf.files && pdf.files[0];
      var pdfError = document.getElementById("cal-pdf-error");

      fields.title.error("");
      fields.sessionId.error("");
      pdfError.textContent = "";

      if (title.length < 3 || title.length > 120) {
        fields.title.error("Enter a title between 3 and 120 characters.");
        return;
      }
      if (!sessionId) {
        fields.sessionId.error("Select an academic session.");
        return;
      }
      if (!existing && !file) {
        pdfError.textContent = "Select the calendar PDF.";
        return;
      }
      if (
        file &&
        (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name))
      ) {
        pdfError.textContent = "Only PDF files are allowed.";
        return;
      }

      var fd = new FormData();
      fd.append("title", title);
      fd.append("sessionId", sessionId);
      fd.append("published", fields.published.get() ? "1" : "0");
      if (file) fd.append("pdf", file, file.name);

      A.busy(save, true, "Saving…");
      if (file) progress.set(0, "Uploading…");

      A.api("POST", "admin/calendars" + (existing ? "/" + existing.id : ""), {
        form: fd,
        onUpload: file
          ? function (pct) {
              progress.set(pct, "Uploading… " + pct + "%");
            }
          : undefined,
      }).then(
        function () {
          A.notify(existing ? "Calendar updated." : "Calendar uploaded.");
          render(root);
        },
        function (err) {
          A.busy(save, false);
          A.handleError(err, fields);
        },
      );
    }
  }

  A.calendarFileUrl = function (id) {
    return OGA.API + "admin/calendars/" + encodeURIComponent(id) + "/file";
  };
})();
