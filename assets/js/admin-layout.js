/* Homepage sections (order, visibility, headings, item counts) and footer / menu / social links. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = window.OGAValidate;
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  function mv(arr, i, d) {
    arr.splice(i + d, 0, arr.splice(i, 1)[0]);
  }
  function small(label, aria, fn, dis, cls) {
    var b = h("button", {
      type: "button",
      class: "btn sm " + (cls || "alt"),
      text: label,
      "aria-label": aria,
    });
    if (dis) b.setAttribute("disabled", "");
    b.onclick = fn;
    return b;
  }
  function validUrl(u, httpsOnly) {
    try {
      var x = new URL(u);
      return httpsOnly ? x.protocol === "https:" : /^https?:$/.test(x.protocol);
    } catch (e) {
      return false;
    }
  }

  var NAMES = {
    departments: "Departments",
    recent: "Recently added",
    popular: "Frequently opened",
    how: "How it works",
    leadership: "Leadership",
    announcements: "Announcements",
    featured: "Featured questions",
  };

  /* ---------- Homepage sections ---------- */
  A.register("sections", "Homepage", function (root) {
    var draft = clone(OGA.get().sections),
      fields = [],
      list = h("div");
    root.appendChild(
      A.title(
        "Homepage sections",
        "Turn sections on or off, change their order, headings and how many items they show. Save to apply.",
      ),
    );
    function render() {
      A.clear(list);
      fields = [];
      draft.forEach(function (s, i) {
        var p = "sc" + i + "-",
          f = {
            enabled: A.field({
              id: p + "e",
              label: 'Show "' + (NAMES[s.id] || s.id) + '" on the homepage',
              type: "checkbox",
              value: s.enabled,
            }),
            heading: A.field({
              id: p + "h",
              label: "Heading",
              value: s.heading,
              maxlength: 60,
              required: true,
            }),
            description: A.field({
              id: p + "d",
              label: "Supporting text",
              value: s.description,
              maxlength: 120,
            }),
          };
        var hasLimit = ["how", "leadership"].indexOf(s.id) === -1;
        if (hasLimit)
          f.limit = A.field({
            id: p + "l",
            label: "Number of items (1 to 12)",
            type: "number",
            inputmode: "numeric",
            value: String(s.limit),
            required: true,
          });
        Object.keys(f).forEach(function (k) {
          f[k].input.addEventListener(
            k === "enabled" ? "change" : "input",
            function () {
              s[k] = k === "limit" ? f[k].get() : f[k].get();
              A.editing = true;
            },
          );
        });
        fields.push(f);
        var card = h(
          "section",
          { class: "slide-card", "aria-label": NAMES[s.id] || s.id },
          [h("h2", { text: i + 1 + ". " + (NAMES[s.id] || s.id) })],
        );
        Object.keys(f).forEach(function (k) {
          card.appendChild(f[k].wrap);
        });
        card.appendChild(
          h(
            "div",
            { class: "acts", style: "display:flex;gap:.5rem;flex-wrap:wrap" },
            [
              small(
                "Move up",
                "Move " + (NAMES[s.id] || s.id) + " up",
                function () {
                  mv(draft, i, -1);
                  A.editing = true;
                  render();
                },
                i === 0,
              ),
              small(
                "Move down",
                "Move " + (NAMES[s.id] || s.id) + " down",
                function () {
                  mv(draft, i, 1);
                  A.editing = true;
                  render();
                },
                i === draft.length - 1,
              ),
            ],
          ),
        );
        list.appendChild(card);
      });
    }
    render();
    root.appendChild(list);
    var row = h("p", { style: "display:flex;gap:.5rem;flex-wrap:wrap" });
    if (
      !draft.some(function (s) {
        return s.id === "featured";
      })
    ) {
      row.appendChild(
        small(
          'Add "Featured questions" section',
          "Add the featured questions section",
          function () {
            draft.push({
              id: "featured",
              enabled: true,
              heading: "Featured Questions",
              description: "Picked by the SUG",
              limit: 3,
            });
            A.editing = true;
            render();
          },
          false,
          "alt",
        ),
      );
    }
    var save = h("button", {
      type: "button",
      class: "btn",
      text: "Save homepage sections",
    });
    save.onclick = function () {
      var first = null;
      fields.forEach(function (f, i) {
        var s = draft[i],
          er = {};
        er.heading = V.text(s.heading, {
          label: "Heading",
          required: true,
          min: 2,
          max: 60,
        });
        er.description = V.text(s.description, {
          label: "Supporting text",
          max: 120,
        });
        if (f.limit)
          er.limit =
            /^\d{1,2}$/.test(String(s.limit)) && +s.limit >= 1 && +s.limit <= 12
              ? ""
              : "Enter a whole number from 1 to 12.";
        Object.keys(f).forEach(function (k) {
          var m = f[k].error(er[k]);
          if (m && !first) first = f[k];
        });
      });
      if (first) {
        first.input.focus();
        A.notify(
          "Sections were not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      var clean = draft.map(function (s) {
        return {
          id: s.id,
          enabled: !!s.enabled,
          heading: String(s.heading).trim(),
          description: String(s.description).trim(),
          limit: Math.max(1, Math.min(12, parseInt(s.limit, 10) || 3)),
        };
      });
      if (
        A.commit(function (n) {
          n.sections = clean;
        }, "Homepage sections updated")
      )
        A.notify("Homepage sections saved.");
    };
    row.appendChild(save);
    root.appendChild(row);
  });

  /* ---------- Footer, menu and social links ---------- */
  var PLATFORMS = [
    "Facebook",
    "X (Twitter)",
    "Instagram",
    "YouTube",
    "WhatsApp",
    "TikTok",
    "LinkedIn",
    "Other",
  ];

  A.register("footer", "Footer and menu", function (root) {
    var S = OGA.getSettings(),
      nav = clone(S.nav),
      social = clone(S.social || []),
      links = S.links || { school: "", sug: "" };
    root.appendChild(
      A.title(
        "Footer, menu and social links",
        "The menu links are used in the header and in the footer quick links. Footer description, copyright and contact details are in Settings.",
      ),
    );
    var navBox = h("div"),
      socBox = h("div"),
      nf = [],
      sf = [];
    var school = A.field({
      id: "lk-school",
      label: "School website link",
      type: "url",
      inputmode: "url",
      value: links.school,
      maxlength: 200,
      hint: "Add only a verified address.",
    });
    var sug = A.field({
      id: "lk-sug",
      label: "SUG website link",
      type: "url",
      inputmode: "url",
      value: links.sug,
      maxlength: 200,
      hint: "Leave blank if there is none.",
    });

    function renderNav() {
      A.clear(navBox);
      nf = [];
      nav.forEach(function (n, i) {
        var l = A.field({
            id: "nv" + i + "l",
            label: "Menu label",
            value: n.label,
            maxlength: 30,
            required: true,
          }),
          u = A.field({
            id: "nv" + i + "u",
            label: "Link",
            value: n.href,
            maxlength: 200,
            required: true,
            hint: "A page like browse.html or an https link.",
          });
        l.input.addEventListener("input", function () {
          n.label = l.get();
          A.editing = true;
        });
        u.input.addEventListener("input", function () {
          n.href = u.get();
          A.editing = true;
        });
        nf.push({ l: l, u: u });
        navBox.appendChild(
          h("div", { class: "slide-card" }, [
            h("h3", { text: "Menu item " + (i + 1) }),
            l.wrap,
            u.wrap,
            h("div", { style: "display:flex;gap:.5rem;flex-wrap:wrap" }, [
              small(
                "Move up",
                "Move menu item " + (i + 1) + " up",
                function () {
                  mv(nav, i, -1);
                  renderNav();
                },
                i === 0,
              ),
              small(
                "Move down",
                "Move menu item " + (i + 1) + " down",
                function () {
                  mv(nav, i, 1);
                  renderNav();
                },
                i === nav.length - 1,
              ),
              small(
                "Remove",
                "Remove menu item " + (i + 1),
                function () {
                  A.confirm(
                    "Remove this menu item?",
                    n.label,
                    "Remove item",
                    function () {
                      nav.splice(i, 1);
                      A.editing = true;
                      renderNav();
                    },
                  );
                },
                false,
                "danger",
              ),
            ]),
          ]),
        );
      });
    }
    function renderSocial() {
      A.clear(socBox);
      sf = [];
      if (!social.length)
        socBox.appendChild(
          h("p", {
            class: "muted",
            text: "No social links. Add only verified accounts.",
          }),
        );
      social.forEach(function (s, i) {
        var p = A.field({
          id: "sc" + i + "p",
          label: "Platform",
          type: "select",
          value: s.platform || "Other",
          options: PLATFORMS.map(function (x) {
            return [x, x];
          }),
          required: true,
        });
        var l = A.field({
          id: "sc" + i + "l",
          label: "Label shown in the footer",
          value: s.label,
          maxlength: 30,
          required: true,
        });
        var u = A.field({
          id: "sc" + i + "u",
          label: "Address (https only)",
          type: "url",
          inputmode: "url",
          value: s.url,
          maxlength: 200,
          required: true,
        });
        p.input.addEventListener("change", function () {
          s.platform = p.get();
          A.editing = true;
        });
        l.input.addEventListener("input", function () {
          s.label = l.get();
          A.editing = true;
        });
        u.input.addEventListener("input", function () {
          s.url = u.get();
          A.editing = true;
        });
        sf.push({ p: p, l: l, u: u });
        socBox.appendChild(
          h("div", { class: "slide-card" }, [
            h("h3", { text: "Social link " + (i + 1) }),
            p.wrap,
            l.wrap,
            u.wrap,
            h("div", { style: "display:flex;gap:.5rem;flex-wrap:wrap" }, [
              small(
                "Move up",
                "Move social link " + (i + 1) + " up",
                function () {
                  mv(social, i, -1);
                  renderSocial();
                },
                i === 0,
              ),
              small(
                "Move down",
                "Move social link " + (i + 1) + " down",
                function () {
                  mv(social, i, 1);
                  renderSocial();
                },
                i === social.length - 1,
              ),
              small(
                "Remove",
                "Remove social link " + (i + 1),
                function () {
                  A.confirm(
                    "Remove this social link?",
                    s.label,
                    "Remove link",
                    function () {
                      social.splice(i, 1);
                      A.editing = true;
                      renderSocial();
                    },
                  );
                },
                false,
                "danger",
              ),
            ]),
          ]),
        );
      });
    }
    root.appendChild(h("h2", { text: "Menu and quick links" }));
    root.appendChild(navBox);
    var addNav = small(
      "Add menu item",
      "Add menu item",
      function () {
        if (nav.length >= 8) {
          A.notify("A menu can have at most 8 items.", "error");
          return;
        }
        nav.push({ label: "New link", href: "index.html" });
        A.editing = true;
        renderNav();
      },
      false,
    );
    root.appendChild(h("p", {}, [addNav]));
    root.appendChild(h("h2", { text: "Official links" }));
    root.appendChild(school.wrap);
    root.appendChild(sug.wrap);
    root.appendChild(h("h2", { text: "Social media" }));
    root.appendChild(socBox);
    var addSoc = small(
      "Add social link",
      "Add social link",
      function () {
        if (social.length >= 8) {
          A.notify("You can add at most 8 social links.", "error");
          return;
        }
        social.push({ platform: "Facebook", label: "", url: "" });
        A.editing = true;
        renderSocial();
      },
      false,
    );
    root.appendChild(h("p", {}, [addSoc]));
    renderNav();
    renderSocial();

    var save = h("button", {
      type: "button",
      class: "btn",
      text: "Save footer and menu",
    });
    save.onclick = function () {
      var first = null,
        bad = false;
      function mark(f, m) {
        var r = f.error(m);
        if (r) {
          bad = true;
          if (!first) first = f;
        }
      }
      if (!nav.length) {
        A.notify("Keep at least one menu item.", "error");
        return;
      }
      nf.forEach(function (x, i) {
        mark(
          x.l,
          V.text(nav[i].label, {
            label: "Menu label",
            required: true,
            min: 1,
            max: 30,
          }),
        );
        mark(
          x.u,
          !nav[i].href || A.safeHref(nav[i].href) === "#"
            ? "Enter a page such as browse.html or an https link."
            : "",
        );
      });
      sf.forEach(function (x, i) {
        mark(x.p, V.choice(social[i].platform, PLATFORMS, "platform"));
        mark(
          x.l,
          V.text(social[i].label, {
            label: "Label",
            required: true,
            min: 1,
            max: 30,
          }),
        );
        mark(
          x.u,
          validUrl(social[i].url, true) ? "" : "Enter a full https:// address.",
        );
      });
      mark(
        school,
        school.get() && !validUrl(school.get(), false)
          ? "Enter a full http:// or https:// address, or leave it blank."
          : "",
      );
      mark(
        sug,
        sug.get() && !validUrl(sug.get(), false)
          ? "Enter a full http:// or https:// address, or leave it blank."
          : "",
      );
      if (bad) {
        first.input.focus();
        A.notify("Footer was not saved. Fix the highlighted fields.", "error");
        return;
      }
      var cn = nav.map(function (n) {
          return { label: n.label.trim(), href: n.href.trim() };
        }),
        cs = social.map(function (s) {
          return {
            platform: s.platform,
            label: s.label.trim(),
            url: s.url.trim(),
          };
        });
      if (
        A.commit(function (n) {
          n.settings.nav = cn;
          n.settings.social = cs;
          n.settings.links = { school: school.get(), sug: sug.get() };
        }, "Footer and menu updated")
      )
        A.notify("Footer and menu saved.");
    };
    root.appendChild(h("p", {}, [save]));
  });
})();
