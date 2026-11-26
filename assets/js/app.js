/* Shared UI (header, footer, theme) + homepage renderer.
   All user/admin text is inserted with textContent, never innerHTML. */
(function () {
  var $ = function (id) {
    return document.getElementById(id);
  };

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

  /* Only allow relative paths, http(s) and mailto. Blocks javascript: and // URLs. */
  function safeHref(u) {
    u = String(u || "").trim();
    return !/^\/\//.test(u) &&
      /^(https?:\/\/|mailto:|#|[\w./-]+(\?[^\s]*)?(#\S*)?$)/i.test(u)
      ? u
      : "#";
  }

  function applyTheme(s) {
    var t = s.theme || {},
      r = document.documentElement.style;
    if (/^#[0-9a-f]{6}$/i.test(t.green)) r.setProperty("--green", t.green);
    if (/^#[0-9a-f]{6}$/i.test(t.accent)) r.setProperty("--red", t.accent);
    if (/^#[0-9a-f]{6}$/i.test(t.gold)) r.setProperty("--gold", t.gold);
    var FONTS = {
      Poppins: "Poppins",
      Montserrat: "Montserrat",
      "Source Sans 3": "Source+Sans+3",
    };
    if (FONTS[t.font]) {
      var l = document.getElementById("theme-font");
      if (!l) {
        l = document.createElement("link");
        l.id = "theme-font";
        l.rel = "stylesheet";
        document.head.appendChild(l);
      }
      l.href =
        "https://fonts.googleapis.com/css2?family=" +
        FONTS[t.font] +
        ":wght@400;500;600;700&display=swap";
      r.setProperty("--font", "'" + t.font + "',system-ui,sans-serif");
    } else r.removeProperty("--font");
    document.title =
      (document.body.dataset.title ? document.body.dataset.title + " | " : "") +
      s.siteName;
    var m = document.querySelector("meta[name=description]");
    if (m) m.setAttribute("content", s.metaDescription || "");
  }

  function logo(s) {
    var wrap = h("span", { "aria-hidden": "true" });
    wrap.style.display = "contents";
    var img = h("img", { src: s.logo, alt: "", width: "44", height: "44" });
    var mono = h("span", {
      class: "mono",
      text: (s.shortName || "OG").slice(0, 2),
    });
    img.onerror = function () {
      img.replaceWith(mono);
    };
    wrap.appendChild(img);
    return wrap;
  }

  function renderHeader(s) {
    var hd = $("header");
    clear(hd);
    var page = location.pathname.split("/").pop() || "index.html";
    var nav = h("nav", { class: "nav", id: "nav", "aria-label": "Main" });

    function addLink(parent, item, className) {
      var a = h("a", { href: safeHref(item.href), text: item.label });
      if (item.href === page) a.setAttribute("aria-current", "page");
      if (className) a.className = className;
      parent.appendChild(a);
      return a;
    }

    s.nav.forEach(function (item) {
      if (item.items && item.items.length) {
        var group = h("div", { class: "nav-group" });
        var toggle = h("button", {
          type: "button",
          class: "nav-group-toggle",
          "aria-expanded": "false",
        }, [
          item.label,
          h("i", { class: "fa-solid fa-chevron-down", "aria-hidden": "true" }),
        ]);
        var submenu = h("div", { class: "nav-submenu" });
        var active = false;

        item.items.forEach(function (child) {
          if (child.href === page) active = true;
          addLink(submenu, child);
        });
        if (active) {
          toggle.classList.add("has-current");
          toggle.setAttribute("aria-label", item.label + ", current page inside");
        }
        toggle.addEventListener("click", function () {
          var open = group.classList.toggle("open");
          toggle.setAttribute("aria-expanded", String(open));
        });
        group.appendChild(toggle);
        group.appendChild(submenu);
        nav.appendChild(group);
      } else {
        addLink(nav, item, item.href === "request-question.html" ? "nav-cta" : "");
      }
    });

    var btn = h("button", {
      class: "nav-toggle",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": "nav",
      "aria-label": "Open menu",
    });
    btn.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      btn.innerHTML = open
        ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target)) {
        nav.querySelectorAll(".nav-group.open").forEach(function (group) {
          group.classList.remove("open");
          var control = group.querySelector(".nav-group-toggle");
          if (control) control.setAttribute("aria-expanded", "false");
        });
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        nav.querySelectorAll(".nav-group.open").forEach(function (group) {
          group.classList.remove("open");
          var control = group.querySelector(".nav-group-toggle");
          if (control) control.setAttribute("aria-expanded", "false");
        });
      }
    });

    var brand = h("a", { class: "brand", href: "index.html" }, [
      logo(s),
      h("span", {}, [
        h("strong", { text: s.shortName }),
        h("span", { text: s.orgLine }),
        h("span", { text: s.siteName }),
      ]),
    ]);
    function hotBtn() {
      var b = h(
        "button",
        { type: "button", class: "hot-btn", "aria-label": "Hotlines" },
        [
          h("i", { class: "fa-solid fa-phone-volume", "aria-hidden": "true" }),
          h("span", { class: "hot-label", text: "Hotlines" }),
        ],
      );
      b.addEventListener("click", openHotlines);
      return b;
    }
    nav.appendChild(hotBtn());
    var bar = h("div", { class: "bar" }, [
      brand,
      h("div", { class: "bar-actions" }, [hotBtn(), btn]),
    ]);
    hd.appendChild(h("div", { class: "wrap" }, [bar, nav]));
  }
  function icon(cls) {
    return h("i", { class: "fa-solid " + cls, "aria-hidden": "true" });
  }

  function renderFooter(s) {
    var f = $("footer");
    clear(f);
    var c = s.contact || {},
      L = s.links || {};
    var explore = h("ul", { class: "foot-links" }),
      support = h("ul", { class: "foot-links" }),
      contact = h("ul", { class: "foot-contact" });

    function add(list, node) {
      list.appendChild(h("li", {}, [node]));
    }
    function ext(url, label) {
      return h("a", {
        href: safeHref(url),
        rel: "noopener",
        target: "_blank",
        text: label,
      });
    }

    function addFooterLinks(items) {
      items.forEach(function (item) {
        if (item.items && item.items.length) {
          addFooterLinks(item.items);
        } else if (!/request-question/.test(item.href)) {
          add(explore, h("a", { href: safeHref(item.href), text: item.label }));
        }
      });
    }
    addFooterLinks(s.nav);
    if (L.school) add(explore, ext(L.school, "School website"));
    if (L.sug) add(explore, ext(L.sug, "SUG website"));

    var hot = h("button", { type: "button", class: "foot-link" }, [
      icon("fa-phone-volume"),
      "Hotlines",
    ]);
    hot.addEventListener("click", openHotlines);
    add(support, hot);
    add(
      support,
      h("a", { href: "request-question.html" }, [
        icon("fa-paper-plane"),
        "Request a question",
      ]),
    );
    if (c.email)
      add(
        support,
        h("a", { href: safeHref("mailto:" + c.email) }, [
          icon("fa-envelope"),
          "Send feedback",
        ]),
      );

    [
      ["fa-location-dot", c.address],
      ["fa-envelope", c.email],
      ["fa-phone", c.phone],
    ].forEach(function (r) {
      if (r[1])
        contact.appendChild(
          h("li", {}, [icon(r[0]), h("span", { text: r[1] })]),
        );
    });
    var social = h("div", { class: "foot-social" });
    (s.social || []).forEach(function (x) {
      social.appendChild(ext(x.url, x.label));
    });

    var hasContact = contact.children.length > 0;
    var cols = [
      h("div", { class: "foot-about" }, [
        h("a", { class: "brand", href: "index.html" }, [
          logo(s),
          h("span", {}, [
            h("strong", { text: s.shortName }),
            h("span", { text: s.orgLine }),
            h("span", { text: s.siteName }),
          ]),
        ]),
        h("p", { text: s.footerText }),
      ]),
      h("nav", { "aria-label": "Footer" }, [
        h("h3", { text: "Explore" }),
        explore,
      ]),
      h("div", {}, [h("h3", { text: "Support" }), support]),
    ];
    if (hasContact || social.children.length)
      cols.push(
        h("div", {}, [
          h("h3", { text: "Contact" }),
          hasContact ? contact : null,
          social.children.length ? social : null,
        ]),
      );

    var top = h("button", { type: "button", class: "foot-top" }, [
      "Back to top ",
      icon("fa-arrow-up"),
    ]);
    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    f.appendChild(
      h("div", { class: "wrap" }, [
        h(
          "div",
          { class: "foot" + (cols.length === 3 ? " foot-3" : "") },
          cols,
        ),
        h("div", { class: "foot-bottom" }, [
          h("p", { text: s.copyright }),
          top,
        ]),
      ]),
    );
  }

  /* ---------- Homepage ---------- */
  var slideIndex = 0;

  function renderHero(s) {
    var slides = OGA.get().hero.filter(function (x) {
      return x.enabled;
    });
    var box = $("hero");
    clear(box);
    if (!slides.length) {
      box.style.display = "none";
      return;
    }
    box.style.display = "";
    slideIndex = Math.min(slideIndex, slides.length - 1);
    var sl = slides[slideIndex];

    var heroImage = String(sl.image || "").trim() || "assets/images/gate.png";

    // CSS background URLs must be absolute here because the CSS rule
    // that uses --hero-img lives inside assets/css/style.css.
    if (!/^(https?:\/\/|data:image\/|blob:)/i.test(heroImage)) {
      heroImage = new URL(heroImage, document.baseURI).href;
    }

    box.style.setProperty(
      "--hero-img",
      'url("' + heroImage.replace(/"/g, "%22") + '")',
    );

    var input = h("input", {
      type: "search",
      id: "q",
      name: "q",
      maxlength: "80",
      placeholder: "Search course code or title",
      autocomplete: "off",
    });
    var form = h("form", { class: "search", role: "search" }, [
      h("label", {
        for: "q",
        class: "skip",
        text: "Search course code or title",
      }),
      input,
      h("button", {
        class: "btn",
        type: "submit",
        text: sl.primaryLabel || "Search",
      }),
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim().slice(0, 80);
      location.href = "browse.html" + (v ? "?q=" + encodeURIComponent(v) : "");
    });
    var kids = [
      sl.eyebrow ? h("p", { class: "eyebrow", text: sl.eyebrow }) : null,
      h("h1", { text: sl.heading }),
      h("p", { text: sl.text }),
      form,
      h("div", { class: "actions" }, [
        h("a", {
          class: "btn ghost",
          href: safeHref(sl.secondaryHref || "browse.html"),
          text: sl.secondaryLabel || "Browse Questions",
        }),
      ]),
    ];
    if (slides.length > 1) {
      var go = function (d) {
        slideIndex = (slideIndex + d + slides.length) % slides.length;
        renderHero(s);
      };
      var prev = h("button", {
        type: "button",
        "aria-label": "Previous slide",
        text: "‹",
      });
      var next = h("button", {
        type: "button",
        "aria-label": "Next slide",
        text: "›",
      });
      prev.onclick = function () {
        go(-1);
      };
      next.onclick = function () {
        go(1);
      };
      kids.push(
        h(
          "div",
          {
            class: "slide-ctl",
            role: "group",
            "aria-label":
              "Slides, " + (slideIndex + 1) + " of " + slides.length,
          },
          [prev, next],
        ),
      );
    }
    box.appendChild(h("div", { class: "wrap" }, kids));
  }

  function qRow(x) {
    var meta = h("div", { class: "m" }, [
      h("span", { text: x.department || "Unassigned" }),
      h("span", { text: x.level }),
      h("span", { text: x.semester + " semester" }),
      h("span", { text: x.session }),
    ]);
    return h("div", { class: "qrow" }, [
      h("div", { class: "t", text: x.courseCode + " – " + x.courseTitle }),
      meta,
      h("a", {
        class: "btn sm",
        href: "question-details.html?id=" + encodeURIComponent(x.id),
        "aria-label": "View " + x.courseCode,
        text: "View",
      }),
    ]);
  }

  function problem() {
    return h("p", {
      class: "empty",
      role: "alert",
      text: "Questions could not be loaded right now. Please refresh the page.",
    });
  }

  var builders = {
    departments: function (sec, data) {
      if (data.failed) return problem();
      var g = h("div", { class: "grid depts" });
      data.departments.slice(0, sec.limit).forEach(function (d) {
        g.appendChild(
          h(
            "a",
            {
              class: "tile",
              href: "browse.html?dept=" + encodeURIComponent(d.id),
            },
            [
              h("span", {
                class: "badge",
                "aria-hidden": "true",
                text: d.name.charAt(0),
              }),
              h("strong", { text: d.name }),
              h("span", { class: "muted", text: d.programmes.join(" / ") }),
            ],
          ),
        );
      });
      return g.children.length
        ? g
        : h("p", { class: "empty", text: "No departments to show yet." });
    },
    recent: function (sec, data) {
      if (data.failed) return problem();
      var list = data.recent.slice(0, sec.limit);
      var box = h("div", { class: "qlist" });
      list.forEach(function (x) {
        box.appendChild(qRow(x));
      });
      return list.length
        ? box
        : h("p", {
            class: "empty",
            text: "No questions have been published yet.",
          });
    },
    popular: function (sec, data) {
      if (data.failed) return problem();
      var list = data.popular
        .filter(function (x) {
          return x.views > 0;
        })
        .slice(0, sec.limit);
      var box = h("div", { class: "qlist" });
      list.forEach(function (x) {
        var row = qRow(x);
        row.firstChild.appendChild(
          h("span", { class: "tag", text: x.views + " views" }),
        );
        box.appendChild(row);
      });
      return list.length
        ? box
        : h("p", { class: "empty", text: "Nothing to show yet." });
    },
    how: function () {
      var steps = [
        "Find your department and course.",
        "Open the question.",
        "Preview or download the document.",
      ];
      var ol = h("ol", { class: "steps" });
      steps.forEach(function (t, i) {
        ol.appendChild(
          h("li", {}, [
            h("strong", { text: "Step " + (i + 1) }),
            h("p", { text: t }),
          ]),
        );
      });
      return ol;
    },
    leadership: function (sec, data) {
      var leaders = (data.leadership || []).filter(function (person) {
        return person && person.isVisible !== false;
      });

      if (!leaders.length) return null;

      var wrap = h("div", { class: "leadership-grid" });

      leaders.forEach(function (person) {
        var photoUrl = person.photoUrl || person.imageUrl || "";
        var name = person.name || "";

        var photo = photoUrl
          ? h("img", {
              class: "leadership-photo",
              src: photoUrl,
              alt: "Portrait of " + name,
              loading: "lazy",
            })
          : h(
              "div",
              {
                class: "leadership-photo-fallback",
                "aria-hidden": "true",
              },
              [h("i", { class: "fa-solid fa-user-tie" })],
            );

        if (photoUrl) {
          photo.onerror = function () {
            photo.replaceWith(
              h(
                "div",
                {
                  class: "leadership-photo-fallback",
                  "aria-hidden": "true",
                },
                [h("i", { class: "fa-solid fa-user-tie" })],
              ),
            );
          };
        }

        wrap.appendChild(
          h("article", { class: "leadership-card" }, [
            h("div", { class: "leadership-image-wrap" }, [photo]),

            h("div", { class: "leadership-content" }, [
              h("h3", {
                class: "leadership-name",
                text: name,
              }),
              person.position
                ? h("p", {
                    class: "leadership-position",
                    text: person.position,
                  })
                : null,
              (function () {
                var qualifications = String(person.qualifications || "")
                  .split(/\\r?\\n/)
                  .map(function (value) { return value.trim(); })
                  .filter(Boolean);
                if (!qualifications.length) return null;
                return h("div", { class: "leadership-qualifications" }, [
                  h("strong", { text: "Qualifications" }),
                  h("ul", {}, qualifications.map(function (value) {
                    return h("li", { text: value });
                  })),
                ]);
              })(),
              h("div", { class: "leadership-message" }, [
                h("i", {
                  class: "fa-solid fa-quote-left leadership-quote",
                  "aria-hidden": "true",
                }),
                person.position
                  ? h("strong", {
                      class: "leadership-message-label",
                      text: "Message from the " + person.position,
                    })
                  : null,
                h("p", {
                  text: person.message || "",
                }),
              ]),
            ]),
          ]),
        );
      });

      return wrap;
    },

    featured: function (sec, data) {
      if (data.failed) return problem();
      var list = data.featured.slice(0, sec.limit);
      var box = h("div", { class: "qlist" });
      list.forEach(function (x) {
        box.appendChild(qRow(x));
      });
      return list.length
        ? box
        : h("p", { class: "empty", text: "No featured questions yet." });
    },

    announcements: function (sec) {
      var list = OGA.get()
        .announcements.filter(function (a) {
          return a.published;
        })
        .sort(function (a, b) {
          return (
            Number(b.featured) - Number(a.featured) ||
            b.date.localeCompare(a.date)
          );
        })
        .slice(0, sec.limit);

      if (!list.length) {
        return h("p", {
          class: "empty",
          text: "No announcements available at the moment.",
        });
      }

      var box = h("div", { class: "grid announcement-grid" });

      list.forEach(function (a) {
        var imageUrl = String(a.image || "").trim();

        var image =
          imageUrl && safeHref(imageUrl) !== "#"
            ? h("img", {
                class: "announcement-image",
                src: imageUrl,
                alt: "",
                loading: "lazy",
              })
            : h(
                "div",
                {
                  class: "announcement-image-fallback",
                  "aria-hidden": "true",
                },
                [h("i", { class: "fa-regular fa-newspaper" })],
              );

        if (imageUrl && image.tagName === "IMG") {
          image.onerror = function () {
            image.replaceWith(
              h(
                "div",
                {
                  class: "announcement-image-fallback",
                  "aria-hidden": "true",
                },
                [h("i", { class: "fa-regular fa-newspaper" })],
              ),
            );
          };
        }

        var body = h("div", { class: "announcement-body" }, [
          h("div", { class: "announcement-meta" }, [
            h("span", { class: "announcement-date" }, [
              h("i", {
                class: "fa-regular fa-calendar",
                "aria-hidden": "true",
              }),
              " " + a.date,
            ]),
            a.featured
              ? h("span", { class: "announcement-featured" }, [
                  h("i", {
                    class: "fa-solid fa-star",
                    "aria-hidden": "true",
                  }),
                  " Featured",
                ])
              : null,
          ]),

          h("h3", {
            class: "announcement-title",
            text: a.title,
          }),

          h("p", {
            class: "announcement-summary",
            text: a.summary,
          }),
        ]);

        var fullText = String(a.content || "").trim();

        if (fullText && fullText !== String(a.summary || "").trim()) {
          body.appendChild(
            h("details", { class: "announcement-details" }, [
              h("summary", {}, [
                "Read full announcement ",
                h("i", {
                  class: "fa-solid fa-arrow-right",
                  "aria-hidden": "true",
                }),
              ]),
              h("p", {
                class: "announcement-content",
                text: fullText,
              }),
            ]),
          );
        }

        box.appendChild(
          h("article", { class: "card announcement-card" }, [
            h("div", { class: "announcement-media" }, [image]),
            body,
          ]),
        );
      });

      return box;
    },
  };

  function loadHome() {
    return Promise.all([
      OGA.meta(),
      OGA.questions({ sort: "recent", perPage: 6 }),
      OGA.questions({ featured: 1, sort: "updated", perPage: 6 }),
      OGA.questions({ sort: "popular", perPage: 6 }),
      OGA.leadership(),
    ]).then(function (r) {
      return {
        departments: r[0].departments,
        recent: r[1].data,
        featured: r[2].data,
        popular: r[3].data,
        leadership: r[4],
      };
    });
  }

  function renderSections() {
    var host = $("sections");
    clear(host);
    host.appendChild(
      h("div", { class: "wrap" }, [
        h("p", { class: "muted", role: "status", text: "Loading…" }),
      ]),
    );
    loadHome()
      .then(null, function () {
        return { failed: true };
      })
      .then(function (data) {
        clear(host);
        OGA.get().sections.forEach(function (sec) {
          if (!sec.enabled || !builders[sec.id]) return;
          var body = builders[sec.id](sec, data);
          if (!body) return;
          var head = h("div", { class: "sec-head" }, [
            h("div", {}, [
              h("h2", { text: sec.heading }),
              sec.description
                ? h("p", { class: "muted", text: sec.description })
                : null,
            ]),
          ]);
          if (sec.id === "departments" || sec.id === "recent")
            head.appendChild(h("a", { href: "browse.html", text: "View all" }));
          var s = h(
            "section",
            { class: "section", id: sec.id, "aria-labelledby": sec.id + "-h" },
            [h("div", { class: "wrap" }, [head, body])],
          );
          s.querySelector("h2").id = sec.id + "-h";
          host.appendChild(s);
        });
      });
  }

  function renderAll() {
    var s = OGA.getSettings();
    applyTheme(s);
    renderHeader(s);
    renderFooter(s);
    if (document.body.dataset.page === "home") {
      renderHero(s);
      renderSections();
    }
    if (window.OGAPage && window.OGAPage.render) window.OGAPage.render(s);
  }

  function patchActionIcons(root) {
    var rules = [
      [/^search|find a question/i, "fa-magnifying-glass"],
      [/^clear|reset filters/i, "fa-rotate-left"],
      [/^browse|back to results|all questions/i, "fa-book-open"],
      [/^download/i, "fa-download"],
      [/^request/i, "fa-paper-plane"],
      [/^send feedback|contact/i, "fa-envelope"],
      [/^submit|save|add |create |upload|import/i, "fa-floppy-disk"],
      [/^edit|change|update/i, "fa-pen-to-square"],
      [/^delete|remove/i, "fa-trash"],
      [/^cancel|close/i, "fa-xmark"],
      [/^preview|view details|read more|learn more/i, "fa-eye"],
      [/^next/i, "fa-arrow-right"],
      [/^previous|^prev/i, "fa-arrow-left"],
      [/^login|sign in/i, "fa-right-to-bracket"],
      [/^logout|sign out/i, "fa-right-from-bracket"],
      [/^dashboard/i, "fa-gauge-high"],
      [/^settings|preferences/i, "fa-gear"],
      [/^export/i, "fa-file-export"],
      [/^publish/i, "fa-globe"],
      [/^unpublish/i, "fa-eye-slash"],
      [/^feature/i, "fa-star"],
      [/^filter/i, "fa-filter"],
      [/^refresh|reload/i, "fa-arrows-rotate"],
      [/^view public website|public site/i, "fa-arrow-up-right-from-square"],
    ];

    function apply(node) {
      if (!node || node.nodeType !== 1) return;
      if (!node.matches("a, button")) return;
      if (node.querySelector(".fa-solid, .fa-regular, .fa-brands")) return;

      var label = (node.getAttribute("aria-label") || node.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      for (var i = 0; i < rules.length; i++) {
        if (rules[i][0].test(label)) {
          var icon = document.createElement("i");
          icon.className = "fa-solid " + rules[i][1] + " fa-icon-patch";
          icon.setAttribute("aria-hidden", "true");
          node.insertBefore(icon, node.firstChild);
          return;
        }
      }
    }

    apply(root);

    if (root.querySelectorAll) {
      root.querySelectorAll("a, button").forEach(apply);
    }
  }

  /* ---------- Hotlines sheet (opens from the header and the footer; data from the admin) ---------- */
  var hotDialog = null;

  function fmtPhone(p) {
    if (/^0\d{10}$/.test(p))
      return p.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
    if (/^\+234\d{10}$/.test(p))
      return p.replace(/^(\+234)(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3 $4");
    return p;
  }
  function waNumber(p) {
    return /^0\d{10}$/.test(p) ? "234" + p.slice(1) : p.replace(/\D/g, "");
  }
  function hotItem(x) {
    var ok = /^\+?\d{7,15}$/.test(x.phone);
    var info = h("div", { class: "hot-info" }, [
      h("strong", { text: x.title }),
      x.holder ? h("span", { class: "hot-holder", text: x.holder }) : null,
      x.note ? h("span", { class: "hot-note", text: x.note }) : null,
    ]);
    var acts = h("div", { class: "hot-actions" });
    if (ok) {
      acts.appendChild(
        h("a", { class: "hot-call", href: "tel:" + x.phone }, [
          h("i", { class: "fa-solid fa-phone", "aria-hidden": "true" }),
          h("span", { text: fmtPhone(x.phone) }),
        ]),
      );
      if (x.whatsapp)
        acts.appendChild(
          h(
            "a",
            {
              class: "hot-wa",
              href: "https://wa.me/" + waNumber(x.phone),
              target: "_blank",
              rel: "noopener",
              "aria-label": "WhatsApp " + x.title,
            },
            [
              h("i", { class: "fa-brands fa-whatsapp", "aria-hidden": "true" }),
              h("span", { text: "WhatsApp" }),
            ],
          ),
        );
    }
    return h("li", { class: "hot-item" }, [info, acts]);
  }
  function fillHotlines(body) {
    clear(body);
    body.appendChild(
      h("p", { class: "muted", role: "status", text: "Loading hotlines…" }),
    );
    OGA.hotlines().then(
      function (list) {
        clear(body);
        if (!list.length) {
          body.appendChild(
            h("p", {
              class: "empty",
              text: "No hotlines have been added yet.",
            }),
          );
          return;
        }
        body.appendChild(
          h("p", { class: "muted hot-intro", text: "Tap a number to call." }),
        );
        var ul = h("ul", { class: "hot-list" });
        list.forEach(function (x) {
          ul.appendChild(hotItem(x));
        });
        body.appendChild(ul);
      },
      function () {
        clear(body);
        var retry = h("button", {
          type: "button",
          class: "btn sm",
          text: "Try again",
        });
        retry.onclick = function () {
          fillHotlines(body);
        };
        body.appendChild(
          h("div", { class: "empty", role: "alert" }, [
            h("p", { text: "Hotlines could not be loaded." }),
            retry,
          ]),
        );
      },
    );
  }
  function openHotlines() {
    if (!hotDialog) {
      var body = h("div", { class: "hot-body" });
      var close = h(
        "button",
        { type: "button", class: "hot-close", "aria-label": "Close hotlines" },
        [h("i", { class: "fa-solid fa-xmark", "aria-hidden": "true" })],
      );
      hotDialog = h(
        "dialog",
        { class: "hot-dialog", "aria-labelledby": "hot-title" },
        [
          h("div", { class: "hot-head" }, [
            h("h2", { id: "hot-title", text: "Hotlines" }),
            close,
          ]),
          body,
        ],
      );
      hotDialog._body = body;
      close.addEventListener("click", function () {
        hotDialog.close();
      });
      hotDialog.addEventListener("click", function (e) {
        if (e.target === hotDialog) hotDialog.close();
      });
      hotDialog.addEventListener("close", function () {
        document.documentElement.classList.remove("no-scroll");
      });
      document.body.appendChild(hotDialog);
    }
    fillHotlines(
      hotDialog._body,
    ); /* always fresh, so admin changes show at once */
    document.documentElement.classList.add("no-scroll");
    if (hotDialog.showModal) hotDialog.showModal();
    else hotDialog.setAttribute("open", "");
  }

  window.OGAUI = {
    openHotlines: openHotlines,
    h: h,
    clear: clear,
    safeHref: safeHref,
    qRow: qRow,
    renderAll: renderAll,
  };
  renderAll();

  patchActionIcons(document);

  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) patchActionIcons(node);
        });
      });
    }).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

})();
