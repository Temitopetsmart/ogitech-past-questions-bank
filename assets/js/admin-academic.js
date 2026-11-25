/* Academic structure (Main Admin only): programmes, levels, semesters, academic sessions.
   The server refuses to delete anything still used by questions. Renaming is safe because questions
   point to records by id, so every question picks up the new name automatically. */
(function () {
  var A = OGAAdmin,
    h = A.h;
  var tab = "programmes";

  A.register(
    "academic",
    "Academic Structure",
    function (root) {
      return A.loadStructure().then(function () {
        render(root);
      });
    },
    { icon: "fa-sitemap", roles: ["main"], group: "admin" },
  );

  function S() {
    return A.structure;
  }
  function lc(s) {
    return String(s).toLowerCase();
  }
  function nameCheck(v, existing, label) {
    if (v.length < 2 || v.length > 20)
      return label + " must be 2 to 20 characters.";
    if (
      existing.some(function (x) {
        return lc(x) === lc(v);
      })
    )
      return "That " + label.toLowerCase() + " already exists.";
    return "";
  }
  function plural(n, one) {
    return n + " " + one + (n === 1 ? "" : "s");
  }

  /* Run an API change, store the fresh structure it returns, and redraw. */
  function change(method, path, json, msg, redo) {
    A.api(method, path, { json: json }).then(function (res) {
      A.setStructure(res);
      if (msg) A.notify(msg);
      redo();
    }, A.handleError);
  }

  function render(root) {
    A.clear(root);
    root.appendChild(
      A.title(
        "Academic structure",
        "The programmes, levels, semesters and sessions used to organise past questions.",
      ),
    );
    var tabs = h("div", {
      class: "tabs",
      role: "tablist",
      "aria-label": "Academic structure",
    });
    [
      ["programmes", "Programmes"],
      ["levels", "Levels"],
      ["semesters", "Semesters"],
      ["sessions", "Sessions"],
    ].forEach(function (t) {
      var b = h("button", {
        type: "button",
        role: "tab",
        class: "tab" + (tab === t[0] ? " on" : ""),
        "aria-selected": String(tab === t[0]),
        text: t[1],
      });
      b.addEventListener("click", function () {
        tab = t[0];
        render(root);
      });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);
    var box = h("div", { role: "tabpanel" });
    root.appendChild(box);
    ({
      programmes: programmes,
      levels: levels,
      semesters: semesters,
      sessions: sessions,
    })[tab](box, function () {
      render(root);
    });
  }

  function row(title, sub, onRename, onDelete, canDelete, why) {
    var del = A.btn(
      "",
      "fa-trash",
      "subtle danger-text",
      onDelete,
      "Delete " + title,
    );
    if (!canDelete) {
      del.disabled = true;
      del.setAttribute("title", why);
    }
    return h("article", { class: "q-item compact" }, [
      h("div", { class: "q-main" }, [
        h("strong", { text: title }),
        sub ? h("span", { class: "muted", text: sub }) : null,
      ]),
      h("div", { class: "q-actions" }, [
        A.btn("", "fa-pen", "subtle", onRename, "Rename " + title),
        del,
      ]),
    ]);
  }
  function addBtn(label, fn) {
    return h("div", { class: "page-actions inline" }, [
      A.btn(label, "fa-plus", "primary", fn),
    ]);
  }

  /* ---------- Programmes ---------- */
  function programmes(box, redo) {
    var P = S().programmes,
      names = P.map(function (p) {
        return p.name;
      });
    box.appendChild(
      addBtn("Add programme", function () {
        A.prompt(
          "New programme",
          "",
          function (v) {
            return nameCheck(v, names, "Programme");
          },
          function (v) {
            change(
              "POST",
              "admin/programmes",
              { name: v },
              "Added " + v + ". Now add its levels.",
              redo,
            );
          },
        );
      }),
    );
    P.forEach(function (p) {
      var inUse = p.questionCount > 0 || p.departmentCount > 0;
      box.appendChild(
        row(
          p.name,
          plural(p.levels.length, "level") +
            " · " +
            plural(p.departmentCount, "department") +
            " · " +
            plural(p.questionCount, "question"),
          function () {
            A.prompt(
              "Rename programme",
              p.name,
              function (v) {
                return nameCheck(
                  v,
                  names.filter(function (x) {
                    return x !== p.name;
                  }),
                  "Programme",
                );
              },
              function (v) {
                change(
                  "PUT",
                  "admin/programmes/" + p.id,
                  { name: v },
                  "Renamed to " + v + ".",
                  redo,
                );
              },
            );
          },
          function () {
            A.confirm(
              "Delete " + p.name + "?",
              "Its levels will be removed too.",
              "Delete programme",
              function () {
                change(
                  "DELETE",
                  "admin/programmes/" + p.id,
                  undefined,
                  "Deleted " + p.name + ".",
                  redo,
                );
              },
            );
          },
          P.length > 1 && !inUse,
          P.length <= 1
            ? "At least one programme is required."
            : "In use by questions or departments. Move or remove them first.",
        ),
      );
    });
  }

  /* ---------- Levels ---------- */
  function levels(box, redo) {
    S().programmes.forEach(function (p) {
      var names = p.levels.map(function (l) {
        return l.name;
      });
      box.appendChild(
        h("div", { class: "group-head" }, [
          h("h2", { text: p.name }),
          A.btn("Add level", "fa-plus", "ghost sm", function () {
            A.prompt(
              "New " + p.name + " level",
              "",
              function (v) {
                return nameCheck(v, names, "Level");
              },
              function (v) {
                change(
                  "POST",
                  "admin/levels",
                  { programmeId: p.id, name: v },
                  "Added " + v + ".",
                  redo,
                );
              },
            );
          }),
        ]),
      );
      if (!p.levels.length)
        box.appendChild(
          h("p", { class: "muted", text: "No levels yet for " + p.name + "." }),
        );
      p.levels.forEach(function (l) {
        box.appendChild(
          row(
            l.name,
            plural(l.questionCount, "question"),
            function () {
              A.prompt(
                "Rename level",
                l.name,
                function (v) {
                  return nameCheck(
                    v,
                    names.filter(function (x) {
                      return x !== l.name;
                    }),
                    "Level",
                  );
                },
                function (v) {
                  change(
                    "PUT",
                    "admin/levels/" + l.id,
                    { name: v },
                    "Renamed to " + v + ".",
                    redo,
                  );
                },
              );
            },
            function () {
              A.confirm(
                "Delete " + l.name + "?",
                "This level will no longer be selectable.",
                "Delete level",
                function () {
                  change(
                    "DELETE",
                    "admin/levels/" + l.id,
                    undefined,
                    "Deleted " + l.name + ".",
                    redo,
                  );
                },
              );
            },
            l.questionCount === 0,
            "Questions use this level. Move or delete them first.",
          ),
        );
      });
    });
  }

  /* ---------- Semesters ---------- */
  function semesters(box, redo) {
    var M = S().semesters,
      names = M.map(function (m) {
        return m.name;
      });
    box.appendChild(
      addBtn("Add semester", function () {
        A.prompt(
          "New semester",
          "",
          function (v) {
            return nameCheck(v, names, "Semester");
          },
          function (v) {
            change(
              "POST",
              "admin/semesters",
              { name: v },
              "Added " + v + ".",
              redo,
            );
          },
        );
      }),
    );
    M.forEach(function (m) {
      box.appendChild(
        row(
          m.name,
          plural(m.questionCount, "question"),
          function () {
            A.prompt(
              "Rename semester",
              m.name,
              function (v) {
                return nameCheck(
                  v,
                  names.filter(function (x) {
                    return x !== m.name;
                  }),
                  "Semester",
                );
              },
              function (v) {
                change(
                  "PUT",
                  "admin/semesters/" + m.id,
                  { name: v },
                  "Renamed to " + v + ".",
                  redo,
                );
              },
            );
          },
          function () {
            A.confirm(
              "Delete " + m.name + "?",
              "This semester will no longer be selectable.",
              "Delete semester",
              function () {
                change(
                  "DELETE",
                  "admin/semesters/" + m.id,
                  undefined,
                  "Deleted " + m.name + ".",
                  redo,
                );
              },
            );
          },
          M.length > 1 && m.questionCount === 0,
          M.length <= 1
            ? "At least one semester is required."
            : "Questions use this semester. Move or delete them first.",
        ),
      );
    });
  }

  /* ---------- Academic sessions ---------- */
  function sessionCheck(v, others) {
    var m = /^(\d{4})\/(\d{4})$/.exec(v);
    if (!m || +m[2] !== +m[1] + 1)
      return "Use the format 2025/2026 (the second year is one more than the first).";
    if (
      others.some(function (x) {
        return x.name === v;
      })
    )
      return "That session already exists.";
    return "";
  }
  function sessions(box, redo) {
    var L = S().sessions;
    box.appendChild(
      h("p", { class: "note" }, [
        h("i", { class: "fa-solid fa-circle-info", "aria-hidden": "true" }),
        " An academic session (2025/2026) is separate from the examination year (2025) recorded on each question.",
      ]),
    );
    box.appendChild(
      addBtn("Add session", function () {
        A.prompt(
          "New academic session",
          "",
          function (v) {
            return sessionCheck(v, L);
          },
          function (v) {
            change(
              "POST",
              "admin/sessions",
              { name: v },
              "Added " + v + ".",
              redo,
            );
          },
        );
      }),
    );
    L.forEach(function (x) {
      box.appendChild(
        row(
          x.name,
          plural(x.questionCount, "question"),
          function () {
            A.prompt(
              "Rename session",
              x.name,
              function (v) {
                return sessionCheck(
                  v,
                  L.filter(function (o) {
                    return o.id !== x.id;
                  }),
                );
              },
              function (v) {
                change(
                  "PUT",
                  "admin/sessions/" + x.id,
                  { name: v },
                  "Renamed to " + v + ".",
                  redo,
                );
              },
            );
          },
          function () {
            A.confirm(
              "Delete " + x.name + "?",
              "This session will no longer be selectable.",
              "Delete session",
              function () {
                change(
                  "DELETE",
                  "admin/sessions/" + x.id,
                  undefined,
                  "Deleted " + x.name + ".",
                  redo,
                );
              },
            );
          },
          x.questionCount === 0,
          "Questions use this session. Move or delete them first.",
        ),
      );
    });
  }
})();
