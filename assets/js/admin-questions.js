/* Question bank management: list, search, create, edit, delete, feature, publish. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = null;
  var flt = { q: "", dept: "", status: "" };

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  function nextId(qs) {
    var n = 0;
    qs.forEach(function (x) {
      var m = /^q(\d+)$/.exec(x.id);
      if (m) n = Math.max(n, +m[1]);
    });
    var id;
    do {
      n++;
      id = "q" + String(n).padStart(3, "0");
    } while (
      qs.some(function (x) {
        return x.id === id;
      })
    );
    return id;
  }

  A.register("questions", "Questions", function (root) {
    V = window.OGAValidate;
    list(root);
  });

  function list(root) {
    A.clear(root);
    root.appendChild(
      A.title(
        "Question bank",
        "Changes appear on the public Browse page straight away. Unpublished questions stay here but are hidden from visitors.",
      ),
    );
    var s = OGA.get(),
      deps = s.departments;
    var q = A.field({
      id: "aq",
      label: "Search",
      type: "search",
      value: flt.q,
      maxlength: 80,
    });
    var d = A.field({
      id: "ad",
      label: "Department",
      type: "select",
      value: flt.dept,
      options: [["", "All departments"]].concat(
        deps.map(function (x) {
          return [x.id, x.name];
        }),
      ),
    });
    var st = A.field({
      id: "as",
      label: "Status",
      type: "select",
      value: flt.status,
      options: [
        ["", "All"],
        ["published", "Published"],
        ["draft", "Unpublished"],
        ["featured", "Featured"],
      ],
    });
    var add = h("button", {
      type: "button",
      class: "btn",
      text: "Add question",
    });
    add.onclick = function () {
      form(root, null);
    };
    root.appendChild(
      h("div", { class: "toolbar" }, [
        q.wrap,
        d.wrap,
        st.wrap,
        h("div", { class: "field" }, [add]),
      ]),
    );
    var box = h("div"),
      count = h("p", { class: "muted", role: "status", "aria-live": "polite" });
    root.appendChild(count);
    root.appendChild(box);

    function paint() {
      flt = { q: q.get(), dept: d.get(), status: st.get() };
      A.clear(box);
      var term = norm(flt.q);
      var rows = OGA.getQuestions(true)
        .filter(function (x) {
          if (flt.dept && x.departmentId !== flt.dept) return false;
          if (flt.status === "published" && !x.published) return false;
          if (flt.status === "draft" && x.published) return false;
          if (flt.status === "featured" && !x.featured) return false;
          return (
            !term ||
            norm(
              [
                x.courseCode,
                x.courseTitle,
                x.level,
                x.semester,
                x.examYear,
                x.notes,
              ].join(" "),
            ).indexOf(term) !== -1
          );
        })
        .sort(function (a, b) {
          return b.updatedAt.localeCompare(a.updatedAt);
        });
      count.textContent =
        rows.length + " of " + OGA.get().questions.length + " questions";
      if (!rows.length)
        box.appendChild(
          h("p", {
            class: "empty",
            text: "No questions match. Change the filters or add a question.",
          }),
        );
      rows.forEach(function (x) {
        var dep = OGA.getDepartment(x.departmentId);
        var info = h("div", {}, [
          h("strong", { text: x.courseCode + " – " + x.courseTitle }),
          h("div", {
            class: "muted",
            text:
              (dep ? dep.name : "No department") +
              ", " +
              x.level +
              ", " +
              x.semester +
              ", " +
              x.examYear,
          }),
          h("div", {}, [
            h("span", {
              class: "pill" + (x.published ? " on" : ""),
              text: x.published ? "Published" : "Unpublished",
            }),
            x.featured
              ? h("span", { class: "pill on", text: "Featured" })
              : null,
            h("span", {
              class: "pill",
              text: x.fileUrl ? "Document linked" : "No document",
            }),
          ]),
        ]);
        function btn(label, cls, fn) {
          var b = h("button", {
            type: "button",
            class: "btn sm " + cls,
            text: label,
            "aria-label": label + " " + x.courseCode,
          });
          b.onclick = fn;
          return b;
        }
        function toggle(key, label) {
          if (
            A.commit(
              function (n) {
                var t = n.questions.filter(function (y) {
                  return y.id === x.id;
                })[0];
                if (!t) return "That question no longer exists.";
                t[key] = !t[key];
                t.updatedAt = new Date().toISOString();
              },
              label + ": " + x.courseCode,
            )
          ) {
            A.notify(label + ": " + x.courseCode + ".");
            paint();
          }
        }
        box.appendChild(
          h("div", { class: "arow" }, [
            info,
            h("div", { class: "acts" }, [
              btn("Edit", "alt", function () {
                form(root, x.id);
              }),
              btn(x.featured ? "Unfeature" : "Feature", "alt", function () {
                toggle("featured", x.featured ? "Unfeatured" : "Featured");
              }),
              btn(x.published ? "Unpublish" : "Publish", "alt", function () {
                toggle("published", x.published ? "Unpublished" : "Published");
              }),
              btn("Delete", "danger", function () {
                A.confirm(
                  "Delete " + x.courseCode + "?",
                  "This permanently removes the question from this browser's data. Consider unpublishing instead.",
                  "Delete question",
                  function () {
                    if (
                      A.commit(function (n) {
                        n.questions = n.questions.filter(function (y) {
                          return y.id !== x.id;
                        });
                      }, "Deleted question " + x.courseCode)
                    ) {
                      A.notify("Deleted " + x.courseCode + ".");
                      paint();
                    }
                  },
                );
              }),
            ]),
          ]),
        );
      });
    }
    [q, d, st].forEach(function (f) {
      f.input.addEventListener("input", paint);
      f.input.addEventListener("change", paint);
    });
    paint();
  }

  function form(root, id) {
    A.clear(root);
    A.editing = true;
    var s = OGA.get(),
      o = s.options,
      ex = id ? OGA.getQuestion(id) : null;
    if (id && !ex) {
      A.notify("That question no longer exists.", "error");
      A.editing = false;
      return list(root);
    }
    var cur = ex || {
      departmentId: "",
      programme: "",
      level: "",
      semester: "",
      courseCode: "",
      courseTitle: "",
      examYear: "",
      notes: "",
      fileUrl: "",
      featured: false,
      published: true,
    };
    root.appendChild(
      A.title(
        ex ? "Edit question" : "Add question",
        ex ? "ID: " + ex.id : "A new ID is created automatically.",
      ),
    );
    var year = new Date().getFullYear();
    var f = {
      departmentId: A.field({
        id: "qd",
        label: "Department",
        type: "select",
        value: cur.departmentId,
        required: true,
        options: [["", "Select department"]].concat(
          s.departments.map(function (x) {
            return [x.id, x.name];
          }),
        ),
      }),
      programme: A.field({
        id: "qp",
        label: "Programme",
        type: "select",
        value: cur.programme,
        required: true,
        options: [["", "Select programme"]].concat(
          o.programmes.map(function (x) {
            return [x, x];
          }),
        ),
      }),
      level: A.field({
        id: "ql",
        label: "Level",
        type: "select",
        value: cur.level,
        required: true,
        options: [["", "Select level"]],
      }),
      semester: A.field({
        id: "qs",
        label: "Semester",
        type: "select",
        value: cur.semester,
        required: true,
        options: [["", "Select semester"]].concat(
          o.semesters.map(function (x) {
            return [x, x];
          }),
        ),
      }),
      courseCode: A.field({
        id: "qc",
        label: "Course code",
        value: cur.courseCode,
        maxlength: 20,
        required: true,
      }),
      courseTitle: A.field({
        id: "qt",
        label: "Course title",
        value: cur.courseTitle,
        maxlength: 120,
        required: true,
      }),
      examYear: A.field({
        id: "qy",
        label: "Examination year",
        value: String(cur.examYear || ""),
        maxlength: 4,
        inputmode: "numeric",
        required: true,
        hint: "The year the exam was written, for example 2025.",
      }),
      notes: A.field({
        id: "qn",
        label: "Notes",
        type: "textarea",
        value: cur.notes,
        maxlength: 300,
      }),
      fileUrl: A.field({
        id: "qf",
        label: "PDF path or link",
        value: cur.fileUrl,
        maxlength: 200,
        hint: "For example assets/files/csc101-2025.pdf. Leave blank if there is no document yet.",
      }),
      published: A.field({
        id: "qu",
        label: "Published (visible to visitors)",
        type: "checkbox",
        value: cur.published,
      }),
      featured: A.field({
        id: "qfe",
        label: "Featured",
        type: "checkbox",
        value: cur.featured,
      }),
    };
    function levels() {
      var keep = f.level.input.value,
        L = o.levels[f.programme.input.value] || [],
        sel = f.level.input;
      A.clear(sel);
      sel.appendChild(
        h("option", {
          value: "",
          text: f.programme.input.value
            ? "Select level"
            : "Choose a programme first",
        }),
      );
      L.forEach(function (l) {
        sel.appendChild(h("option", { value: l, text: l }));
      });
      sel.value = L.indexOf(keep) !== -1 ? keep : "";
    }
    f.level.input.value = cur.level;
    f.programme.input.addEventListener("change", levels);
    levels();
    f.level.input.value =
      (o.levels[cur.programme] || []).indexOf(cur.level) !== -1
        ? cur.level
        : "";
    var fm = h("form", { class: "formgrid", novalidate: "" });
    [
      "departmentId",
      "programme",
      "level",
      "semester",
      "courseCode",
      "courseTitle",
      "examYear",
      "notes",
      "fileUrl",
    ].forEach(function (k) {
      fm.appendChild(f[k].wrap);
    });
    fm.appendChild(
      A.filePicker({ id: "qfile", label: "Preview a PDF file", kind: "pdf" }),
    );
    fm.appendChild(f.published.wrap);
    fm.appendChild(f.featured.wrap);
    var cancel = h("button", {
      type: "button",
      class: "btn alt",
      text: "Cancel",
    });
    cancel.onclick = function () {
      A.editing = false;
      list(root);
    };
    fm.appendChild(
      h("div", { style: "display:flex;gap:.5rem;flex-wrap:wrap" }, [
        h("button", {
          type: "submit",
          class: "btn",
          text: ex ? "Save changes" : "Add question",
        }),
        cancel,
      ]),
    );

    fm.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = {};
      Object.keys(f).forEach(function (k) {
        v[k] = f[k].get();
      });
      var er = {},
        depIds = OGA.get().departments.map(function (x) {
          return x.id;
        });
      er.departmentId = V.choice(v.departmentId, depIds, "department");
      er.programme = V.choice(v.programme, o.programmes, "programme");
      er.level = v.programme
        ? V.choice(v.level, o.levels[v.programme] || [], "level")
        : "Choose a programme first.";
      er.semester = V.choice(v.semester, o.semesters, "semester");
      er.courseCode = V.code(v.courseCode);
      er.courseTitle = V.text(v.courseTitle, {
        label: "Course title",
        required: true,
        min: 3,
        max: 120,
      });
      er.examYear = !v.examYear
        ? "Examination year is required."
        : V.year(v.examYear, o.yearMin, year);
      er.notes = V.text(v.notes, { label: "Notes", max: 300 });
      if (
        v.fileUrl &&
        (A.safeHref(v.fileUrl) === "#" || !/\.pdf(\?.*)?$/i.test(v.fileUrl))
      )
        er.fileUrl =
          "Enter a path or https link that ends in .pdf, or leave it blank.";
      if (!er.courseCode && !er.examYear && !er.departmentId) {
        var key = [
          v.departmentId,
          v.programme,
          v.level,
          v.semester,
          norm(v.courseCode),
          v.examYear,
        ].join("|");
        if (
          OGA.getQuestions(true).some(function (x) {
            return (
              x.id !== (ex && ex.id) &&
              [
                x.departmentId,
                x.programme,
                x.level,
                x.semester,
                norm(x.courseCode),
                String(x.examYear),
              ].join("|") === key
            );
          })
        )
          er.courseCode =
            "This question already exists for the same department, level, semester and year.";
      }
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(f, er)) {
        A.notify(
          "Question was not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      var now = new Date().toISOString(),
        savedId = ex ? ex.id : null;
      var ok = A.commit(
        function (n) {
          if (ex) {
            var t = n.questions.filter(function (y) {
              return y.id === ex.id;
            })[0];
            if (!t) return "That question no longer exists. Nothing was saved.";
            Object.assign(t, {
              departmentId: v.departmentId,
              programme: v.programme,
              level: v.level,
              semester: v.semester,
              courseCode: v.courseCode,
              courseTitle: v.courseTitle,
              examYear: +v.examYear,
              notes: v.notes,
              fileUrl: v.fileUrl,
              published: v.published,
              featured: v.featured,
              updatedAt: now,
            });
          } else {
            savedId = nextId(n.questions);
            n.questions.push({
              id: savedId,
              departmentId: v.departmentId,
              programme: v.programme,
              level: v.level,
              semester: v.semester,
              courseCode: v.courseCode,
              courseTitle: v.courseTitle,
              examYear: +v.examYear,
              notes: v.notes,
              fileUrl: v.fileUrl,
              featured: v.featured,
              published: v.published,
              demoViews: 0,
              createdAt: now,
              updatedAt: now,
            });
          }
        },
        (ex ? "Edited question " : "Added question ") + v.courseCode,
      );
      if (ok) {
        A.notify((ex ? "Saved " : "Added ") + v.courseCode + ".");
        list(root);
      }
    });
    root.appendChild(fm);
    f.departmentId.input.focus();
  }
})();
