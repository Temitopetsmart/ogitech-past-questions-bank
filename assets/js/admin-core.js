/* Admin framework: prototype login, role guard, routing and shared helpers.
   PROTOTYPE ONLY: the login is a stand-in. The backend enforces real authentication
   and permissions on the server; hiding things here is not security. */
(function () {
  var SESSION_KEY = "pqb_admin_uid",
    GREEN = "#0b5d34",
    GREY = "#5a655f",
    RED = "#c8102e";

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
  function $(id) {
    return document.getElementById(id);
  }

  var views = {},
    order = [];
  var A = {
    h: h,
    clear: clear,
    $: $,
    pending: null,
    GREEN: GREEN,
    GREY: GREY,
    RED: RED,
  };

  /* ---------- Prototype authentication ---------- */
  A.user = function () {
    var id = null;
    try {
      id = sessionStorage.getItem(SESSION_KEY);
    } catch (e) {}
    if (!id) return null;
    return (
      OGA.get().adminUsers.filter(function (u) {
        return u.id === id && u.active;
      })[0] || null
    );
  };
  A.login = function (username, password) {
    var name = String(username || "")
      .trim()
      .toLowerCase();
    var u = OGA.get().adminUsers.filter(function (x) {
      return (
        x.active && x.username.toLowerCase() === name && x.password === password
      );
    })[0];
    if (!u) return null;
    try {
      sessionStorage.setItem(SESSION_KEY, u.id);
    } catch (e) {
      return null;
    }
    return u;
  };
  A.logout = function () {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    history.replaceState(null, "", location.pathname + location.search);
    A.destroyCharts && A.destroyCharts();
    showLogin();
  };
  A.roleLabel = function (r) {
    return r === "main" ? "Main Admin" : "Question Manager";
  };
  A.can = function (id) {
    var u = A.user(),
      v = views[id];
    return !!(u && v && v.roles.indexOf(u.role) !== -1);
  };

  /* ---------- Views and routing ---------- */
  A.register = function (id, label, render, o) {
    o = o || {};
    if (!views[id]) order.push(id);
    views[id] = {
      label: label,
      render: render,
      icon: o.icon || "fa-circle",
      roles: o.roles || ["main", "manager"],
      group: o.group || "work",
      badge: o.badge || null,
    };
  };
  A.current = function () {
    var id = location.hash.slice(1);
    return views[id] ? id : "dashboard";
  };
  A.go = function (id, pending) {
    A.pending = pending || null;
    if (location.hash === "#" + id) A.route();
    else location.hash = id;
  };

  function buildNav() {
    var nav = $("anav"),
      cur = A.current(),
      adminHead = false;
    clear(nav);
    order.forEach(function (id) {
      if (!A.can(id)) return;
      var v = views[id];
      if (v.group === "admin" && !adminHead) {
        nav.appendChild(
          h("p", { class: "nav-heading", text: "Administration" }),
        );
        adminHead = true;
      }
      var a = h("a", { href: "#" + id }, [
        h("i", { class: "fa-solid " + v.icon, "aria-hidden": "true" }),
        h("span", { text: v.label }),
      ]);
      var n = v.badge ? v.badge() : 0;
      if (n > 0)
        a.appendChild(
          h("span", {
            class: "nav-badge",
            text: String(n),
            "aria-label": n + " new",
          }),
        );
      if (id === cur) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
  }

  A.refreshNav = buildNav;

  A.route = function () {
    var user = A.user();
    if (!user) return showLogin();
    var id = A.current(),
      asked = location.hash.slice(1);
    if (views[asked] && !A.can(asked)) {
      A.notify("Your account does not have access to that section.", "error");
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#dashboard",
      );
      id = "dashboard";
    }
    closeDrawer();
    var view = $("view");
    A.destroyCharts && A.destroyCharts();
    clear(view);
    buildNav();
    try {
      views[id].render(view);
    } catch (err) {
      if (window.console) console.error(err);
      clear(view);
      view.appendChild(
        A.empty(
          "fa-triangle-exclamation",
          "Something went wrong",
          "This section could not be shown. Reload the page and try again.",
        ),
      );
    }
    $("page-title").textContent = views[id].label;
    document.title = views[id].label + " | OGITECH Past Questions Bank Admin";
    view.focus();
    window.scrollTo(0, 0);
  };

  /* ---------- Notifications (SweetAlert2) ---------- */
  A.notify = function (msg, type) {
    if (window.Swal && Swal.fire) {
      Swal.fire({
        toast: true,
        position: "top",
        showConfirmButton: false,
        timer: type === "error" ? 5500 : 3000,
        timerProgressBar: true,
        icon: type === "error" ? "error" : "success",
        title: String(msg || ""),
      });
      return;
    }
    var t = $("toast");
    clear(t);
    t.appendChild(
      h("p", {
        class: type === "error" ? "error" : "ok",
        text: String(msg || ""),
      }),
    );
  };
  A.error = function (title, text) {
    if (window.Swal && Swal.fire)
      return Swal.fire({
        icon: "error",
        title: title,
        text: text,
        confirmButtonColor: GREEN,
      });
    window.alert(title + "\n" + text);
  };
  A.confirm = function (title, text, label, onYes, warn) {
    if (!(window.Swal && Swal.fire)) {
      if (window.confirm(title + "\n" + text)) onYes();
      return;
    }
    Swal.fire({
      icon: "warning",
      title: title,
      text: text,
      showCancelButton: true,
      confirmButtonText: label || "Confirm",
      cancelButtonText: "Cancel",
      confirmButtonColor: warn === false ? GREEN : RED,
      cancelButtonColor: GREY,
      reverseButtons: true,
      focusCancel: true,
    }).then(function (r) {
      if (r.isConfirmed) onYes();
    });
  };
  /* Modal showing a DOM node (details, forms in a dialog). */
  A.dialog = function (title, node, o) {
    o = o || {};
    return Swal.fire({
      title: title,
      html: node,
      width: 560,
      confirmButtonColor: GREEN,
      cancelButtonColor: GREY,
      confirmButtonText: o.confirm || "Close",
      showCancelButton: !!o.cancel,
      cancelButtonText: o.cancel || "Cancel",
      reverseButtons: !!o.cancel,
      preConfirm: o.preConfirm,
      customClass: { popup: "pqb-dialog" },
    });
  };
  A.prompt = function (title, value, validator, onOk) {
    Swal.fire({
      title: title,
      input: "text",
      inputValue: value || "",
      inputAttributes: { maxlength: 30, autocapitalize: "off" },
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: GREEN,
      cancelButtonColor: GREY,
      reverseButtons: true,
      inputValidator: function (v) {
        return validator(String(v).trim()) || undefined;
      },
    }).then(function (r) {
      if (r.isConfirmed) onOk(String(r.value).trim());
    });
  };

  /* Clone state, let fn change it, validate and persist. fn may return an error string to abort. */
  A.commit = function (fn) {
    var next = JSON.parse(JSON.stringify(OGA.get()));
    var err = fn(next);
    if (typeof err === "string") {
      A.notify(err, "error");
      return false;
    }
    var r = OGA.save(next);
    if (!r.ok) {
      A.error("Not saved", r.error);
      return false;
    }
    return true;
  };

  /* ---------- Small UI helpers ---------- */
  A.fmtDate = function (iso) {
    var d = new Date(iso);
    return isNaN(d)
      ? ""
      : d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };
  A.uid = function (p) {
    return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
  A.deptName = function (id) {
    var d = OGA.getDepartment(id);
    return d ? d.name : "Unknown department";
  };
  A.spinner = function () {
    return h("span", { class: "spin", "aria-hidden": "true" });
  };
  A.btn = function (label, icon, cls, onClick, aria) {
    var b = h("button", { type: "button", class: "btn " + (cls || "") });
    if (icon)
      b.appendChild(
        h("i", { class: "fa-solid " + icon, "aria-hidden": "true" }),
      );
    if (label) b.appendChild(document.createTextNode(label));
    else {
      b.classList.add("icon-only");
      b.setAttribute("aria-label", aria || "");
      b.setAttribute("title", aria || "");
    }
    if (aria && label) b.setAttribute("aria-label", aria);
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };
  A.busy = function (btn, on, text) {
    if (on) {
      btn._kids = Array.prototype.slice.call(btn.childNodes);
      clear(btn);
      btn.appendChild(A.spinner());
      btn.appendChild(document.createTextNode(" " + (text || "Working…")));
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    } else {
      if (btn._kids) {
        clear(btn);
        btn._kids.forEach(function (k) {
          btn.appendChild(k);
        });
      }
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  };
  A.pill = function (text, kind) {
    return h("span", { class: "pill" + (kind ? " " + kind : ""), text: text });
  };
  A.empty = function (icon, title, text, action) {
    return h("div", { class: "empty-state" }, [
      h("span", { class: "empty-icon", "aria-hidden": "true" }, [
        h("i", { class: "fa-solid " + icon }),
      ]),
      h("h2", { text: title }),
      text ? h("p", { class: "muted", text: text }) : null,
      action || null,
    ]);
  };
  A.title = function (text, sub, actions) {
    return h("div", { class: "page-head" }, [
      h("div", {}, [
        h("h1", { text: text }),
        sub ? h("p", { class: "muted", text: sub }) : null,
      ]),
      actions && actions.length
        ? h("div", { class: "page-actions" }, actions)
        : null,
    ]);
  };
  A.card = function (title, kids, cls) {
    return h(
      "section",
      { class: "card " + (cls || "") },
      [title ? h("h2", { text: title }) : null].concat(kids || []),
    );
  };
  A.dl = function (rows) {
    var dl = h("dl", { class: "dl" });
    rows.forEach(function (r) {
      dl.appendChild(h("dt", { text: r[0] }));
      dl.appendChild(
        h("dd", { text: r[1] == null || r[1] === "" ? "—" : String(r[1]) }),
      );
    });
    return dl;
  };
  A.fileSize = function (n) {
    return n >= 1048576
      ? (n / 1048576).toFixed(1) + " MB"
      : Math.max(1, Math.round(n / 1024)) + " KB";
  };

  /* Upload / conversion progress bar. The backend will drive set() from upload events and conversion status. */
  A.progress = function () {
    var bar = h("div", { class: "bar-fill" }),
      label = h("span", { class: "muted", role: "status" }),
      el = h("div", { class: "progress", hidden: "" }, [
        h(
          "div",
          {
            class: "bar",
            role: "progressbar",
            "aria-valuemin": "0",
            "aria-valuemax": "100",
          },
          [bar],
        ),
        label,
      ]);
    return {
      el: el,
      set: function (pct, text) {
        el.hidden = false;
        bar.style.width = (pct == null ? 100 : pct) + "%";
        bar.parentNode.classList.toggle("indeterminate", pct == null);
        if (pct != null)
          bar.parentNode.setAttribute("aria-valuenow", String(pct));
        label.textContent = text || "";
      },
      hide: function () {
        el.hidden = true;
      },
    };
  };

  /* Labelled form control with its own error line. */
  A.field = function (o) {
    var id = o.id,
      err = h("p", { class: "err", id: id + "-err" }),
      hint = o.hint
        ? h("p", { class: "hint", id: id + "-hint", text: o.hint })
        : null,
      input;
    if (o.type === "select") {
      input = h("select", { id: id });
      (o.options || []).forEach(function (op) {
        input.appendChild(h("option", { value: op[0], text: op[1] }));
      });
      input.value = o.value == null ? "" : o.value;
    } else if (o.type === "textarea") {
      input = h("textarea", { id: id, rows: o.rows || 3 });
      input.value = o.value || "";
    } else if (o.type === "checkbox") {
      input = h("input", { id: id, type: "checkbox" });
      input.checked = !!o.value;
    } else {
      input = h("input", { id: id, type: o.type || "text" });
      input.value = o.value || "";
      if (o.inputmode) input.setAttribute("inputmode", o.inputmode);
      if (o.autocomplete) input.setAttribute("autocomplete", o.autocomplete);
    }
    if (o.maxlength) input.setAttribute("maxlength", o.maxlength);
    if (o.required) input.setAttribute("aria-required", "true");
    input.setAttribute(
      "aria-describedby",
      (hint ? id + "-hint " : "") + id + "-err",
    );
    var wrap =
      o.type === "checkbox"
        ? h("div", { class: "field check" }, [
            h("label", { class: "chk", for: id }, [
              input,
              h("span", { text: o.label }),
            ]),
            hint,
            err,
          ])
        : h("div", { class: "field" }, [
            h("label", {
              for: id,
              text: o.label + (o.required || o.noSuffix ? "" : " (optional)"),
            }),
            input,
            hint,
            err,
          ]);
    return {
      wrap: wrap,
      input: input,
      get: function () {
        return o.type === "checkbox"
          ? input.checked
          : o.type === "password"
            ? input.value
            : input.value.trim();
      },
      error: function (m) {
        err.textContent = m || "";
        if (m) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
        return m || "";
      },
    };
  };
  /* Apply {key: message} to fields {key: field}; focus the first failing one. True if all valid. */
  A.applyErrors = function (fields, errors) {
    var first = null;
    Object.keys(fields).forEach(function (k) {
      var m = fields[k].error(errors[k]);
      if (m && !first) first = k;
    });
    if (first) fields[first].input.focus();
    return !first;
  };

  /* ---------- Shell: login, drawer ---------- */
  function showLogin() {
    $("app").hidden = true;
    $("login").hidden = false;
    document.title = "Sign in | OGITECH Past Questions Bank Admin";
    $("lg-user").focus();
  }
  function showApp() {
    var u = A.user();
    $("login").hidden = true;
    $("app").hidden = false;
    $("user-name").textContent = u.name;
    $("user-role").textContent = A.roleLabel(u.role);
    $("user-initial").textContent = (u.name || "A").charAt(0).toUpperCase();
  }
  function setDrawer(open) {
    $("sidebar").classList.toggle("is-open", open);
    $("backdrop").hidden = !open;
    var b = $("menu-btn");
    b.setAttribute("aria-expanded", String(open));
    b.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    b.firstChild.className = "fa-solid " + (open ? "fa-xmark" : "fa-bars");
    document.body.classList.toggle("drawer-open", open);
  }
  function closeDrawer() {
    if ($("sidebar").classList.contains("is-open")) setDrawer(false);
  }

  function start() {
    $("menu-btn").addEventListener("click", function () {
      setDrawer(!$("sidebar").classList.contains("is-open"));
    });
    $("backdrop").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
    $("logout").addEventListener("click", A.logout);
    $("lg-toggle").addEventListener("click", function () {
      var p = $("lg-pass"),
        show = p.type === "password";
      p.type = show ? "text" : "password";
      this.setAttribute("aria-label", show ? "Hide password" : "Show password");
      this.firstChild.className =
        "fa-solid " + (show ? "fa-eye-slash" : "fa-eye");
    });
    $("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var u = $("lg-user"),
        p = $("lg-pass"),
        err = $("lg-err"),
        btn = $("lg-submit");
      if (!u.value.trim() || !p.value) {
        err.textContent = "Enter your username and password.";
        (u.value.trim() ? p : u).focus();
        return;
      }
      err.textContent = "";
      A.busy(btn, true, "Signing in…");
      setTimeout(function () {
        var user = A.login(u.value, p.value);
        A.busy(btn, false);
        if (!user) {
          err.textContent =
            "Incorrect username or password, or browser storage is blocked.";
          p.value = "";
          p.focus();
          return;
        }
        u.value = "";
        p.value = "";
        history.replaceState(
          null,
          "",
          location.pathname + location.search + "#dashboard",
        );
        showApp();
        A.route();
      }, 350);
    });
    window.addEventListener("hashchange", A.route);
    if (A.user()) {
      showApp();
      A.route();
    } else showLogin();
    var st = OGA.status();
    if (st.message) A.notify(st.message, "error");
  }

  window.OGAAdmin = A;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
