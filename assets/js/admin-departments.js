/* Department management with safe deletion (questions are never orphaned). */
(function () {
  var A = OGAAdmin,
    h = A.h;

  A.register("departments", "Departments", function (root) {
    list(root);
  });

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
        "Hidden departments are removed from public filters and tiles. Order here is the order visitors see.",
      ),
    );
    var add = h("button", {
      type: "button",
      class: "btn",
      text: "Add department",
    });
    add.onclick = function () {
      form(root, null);
    };
    root.appendChild(h("p", {}, [add]));
    var deps = OGA.getDepartments(true),
      c = counts();
    if (!deps.length)
      root.appendChild(
        h("p", {
          class: "empty",
          text: "No departments yet. Add one to start organising questions.",
        }),
      );
    deps.forEach(function (d, i) {
      function btn(label, cls, fn, dis) {
        var b = h("button", {
          type: "button",
          class: "btn sm " + cls,
          text: label,
          "aria-label": label + " " + d.name,
        });
        if (dis) b.setAttribute("disabled", "");
        b.onclick = fn;
        return b;
      }
      function move(dir) {
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
        }, "Reordered departments") && list(root);
      }
      var info = h("div", {}, [
        h("strong", { text: d.name }),
        h("div", { class: "muted", text: d.description || "No description" }),
        h("div", {}, [
          h("span", {
            class: "pill" + (d.visible ? " on" : ""),
            text: d.visible ? "Shown" : "Hidden",
          }),
          h("span", { class: "pill", text: d.programmes.join(" / ") }),
          h("span", { class: "pill", text: (c[d.id] || 0) + " questions" }),
        ]),
      ]);
      root.appendChild(
        h("div", { class: "arow" }, [
          info,
          h("div", { class: "acts" }, [
            btn(
              "Move up",
              "alt",
              function () {
                move(-1);
              },
              i === 0,
            ),
            btn(
              "Move down",
              "alt",
              function () {
                move(1);
              },
              i === deps.length - 1,
            ),
            btn(d.visible ? "Hide" : "Show", "alt", function () {
              if (
                A.commit(
                  function (n) {
                    var t = n.departments.filter(function (x) {
                      return x.id === d.id;
                    })[0];
                    if (!t) return "Department not found.";
                    t.visible = !t.visible;
                  },
                  (d.visible ? "Hid" : "Showed") + " department " + d.name,
                )
              ) {
                A.notify((d.visible ? "Hidden: " : "Shown: ") + d.name + ".");
                list(root);
              }
            }),
            btn("Edit", "alt", function () {
              form(root, d.id);
            }),
            btn("Delete", "danger", function () {
              del(root, d);
            }),
          ]),
        ]),
      );
    });
  }

  function del(root, d) {
    var n = counts()[d.id] || 0,
      others = OGA.getDepartments(true).filter(function (x) {
        return x.id !== d.id;
      });
    if (!n)
      return A.confirm(
        "Delete " + d.name + "?",
        "No questions use this department.",
        "Delete department",
        function () {
          if (
            A.commit(function (s) {
              s.departments = s.departments.filter(function (x) {
                return x.id !== d.id;
              });
            }, "Deleted department " + d.name)
          ) {
            A.notify("Deleted " + d.name + ".");
            list(root);
          }
        },
      );
    if (!others.length)
      return A.modal(
        "Cannot delete " + d.name,
        [
          h("p", {
            text:
              n +
              " question(s) use this department and there is no other department to move them to. Add another department first.",
          }),
        ],
        [{ label: "OK", onClick: function () {} }],
      );
    var sel = h("select", { id: "moveto", "aria-label": "Move questions to" });
    others.forEach(function (x) {
      sel.appendChild(h("option", { value: x.id, text: x.name }));
    });
    A.modal(
      "Move questions before deleting",
      [
        h("p", {
          text:
            d.name +
            " has " +
            n +
            " question(s). Deleting it would leave them without a department. Choose where to move them, or cancel.",
        }),
        sel,
      ],
      [
        { label: "Cancel", cls: "alt", onClick: function () {} },
        {
          label: "Move " + n + " and delete",
          cls: "danger",
          onClick: function () {
            var to = sel.value;
            if (
              A.commit(
                function (s) {
                  if (
                    !s.departments.some(function (x) {
                      return x.id === to;
                    })
                  )
                    return "The chosen department no longer exists.";
                  s.questions.forEach(function (q) {
                    if (q.departmentId === d.id) {
                      q.departmentId = to;
                      q.updatedAt = new Date().toISOString();
                    }
                  });
                  s.departments = s.departments.filter(function (x) {
                    return x.id !== d.id;
                  });
                },
                "Deleted department " + d.name + " and moved its questions",
              )
            ) {
              A.notify(
                "Moved " + n + " question(s) and deleted " + d.name + ".",
              );
              list(root);
            }
          },
        },
      ],
    );
  }

  function form(root, id) {
    A.clear(root);
    A.editing = true;
    var s = OGA.get(),
      ex = id ? OGA.getDepartment(id) : null,
      V = window.OGAValidate;
    var cur = ex || {
      name: "",
      description: "",
      programmes: s.options.programmes.slice(),
      visible: true,
    };
    root.appendChild(A.title(ex ? "Edit department" : "Add department"));
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
      pg = h("fieldset", {}, [h("legend", { text: "Programmes offered" })]),
      perr = h("p", { class: "err", id: "dp-err", role: "alert" });
    s.options.programmes.forEach(function (p) {
      var c = A.field({
        id: "dp-" + p,
        label: p,
        type: "checkbox",
        value: cur.programmes.indexOf(p) !== -1,
      });
      progs[p] = c;
      pg.appendChild(c.wrap);
    });
    pg.appendChild(perr);
    var fm = h("form", { class: "formgrid", novalidate: "" }, [
      f.name.wrap,
      f.description.wrap,
      pg,
      f.visible.wrap,
    ]);
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
          text: ex ? "Save changes" : "Add department",
        }),
        cancel,
      ]),
    );
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
        OGA.get().departments.some(function (x) {
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
      var okF = A.applyErrors({ name: f.name, description: f.description }, er);
      if (!okF || perr.textContent) {
        if (okF) progs[s.options.programmes[0]].input.focus();
        A.notify(
          "Department was not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      var ok = A.commit(
        function (n) {
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
        },
        (ex ? "Edited department " : "Added department ") + name,
      );
      if (ok) {
        A.notify((ex ? "Saved " : "Added ") + name + ".");
        list(root);
      }
    });
    root.appendChild(fm);
    f.name.input.focus();
  }
})();
