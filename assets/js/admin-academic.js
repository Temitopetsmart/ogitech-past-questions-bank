/* Academic structure (Main Admin only): programmes, levels, semesters, academic sessions.
   Items in use by questions cannot be deleted. Renaming programmes, levels and semesters updates the records that use them. */
(function () {
  var A = OGAAdmin,
    h = A.h;
  var tab = "programmes";

  A.register(
    "academic",
    "Academic Structure",
    function (root) {
      render(root);
    },
    { icon: "fa-sitemap", roles: ["main"], group: "admin" },
  );

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
  function qCount(fn) {
    return OGA.getQuestions(true).filter(fn).length;
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
    var s = OGA.get(),
      P = s.options.programmes;
    box.appendChild(
      addBtn("Add programme", function () {
        A.prompt(
          "New programme",
          "",
          function (v) {
            return nameCheck(v, P, "Programme");
          },
          function (v) {
            if (
              A.commit(function (n) {
                n.options.programmes.push(v);
                n.options.levels[v] = [];
              })
            ) {
              A.notify("Added " + v + ". Now add its levels.");
              redo();
            }
          },
        );
      }),
    );
    P.forEach(function (p) {
      var qs = qCount(function (x) {
          return x.programme === p;
        }),
        ds = s.departments.filter(function (d) {
          return d.programmes.indexOf(p) !== -1;
        }).length;
      box.appendChild(
        row(
          p,
          (s.options.levels[p] || []).length +
            " levels · " +
            ds +
            " departments · " +
            qs +
            " questions",
          function () {
            A.prompt(
              "Rename programme",
              p,
              function (v) {
                return nameCheck(
                  v,
                  P.filter(function (x) {
                    return x !== p;
                  }),
                  "Programme",
                );
              },
              function (v) {
                if (
                  A.commit(function (n) {
                    n.options.programmes = n.options.programmes.map(
                      function (x) {
                        return x === p ? v : x;
                      },
                    );
                    n.options.levels[v] = n.options.levels[p];
                    if (v !== p) delete n.options.levels[p];
                    n.departments.forEach(function (d) {
                      d.programmes = d.programmes.map(function (x) {
                        return x === p ? v : x;
                      });
                    });
                    n.questions.forEach(function (x) {
                      if (x.programme === p) x.programme = v;
                    });
                    n.requests.forEach(function (x) {
                      if (x.programme === p) x.programme = v;
                    });
                  })
                ) {
                  A.notify("Renamed to " + v + ".");
                  redo();
                }
              },
            );
          },
          function () {
            A.confirm(
              "Delete " + p + "?",
              "Its levels will be removed too.",
              "Delete programme",
              function () {
                if (
                  A.commit(function (n) {
                    n.options.programmes = n.options.programmes.filter(
                      function (x) {
                        return x !== p;
                      },
                    );
                    delete n.options.levels[p];
                  })
                ) {
                  A.notify("Deleted " + p + ".");
                  redo();
                }
              },
            );
          },
          P.length > 1 && !qs && !ds,
          P.length <= 1
            ? "At least one programme is required."
            : "In use by questions or departments. Move or remove them first.",
        ),
      );
    });
  }

  /* ---------- Levels ---------- */
  function levels(box, redo) {
    var s = OGA.get();
    s.options.programmes.forEach(function (p) {
      var L = s.options.levels[p] || [];
      box.appendChild(
        h("div", { class: "group-head" }, [
          h("h2", { text: p }),
          A.btn("Add level", "fa-plus", "ghost sm", function () {
            A.prompt(
              "New " + p + " level",
              "",
              function (v) {
                return nameCheck(v, L, "Level");
              },
              function (v) {
                if (
                  A.commit(function (n) {
                    n.options.levels[p].push(v);
                  })
                ) {
                  A.notify("Added " + v + ".");
                  redo();
                }
              },
            );
          }),
        ]),
      );
      if (!L.length)
        box.appendChild(
          h("p", { class: "muted", text: "No levels yet for " + p + "." }),
        );
      L.forEach(function (l) {
        var qs = qCount(function (x) {
          return x.programme === p && x.level === l;
        });
        box.appendChild(
          row(
            l,
            qs + (qs === 1 ? " question" : " questions"),
            function () {
              A.prompt(
                "Rename level",
                l,
                function (v) {
                  return nameCheck(
                    v,
                    L.filter(function (x) {
                      return x !== l;
                    }),
                    "Level",
                  );
                },
                function (v) {
                  if (
                    A.commit(function (n) {
                      n.options.levels[p] = n.options.levels[p].map(
                        function (x) {
                          return x === l ? v : x;
                        },
                      );
                      n.questions.forEach(function (x) {
                        if (x.programme === p && x.level === l) x.level = v;
                      });
                      n.requests.forEach(function (x) {
                        if (x.programme === p && x.level === l) x.level = v;
                      });
                    })
                  ) {
                    A.notify("Renamed to " + v + ".");
                    redo();
                  }
                },
              );
            },
            function () {
              A.confirm(
                "Delete " + l + "?",
                "This level will no longer be selectable.",
                "Delete level",
                function () {
                  if (
                    A.commit(function (n) {
                      n.options.levels[p] = n.options.levels[p].filter(
                        function (x) {
                          return x !== l;
                        },
                      );
                    })
                  ) {
                    A.notify("Deleted " + l + ".");
                    redo();
                  }
                },
              );
            },
            !qs,
            "Questions use this level. Move or delete them first.",
          ),
        );
      });
    });
  }

  /* ---------- Semesters ---------- */
  function semesters(box, redo) {
    var S = OGA.get().options.semesters;
    box.appendChild(
      addBtn("Add semester", function () {
        A.prompt(
          "New semester",
          "",
          function (v) {
            return nameCheck(v, S, "Semester");
          },
          function (v) {
            if (
              A.commit(function (n) {
                n.options.semesters.push(v);
              })
            ) {
              A.notify("Added " + v + ".");
              redo();
            }
          },
        );
      }),
    );
    S.forEach(function (m) {
      var qs = qCount(function (x) {
        return x.semester === m;
      });
      box.appendChild(
        row(
          m,
          qs + (qs === 1 ? " question" : " questions"),
          function () {
            A.prompt(
              "Rename semester",
              m,
              function (v) {
                return nameCheck(
                  v,
                  S.filter(function (x) {
                    return x !== m;
                  }),
                  "Semester",
                );
              },
              function (v) {
                if (
                  A.commit(function (n) {
                    n.options.semesters = n.options.semesters.map(function (x) {
                      return x === m ? v : x;
                    });
                    n.questions.forEach(function (x) {
                      if (x.semester === m) x.semester = v;
                    });
                    n.requests.forEach(function (x) {
                      if (x.semester === m) x.semester = v;
                    });
                  })
                ) {
                  A.notify("Renamed to " + v + ".");
                  redo();
                }
              },
            );
          },
          function () {
            A.confirm(
              "Delete " + m + "?",
              "This semester will no longer be selectable.",
              "Delete semester",
              function () {
                if (
                  A.commit(function (n) {
                    n.options.semesters = n.options.semesters.filter(
                      function (x) {
                        return x !== m;
                      },
                    );
                  })
                ) {
                  A.notify("Deleted " + m + ".");
                  redo();
                }
              },
            );
          },
          S.length > 1 && !qs,
          S.length <= 1
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
    var S = OGA.getSessions();
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
            return sessionCheck(v, S);
          },
          function (v) {
            if (
              A.commit(function (n) {
                n.sessions.push({ id: v.replace("/", "-"), name: v });
              })
            ) {
              A.notify("Added " + v + ".");
              redo();
            }
          },
        );
      }),
    );
    S.forEach(function (x) {
      var qs = qCount(function (q) {
        return q.sessionId === x.id;
      });
      box.appendChild(
        row(
          x.name,
          qs + (qs === 1 ? " question" : " questions"),
          function () {
            A.prompt(
              "Rename session",
              x.name,
              function (v) {
                return sessionCheck(
                  v,
                  S.filter(function (o) {
                    return o.id !== x.id;
                  }),
                );
              },
              function (v) {
                if (
                  A.commit(function (n) {
                    n.sessions.filter(function (o) {
                      return o.id === x.id;
                    })[0].name = v;
                  })
                ) {
                  A.notify("Renamed to " + v + ".");
                  redo();
                }
              },
            );
          },
          function () {
            A.confirm(
              "Delete " + x.name + "?",
              "This session will no longer be selectable.",
              "Delete session",
              function () {
                if (
                  A.commit(function (n) {
                    n.sessions = n.sessions.filter(function (o) {
                      return o.id !== x.id;
                    });
                  })
                ) {
                  A.notify("Deleted " + x.name + ".");
                  redo();
                }
              },
            );
          },
          !qs,
          "Questions use this session. Move or delete them first.",
        ),
      );
    });
  }
})();
