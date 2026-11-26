/* Committee management (Main Admin). One "term" per administration; members belong to a term. */
(function () {
  "use strict";

  var A = OGAAdmin,
    h = A.h,
    viewTerm = null,
    MAX_MB = 8; /* keep in step with limits.image_mb in api/config.php */

  A.register(
    "committee",
    "Executives",
    function (root) {
      return list(root);
    },
    { icon: "fa-people-group", roles: ["main"], group: "admin" },
  );

  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) {
        return w.charAt(0).toUpperCase();
      })
      .join("");
  }
  function reload(root) {
    list(root).catch(A.handleError);
  }

  function list(root) {
    return A.api("GET", "admin/committee", {
      query: viewTerm ? { term: viewTerm } : null,
    }).then(function (res) {
      var terms = res.terms || [],
        term = res.term,
        items = res.data || [];
      viewTerm = term ? term.id : null;
      A.clear(root);

      root.appendChild(
        A.title(
          "Executives",
          "Add each year's executives. The public Executive page shows the term marked Current.",
          [
            term
              ? A.btn("Add member", "fa-plus", "primary", function () {
                  edit(root, term, null);
                })
              : null,
            A.btn(
              "New Administration",
              "fa-calendar-plus",
              term ? "ghost" : "primary",
              function () {
                newTerm(root);
              },
            ),
          ],
        ),
      );

      if (!term) {
        root.appendChild(
          A.empty(
            "fa-people-group",
            "No term yet",
            "Create the first term (for example 2026/2027), then add its executives.",
            A.btn(
              "Create first term",
              "fa-calendar-plus",
              "primary",
              function () {
                newTerm(root);
              },
            ),
          ),
        );
        return;
      }

      /* Term bar */
      var sel = h("select", { id: "cm-term", "aria-label": "Choose term" });
      terms.forEach(function (t) {
        sel.appendChild(
          h("option", {
            value: String(t.id),
            text: t.label + (t.current ? " (current)" : ""),
          }),
        );
      });
      sel.value = String(term.id);
      sel.addEventListener("change", function () {
        viewTerm = Number(sel.value);
        reload(root);
      });

      var tools = [
        A.btn("Rename", "fa-pen", "subtle", function () {
          A.prompt("Rename term", term.label, termCheck, function (label) {
            A.api("POST", "admin/committee/terms/" + term.id, {
              json: { label: label },
            }).then(function () {
              A.notify("Term renamed.");
              reload(root);
            }, A.handleError);
          });
        }),
      ];
      if (!term.current)
        tools.unshift(
          A.btn("Set as current", "fa-circle-check", "subtle", function () {
            A.confirm(
              "Show " + term.label + " on the public site?",
              "It becomes the Current Executives. Other terms stay available as past administrations.",
              "Set as current",
              function () {
                A.api(
                  "POST",
                  "admin/committee/terms/" + term.id + "/current",
                ).then(function () {
                  A.notify("Current term updated.");
                  reload(root);
                }, A.handleError);
              },
              false,
            );
          }),
        );
      tools.push(
        A.btn(
          "",
          "fa-trash",
          "subtle danger-text",
          function () {
            A.confirm(
              "Delete " + term.label + "?",
              "This deletes the term and its " +
                term.memberCount +
                " member(s), including their photographs. This cannot be undone.",
              "Delete term",
              function () {
                A.api("DELETE", "admin/committee/terms/" + term.id).then(
                  function () {
                    viewTerm = null;
                    A.notify("Term deleted.");
                    reload(root);
                  },
                  A.handleError,
                );
              },
            );
          },
          "Delete term " + term.label,
        ),
      );

      root.appendChild(
        h("div", { class: "cm-termbar card" }, [
          h("div", { class: "cm-termpick" }, [
            h("label", { for: "cm-term", text: "Term" }),
            sel,
            term.current
              ? A.pill("Shown on public site", "ok")
              : A.pill("Past term", "gold"),
          ]),
          h("div", { class: "q-actions" }, tools),
        ]),
      );

      if (!items.length) {
        root.appendChild(
          A.empty(
            "fa-user-plus",
            "No members in " + term.label,
            "Add the president, vice president and other executives.",
            A.btn("Add first member", "fa-plus", "primary", function () {
              edit(root, term, null);
            }),
          ),
        );
        return;
      }

      var box = h("div", { class: "cm-list" });
      items.forEach(function (m, i) {
        var thumb = m.imageUrl
          ? h("img", { class: "cm-thumb", src: m.imageUrl, alt: "" })
          : h("div", {
              class: "cm-thumb cm-initials",
              "aria-hidden": "true",
              text: initials(m.name),
            });
        var sub = [m.department, m.level].filter(Boolean).join(" · ");
        box.appendChild(
          h("article", { class: "cm-item" }, [
            thumb,
            h("div", { class: "cm-info" }, [
              h("strong", { text: m.name }),
              h("span", { text: m.office }),
              sub ? h("small", { class: "muted", text: sub }) : null,
              m.visible ? A.pill("Visible", "ok") : A.pill("Hidden", "warn"),
            ]),
            h("div", { class: "q-actions" }, [
              A.btn(
                "",
                "fa-arrow-up",
                "subtle",
                function () {
                  move(root, term, items, i, -1);
                },
                "Move " + m.name + " up",
              ),
              A.btn(
                "",
                "fa-arrow-down",
                "subtle",
                function () {
                  move(root, term, items, i, 1);
                },
                "Move " + m.name + " down",
              ),
              A.btn("Edit", "fa-pen-to-square", "subtle", function () {
                edit(root, term, m);
              }),
              A.btn(
                m.visible ? "Hide" : "Show",
                m.visible ? "fa-eye-slash" : "fa-eye",
                "subtle",
                function () {
                  toggle(root, m);
                },
              ),
              A.btn(
                "",
                "fa-trash",
                "subtle danger-text",
                function () {
                  remove(root, m);
                },
                "Delete " + m.name,
              ),
            ]),
          ]),
        );
        var btns = box.lastChild.querySelectorAll("button");
        if (i === 0) btns[0].disabled = true;
        if (i === items.length - 1) btns[1].disabled = true;
      });
      root.appendChild(box);
    });
  }

  function termCheck(v) {
    if (v.length < 3) return "Enter a name such as 2026/2027.";
    if (/[<>]/.test(v)) return "Remove < and > characters.";
    return "";
  }

  function newTerm(root) {
    A.prompt(
      "New Administration (e.g. 2026/2027)",
      "",
      termCheck,
      function (label) {
        A.api("POST", "admin/committee/terms", { json: { label: label } }).then(
          function (res) {
            var t = res.data;
            viewTerm = t.id;
            A.notify("Term created.");
            if (t.current) return reload(root);
            A.confirm(
              "Make " + t.label + " the Current Executives?",
              "Choose Cancel to keep showing the current executives while you add members.",
              "Make current",
              function () {
                A.api(
                  "POST",
                  "admin/committee/terms/" + t.id + "/current",
                ).then(function () {
                  reload(root);
                }, A.handleError);
              },
              false,
            );
            reload(root);
          },
          A.handleError,
        );
      },
    );
  }

  function move(root, term, items, i, d) {
    var ids = items.map(function (m) {
      return m.id;
    });
    var j = i + d;
    if (j < 0 || j >= ids.length) return;
    var t = ids[i];
    ids[i] = ids[j];
    ids[j] = t;
    A.api("POST", "admin/committee/members/reorder", {
      json: { termId: term.id, ids: ids },
    }).then(function () {
      reload(root);
    }, A.handleError);
  }

  function toggle(root, m) {
    var f = new FormData();
    f.append("name", m.name);
    f.append("office", m.office);
    f.append("department", m.department);
    f.append("level", m.level);
    f.append("visible", m.visible ? "0" : "1");
    A.api("POST", "admin/committee/members/" + m.id, { form: f }).then(
      function () {
        A.notify(m.visible ? "Member hidden." : "Member is now visible.");
        reload(root);
      },
      A.handleError,
    );
  }

  function remove(root, m) {
    A.confirm(
      "Delete " + m.name + "?",
      "The member and their photograph will be removed.",
      "Delete member",
      function () {
        A.api("DELETE", "admin/committee/members/" + m.id).then(function () {
          A.notify("Member deleted.");
          reload(root);
        }, A.handleError);
      },
    );
  }

  function datalist(id, values) {
    var dl = h("datalist", { id: id });
    values.forEach(function (v) {
      dl.appendChild(h("option", { value: v }));
    });
    return dl;
  }

  function structureLists() {
    var s = A.structure || {},
      depts = (s.departments || []).map(function (d) {
        return d.name;
      }),
      seen = {},
      levels = [];
    (s.programmes || []).forEach(function (p) {
      (p.levels || []).forEach(function (l) {
        if (!seen[l.name]) {
          seen[l.name] = 1;
          levels.push(l.name);
        }
      });
    });
    return { depts: depts, levels: levels };
  }

  function edit(root, term, item) {
    var cur = item || {
        name: "",
        office: "",
        department: "",
        level: "",
        visible: true,
      },
      lists = structureLists();
    A.clear(root);
    root.appendChild(
      A.title(item ? "Edit member" : "Add member", term.label, [
        A.btn("Back to Executives", "fa-arrow-left", "ghost", function () {
          reload(root);
        }),
      ]),
    );

    var f = {
      name: A.field({
        id: "cm-name",
        label: "Full name",
        value: cur.name,
        maxlength: 100,
        required: true,
      }),
      office: A.field({
        id: "cm-office",
        label: "Office held",
        value: cur.office,
        maxlength: 100,
        required: true,
        hint: "For example: President, General Secretary, Welfare Director.",
      }),
      department: A.field({
        id: "cm-dept",
        label: "Department",
        value: cur.department,
        maxlength: 100,
      }),
      level: A.field({
        id: "cm-level",
        label: "Level",
        value: cur.level,
        maxlength: 30,
      }),
      visible: A.field({
        id: "cm-visible",
        label: "Show on the public site",
        type: "checkbox",
        value: cur.visible !== false,
      }),
    };
    f.department.input.setAttribute("list", "cm-dept-list");
    f.level.input.setAttribute("list", "cm-level-list");
    f.department.wrap.appendChild(datalist("cm-dept-list", lists.depts));
    f.level.wrap.appendChild(datalist("cm-level-list", lists.levels));

    var file = h("input", {
      type: "file",
      id: "cm-photo",
      accept: "image/jpeg,image/png,image/webp",
    });
    var img = h("img", {
      class: "cm-preview",
      alt: "Photograph preview",
      hidden: !cur.imageUrl,
    });
    if (cur.imageUrl) img.src = cur.imageUrl;
    var ph = h(
      "div",
      {
        class: "cm-preview cm-initials",
        hidden: !!cur.imageUrl,
        "aria-hidden": "true",
      },
      [h("i", { class: "fa-solid fa-user" })],
    );
    var rm = A.field({
      id: "cm-remove",
      label: "Remove the current photograph",
      type: "checkbox",
      value: false,
    });
    file.addEventListener("change", function () {
      var x = file.files && file.files[0];
      if (!x) return;
      if (!/^image\/(jpeg|png|webp)$/.test(x.type)) {
        file.value = "";
        return A.notify("Choose a JPG, PNG or WebP image.", "error");
      }
      if (x.size > MAX_MB * 1048576) {
        file.value = "";
        return A.notify(
          "That image is larger than " + MAX_MB + " MB.",
          "error",
        );
      }
      var r = new FileReader();
      r.onload = function () {
        img.src = r.result;
        img.hidden = false;
        ph.hidden = true;
        rm.input.checked = false;
      };
      r.readAsDataURL(x);
    });

    var save = h("button", { type: "submit", class: "btn primary" }, [
      h("i", { class: "fa-solid fa-floppy-disk", "aria-hidden": "true" }),
      item ? "Save changes" : "Add member",
    ]);

    var form = h("form", { class: "qform", novalidate: "" }, [
      A.card("Details", [
        h("div", { class: "formgrid" }, [
          f.name.wrap,
          f.office.wrap,
          f.department.wrap,
          f.level.wrap,
        ]),
        f.visible.wrap,
      ]),
      A.card("Photograph", [
        h("div", { class: "cm-upload" }, [
          h("div", {}, [img, ph]),
          h("div", { class: "field" }, [
            h("label", { for: "cm-photo", text: "Photograph (optional)" }),
            file,
            h("p", {
              class: "hint",
              text:
                "A clear head-and-shoulders portrait works best (JPG, PNG or WebP, up to " +
                MAX_MB +
                " MB). Without a photo, the member's initials are shown.",
            }),
            item && cur.imageUrl ? rm.wrap : null,
          ]),
        ]),
      ]),
      h("div", { class: "form-actions" }, [
        save,
        A.btn("Cancel", "fa-xmark", "ghost", function () {
          reload(root);
        }),
      ]),
    ]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errs = {};
      if (f.name.get().length < 2) errs.name = "Enter the member's full name.";
      if (f.office.get().length < 2) errs.office = "Enter the office held.";
      ["name", "office", "department", "level"].forEach(function (k) {
        if (/[<>]/.test(f[k].get())) errs[k] = "Remove < and > characters.";
      });
      if (!A.applyErrors(f, errs))
        return A.notify("Please correct the highlighted fields.", "error");

      var d = new FormData();
      d.append("name", f.name.get());
      d.append("office", f.office.get());
      d.append("department", f.department.get());
      d.append("level", f.level.get());
      d.append("visible", f.visible.get() ? "1" : "0");
      if (!item) d.append("termId", String(term.id));
      if (rm.input.checked) d.append("removePhoto", "1");
      if (file.files && file.files[0]) d.append("image", file.files[0]);

      A.busy(save, true, "Saving…");
      A.api("POST", "admin/committee/members" + (item ? "/" + item.id : ""), {
        form: d,
      }).then(
        function () {
          A.notify(item ? "Member updated." : "Member added.");
          reload(root);
        },
        function (err) {
          A.busy(save, false);
          A.handleError(err, f);
        },
      );
    });
    root.appendChild(form);
  }
})();
