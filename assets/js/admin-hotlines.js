/* Hotlines management (Main Admin). Shown to students in the Hotlines sheet on every public page. */
(function () {
  "use strict";

  var A = OGAAdmin,
    h = A.h;

  A.register(
    "hotlines",
    "Hotlines",
    function (root) {
      return list(root);
    },
    { icon: "fa-phone-volume", roles: ["main"], group: "admin" },
  );

  var SUGGESTIONS = [
    "DPO Igbesa hotline",
    "School CSO hotline",
    "DSA hotline",
    "SUG Welfare Director hotline",
  ];

  function reload(root) {
    list(root).catch(A.handleError);
  }

  function list(root) {
    return A.api("GET", "admin/hotlines").then(function (res) {
      var items = res.data || [];
      A.clear(root);
      root.appendChild(
        A.title(
          "Hotlines",
          "Numbers students can call or message for help. They appear in the Hotlines button on every public page.",
          [
            A.btn("Add hotline", "fa-plus", "primary", function () {
              edit(root, null);
            }),
          ],
        ),
      );
      if (!items.length) {
        root.appendChild(
          A.empty(
            "fa-phone-volume",
            "No hotlines yet",
            "Add the DPO, CSO, DSA and SUG Welfare Director lines, or any other contact students may need.",
            A.btn("Add first hotline", "fa-plus", "primary", function () {
              edit(root, null);
            }),
          ),
        );
        return;
      }
      var box = h("div", { class: "cm-list" });
      items.forEach(function (x, i) {
        box.appendChild(
          h("article", { class: "cm-item" }, [
            h("div", { class: "cm-thumb cm-initials", "aria-hidden": "true" }, [
              h("i", { class: "fa-solid fa-phone" }),
            ]),
            h("div", { class: "cm-info" }, [
              h("strong", { text: x.title }),
              h("span", { text: x.phone + (x.holder ? " · " + x.holder : "") }),
              x.note ? h("small", { class: "muted", text: x.note }) : null,
              h("span", { class: "cm-pills" }, [
                x.visible ? A.pill("Visible", "ok") : A.pill("Hidden", "warn"),
                x.whatsapp ? A.pill("WhatsApp", "gold") : null,
              ]),
            ]),
            h("div", { class: "q-actions" }, [
              A.btn(
                "",
                "fa-arrow-up",
                "subtle",
                function () {
                  move(root, items, i, -1);
                },
                "Move " + x.title + " up",
              ),
              A.btn(
                "",
                "fa-arrow-down",
                "subtle",
                function () {
                  move(root, items, i, 1);
                },
                "Move " + x.title + " down",
              ),
              A.btn("Edit", "fa-pen-to-square", "subtle", function () {
                edit(root, x);
              }),
              A.btn(
                x.visible ? "Hide" : "Show",
                x.visible ? "fa-eye-slash" : "fa-eye",
                "subtle",
                function () {
                  A.api("PUT", "admin/hotlines/" + x.id, {
                    json: payload(x, { visible: !x.visible }),
                  }).then(function () {
                    A.notify(
                      x.visible ? "Hotline hidden." : "Hotline is now visible.",
                    );
                    reload(root);
                  }, A.handleError);
                },
              ),
              A.btn(
                "",
                "fa-trash",
                "subtle danger-text",
                function () {
                  A.confirm(
                    "Delete " + x.title + "?",
                    "Students will no longer see this hotline.",
                    "Delete hotline",
                    function () {
                      A.api("DELETE", "admin/hotlines/" + x.id).then(
                        function () {
                          A.notify("Hotline deleted.");
                          reload(root);
                        },
                        A.handleError,
                      );
                    },
                  );
                },
                "Delete " + x.title,
              ),
            ]),
          ]),
        );
        var b = box.lastChild.querySelectorAll("button");
        if (i === 0) b[0].disabled = true;
        if (i === items.length - 1) b[1].disabled = true;
      });
      root.appendChild(box);
    });
  }

  function payload(x, over) {
    var o = {
      title: x.title,
      holder: x.holder,
      phone: x.phone,
      whatsapp: x.whatsapp,
      note: x.note,
      visible: x.visible,
    };
    Object.keys(over || {}).forEach(function (k) {
      o[k] = over[k];
    });
    return o;
  }

  function move(root, items, i, d) {
    var ids = items.map(function (x) {
      return x.id;
    });
    var j = i + d,
      t = ids[i];
    if (j < 0 || j >= ids.length) return;
    ids[i] = ids[j];
    ids[j] = t;
    A.api("POST", "admin/hotlines/reorder", { json: { ids: ids } }).then(
      function () {
        reload(root);
      },
      A.handleError,
    );
  }

  function edit(root, item) {
    var cur = item || {
      title: "",
      holder: "",
      phone: "",
      whatsapp: false,
      note: "",
      visible: true,
    };
    A.clear(root);
    root.appendChild(
      A.title(item ? "Edit hotline" : "Add hotline", null, [
        A.btn("Back to hotlines", "fa-arrow-left", "ghost", function () {
          reload(root);
        }),
      ]),
    );
    var f = {
      title: A.field({
        id: "hl-title",
        label: "Hotline name",
        value: cur.title,
        maxlength: 100,
        required: true,
        hint: "Pick a suggestion or type your own.",
      }),
      holder: A.field({
        id: "hl-holder",
        label: "Contact person",
        value: cur.holder,
        maxlength: 100,
      }),
      phone: A.field({
        id: "hl-phone",
        label: "Phone number",
        type: "tel",
        inputmode: "tel",
        autocomplete: "off",
        value: cur.phone,
        maxlength: 20,
        required: true,
        hint: "For example 08012345678 or +2348012345678.",
      }),
      note: A.field({
        id: "hl-note",
        label: "Note",
        value: cur.note,
        maxlength: 160,
        hint: "Short and optional, e.g. Available 24 hours.",
      }),
      whatsapp: A.field({
        id: "hl-wa",
        label: "This number is on WhatsApp (shows a WhatsApp button)",
        type: "checkbox",
        value: cur.whatsapp,
      }),
      visible: A.field({
        id: "hl-visible",
        label: "Show on the public site",
        type: "checkbox",
        value: cur.visible !== false,
      }),
    };
    f.title.input.setAttribute("list", "hl-suggest");
    f.title.wrap.appendChild(
      h(
        "datalist",
        { id: "hl-suggest" },
        SUGGESTIONS.map(function (s) {
          return h("option", { value: s });
        }),
      ),
    );

    var save = h("button", { type: "submit", class: "btn primary" }, [
      h("i", { class: "fa-solid fa-floppy-disk", "aria-hidden": "true" }),
      item ? "Save changes" : "Add hotline",
    ]);
    var form = h("form", { class: "qform", novalidate: "" }, [
      A.card("Hotline", [
        h("div", { class: "formgrid" }, [
          f.title.wrap,
          f.holder.wrap,
          f.phone.wrap,
          f.note.wrap,
        ]),
        f.whatsapp.wrap,
        f.visible.wrap,
      ]),
      h("div", { class: "form-actions" }, [
        save,
        A.btn("Cancel", "fa-xmark", "ghost", function () {
          reload(root);
        }),
      ]),
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = f.phone.get().replace(/[\s\-().]/g, "");
      var errs = {};
      if (f.title.get().length < 2) errs.title = "Enter the hotline name.";
      if (!phone) errs.phone = "Enter the phone number.";
      else if (!/^\+?\d{7,15}$/.test(phone))
        errs.phone = "Enter a valid phone number, for example 08012345678.";
      ["title", "holder", "note"].forEach(function (k) {
        if (/[<>]/.test(f[k].get())) errs[k] = "Remove < and > characters.";
      });
      if (!A.applyErrors(f, errs))
        return A.notify("Please correct the highlighted fields.", "error");

      var body = {
        title: f.title.get(),
        holder: f.holder.get(),
        phone: phone,
        note: f.note.get(),
        whatsapp: f.whatsapp.get(),
        visible: f.visible.get(),
      };
      A.busy(save, true, "Saving…");
      A.api(
        item ? "PUT" : "POST",
        "admin/hotlines" + (item ? "/" + item.id : ""),
        { json: body },
      ).then(
        function () {
          A.notify(item ? "Hotline updated." : "Hotline added.");
          reload(root);
        },
        function (err) {
          A.busy(save, false);
          A.handleError(err, f);
        },
      );
    });
    root.appendChild(form);
  }
})();
