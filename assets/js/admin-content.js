/* Leadership profiles, announcements and page text (About + request form intro). */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = window.OGAValidate;
  function btnRow(kids) {
    return h("div", { style: "display:flex;gap:.5rem;flex-wrap:wrap" }, kids);
  }

  /* ---------- Leadership ---------- */
  A.register("leadership", "Leadership", function (root) {
    var L = OGA.get().leadership,
      F = {},
      form = h("form", { class: "formgrid", novalidate: "" });
    root.appendChild(
      A.title(
        "Leadership and institutional content",
        "Use only approved names and messages. Anything marked as a placeholder is sample text.",
      ),
    );
    [
      ["rector", "Rector"],
      ["sug", "SUG leadership"],
    ].forEach(function (k) {
      var p = L[k[0]],
        id = k[0];
      form.appendChild(h("h2", { text: k[1] }));
      [
        [
          "heading",
          A.field({
            id: id + "-h",
            label: "Section heading",
            value: p.heading,
            maxlength: 60,
            required: true,
          }),
        ],
        [
          "name",
          A.field({
            id: id + "-n",
            label: "Name",
            value: p.name,
            maxlength: 80,
          }),
        ],
        [
          "title",
          A.field({
            id: id + "-t",
            label: "Official title",
            value: p.title,
            maxlength: 80,
            required: true,
          }),
        ],
        [
          "photo",
          A.field({
            id: id + "-p",
            label: "Portrait path",
            value: p.photo,
            maxlength: 200,
            hint: "For example assets/images/rector.jpg. Leave blank for no photo.",
          }),
        ],
        [
          "message",
          A.field({
            id: id + "-m",
            label: "Approved message or biography",
            type: "textarea",
            value: p.message,
            maxlength: 800,
          }),
        ],
        [
          "visible",
          A.field({
            id: id + "-v",
            label: "Show on the public site",
            type: "checkbox",
            value: p.visible,
          }),
        ],
      ].forEach(function (x) {
        F[id + "." + x[0]] = x[1];
        form.appendChild(x[1].wrap);
        if (x[0] === "photo")
          form.appendChild(
            A.filePicker({
              id: id + "-file",
              label: "Preview a portrait file",
              kind: "image",
            }),
          );
      });
    });
    form.appendChild(
      btnRow([
        h("button", { type: "submit", class: "btn", text: "Save leadership" }),
      ]),
    );
    form.addEventListener("input", function () {
      A.editing = true;
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var er = {};
      ["rector", "sug"].forEach(function (id) {
        er[id + ".heading"] = V.text(F[id + ".heading"].get(), {
          label: "Heading",
          required: true,
          min: 2,
          max: 60,
        });
        er[id + ".name"] = V.text(F[id + ".name"].get(), {
          label: "Name",
          max: 80,
        });
        er[id + ".title"] = V.text(F[id + ".title"].get(), {
          label: "Title",
          required: true,
          min: 2,
          max: 80,
        });
        var ph = F[id + ".photo"].get();
        if (ph && A.safeHref(ph) === "#")
          er[id + ".photo"] =
            "Enter a path such as assets/images/rector.jpg, or an https link.";
        er[id + ".message"] = V.text(F[id + ".message"].get(), {
          label: "Message",
          max: 800,
        });
      });
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(F, er)) {
        A.notify(
          "Leadership was not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      if (
        A.commit(function (n) {
          ["rector", "sug"].forEach(function (id) {
            ["heading", "name", "title", "photo", "message", "visible"].forEach(
              function (k) {
                n.leadership[id][k] = F[id + "." + k].get();
              },
            );
          });
        }, "Leadership content updated")
      )
        A.notify("Leadership saved.");
    });
    root.appendChild(form);
  });

  /* ---------- Announcements ---------- */
  function validDate(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    var d = new Date(v + "T00:00:00Z");
    return (
      !isNaN(d) && d.toISOString().slice(0, 10) === v && +v.slice(0, 4) >= 2000
    );
  }

  A.register("announcements", "Announcements", function (root) {
    aList(root);
  });
  function aList(root) {
    A.clear(root);
    root.appendChild(
      A.title(
        "Announcements",
        "Published announcements appear on the homepage; featured ones come first.",
      ),
    );
    var add = h("button", {
      type: "button",
      class: "btn",
      text: "Add announcement",
    });
    add.onclick = function () {
      aForm(root, null);
    };
    root.appendChild(h("p", {}, [add]));
    var items = OGA.get()
      .announcements.slice()
      .sort(function (a, b) {
        return b.date.localeCompare(a.date);
      });
    if (!items.length)
      root.appendChild(
        h("p", {
          class: "empty",
          text: "No announcements yet. Add one to show it on the homepage.",
        }),
      );
    items.forEach(function (a) {
      function btn(l, c, fn) {
        var b = h("button", {
          type: "button",
          class: "btn sm " + c,
          text: l,
          "aria-label": l + " " + a.title,
        });
        b.onclick = fn;
        return b;
      }
      function toggle(k, label) {
        if (
          A.commit(
            function (n) {
              var t = n.announcements.filter(function (x) {
                return x.id === a.id;
              })[0];
              if (!t) return "Announcement not found.";
              t[k] = !t[k];
            },
            label + ": " + a.title,
          )
        ) {
          A.notify(label + ".");
          aList(root);
        }
      }
      root.appendChild(
        h("div", { class: "arow" }, [
          h("div", {}, [
            h("strong", { text: a.title }),
            h("div", { class: "muted", text: a.date + " – " + a.summary }),
            h("div", {}, [
              h("span", {
                class: "pill" + (a.published ? " on" : ""),
                text: a.published ? "Published" : "Unpublished",
              }),
              a.featured
                ? h("span", { class: "pill on", text: "Featured" })
                : null,
            ]),
          ]),
          h("div", { class: "acts" }, [
            btn("Edit", "alt", function () {
              aForm(root, a.id);
            }),
            btn(a.published ? "Unpublish" : "Publish", "alt", function () {
              toggle("published", a.published ? "Unpublished" : "Published");
            }),
            btn(a.featured ? "Unfeature" : "Feature", "alt", function () {
              toggle("featured", a.featured ? "Unfeatured" : "Featured");
            }),
            btn("Delete", "danger", function () {
              A.confirm(
                "Delete this announcement?",
                a.title,
                "Delete announcement",
                function () {
                  if (
                    A.commit(function (n) {
                      n.announcements = n.announcements.filter(function (x) {
                        return x.id !== a.id;
                      });
                    }, "Deleted announcement " + a.title)
                  ) {
                    A.notify("Announcement deleted.");
                    aList(root);
                  }
                },
              );
            }),
          ]),
        ]),
      );
    });
  }
  function aForm(root, id) {
    A.clear(root);
    A.editing = true;
    var ex = id
      ? OGA.get().announcements.filter(function (x) {
          return x.id === id;
        })[0]
      : null;
    if (id && !ex) {
      A.editing = false;
      return aList(root);
    }
    var c = ex || {
      title: "",
      summary: "",
      content: "",
      image: "",
      date: new Date().toISOString().slice(0, 10),
      published: true,
      featured: false,
    };
    root.appendChild(A.title(ex ? "Edit announcement" : "Add announcement"));
    var f = {
      title: A.field({
        id: "at",
        label: "Title",
        value: c.title,
        maxlength: 120,
        required: true,
      }),
      summary: A.field({
        id: "as1",
        label: "Summary (shown on the homepage)",
        type: "textarea",
        value: c.summary,
        maxlength: 200,
        required: true,
      }),
      content: A.field({
        id: "ac",
        label:
          "Full text (stored for later; not shown on the homepage in this prototype)",
        type: "textarea",
        value: c.content,
        maxlength: 2000,
      }),
      image: A.field({
        id: "ai",
        label: "Image path",
        value: c.image,
        maxlength: 200,
        hint: "For example assets/images/notice.jpg.",
      }),
      date: A.field({
        id: "ad1",
        label: "Date",
        type: "date",
        value: c.date,
        required: true,
      }),
      published: A.field({
        id: "ap",
        label: "Published",
        type: "checkbox",
        value: c.published,
      }),
      featured: A.field({
        id: "af",
        label: "Featured on the homepage",
        type: "checkbox",
        value: c.featured,
      }),
    };
    var fm = h("form", { class: "formgrid", novalidate: "" });
    Object.keys(f).forEach(function (k) {
      fm.appendChild(f[k].wrap);
    });
    fm.insertBefore(
      A.filePicker({
        id: "afile",
        label: "Preview an image file",
        kind: "image",
      }),
      f.date.wrap,
    );
    var cancel = h("button", {
      type: "button",
      class: "btn alt",
      text: "Cancel",
    });
    cancel.onclick = function () {
      A.editing = false;
      aList(root);
    };
    fm.appendChild(
      btnRow([
        h("button", {
          type: "submit",
          class: "btn",
          text: ex ? "Save changes" : "Add announcement",
        }),
        cancel,
      ]),
    );
    fm.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = {};
      Object.keys(f).forEach(function (k) {
        v[k] = f[k].get();
      });
      var er = {};
      er.title = V.text(v.title, {
        label: "Title",
        required: true,
        min: 3,
        max: 120,
      });
      er.summary = V.text(v.summary, {
        label: "Summary",
        required: true,
        min: 3,
        max: 200,
      });
      er.content = V.text(v.content, { label: "Full text", max: 2000 });
      if (v.image && A.safeHref(v.image) === "#")
        er.image =
          "Enter a path such as assets/images/notice.jpg, or an https link.";
      if (!validDate(v.date)) er.date = "Choose a valid date.";
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(f, er)) {
        A.notify(
          "Announcement was not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      if (
        A.commit(
          function (n) {
            if (ex) {
              var t = n.announcements.filter(function (x) {
                return x.id === ex.id;
              })[0];
              if (!t) return "That announcement no longer exists.";
              Object.assign(t, v);
            } else {
              var m = 0;
              n.announcements.forEach(function (x) {
                var q = /^a(\d+)$/.exec(x.id);
                if (q) m = Math.max(m, +q[1]);
              });
              n.announcements.push(Object.assign({ id: "a" + (m + 1) }, v));
            }
          },
          (ex ? "Edited announcement " : "Added announcement ") + v.title,
        )
      ) {
        A.notify("Announcement saved.");
        aList(root);
      }
    });
    root.appendChild(fm);
    f.title.input.focus();
  }

  /* ---------- Page text ---------- */
  A.register("pages", "Page text", function (root) {
    var a = OGA.get().about || {
      heading: "",
      intro: "",
      paragraphs: [],
      feedback: "",
      requestIntro: "",
    };
    root.appendChild(
      A.title(
        "Page text",
        "The About page and the intro line on the Request a Question page.",
      ),
    );
    var f = {
      heading: A.field({
        id: "ph",
        label: "About page heading",
        value: a.heading,
        maxlength: 80,
        required: true,
      }),
      intro: A.field({
        id: "pi",
        label: "About page introduction",
        type: "textarea",
        value: a.intro,
        maxlength: 300,
      }),
      body: A.field({
        id: "pb",
        label: "About page paragraphs",
        type: "textarea",
        value: (a.paragraphs || []).join("\n\n"),
        hint: "Separate paragraphs with a blank line. Up to 6 paragraphs, 600 characters each.",
        required: true,
      }),
      feedback: A.field({
        id: "pf",
        label: "Feedback line",
        type: "textarea",
        value: a.feedback,
        maxlength: 300,
      }),
      requestIntro: A.field({
        id: "pr",
        label: "Request form introduction",
        type: "textarea",
        value: a.requestIntro,
        maxlength: 300,
      }),
    };
    var fm = h("form", { class: "formgrid", novalidate: "" });
    Object.keys(f).forEach(function (k) {
      fm.appendChild(f[k].wrap);
    });
    fm.appendChild(
      btnRow([
        h("button", { type: "submit", class: "btn", text: "Save page text" }),
      ]),
    );
    fm.addEventListener("input", function () {
      A.editing = true;
    });
    fm.addEventListener("submit", function (e) {
      e.preventDefault();
      var er = {},
        paras = f.body.input.value
          .split(/\n\s*\n/)
          .map(function (x) {
            return x.trim();
          })
          .filter(Boolean);
      er.heading = V.text(f.heading.get(), {
        label: "Heading",
        required: true,
        min: 2,
        max: 80,
      });
      er.intro = V.text(f.intro.get(), { label: "Introduction", max: 300 });
      if (!paras.length) er.body = "Add at least one paragraph.";
      else if (paras.length > 6) er.body = "Use 6 paragraphs or fewer.";
      else if (
        paras.some(function (x) {
          return x.length > 600;
        })
      )
        er.body = "Each paragraph must be 600 characters or fewer.";
      er.feedback = V.text(f.feedback.get(), {
        label: "Feedback line",
        max: 300,
      });
      er.requestIntro = V.text(f.requestIntro.get(), {
        label: "Introduction",
        max: 300,
      });
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(f, er)) {
        A.notify(
          "Page text was not saved. Fix the highlighted fields.",
          "error",
        );
        return;
      }
      if (
        A.commit(function (n) {
          n.about = {
            heading: f.heading.get(),
            intro: f.intro.get(),
            paragraphs: paras,
            feedback: f.feedback.get(),
            requestIntro: f.requestIntro.get(),
          };
        }, "Page text updated")
      )
        A.notify("Page text saved.");
    });
    root.appendChild(fm);
  });
})();
