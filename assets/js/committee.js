/* Public "Meet the Committee" page. Everything shown here is managed in the admin. */
(function () {
  var h = OGAUI.h,
    box = document.getElementById("committee");

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

  function photo(m) {
    var fallback = function () {
      return h("div", {
        class: "member-initials",
        "aria-hidden": "true",
        text: initials(m.name),
      });
    };
    if (!m.imageUrl) return fallback();
    var img = h("img", {
      src: m.imageUrl,
      alt: "Photo of " + m.name,
      loading: "lazy",
    });
    img.onerror = function () {
      img.replaceWith(fallback());
    };
    return img;
  }

  function card(m) {
    var meta = h("ul", { class: "member-meta" });
    if (m.department)
      meta.appendChild(
        h("li", {}, [
          h("i", {
            class: "fa-solid fa-building-columns",
            "aria-hidden": "true",
          }),
          h("span", { text: m.department }),
        ]),
      );
    if (m.level)
      meta.appendChild(
        h("li", {}, [
          h("i", {
            class: "fa-solid fa-graduation-cap",
            "aria-hidden": "true",
          }),
          h("span", { text: m.level }),
        ]),
      );
    return h("article", { class: "member-card" }, [
      h("div", { class: "member-photo" }, [photo(m)]),
      h("div", { class: "member-body" }, [
        h("p", { class: "member-office", text: m.office }),
        h("h3", { text: m.name }),
        meta.children.length ? meta : null,
      ]),
    ]);
  }

  function message(icon, title, text, retry) {
    OGAUI.clear(box);
    box.appendChild(
      h("div", { class: "empty-state" }, [
        h("span", { class: "empty-icon", "aria-hidden": "true" }, [
          h("i", { class: "fa-solid " + icon }),
        ]),
        h("h2", { text: title }),
        text ? h("p", { class: "muted", text: text }) : null,
        retry || null,
      ]),
    );
  }

  function render(res) {
    if (!res.term || !res.data.length)
      return message(
        "fa-people-group",
        "No executives to show yet",
        "The current executives will appear here once they are added.",
      );

    OGAUI.clear(box);
    var head = h("div", { class: "term-head" }, [
      h("h2", { text: res.term.label }),
      res.term.current ? h("span", { class: "tag", text: "Current" }) : null,
    ]);

    if (res.terms.length > 1) {
      var sel = h("select", { id: "term-pick" });
      res.terms.forEach(function (t) {
        sel.appendChild(
          h("option", {
            value: String(t.id),
            text: t.label + (t.current ? " (current)" : ""),
          }),
        );
      });
      sel.value = String(res.term.id);
      sel.addEventListener("change", function () {
        load(sel.value);
      });
      head.appendChild(
        h("div", { class: "term-pick" }, [
          h("label", { for: "term-pick", text: "Administration" }),
          sel,
        ]),
      );
    }

    var grid = h("div", { class: "member-grid" });
    res.data.forEach(function (m) {
      grid.appendChild(card(m));
    });
    box.appendChild(head);
    box.appendChild(grid);
  }

  function load(termId) {
    OGAUI.clear(box);
    box.appendChild(
      h("p", { class: "muted", role: "status", text: "Loading…" }),
    );
    OGA.committee(termId).then(render, function () {
      var retry = h("button", {
        type: "button",
        class: "btn sm",
        text: "Try again",
      });
      retry.addEventListener("click", function () {
        load(termId);
      });
      message(
        "fa-triangle-exclamation",
        "Could not load the committee",
        "Check your connection and try again.",
        retry,
      );
    });
  }

  load();
})();
