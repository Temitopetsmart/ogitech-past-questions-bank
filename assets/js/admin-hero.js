/* Homepage hero editor: slides are edited as a draft and only saved on "Save hero". */
(function () {
  var A = OGAAdmin,
    h = A.h;

  A.register("hero", "Hero slides", function (root) {
    var draft = JSON.parse(JSON.stringify(OGA.get().hero)),
      fields = [],
      preview = h("div");
    root.appendChild(
      A.title(
        "Homepage hero",
        "Edit slides, reorder them, then save. The public homepage shows only enabled slides, in this order.",
      ),
    );
    var list = h("div"),
      msgBox = h("p", { class: "hint", role: "status" });

    function dirty() {
      A.editing = true;
      paint();
    }
    function paint() {
      A.clear(preview);
      var s = draft.filter(function (x) {
        return x.enabled;
      })[0];
      if (!s) {
        preview.appendChild(
          h("p", {
            class: "notice",
            text: "No slide is enabled, so the homepage will not show a hero section.",
          }),
        );
        return;
      }
      var box = h("div", { class: "prev-hero" }, [
        h("p", {
          class: "muted",
          style: "color:#d6e6dc",
          text: "Preview of the first enabled slide",
        }),
        h("h3", { text: s.heading || "(heading)" }),
        h("p", { text: s.text }),
        h("span", { class: "btn sm", text: s.primaryLabel || "Search" }),
        " ",
        h("span", {
          class: "btn sm ghost",
          text: s.secondaryLabel || "Browse Questions",
        }),
      ]);
      if (s.image && A.safeHref(s.image) !== "#")
        box.style.backgroundImage =
          'linear-gradient(rgba(8,68,31,.8),rgba(8,68,31,.8)),url("' +
          encodeURI((/^https?:/i.test(s.image) ? "" : "../") + s.image).replace(
            /"/g,
            "",
          ) +
          '")';
      preview.appendChild(box);
    }

    function renderList() {
      A.clear(list);
      fields = [];
      draft.forEach(function (s, i) {
        var p = "sl" + i + "-",
          f = {
            eyebrow: A.field({
              id: p + "eyebrow",
              label: "Small heading above the title",
              value: s.eyebrow,
              maxlength: 40,
            }),
            heading: A.field({
              id: p + "heading",
              label: "Heading",
              value: s.heading,
              maxlength: 60,
              required: true,
            }),
            text: A.field({
              id: p + "text",
              label: "Description",
              type: "textarea",
              value: s.text,
              maxlength: 200,
            }),
            image: A.field({
              id: p + "image",
              label: "Background image path",
              value: s.image,
              maxlength: 200,
              hint: "For example assets/images/gate.jpg. Leave blank for plain green.",
            }),
            primaryLabel: A.field({
              id: p + "pl",
              label: "Search button label",
              value: s.primaryLabel,
              maxlength: 20,
              required: true,
            }),
            secondaryLabel: A.field({
              id: p + "sl",
              label: "Second button label",
              value: s.secondaryLabel,
              maxlength: 30,
            }),
            secondaryHref: A.field({
              id: p + "sh",
              label: "Second button destination",
              value: s.secondaryHref,
              maxlength: 200,
              hint: "A page such as browse.html, or an https link.",
            }),
            enabled: A.field({
              id: p + "en",
              label: "Show this slide on the homepage",
              type: "checkbox",
              value: s.enabled,
            }),
          };
        Object.keys(f).forEach(function (k) {
          var ev = k === "enabled" ? "change" : "input";
          f[k].input.addEventListener(ev, function () {
            s[k] = f[k].get();
            dirty();
          });
        });
        fields.push(f);
        var up = h("button", {
            type: "button",
            class: "btn alt sm",
            text: "Move up",
            "aria-label": "Move slide " + (i + 1) + " up",
          }),
          dn = h("button", {
            type: "button",
            class: "btn alt sm",
            text: "Move down",
            "aria-label": "Move slide " + (i + 1) + " down",
          });
        var del = h("button", {
          type: "button",
          class: "btn danger sm",
          text: "Delete",
          "aria-label": "Delete slide " + (i + 1),
        });
        if (i === 0) up.setAttribute("disabled", "");
        if (i === draft.length - 1) dn.setAttribute("disabled", "");
        up.onclick = function () {
          draft.splice(i - 1, 0, draft.splice(i, 1)[0]);
          A.editing = true;
          renderList();
          paint();
        };
        dn.onclick = function () {
          draft.splice(i + 1, 0, draft.splice(i, 1)[0]);
          A.editing = true;
          renderList();
          paint();
        };
        del.onclick = function () {
          A.confirm(
            "Delete slide " + (i + 1) + "?",
            "It is removed from this draft. The public site changes only after you save.",
            "Delete slide",
            function () {
              draft.splice(i, 1);
              A.editing = true;
              renderList();
              paint();
            },
          );
        };
        var card = h(
          "section",
          { class: "slide-card", "aria-label": "Slide " + (i + 1) },
          [h("h2", { text: "Slide " + (i + 1) })],
        );
        Object.keys(f).forEach(function (k) {
          card.appendChild(f[k].wrap);
        });
        card.insertBefore(
          A.filePicker({
            id: p + "file",
            label: "Preview an image file",
            kind: "image",
          }),
          f.primaryLabel.wrap,
        );
        card.appendChild(
          h(
            "div",
            { class: "acts", style: "display:flex;gap:.5rem;flex-wrap:wrap" },
            [up, dn, del],
          ),
        );
        list.appendChild(card);
      });
      if (!draft.length)
        list.appendChild(
          h("p", {
            class: "empty",
            text: "No slides. Add one to show a hero on the homepage.",
          }),
        );
    }

    var add = h("button", {
      type: "button",
      class: "btn alt",
      text: "Add slide",
    });
    add.onclick = function () {
      draft.push({
        id: "s" + Date.now().toString(36),
        enabled: true,
        eyebrow: "",
        heading: "New slide",
        text: "",
        image: "",
        primaryLabel: "Search",
        secondaryLabel: "Browse Questions",
        secondaryHref: "browse.html",
      });
      A.editing = true;
      renderList();
      paint();
    };
    var save = h("button", { type: "button", class: "btn", text: "Save hero" });
    save.onclick = function () {
      var bad = false,
        firstField = null;
      fields.forEach(function (f, i) {
        var s = draft[i],
          er = {};
        if (!s.heading.trim() || s.heading.trim().length < 2)
          er.heading = "Heading must be 2 to 60 characters.";
        if (!s.primaryLabel.trim())
          er.primaryLabel = "Button label is required.";
        if (s.image && A.safeHref(s.image) === "#")
          er.image =
            "Enter a path such as assets/images/gate.jpg, or an https link.";
        if (
          s.secondaryHref &&
          A.safeHref(s.secondaryHref) === "#" &&
          s.secondaryHref !== "#"
        )
          er.secondaryHref =
            "Enter a page such as browse.html, or an https link.";
        Object.keys(f).forEach(function (k) {
          var m = f[k].error(er[k]);
          if (m && !firstField) firstField = f[k];
          if (m) bad = true;
        });
      });
      if (bad) {
        firstField.input.focus();
        A.notify("Hero was not saved. Fix the highlighted fields.", "error");
        return;
      }
      var clean = draft.map(function (s) {
        return {
          id: s.id,
          enabled: !!s.enabled,
          eyebrow: s.eyebrow.trim(),
          heading: s.heading.trim(),
          text: s.text.trim(),
          image: s.image.trim(),
          primaryLabel: s.primaryLabel.trim(),
          secondaryLabel: s.secondaryLabel.trim(),
          secondaryHref: s.secondaryHref.trim(),
        };
      });
      if (
        A.commit(function (n) {
          n.hero = clean;
        }, "Homepage hero updated")
      )
        A.notify("Hero saved.");
    };

    root.appendChild(preview);
    root.appendChild(msgBox);
    root.appendChild(list);
    root.appendChild(
      h("p", { style: "display:flex;gap:.5rem;flex-wrap:wrap" }, [add, save]),
    );
    renderList();
    paint();
  });
})();
