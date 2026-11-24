/* Admin accounts (Main Admin only). PROTOTYPE: passwords are kept in plain text in browser storage.
   The backend stores password_hash() values and enforces roles on the server. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = OGAValidate;

  A.register(
    "accounts",
    "Admin Accounts",
    function (root) {
      list(root);
    },
    { icon: "fa-users-gear", roles: ["main"], group: "admin" },
  );

  function activeMains(users) {
    return users.filter(function (u) {
      return u.role === "main" && u.active;
    }).length;
  }

  function list(root) {
    A.clear(root);
    var me = A.user();
    root.appendChild(
      A.title("Admin accounts", "People who can sign in to this admin area.", [
        A.btn("Add account", "fa-user-plus", "primary", function () {
          form(root, null);
        }),
      ]),
    );
    var box = h("div", { class: "qlist" });
    OGA.get().adminUsers.forEach(function (u) {
      var self = u.id === me.id;
      var del = A.btn(
        "",
        "fa-trash",
        "subtle danger-text",
        function () {
          remove(root, u);
        },
        "Delete " + u.name,
      );
      if (self) {
        del.disabled = true;
        del.setAttribute("title", "You cannot delete your own account.");
      }
      box.appendChild(
        h("article", { class: "q-item" }, [
          h("div", { class: "q-main" }, [
            h("strong", { text: u.name + (self ? " (you)" : "") }),
            h("span", {
              class: "muted",
              text: "@" + u.username + " · added " + A.fmtDate(u.createdAt),
            }),
          ]),
          h("div", { class: "q-tags" }, [
            A.pill(A.roleLabel(u.role), u.role === "main" ? "gold" : ""),
            A.pill(u.active ? "Active" : "Disabled", u.active ? "ok" : "warn"),
          ]),
          h("div", { class: "q-actions" }, [
            A.btn(
              "",
              "fa-pen-to-square",
              "subtle",
              function () {
                form(root, u.id);
              },
              "Edit " + u.name,
            ),
            del,
          ]),
        ]),
      );
    });
    root.appendChild(box);
    root.appendChild(
      A.card("What each role can do", [
        A.dl([
          [
            "Main Admin",
            "Everything: dashboard, past questions, requests, departments, academic structure and admin accounts.",
          ],
          [
            "Question Manager",
            "Dashboard, past questions (upload, edit, publish, unpublish, delete) and student requests only.",
          ],
        ]),
      ]),
    );
  }

  function remove(root, u) {
    A.confirm(
      "Delete " + u.name + "?",
      "They will no longer be able to sign in.",
      "Delete account",
      function () {
        if (
          A.commit(function (n) {
            var rest = n.adminUsers.filter(function (x) {
              return x.id !== u.id;
            });
            if (!activeMains(rest))
              return "At least one active Main Admin must remain.";
            n.adminUsers = rest;
          })
        ) {
          A.notify("Deleted " + u.name + ".");
          list(root);
        }
      },
    );
  }

  function form(root, id) {
    A.clear(root);
    var me = A.user(),
      all = OGA.get().adminUsers,
      ex = id
        ? all.filter(function (u) {
            return u.id === id;
          })[0]
        : null;
    if (id && !ex) {
      A.notify("That account no longer exists.", "error");
      return list(root);
    }
    var cur = ex || { name: "", username: "", role: "manager", active: true };
    function leave() {
      list(root);
    }
    root.appendChild(
      A.title(ex ? "Edit account" : "Add account", null, [
        A.btn("Back to accounts", "fa-arrow-left", "ghost", leave),
      ]),
    );
    var f = {
      name: A.field({
        id: "an",
        label: "Full name",
        value: cur.name,
        maxlength: 60,
        required: true,
        autocomplete: "off",
      }),
      username: A.field({
        id: "au",
        label: "Username",
        value: cur.username,
        maxlength: 30,
        required: true,
        hint: "3 to 30 characters: letters, numbers, dot, dash or underscore.",
        autocomplete: "off",
      }),
      role: A.field({
        id: "ar",
        label: "Role",
        type: "select",
        value: cur.role,
        required: true,
        options: [
          ["manager", "Question Manager"],
          ["main", "Main Admin"],
        ],
      }),
      password: A.field({
        id: "ap",
        label: ex ? "New password" : "Password",
        type: "password",
        maxlength: 60,
        required: !ex,
        hint: ex
          ? "Leave blank to keep the current password. Otherwise at least 8 characters."
          : "At least 8 characters.",
        autocomplete: "new-password",
      }),
      active: A.field({
        id: "aa",
        label: "Account is active (can sign in)",
        type: "checkbox",
        value: cur.active,
      }),
    };
    var save = h("button", { type: "submit", class: "btn primary" }, [
      h("i", { class: "fa-solid fa-floppy-disk", "aria-hidden": "true" }),
      ex ? "Save changes" : "Create account",
    ]);
    var fm = h("form", { class: "qform", novalidate: "" }, [
      A.card(null, [
        h("div", { class: "formgrid" }, [
          f.name.wrap,
          f.username.wrap,
          f.role.wrap,
          f.password.wrap,
        ]),
        f.active.wrap,
      ]),
      h("div", { class: "form-actions" }, [
        save,
        A.btn("Cancel", "fa-xmark", "ghost", leave),
      ]),
    ]);
    fm.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = {};
      Object.keys(f).forEach(function (k) {
        v[k] = f[k].get();
      });
      var er = {};
      er.name = V.text(v.name, {
        label: "Full name",
        required: true,
        min: 2,
        max: 60,
      });
      er.username = !/^[A-Za-z0-9._-]{3,30}$/.test(v.username)
        ? "Use 3 to 30 letters, numbers, dots, dashes or underscores."
        : all.some(function (u) {
              return (
                u.id !== (ex && ex.id) &&
                u.username.toLowerCase() === v.username.toLowerCase()
              );
            })
          ? "That username is already taken."
          : "";
      er.password =
        (!ex || v.password) && v.password.length < 8
          ? "Password must be at least 8 characters."
          : "";
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(f, er)) {
        A.notify("Not saved. Fix the highlighted fields.", "error");
        return;
      }
      A.busy(save, true, "Saving…");
      var ok = A.commit(function (n) {
        var t;
        if (ex) {
          t = n.adminUsers.filter(function (u) {
            return u.id === ex.id;
          })[0];
          if (!t) return "That account no longer exists.";
        } else {
          t = { id: A.uid("u"), createdAt: new Date().toISOString() };
          n.adminUsers.push(t);
        }
        Object.assign(t, {
          name: v.name,
          username: v.username,
          role: v.role,
          active: v.active,
        });
        if (v.password) t.password = v.password;
        if (!activeMains(n.adminUsers))
          return "At least one active Main Admin must remain.";
      });
      A.busy(save, false);
      if (ok) {
        A.notify((ex ? "Saved " : "Created ") + v.name + ".");
        if (ex && ex.id === me.id) return A.user() ? A.route() : A.logout();
        list(root);
      }
    });
    root.appendChild(fm);
    f.name.input.focus();
  }
})();
