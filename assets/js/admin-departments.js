/* Departments (Main Admin only). Every change is saved through the API, which also enforces the rules
   (no orphaned questions, unique names, programmes with questions cannot be removed). */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = OGAValidate,
    departmentPage = 1;

  A.register(
    "departments",
    "Departments",
    function (root) {
      return A.loadStructure().then(function () {
        return list(root);
      });
    },
    { icon: "fa-building", roles: ["main"], group: "admin" },
  );

  function S() {
    return A.structure;
  }
  function progNames(d) {
    return S()
      .programmes.filter(function (p) {
        return d.programmeIds.indexOf(p.id) !== -1;
      })
      .map(function (p) {
        return p.name;
      });
  }
  function bodyOf(d, changes) {
    return Object.assign(
      {
        name: d.name,
        description: d.description,
        programmeIds: d.programmeIds,
        visible: d.visible,
      },
      changes,
    );
  }
  function saved(res, root, msg) {
    A.setStructure(res);
    if (msg) A.notify(msg);
    list(root).catch(A.handleError);
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
    var box = h("div", { class: "qlist" });
    root.appendChild(box);
    box.appendChild(h("p", { class: "loading" }, [A.spinner(), " Loading departments…"]));

    return A.api("GET", "admin/structure", {
      query: { list: "departments", page: departmentPage },
    }).then(function (res) {
      A.clear(box);
      departmentPage = res.meta.page;
      var deps = res.data || [];
      var allDeps = S().departments || [];
      if (!res.meta.total) {
        box.appendChild(
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
      deps.forEach(function (d) {
        var index = allDeps.findIndex(function (x) { return x.id === d.id; });
        function move(dir) {
          var j = index + dir;
          if (j < 0 || j >= allDeps.length) return;
          var ids = allDeps.map(function (x) { return x.id; });
          var temp = ids[index]; ids[index] = ids[j]; ids[j] = temp;
          A.api("POST", "admin/departments/reorder", { json: { ids: ids } }).then(
            function (res) {
              saved(res, root);
            },
            A.handleError,
          );
        }
        var up = A.btn("", "fa-arrow-up", "subtle", function () { move(-1); }, "Move " + d.name + " up");
        var down = A.btn("", "fa-arrow-down", "subtle", function () { move(1); }, "Move " + d.name + " down");
        up.disabled = index <= 0;
        down.disabled = index < 0 || index >= allDeps.length - 1;
        box.appendChild(
          h("article", { class: "q-item" }, [
            h("div", { class: "q-main" }, [
              h("strong", { text: d.name }),
              h("span", { class: "muted", text: d.description || "No description" }),
              h("span", { class: "muted", text: "Programmes: " + (progNames(d).join(", ") || "none") + " · " + d.questionCount + (d.questionCount === 1 ? " question" : " questions") }),
            ]),
            h("div", { class: "q-tags" }, [
              A.pill(d.visible ? "Shown" : "Hidden", d.visible ? "ok" : ""),
            ]),
            h("div", { class: "q-actions" }, [
              up, down,
              A.btn("", d.visible ? "fa-eye-slash" : "fa-eye", "subtle", function () {
                A.api("PUT", "admin/departments/" + d.id, {
                  json: bodyOf(d, { visible: !d.visible }),
                }).then(function (updated) {
                  saved(updated, root, (d.visible ? "Hidden: " : "Shown: ") + d.name + ".");
                }, A.handleError);
              }, (d.visible ? "Hide " : "Show ") + d.name),
              A.btn("", "fa-pen-to-square", "subtle", function () { form(root, d.id); }, "Edit " + d.name),
              A.btn("", "fa-trash", "subtle danger-text", function () { del(root, d); }, "Delete " + d.name),
            ]),
          ]),
        );
      });
      var pager = A.pagination(res.meta, function (nextPage) {
        departmentPage = nextPage;
        list(root).catch(A.handleError);
      });
      if (pager) root.appendChild(pager);
    });
  }

  function del(root, d) {
    var n = d.questionCount,
      others = S().departments.filter(function (x) {
        return x.id !== d.id;
      });
    function remove(moveTo) {
      A.api("DELETE", "admin/departments/" + d.id, {
        query: moveTo ? { moveTo: moveTo } : null,
      }).then(function (res) {
        saved(
          res,
          root,
          moveTo
            ? "Moved " + n + " question(s) and deleted " + d.name + "."
            : "Deleted " + d.name + ".",
        );
      }, A.handleError);
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
      sel.appendChild(h("option", { value: String(x.id), text: x.name }));
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
    var ex = id
      ? S().departments.filter(function (d) {
          return d.id === id;
        })[0]
      : null;
    var cur = ex || {
      name: "",
      description: "",
      programmeIds: S().programmes.map(function (p) {
        return p.id;
      }),
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
    S().programmes.forEach(function (p) {
      progs[p.id] = A.field({
        id: "dp-" + p.id,
        label: p.name,
        type: "checkbox",
        value: cur.programmeIds.indexOf(p.id) !== -1,
      });
      pg.appendChild(progs[p.id].wrap);
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
        chosen = S()
          .programmes.filter(function (p) {
            return progs[p.id].get();
          })
          .map(function (p) {
            return p.id;
          });
      er.name = V.text(name, {
        label: "Department name",
        required: true,
        min: 2,
        max: 80,
      });
      er.description = V.text(f.description.get(), {
        label: "Description",
        max: 200,
      });
      perr.textContent = chosen.length ? "" : "Choose at least one programme.";
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      var ok = A.applyErrors({ name: f.name, description: f.description }, er);
      if (!ok || perr.textContent) {
        A.notify("Not saved. Fix the highlighted fields.", "error");
        return;
      }
      A.busy(save, true, "Saving…");
      A.api(
        ex ? "PUT" : "POST",
        "admin/departments" + (ex ? "/" + ex.id : ""),
        {
          json: {
            name: name,
            description: f.description.get(),
            programmeIds: chosen,
            visible: f.visible.get(),
          },
        },
      ).then(
        function (res) {
          A.busy(save, false);
          saved(res, root, (ex ? "Saved " : "Added ") + name + ".");
        },
        function (err) {
          A.busy(save, false);
          if (err.fields && err.fields.programmeIds)
            perr.textContent = err.fields.programmeIds;
          A.handleError(err, { name: f.name, description: f.description });
        },
      );
    });
    root.appendChild(fm);
    f.name.input.focus();
  }
})();
