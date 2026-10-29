/* Admin framework: demo gate, routing, helpers, dashboard.
   PROTOTYPE ONLY: no real authentication. localStorage is not a security boundary. */
(function () {
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) {
      if (c)
        el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  function safeHref(u) {
    u = String(u || "").trim();
    return !/^\/\//.test(u) &&
      /^(https?:\/\/|mailto:|#|[\w./-]+(\?[^\s]*)?(#\S*)?$)/i.test(u)
      ? u
      : "#";
  }
  function $(id) {
    return document.getElementById(id);
  }

  var views = {},
    order = [],
    toastTimer = null;
  var A = { h: h, clear: clear, safeHref: safeHref, $: $, editing: false };

  A.register = function (id, label, render) {
    if (!views[id]) order.push({ id: id, label: label });
    views[id] = render;
    buildNav();
  };

  function buildNav() {
    var nav = $("anav");
    if (!nav) return;

    clear(nav);

    var current = A.current();

    var iconMap = {
      dashboard: "fa-gauge-high",
      questions: "fa-file-lines",
      departments: "fa-building",
      requests: "fa-inbox",
      "question-requests": "fa-inbox",
      hero: "fa-panorama",
      settings: "fa-sliders",
      leadership: "fa-users",
      announcements: "fa-bullhorn",
      layout: "fa-table-columns",
      data: "fa-database",
    };

    var groupMap = {
      dashboard: "Overview",
      questions: "Academic content",
      departments: "Academic content",
      requests: "Academic content",
      "question-requests": "Academic content",
      hero: "Website management",
      settings: "Website management",
      leadership: "Website management",
      announcements: "Website management",
      layout: "Website management",
      data: "System",
    };

    var groupOrder = [
      "Overview",
      "Academic content",
      "Website management",
      "System",
      "Other",
    ];

    var groups = {};

    order.forEach(function (view) {
      var groupName = groupMap[view.id] || "Other";

      if (!groups[groupName]) groups[groupName] = [];

      groups[groupName].push(view);
    });

    groupOrder.forEach(function (groupName) {
      var items = groups[groupName];

      if (!items || !items.length) return;

      var group = h("section", {
        class: "admin-nav-group",
        "aria-label": groupName,
      });

      group.appendChild(
        h("p", {
          class: "admin-nav-heading",
          text: groupName,
        }),
      );

      items.forEach(function (view) {
        var link = h("a", {
          href: "#" + view.id,
          "aria-label": view.label,
        });

        var icon = h("i", {
          class: "fa-solid " + (iconMap[view.id] || "fa-circle-dot"),
          "aria-hidden": "true",
        });

        var label = h("span", { text: view.label });

        link.appendChild(icon);
        link.appendChild(label);

        if (view.id === current) {
          link.setAttribute("aria-current", "page");
        }

        group.appendChild(link);
      });

      nav.appendChild(group);
    });
  }
  A.current = function () {
    var id = location.hash.slice(1);
    return views[id] ? id : "dashboard";
  };

  A.route = function () {
    var id = A.current();
    var view = $("view");

    A.editing = false;
    clear(view);
    buildNav();

    if (typeof views[id] === "function") {
      views[id](view);
    }

    var heading = view.querySelector("h1");
    var title = heading ? heading.textContent : "Dashboard";
    var pageTitle = $("admin-page-title");

    if (pageTitle) pageTitle.textContent = title;

    document.title = title + " | OGITECH Administration";

    view.focus();
    window.scrollTo(0, 0);
  };

  A.notify = function (msg, type) {
    if (window.Swal && typeof window.Swal.mixin === "function") {
      var toast = window.Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: type === "error" ? 6500 : 3200,
        timerProgressBar: true,
      });

      toast.fire({
        icon: type === "error" ? "error" : "success",
        title: String(msg || ""),
      });

      return;
    }

    var t = $("toast");
    if (!t) return;

    clear(t);
    t.appendChild(
      h("p", {
        class: type || "ok",
        role: type === "error" ? "alert" : "status",
        text: msg,
      }),
    );
  };

  /* Clone state, let fn change it, validate+persist. fn may return an error string to abort. */
  A.commit = function (fn, label) {
    var next = JSON.parse(JSON.stringify(OGA.get()));
    var err = fn(next);
    if (typeof err === "string") {
      A.notify(err, "error");
      return false;
    }
    next.activity = [{ at: new Date().toISOString(), label: label }]
      .concat(next.activity || [])
      .slice(0, 10);
    var r = OGA.save(next);
    if (!r.ok) {
      A.notify(r.error, "error");
      return false;
    }
    A.editing = false;
    return true;
  };

  A.fmt = function (iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString();
  };

  /* Labelled form control with its own error line. */
  A.field = function (o) {
    var id = o.id,
      err = h("p", { class: "err", id: id + "-err" }),
      hint = o.hint
        ? h("p", { class: "hint", id: id + "-hint", text: o.hint })
        : null;
    var input;
    if (o.type === "select") {
      input = h("select", { id: id });
      (o.options || []).forEach(function (op) {
        input.appendChild(h("option", { value: op[0], text: op[1] }));
      });
      input.value = o.value == null ? "" : o.value;
    } else if (o.type === "textarea") {
      input = h("textarea", { id: id });
      input.value = o.value || "";
    } else if (o.type === "checkbox") {
      input = h("input", { id: id, type: "checkbox" });
      input.checked = !!o.value;
    } else {
      input = h("input", { id: id, type: o.type || "text" });
      input.value = o.value || "";
      if (o.inputmode) input.setAttribute("inputmode", o.inputmode);
    }
    if (o.maxlength) input.setAttribute("maxlength", o.maxlength);
    if (o.required) input.setAttribute("aria-required", "true");
    input.setAttribute(
      "aria-describedby",
      (hint ? id + "-hint " : "") + id + "-err",
    );
    var wrap =
      o.type === "checkbox"
        ? h("div", { class: "field" }, [
            h("label", { class: "chk", for: id }, [
              input,
              h("span", { text: o.label }),
            ]),
            err,
          ])
        : h("div", { class: "field" }, [
            h("label", {
              for: id,
              text: o.label + (o.required ? "" : " (optional)"),
            }),
            input,
            hint,
            err,
          ]);
    return {
      wrap: wrap,
      input: input,
      get: function () {
        return o.type === "checkbox" ? input.checked : input.value.trim();
      },
      error: function (m) {
        err.textContent = m || "";
        if (m) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
        return m || "";
      },
    };
  };
  /* Apply {key: message} to fields {key: field}; focus the first failing one. Returns true if all valid. */
  A.applyErrors = function (fields, errors) {
    var first = null;
    Object.keys(fields).forEach(function (k) {
      var m = fields[k].error(errors[k]);
      if (m && !first) first = k;
    });
    if (first) fields[first].input.focus();
    return !first;
  };

  /* Accessible overlay dialog. actions: [{label, cls, onClick}] ; resolves via callbacks. */
  A.modal = function (title, body, actions) {
    var opener = document.activeElement,
      ov = h("div", { class: "overlay" });
    function close() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (opener && opener.focus) opener.focus();
    }
    var acts = h("div", { class: "acts" });
    actions.forEach(function (a) {
      var b = h("button", {
        type: "button",
        class: "btn " + (a.cls || ""),
        text: a.label,
      });
      b.addEventListener("click", function () {
        if (a.onClick() !== false) close();
      });
      acts.appendChild(b);
    });
    var dlg = h(
      "div",
      {
        class: "dlg",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "dlg-t",
      },
      [h("h2", { id: "dlg-t", text: title })].concat(body, [acts]),
    );
    ov.appendChild(dlg);
    ov.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    document.body.appendChild(ov);
    (acts.querySelector("button") || dlg).focus();
    return close;
  };

  A.confirm = function (title, text, label, onYes) {
    if (window.Swal && typeof window.Swal.fire === "function") {
      window.Swal.fire({
        title: title,
        text: text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: label || "Confirm",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        focusCancel: true,
      }).then(function (result) {
        if (result.isConfirmed && typeof onYes === "function") {
          onYes();
        }
      });

      return;
    }

    A.modal(
      title,
      [h("p", { text: text })],
      [
        {
          label: "Cancel",
          cls: "alt",
          onClick: function () {},
        },
        {
          label: label || "Confirm",
          cls: "danger",
          onClick: function () {
            onYes();
          },
        },
      ],
    );
  };

  /* File chooser that validates and previews, but never persists the file (see note). */
  A.filePicker = function (o) {
    var pdf = o.kind === "pdf";
    var rule = pdf
      ? {
          types: ["application/pdf"],
          max: 10 * 1048576,
          name: "PDF",
          mb: 10,
          dir: "assets/files/",
        }
      : {
          types: ["image/jpeg", "image/png", "image/webp"],
          max: 2 * 1048576,
          name: "JPG, PNG or WebP image",
          mb: 2,
          dir: "assets/images/",
        };
    var input = h("input", {
      type: "file",
      id: o.id,
      accept: rule.types.join(","),
      "aria-describedby": o.id + "-msg",
    });
    var msg = h("p", {
        class: "hint",
        id: o.id + "-msg",
        text: "Optional. Choosing a file only previews it; it is not saved.",
      }),
      prev = h("div"),
      url = null;
    input.addEventListener("change", function () {
      if (url) {
        URL.revokeObjectURL(url);
        url = null;
      }
      clear(prev);
      var f = input.files && input.files[0];
      if (!f) return;
      if (rule.types.indexOf(f.type) === -1) {
        msg.textContent = "Unsupported file type. Choose a " + rule.name + ".";
        input.value = "";
        return;
      }
      if (f.size > rule.max) {
        msg.textContent =
          "That file is too large. The limit is " + rule.mb + " MB.";
        input.value = "";
        return;
      }
      if (pdf) prev.appendChild(h("p", { text: "Selected: " + f.name }));
      else {
        url = URL.createObjectURL(f);
        prev.appendChild(
          h("img", {
            src: url,
            alt: "Preview of the selected image",
            style: "max-width:220px;margin-top:.5rem",
          }),
        );
      }
      msg.textContent =
        "Session preview only; it will be gone after a refresh. To keep it, copy the file into " +
        rule.dir +
        " and type its path in the field above.";
    });
    return h("div", { class: "field" }, [
      h("label", { for: o.id, text: o.label }),
      input,
      msg,
      prev,
    ]);
  };

  A.title = function (text, sub) {
    return h("div", {}, [
      h("h1", { text: text }),
      sub ? h("p", { class: "muted", text: sub }) : null,
    ]);
  };
  A.slug = function (s) {
    return (
      String(s)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30) || "item"
    );
  };

  /* ---------- Dashboard ---------- */
  A.register("dashboard", "Dashboard", function (root) {
    var s = OGA.get(),
      qs = s.questions;
    var pubQ = qs.filter(function (x) {
        return x.published;
      }).length,
      pubA = s.announcements.filter(function (x) {
        return x.published;
      }).length;
    var slides = s.hero.filter(function (x) {
      return x.enabled;
    }).length;
    function stat(n, label) {
      return h("div", { class: "stat" }, [
        h("b", { text: String(n) }),
        h("span", { class: "muted", text: label }),
      ]);
    }
    root.appendChild(
      A.title(
        "Dashboard",
        "All figures are calculated from the local demonstration data in this browser.",
      ),
    );
    var st = OGA.status();
    if (st.message)
      root.appendChild(
        h("p", { class: "notice", role: "alert", text: st.message }),
      );
    root.appendChild(
      h("div", { class: "stats" }, [
        stat(qs.length, "Questions"),
        stat(pubQ, "Published questions"),
        stat(s.departments.length, "Departments"),
        stat(s.announcements.length, "Announcements"),
        stat(
          pubQ + pubA + slides,
          "Published items (questions, announcements, slides)",
        ),
        stat(
          qs.filter(function (x) {
            return x.featured;
          }).length,
          "Featured questions",
        ),
      ]),
    );
    root.appendChild(h("h2", { text: "Shortcuts" }));
    var sc = h("p", {
      class: "acts",
      style: "display:flex;flex-wrap:wrap;gap:.5rem",
    });
    [
      ["#questions", "Manage questions"],
      ["#departments", "Manage departments"],
      ["#hero", "Edit homepage hero"],
      ["#settings", "Website settings"],
    ].forEach(function (l) {
      sc.appendChild(h("a", { class: "btn alt", href: l[0], text: l[1] }));
    });
    root.appendChild(sc);
    root.appendChild(h("h2", { text: "Recently edited" }));
    var act = s.activity || [],
      ul = h("ul");
    if (act.length)
      act.slice(0, 6).forEach(function (a) {
        ul.appendChild(h("li", { text: a.label + " (" + A.fmt(a.at) + ")" }));
      });
    else
      qs.slice()
        .sort(function (a, b) {
          return b.updatedAt.localeCompare(a.updatedAt);
        })
        .slice(0, 5)
        .forEach(function (x) {
          ul.appendChild(
            h("li", {
              text:
                x.courseCode +
                " " +
                x.courseTitle +
                " (sample, " +
                A.fmt(x.updatedAt) +
                ")",
            }),
          );
        });
    root.appendChild(ul);
  });

  function start() {
    var app = $("app");
    if (!app) return;

    app.hidden = false;

    function closeSidebar() {
      var sidebar = $("admin-sidebar");
      var toggle = $("admin-menu-toggle");
      var backdrop = $("admin-sidebar-backdrop");

      if (sidebar) sidebar.classList.remove("is-open");
      if (backdrop) backdrop.hidden = true;

      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation");
        toggle.innerHTML =
          '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
      }
    }

    function openSidebar() {
      var sidebar = $("admin-sidebar");
      var toggle = $("admin-menu-toggle");
      var backdrop = $("admin-sidebar-backdrop");

      if (!sidebar || !toggle || !backdrop) return;

      sidebar.classList.add("is-open");
      backdrop.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation");
      toggle.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    }

    var toggle = $("admin-menu-toggle");
    var backdrop = $("admin-sidebar-backdrop");

    if (toggle) {
      toggle.addEventListener("click", function () {
        var sidebar = $("admin-sidebar");

        if (sidebar && sidebar.classList.contains("is-open")) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", closeSidebar);
    }

    var nav = $("anav");

    if (nav) {
      nav.addEventListener("click", function (event) {
        var link = event.target.closest("a[href^='#']");

        if (link) closeSidebar();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeSidebar();
    });

    if (!location.hash || !views[location.hash.slice(1)]) {
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#dashboard",
      );
    }

    A.route();

    window.addEventListener("hashchange", function () {
      A.route();
      closeSidebar();
    });

    /*
     * Changes from another tab can refresh the view.
     * If a form is being edited, don't silently discard that work.
     */
    OGA.onChange(function () {
      if (A.editing) {
        A.notify(
          "Content changed in another tab. Save or reopen your current section to review the latest changes.",
          "error",
        );
        return;
      }

      A.route();
    });
  }
  window.OGAAdmin = A;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
