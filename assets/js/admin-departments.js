/* Departments (Main Admin only). Questions are never left without a department. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = OGAValidate;

  A.register(
    "departments",
    "Departments",
    function (root) {
      list(root);
    },
    { icon: "fa-building", roles: ["main"], group: "admin" },
  );

  function counts() {
    var c = {};
    OGA.getQuestions(true).forEach(function (q) {
      c[q.departmentId] = (c[q.departmentId] || 0) + 1;
    });
    return c;
  }

  function list(root) {
    A.clear(root);
    root.appendChild(
      A.title(
        "Departments",
        "Hidden departments are removed from public filters and tiles. The order here is the order students see.",
        [
          A.btn("Add department", "fa-plus", "primary", function () {
            form(root, null);
          }),
        ],
      ),
    );
    var deps = OGA.getDepartments(true),
      c = counts();
    if (!deps.length) {
      root.appendChild(
        A.empty(
          "fa-building",
          "No departments yet",
          "Add a department to start organising questions.",
          A.btn("Add department", "fa-plus", "primary", function () {
            form(root, null);
          }),
        ),
      );
      return;
    }
    var box = h("div", { class: "qlist" });
    deps.forEach(function (d, i) {
      function move(dir) {
        if (
          A.commit(function (n) {
            var arr = n.departments.slice().sort(function (a, b) {
                return a.order - b.order;
              }),
              j = i + dir;
            if (j < 0 || j >= arr.length) return "Cannot move further.";
            var t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
            arr.forEach(function (x, k) {
              x.order = k + 1;
            });
            n.departments = arr;
          })
        )
          list(root);
      }
      var up = A.btn(
          "",
          "fa-arrow-up",
          "subtle",
          function () {
            move(-1);
          },
          "Move " + d.name + " up",
        ),
        down = A.btn(
          "",
          "fa-arrow-down",
          "subtle",
          function () {
            move(1);
          },
          "Move " + d.name + " down",
        );
      up.disabled = i === 0;
      down.disabled = i === deps.length - 1;
      box.appendChild(
        h("article", { class: "q-item" }, [
          h("div", { class: "q-main" }, [
            h("strong", { text: d.name }),
            h("span", {
              class: "muted",
              text: d.description || "No description",
            }),
            h("span", {
              class: "muted",
              text:
                "Programmes: " +
                (d.programmes.join(", ") || "none") +
                " · " +
                (c[d.id] || 0) +
                (c[d.id] === 1 ? " question" : " questions"),
            }),
          ]),
          h("div", { class: "q-tags" }, [
            A.pill(d.visible ? "Shown" : "Hidden", d.visible ? "ok" : ""),
          ]),
          h("div", { class: "q-actions" }, [
            up,
            down,
            A.btn(
              "",
              d.visible ? "fa-eye-slash" : "fa-eye",
              "subtle",
              function () {
                if (
                  A.commit(function (n) {
                    var t = n.departments.filter(function (x) {
                      return x.id === d.id;
                    })[0];
                    if (!t) return "Department not found.";
                    t.visible = !t.visible;
                  })
                ) {
                  A.notify((d.visible ? "Hidden: " : "Shown: ") + d.name + ".");
                  list(root);
                }
              },
              (d.visible ? "Hide " : "Show ") + d.name,
            ),
            A.btn(
              "",
              "fa-pen-to-square",
              "subtle",
              function () {
                form(root, d.id);
              },
              "Edit " + d.name,
            ),
            A.btn(
              "",
              "fa-trash",
              "subtle danger-text",
              function () {
                del(root, d);
              },
              "Delete " + d.name,
            ),
          ]),
        ]),
      );
    });
    root.appendChild(box);
  }

  function del(root, d) {
    var n = counts()[d.id] || 0,
      others = OGA.getDepartments(true).filter(function (x) {
        return x.id !== d.id;
      });
    function remove(moveTo) {
      if (
        A.commit(function (s) {
          if (moveTo) {
            if (
              !s.departments.some(function (x) {
                return x.id === moveTo;
              })
            )
              return "The chosen department no longer exists.";
            s.questions.forEach(function (q) {
              if (q.departmentId === d.id) {
                q.departmentId = moveTo;
                q.updatedAt = new Date().toISOString();
              }
            });
          }
          s.departments = s.departments.filter(function (x) {
            return x.id !== d.id;
          });
        })
      ) {
        A.notify(
          moveTo
            ? "Moved " + n + " question(s) and deleted " + d.name + "."
            : "Deleted " + d.name + ".",
        );
        list(root);
      }
    }
    if (!n)
      return A.confirm(
        "Delete " + d.name + "?",
        "No questions use this department.",
        "Delete department",
        function () {
          remove(null);
        },
      );
    if (!others.length)
      return A.error(
        "Cannot delete " + d.name,
        n +
          " question(s) use this department and there is no other department to move them to. Add another department first.",
      );
    var sel = h("select", {
      "aria-label": "Move questions to",
      class: "swal-select",
    });
    others.forEach(function (x) {
      sel.appendChild(h("option", { value: x.id, text: x.name }));
    });
    A.dialog(
      "Move questions before deleting",
      h("div", {}, [
        h("p", {
          text:
            d.name +
            " has " +
            n +
            " question(s). Choose a department to move them to, then it will be deleted.",
        }),
        sel,
      ]),
      {
        confirm: "Move " + n + " and delete",
        cancel: "Cancel",
        preConfirm: function () {
          return sel.value;
        },
      },
    ).then(function (r) {
      if (r.isConfirmed) remove(r.value);
    });
  }

  function form(root, id) {
    A.clear(root);
    var s = OGA.get(),
      ex = id ? OGA.getDepartment(id) : null;
    var cur = ex || {
      name: "",
      description: "",
      programmes: s.options.programmes.slice(),
      visible: true,
    };
    function leave() {
      list(root);
    }
    root.appendChild(
      A.title(ex ? "Edit department" : "Add department", null, [
        A.btn("Back to departments", "fa-arrow-left", "ghost", leave),
      ]),
    );
    var f = {
      name: A.field({
        id: "dn",
        label: "Department name",
        value: cur.name,
        maxlength: 80,
        required: true,
      }),
      description: A.field({
        id: "dd",
        label: "Description",
        type: "textarea",
        value: cur.description,
        maxlength: 200,
      }),
      visible: A.field({
        id: "dv",
        label: "Show on the public site",
        type: "checkbox",
        value: cur.visible,
      }),
    };
    var progs = {},
      pg = h("fieldset", { class: "fieldset" }, [
        h("legend", { text: "Programmes offered" }),
      ]),
      perr = h("p", { class: "err", role: "alert" });
    s.options.programmes.forEach(function (p) {
      progs[p] = A.field({
        id: "dp-" + p,
        label: p,
        type: "checkbox",
        value: cur.programmes.indexOf(p) !== -1,
      });
      pg.appendChild(progs[p].wrap);
    });
    pg.appendChild(perr);
    var save = h("button", { type: "submit", class: "btn primary" }, [
      h("i", { class: "fa-solid fa-floppy-disk", "aria-hidden": "true" }),
      ex ? "Save changes" : "Add department",
    ]);
    var fm = h("form", { class: "qform", novalidate: "" }, [
      A.card(null, [f.name.wrap, f.description.wrap, pg, f.visible.wrap]),
      h("div", { class: "form-actions" }, [
        save,
        A.btn("Cancel", "fa-xmark", "ghost", leave),
      ]),
    ]);
    fm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = f.name.get().replace(/\s+/g, " "),
        er = {},
        chosen = s.options.programmes.filter(function (p) {
          return progs[p].get();
        });
      er.name = V.text(name, {
        label: "Department name",
        required: true,
        min: 2,
        max: 80,
      });
      if (
        !er.name &&
        s.departments.some(function (x) {
          return (
            x.id !== (ex && ex.id) &&
            x.name.toLowerCase() === name.toLowerCase()
          );
        })
      )
        er.name = "A department with this name already exists.";
      er.description = V.text(f.description.get(), {
        label: "Description",
        max: 200,
      });
      perr.textContent = chosen.length ? "" : "Choose at least one programme.";
      if (ex) {
        var blocked = ex.programmes.filter(function (p) {
          return (
            chosen.indexOf(p) === -1 &&
            OGA.getQuestions(true).some(function (q) {
              return q.departmentId === ex.id && q.programme === p;
            })
          );
        });
        if (blocked.length)
          perr.textContent =
            "Questions exist for " +
            blocked.join(", ") +
            " in this department. Move or delete them before removing that programme.";
      }
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      var ok = A.applyErrors({ name: f.name, description: f.description }, er);
      if (!ok || perr.textContent) {
        if (ok) progs[s.options.programmes[0]].input.focus();
        A.notify("Not saved. Fix the highlighted fields.", "error");
        return;
      }
      A.busy(save, true, "Saving…");
      var done = A.commit(function (n) {
        if (ex) {
          var t = n.departments.filter(function (x) {
            return x.id === ex.id;
          })[0];
          if (!t) return "That department no longer exists.";
          Object.assign(t, {
            name: name,
            description: f.description.get(),
            programmes: chosen,
            visible: f.visible.get(),
          });
        } else {
          var base = A.slug(name),
            nid = base,
            k = 1;
          while (
            n.departments.some(function (x) {
              return x.id === nid;
            })
          ) {
            k++;
            nid = base + "-" + k;
          }
          n.departments.push({
            id: nid,
            name: name,
            description: f.description.get(),
            programmes: chosen,
            visible: f.visible.get(),
            order: n.departments.length + 1,
          });
        }
      });
      A.busy(save, false);
      if (done) {
        A.notify((ex ? "Saved " : "Added ") + name + ".");
        list(root);
      }
    });
    root.appendChild(fm);
    f.name.input.focus();
  }
})();
