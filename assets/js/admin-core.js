/* Admin framework: sign-in, role-aware navigation, routing and shared helpers.
   Every action goes through the PHP API. Hiding links here is only for convenience:
   the server enforces who may do what, so typing a restricted URL is refused with 403. */
(function () {
  var GREEN = "#0b5d34",
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
    order = [],
    routeTicket = 0;
  var A = {
    h: h,
    clear: clear,
    $: $,
    pending: null,
    me: null,
    structure: null,
    badges: { requests: 0 },
    GREEN: GREEN,
    GREY: GREY,
    RED: RED,
  };

  /* ---------- API access ---------- */
  A.api = function (method, path, o) {
    return OGA.api(method, path, o).then(null, function (err) {
      if (err.status === 401 && A.me) expired();
      throw err;
    });
  };
  A.fileUrl = function (id) {
    return OGA.API + "admin/questions/" + encodeURIComponent(id) + "/file";
  };
  A.loadStructure = function () {
    return A.api("GET", "admin/structure").then(function (s) {
      A.structure = s;
      return s;
    });
  };
  A.setStructure = function (s) {
    A.structure = s;
  };
  A.deptName = function (id) {
    var d = ((A.structure && A.structure.departments) || []).filter(
      function (x) {
        return x.id === id;
      },
    )[0];
    return d ? d.name : "Unknown department";
  };

  /* ---------- Session ---------- */
  A.user = function () {
    return A.me;
  };
  A.roleLabel = function (r) {
    return r === "main" ? "Main Admin" : "Question Manager";
  };
  A.can = function (id) {
    var v = views[id];
    return !!(A.me && v && v.roles.indexOf(A.me.role) !== -1);
  };
  function expired() {
    A.me = null;
    OGA.setCsrf(null);
    A.destroyCharts && A.destroyCharts();
    showLogin("Your session has ended. Please sign in again.");
  }
  A.logout = function () {
    OGA.api("POST", "auth/logout")
      .then(null, function () {})
      .then(function () {
        A.me = null;
        A.structure = null;
        OGA.setCsrf(null);
        history.replaceState(null, "", location.pathname + location.search);
        A.destroyCharts && A.destroyCharts();
        showLogin();
      });
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
    if (!A.me) return showLogin();
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
    A.destroyCharts && A.destroyCharts();
    buildNav();
    var mine = ++routeTicket,
      view = $("view"),
      root = h("div");
    clear(view);
    view.appendChild(
      h("p", { class: "loading", role: "status" }, [A.spinner(), " Loading…"]),
    );
    $("page-title").textContent = views[id].label;
    document.title = views[id].label + " | OGITECH Past Questions Bank Admin";
    function show(node) {
      if (mine !== routeTicket) return;
      clear(view);
      view.appendChild(node);
      view.focus();
      window.scrollTo(0, 0);
    }
    Promise.resolve()
      .then(function () {
        return views[id].render(root);
      })
      .then(
        function () {
          show(root);
          buildNav();
        },
        function (err) {
          if (err && err.status === 401) return;
          if (window.console) console.error(err);
          var retry = A.btn(
            "Try again",
            "fa-rotate-right",
            "ghost",
            function () {
              A.route();
            },
          );
          show(
            A.empty(
              "fa-triangle-exclamation",
              "This section could not be loaded",
              (err && err.message) || "Something went wrong.",
              retry,
            ),
          );
        },
      );
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

  /* Show a failed API call. Field errors from the server are placed under the matching inputs. */
  A.handleError = function (err, fields, map) {
    if (err && err.status === 401) return;
    if (err && err.status === 422 && err.fields && fields) {
      var errs = {};
      Object.keys(err.fields).forEach(function (k) {
        errs[(map && map[k]) || k] = err.fields[k];
      });
      var known = {};
      Object.keys(errs).forEach(function (k) {
        if (fields[k]) known[k] = errs[k];
      });
      if (Object.keys(known).length) {
        A.applyErrors(fields, known);
        A.notify("Not saved. Fix the highlighted fields.", "error");
        return;
      }
    }
    A.error(
      err && err.status === 0 ? "Connection problem" : "That did not work",
      (err && err.message) || "Something went wrong.",
    );
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
        btn._kids = null;
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

  /* Upload / conversion progress bar, driven by real upload events and the server's response. */
  A.progress = function () {
    var bar = h("div", { class: "bar-fill" }),
      label = h("span", { class: "muted", role: "status" }),
      track = h(
        "div",
        {
          class: "bar",
          role: "progressbar",
          "aria-valuemin": "0",
          "aria-valuemax": "100",
        },
        [bar],
      ),
      el = h("div", { class: "progress", hidden: "" }, [track, label]);
    return {
      el: el,
      set: function (pct, text) {
        el.hidden = false;
        bar.style.width = (pct == null ? 100 : pct) + "%";
        track.classList.toggle("indeterminate", pct == null);
        if (pct != null) track.setAttribute("aria-valuenow", String(pct));
        else track.removeAttribute("aria-valuenow");
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
        input.appendChild(h("option", { value: String(op[0]), text: op[1] }));
      });
      input.value = o.value == null ? "" : String(o.value);
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
  function showLogin(message) {
    $("boot").hidden = true;
    $("app").hidden = true;
    $("login").hidden = false;
    $("lg-err").textContent = message || "";
    document.title = "Sign in | OGITECH Past Questions Bank Admin";
    $("lg-user").focus();
  }
  function showApp() {
    var u = A.me;
    $("boot").hidden = true;
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

  /* Session established (login or page reload): load shared lists, then open the app. */
  function begin(data) {
    OGA.setCsrf(data.csrfToken);
    A.me = data.user;
    A.badges.requests = data.newRequests || 0;
    return A.loadStructure().then(function () {
      if (!location.hash || !views[location.hash.slice(1)])
        history.replaceState(
          null,
          "",
          location.pathname + location.search + "#dashboard",
        );
      showApp();
      A.route();
    });
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
      OGA.api("POST", "auth/login", {
        json: { username: u.value.trim(), password: p.value },
      })
        .then(function (data) {
          u.value = "";
          p.value = "";
          history.replaceState(
            null,
            "",
            location.pathname + location.search + "#dashboard",
          );
          return begin(data);
        })
        .then(null, function (e2) {
          err.textContent =
            e2.status === 401 ? "Incorrect username or password." : e2.message;
          if (e2.status === 401 || e2.status === 429) {
            p.value = "";
            p.focus();
          }
        })
        .then(function () {
          A.busy(btn, false);
        });
    });
    window.addEventListener("hashchange", A.route);
    OGA.api("GET", "auth/me").then(
      function (d) {
        if (!d.user) return showLogin();
        return begin(d).then(null, function (e) {
          showLogin(e.message);
        });
      },
      function (e) {
        showLogin(e.message);
      },
    );
  }

  window.OGAAdmin = A;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
