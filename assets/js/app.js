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
    s.nav.forEach(function (n) {
      var a = h("a", { href: safeHref(n.href), text: n.label });
      if (n.href === page) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
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
    var brand = h("a", { class: "brand", href: "index.html" }, [
      logo(s),
      h("span", {}, [
        h("strong", { text: s.shortName }),
        h("span", { text: s.orgLine }),
        h("span", { text: s.siteName }),
      ]),
    ]);
    var bar = h("div", { class: "bar" }, [brand, btn]);
    hd.appendChild(h("div", { class: "wrap" }, [bar, nav]));
  }

  function renderFooter(s) {
    var f = $("footer");
    clear(f);
    var links = h("ul"),
      social = h("ul"),
      c = s.contact || {},
      L = s.links || {};
    s.nav.forEach(function (n) {
      links.appendChild(
        h("li", {}, [h("a", { href: safeHref(n.href), text: n.label })]),
      );
    });
    if (L.school)
      links.appendChild(
        h("li", {}, [
          h("a", {
            href: safeHref(L.school),
            rel: "noopener",
            target: "_blank",
            text: "School website",
          }),
        ]),
      );
    if (L.sug)
      links.appendChild(
        h("li", {}, [
          h("a", {
            href: safeHref(L.sug),
            rel: "noopener",
            target: "_blank",
            text: "SUG website",
          }),
        ]),
      );
    (s.social || []).forEach(function (x) {
      social.appendChild(
        h("li", {}, [
          h("a", {
            href: safeHref(x.url),
            rel: "noopener",
            target: "_blank",
            text: x.label,
          }),
        ]),
      );
    });
    var contact = h("ul");
    [c.email, c.phone, c.address].forEach(function (v) {
      if (v) contact.appendChild(h("li", { text: v }));
    });
    if (!contact.children.length)
      contact.appendChild(h("li", { text: "Contact details not yet added." }));
    f.appendChild(
      h("div", { class: "wrap" }, [
        h("div", { class: "foot" }, [
          h("div", {}, [
            h("h3", { text: s.siteName }),
            h("p", { text: s.footerText }),
          ]),
          h("div", {}, [h("h3", { text: "Quick links" }), links]),
          h("div", {}, [
            h("h3", { text: "Contact" }),
            contact,
            social.children.length ? social : null,
          ]),
        ]),
        h("p", {
          class: "muted",
          text: s.copyright,
          style: "color:#b8c2bb;margin-top:1.5rem",
        }),
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
    var dep = OGA.getDepartment(x.departmentId);
    var meta = h("div", { class: "m" }, [
      h("span", { text: dep ? dep.name : "Unassigned" }),
      h("span", { text: x.level }),
      h("span", { text: x.semester + " semester" }),
      h("span", { text: OGA.session(x.examYear) }),
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

  var builders = {
    departments: function (sec) {
      var g = h("div", { class: "grid depts" });
      OGA.getDepartments()
        .slice(0, sec.limit)
        .forEach(function (d) {
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
    recent: function (sec) {
      var list = OGA.getQuestions()
        .sort(function (a, b) {
          return b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, sec.limit);
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
    popular: function (sec) {
      var list = OGA.getQuestions()
        .sort(function (a, b) {
          return b.demoViews - a.demoViews;
        })
        .slice(0, sec.limit);
      var box = h("div", { class: "qlist" });
      list.forEach(function (x) {
        var row = qRow(x);
        row.firstChild.appendChild(
          h("span", { class: "tag", text: "Demo: " + x.demoViews + " views" }),
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
    leadership: function () {
      var L = OGA.get().leadership,
        wrap = h("div", { class: "two" });
      ["rector", "sug"].forEach(function (k) {
        var p = L[k];
        if (!p || !p.visible) return;
        var photo =
          p.photo && safeHref(p.photo) !== "#"
            ? h("img", {
                src: p.photo,
                alt: p.name ? "Portrait of " + p.name : "",
                loading: "lazy",
                width: "96",
                height: "96",
                style:
                  "width:96px;height:96px;object-fit:cover;border-radius:50%;margin-bottom:.6rem",
              })
            : null;
        if (photo)
          photo.onerror = function () {
            photo.remove();
          };
        wrap.appendChild(
          h("div", { class: "card" }, [
            photo,
            h("h3", { text: p.heading }),
            h("p", { text: p.message }),
            p.name || p.title
              ? h("p", {
                  class: "muted",
                  text: [p.name, p.title].filter(Boolean).join(", "),
                })
              : null,
          ]),
        );
      });
      return wrap.children.length ? wrap : null;
    },
    featured: function (sec) {
      var list = OGA.getQuestions()
        .filter(function (x) {
          return x.featured;
        })
        .sort(function (a, b) {
          return b.updatedAt.localeCompare(a.updatedAt);
        })
        .slice(0, sec.limit);
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
          return b.featured - a.featured || b.date.localeCompare(a.date);
        })
        .slice(0, sec.limit);
      if (!list.length)
        return h("p", { class: "empty", text: "No announcements right now." });
      var box = h("div", { class: "grid" });
      list.forEach(function (a) {
        var im =
          a.image && safeHref(a.image) !== "#"
            ? h("img", {
                src: a.image,
                alt: "",
                loading: "lazy",
                style:
                  "width:100%;max-height:140px;object-fit:cover;border-radius:4px;margin-bottom:.5rem",
              })
            : null;
        if (im)
          im.onerror = function () {
            im.remove();
          };
        box.appendChild(
          h("div", { class: "card" }, [
            im,
            h("h3", { text: a.title }),
            h("p", { class: "muted", text: a.date }),
            h("p", { text: a.summary }),
          ]),
        );
      });
      return box;
    },
  };

  function renderSections() {
    var host = $("sections");
    clear(host);
    OGA.get().sections.forEach(function (sec) {
      if (!sec.enabled || !builders[sec.id]) return;
      var body = builders[sec.id](sec);
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
  }

  function renderAll() {
    var s = OGA.getSettings();
    applyTheme(s);
    renderHeader(s);
    renderFooter(s);
    var st = OGA.status();
    if (st.message && $("storage-note")) {
      clear($("storage-note"));
      $("storage-note").appendChild(
        h("p", { class: "notice", role: "alert", text: st.message }),
      );
    }
    if (document.body.dataset.page === "home") {
      renderHero(s);
      renderSections();
    }
    if (window.OGAPage && window.OGAPage.render) window.OGAPage.render(s);
  }

  window.OGAUI = {
    h: h,
    clear: clear,
    safeHref: safeHref,
    qRow: qRow,
    renderAll: renderAll,
  };
  renderAll();
  OGA.onChange(renderAll); // reflect admin edits made in another tab

  /*
   * A storage event is fired in other tabs on the same origin,
   * not in the tab that originally made the change.
   */
  window.addEventListener("storage", function (event) {
    if (event.key === OGA.KEY || event.key === null) {
      window.location.reload();
    }
  });
})();
