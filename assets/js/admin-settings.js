/* Website settings: name, branding, colours, font, contact, metadata, footer text. */
(function () {
  var A = OGAAdmin,
    h = A.h;
  var FONTS = ["Inter", "Poppins", "Montserrat", "Source Sans 3"];
  var HEX = /^#[0-9a-f]{6}$/i;

  A.register("settings", "Settings", function (root) {
    var s = OGA.getSettings(),
      t = s.theme || {},
      c = s.contact || {};
    root.appendChild(
      A.title(
        "Website settings",
        "Name, branding, colours, contact details and page metadata. The favicon uses the same file as the logo.",
      ),
    );
    var f = {
      siteName: A.field({
        id: "siteName",
        label: "Website name",
        value: s.siteName,
        maxlength: 60,
        required: true,
      }),
      shortName: A.field({
        id: "shortName",
        label: "Short name (shown beside the logo)",
        value: s.shortName,
        maxlength: 12,
        required: true,
      }),
      orgLine: A.field({
        id: "orgLine",
        label: "Organisation line",
        value: s.orgLine,
        maxlength: 80,
      }),
      tagline: A.field({
        id: "tagline",
        label: "Short description",
        type: "textarea",
        value: s.tagline,
        maxlength: 200,
      }),
      logo: A.field({
        id: "logo",
        label: "Logo and favicon path",
        value: s.logo,
        maxlength: 200,
        hint: "A path like assets/images/logo.png or an https link.",
      }),
      green: A.field({
        id: "green",
        label: "Main green",
        type: "color",
        value: t.green || "#0b5d34",
        required: true,
      }),
      accent: A.field({
        id: "accent",
        label: "Accent red",
        type: "color",
        value: t.accent || "#c8102e",
        required: true,
      }),
      gold: A.field({
        id: "gold",
        label: "Accent gold",
        type: "color",
        value: t.gold || "#c9a227",
        required: true,
      }),
      font: A.field({
        id: "font",
        label: "Typeface",
        type: "select",
        value: t.font || "Inter",
        options: FONTS.map(function (x) {
          return [x, x];
        }),
        required: true,
      }),
      metaTitle: A.field({
        id: "metaDescription",
        label: "Page description (search engines)",
        type: "textarea",
        value: s.metaDescription,
        maxlength: 200,
      }),
      email: A.field({
        id: "email",
        label: "Contact email",
        type: "email",
        inputmode: "email",
        value: c.email,
        maxlength: 120,
      }),
      phone: A.field({
        id: "phone",
        label: "Contact phone",
        type: "tel",
        value: c.phone,
        maxlength: 30,
      }),
      address: A.field({
        id: "address",
        label: "Address",
        value: c.address,
        maxlength: 120,
      }),
      footerText: A.field({
        id: "footerText",
        label: "Footer description",
        type: "textarea",
        value: s.footerText,
        maxlength: 300,
      }),
      copyright: A.field({
        id: "copyright",
        label: "Copyright text",
        value: s.copyright,
        maxlength: 120,
      }),
    };
    var prevName = h("strong"),
      prevOrg = h("span"),
      prevBtn = h("span", { class: "btn sm", text: "Sample button" });
    var prev = h("div", { class: "prev-hero", "aria-label": "Live preview" }, [
      h("p", {
        class: "muted",
        style: "color:#d6e6dc",
        text: "Live preview (not saved yet)",
      }),
      prevName,
      h("br"),
      prevOrg,
      h("p", {}, [prevBtn]),
    ]);
    function paint() {
      prevName.textContent = f.siteName.get() || "(name)";
      prevOrg.textContent = f.orgLine.get();
      prev.style.background = HEX.test(f.green.get()) ? f.green.get() : "";
      prevBtn.style.background = HEX.test(f.accent.get()) ? f.accent.get() : "";
      prevBtn.style.borderColor = HEX.test(f.gold.get()) ? f.gold.get() : "";
      prev.style.fontFamily = "'" + f.font.get() + "',system-ui,sans-serif";
    }
    var form = h("form", { class: "formgrid", novalidate: "" });
    Object.keys(f).forEach(function (k) {
      form.appendChild(f[k].wrap);
      f[k].input.addEventListener("input", function () {
        A.editing = true;
        paint();
      });
      f[k].input.addEventListener("change", paint);
    });
    form.insertBefore(
      A.filePicker({
        id: "logofile",
        label: "Preview a logo file",
        kind: "image",
      }),
      f.green.wrap,
    );
    form.insertBefore(prev, f.green.wrap);
    form.appendChild(
      h("div", {}, [
        h("button", { type: "submit", class: "btn", text: "Save settings" }),
      ]),
    );
    paint();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = {},
        er = {};
      Object.keys(f).forEach(function (k) {
        v[k] = f[k].get();
      });
      if (v.siteName.length < 2)
        er.siteName = "Website name must be 2 to 60 characters.";
      if (!v.shortName)
        er.shortName = "Short name is required (up to 12 characters).";
      if (v.logo && A.safeHref(v.logo) === "#")
        er.logo =
          "Enter a file path such as assets/images/logo.png, or an https link.";
      ["green", "accent", "gold"].forEach(function (k) {
        if (!HEX.test(v[k])) er[k] = "Use a six-digit colour like #0b5d34.";
      });
      if (FONTS.indexOf(v.font) === -1)
        er.font = "Choose a typeface from the list.";
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email))
        er.email = "Enter an email like name@example.com, or leave it blank.";
      if (v.phone && !/^[0-9+()\-\s]{5,30}$/.test(v.phone))
        er.phone = "Use digits, spaces, + ( ) and hyphens only.";
      if (!A.applyErrors(f, er)) {
        A.notify(
          "Settings were not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      var ok = A.commit(function (n) {
        var x = n.settings;
        x.siteName = v.siteName;
        x.shortName = v.shortName;
        x.orgLine = v.orgLine;
        x.tagline = v.tagline;
        x.logo = v.logo;
        x.metaDescription = v.metaTitle;
        x.footerText = v.footerText;
        x.copyright = v.copyright;
        x.contact = { email: v.email, phone: v.phone, address: v.address };
        x.theme = {
          green: v.green,
          accent: v.accent,
          gold: v.gold,
          font: v.font,
        };
      }, "Website settings updated");
      if (ok) A.notify("Settings saved. Refresh the public site to see them.");
    });
    root.appendChild(form);
  });
})();
