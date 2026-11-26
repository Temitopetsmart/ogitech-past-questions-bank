/* Admin accounts (Main Admin only). Passwords are hashed by the server and never sent back. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = OGAValidate,
    page = 1;

  A.register(
    "accounts",
    "Admin Accounts",
    function (root) {
      return list(root);
    },
    { icon: "fa-users-gear", roles: ["main"], group: "admin" },
  );

  function list(root) {
    return A.api("GET", "admin/users", { query: { page: page } }).then(function (res) {
      A.clear(root);
      var me = A.user();
      root.appendChild(
        A.title(
          "Admin accounts",
          "People who can sign in to this admin area.",
          [
            A.btn("Add account", "fa-user-plus", "primary", function () {
              form(root, null, res.data);
            }),
          ],
        ),
      );
      var box = h("div", { class: "qlist" });
      res.data.forEach(function (u) {
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
                text:
                  "@" +
                  u.username +
                  " · added " +
                  A.fmtDate(u.createdAt) +
                  (u.lastLoginAt
                    ? " · last sign-in " + A.fmtDate(u.lastLoginAt)
                    : ""),
              }),
            ]),
            h("div", { class: "q-tags" }, [
              A.pill(A.roleLabel(u.role), u.role === "main" ? "gold" : ""),
              A.pill(
                u.isActive ? "Active" : "Disabled",
                u.isActive ? "ok" : "warn",
              ),
            ]),
            h("div", { class: "q-actions" }, [
              A.btn(
                "",
                "fa-pen-to-square",
                "subtle",
                function () {
                  form(root, u, res.data);
                },
                "Edit " + u.name,
              ),
              del,
            ]),
          ]),
        );
      });
      root.appendChild(box);
      var pager = A.pagination(res.meta, function (nextPage) { page = nextPage; reload(root); });
      if (pager) root.appendChild(pager);
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
    });
  }

  function reload(root) {
    list(root).then(null, A.handleError);
  }

  function remove(root, u) {
    A.confirm(
      "Delete " + u.name + "?",
      "They will no longer be able to sign in.",
      "Delete account",
      function () {
        A.api("DELETE", "admin/users/" + u.id).then(function () {
          A.notify("Deleted " + u.name + ".");
          reload(root);
        }, A.handleError);
      },
    );
  }

  function form(root, ex) {
    A.clear(root);
    var me = A.user();
    var cur = ex || { name: "", username: "", role: "manager", isActive: true };
    function leave() {
      reload(root);
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
        maxlength: 72,
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
        value: cur.isActive,
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
      er.username = /^[A-Za-z0-9._-]{3,30}$/.test(v.username)
        ? ""
        : "Use 3 to 30 letters, numbers, dots, dashes or underscores.";
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
      A.api(ex ? "PUT" : "POST", "admin/users" + (ex ? "/" + ex.id : ""), {
        json: {
          name: v.name,
          username: v.username,
          role: v.role,
          active: v.active,
          password: v.password,
        },
      }).then(
        function () {
          A.busy(save, false);
          A.notify((ex ? "Saved " : "Created ") + v.name + ".");
          if (ex && ex.id === me.id) {
            /* Your own role or status may have changed: refresh who you are and what you can open. */
            return OGA.api("GET", "auth/me").then(function (d) {
              if (!d.user) return A.logout();
              A.me = d.user;
              document.getElementById("user-name").textContent = d.user.name;
              document.getElementById("user-role").textContent = A.roleLabel(
                d.user.role,
              );
              A.route();
            });
          }
          leave();
        },
        function (err) {
          A.busy(save, false);
          A.handleError(err, f);
        },
      );
    });
    root.appendChild(fm);
    f.name.input.focus();
  }
})();
