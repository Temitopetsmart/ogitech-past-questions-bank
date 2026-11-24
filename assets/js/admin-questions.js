/* Past questions: list, search/filter, details, add/edit, publish, feature, delete.
   Upload UI accepts one PDF or several images. Converting images into ONE PDF is the backend's job. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = OGAValidate;
  var PAGE = 20,
    limit = PAGE,
    flt = { q: "", dept: "", status: "", prog: "", session: "", year: "" },
    filtersOpen = false;
  /* Frontend limits; the backend must enforce its own. */
  var PDF_MAX = 20 * 1048576,
    IMG_MAX = 8 * 1048576,
    IMG_COUNT = 30,
    IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  function compact(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  function nextId(qs) {
    var n = 0;
    qs.forEach(function (x) {
      var m = /^q(\d+)$/.exec(x.id);
      if (m) n = Math.max(n, +m[1]);
    });
    return "q" + String(n + 1).padStart(3, "0");
  }
  function find(state, id) {
    return state.questions.filter(function (y) {
      return y.id === id;
    })[0];
  }
  function docLabel(d) {
    if (!d) return "No document";
    return d.source === "images"
      ? "PDF from " + d.pageCount + " images"
      : "PDF attached";
  }

  A.register(
    "questions",
    "Past Questions",
    function (root) {
      var p = A.pending;
      A.pending = null;
      if (p && p.add) return form(root, null, p.add);
      list(root);
      if (p && p.view) {
        var x = OGA.getQuestion(p.view);
        if (x) details(x);
      }
    },
    { icon: "fa-file-lines" },
  );

  /* ---------- List ---------- */
  function list(root) {
    A.clear(root);
    limit = PAGE;
    var s = OGA.get();
    root.appendChild(
      A.title(
        "Past questions",
        "Upload, publish and manage examination questions.",
        [
          A.btn("Upload question", "fa-cloud-arrow-up", "primary", function () {
            form(root, null);
          }),
        ],
      ),
    );

    var years = {};
    s.questions.forEach(function (x) {
      years[x.examYear] = 1;
    });
    var f = {
      q: A.field({
        id: "fq",
        label: "Search",
        type: "search",
        value: flt.q,
        maxlength: 80,
        noSuffix: true,
      }),
      dept: A.field({
        id: "fd",
        label: "Department",
        type: "select",
        value: flt.dept,
        noSuffix: true,
        options: [["", "All departments"]].concat(
          s.departments.map(function (d) {
            return [d.id, d.name];
          }),
        ),
      }),
      status: A.field({
        id: "fs",
        label: "Status",
        type: "select",
        value: flt.status,
        noSuffix: true,
        options: [
          ["", "All statuses"],
          ["published", "Published"],
          ["draft", "Draft / unpublished"],
          ["featured", "Featured"],
        ],
      }),
      prog: A.field({
        id: "fp",
        label: "Programme",
        type: "select",
        value: flt.prog,
        noSuffix: true,
        options: [["", "All programmes"]].concat(
          s.options.programmes.map(function (p) {
            return [p, p];
          }),
        ),
      }),
      session: A.field({
        id: "fe",
        label: "Academic session",
        type: "select",
        value: flt.session,
        noSuffix: true,
        options: [["", "All sessions"]].concat(
          OGA.getSessions().map(function (x) {
            return [x.id, x.name];
          }),
        ),
      }),
      year: A.field({
        id: "fy",
        label: "Examination year",
        type: "select",
        value: flt.year,
        noSuffix: true,
        options: [["", "All years"]].concat(
          Object.keys(years)
            .sort()
            .reverse()
            .map(function (y) {
              return [y, y];
            }),
        ),
      }),
    };
    f.q.wrap.querySelector("label").className = "sr";
    f.q.input.setAttribute("placeholder", "Search course code, title or notes");

    var filterBtn = h("button", {
      type: "button",
      class: "btn ghost",
      "aria-controls": "filters",
    });
    var panel = h("div", { class: "filters", id: "filters" }, [
      f.dept.wrap,
      f.status.wrap,
      f.prog.wrap,
      f.session.wrap,
      f.year.wrap,
      h("div", { class: "field end" }, [
        A.btn("Clear filters", "fa-rotate-left", "ghost", function () {
          flt = {
            q: "",
            dept: "",
            status: "",
            prog: "",
            session: "",
            year: "",
          };
          list(root);
        }),
      ]),
    ]);
    function syncFilterBtn() {
      var n = ["dept", "status", "prog", "session", "year"].filter(
        function (k) {
          return flt[k];
        },
      ).length;
      A.clear(filterBtn);
      filterBtn.appendChild(
        h("i", { class: "fa-solid fa-sliders", "aria-hidden": "true" }),
      );
      filterBtn.appendChild(
        document.createTextNode(" Filters" + (n ? " (" + n + ")" : "")),
      );
      filterBtn.setAttribute("aria-expanded", String(filtersOpen));
      panel.hidden = !filtersOpen;
    }
    filterBtn.addEventListener("click", function () {
      filtersOpen = !filtersOpen;
      syncFilterBtn();
    });
    root.appendChild(h("div", { class: "toolbar" }, [f.q.wrap, filterBtn]));
    root.appendChild(panel);

    var count = h("p", {
        class: "muted",
        role: "status",
        "aria-live": "polite",
      }),
      box = h("div", { class: "qlist" }),
      more = h("div", { class: "more" });
    root.appendChild(count);
    root.appendChild(box);
    root.appendChild(more);

    function matches(x) {
      if (flt.dept && x.departmentId !== flt.dept) return false;
      if (flt.prog && x.programme !== flt.prog) return false;
      if (flt.session && x.sessionId !== flt.session) return false;
      if (flt.year && String(x.examYear) !== flt.year) return false;
      if (flt.status === "published" && !x.published) return false;
      if (flt.status === "draft" && x.published) return false;
      if (flt.status === "featured" && !x.featured) return false;
      if (!flt.q) return true;
      var text = [
        x.courseCode,
        x.courseTitle,
        A.deptName(x.departmentId),
        x.programme,
        x.level,
        x.semester,
        x.examYear,
        OGA.sessionName(x),
        x.notes,
      ].join(" ");
      var low = norm(text);
      return (
        norm(flt.q)
          .split(" ")
          .every(function (t) {
            return low.indexOf(t) !== -1;
          }) ||
        (compact(flt.q) && compact(text).indexOf(compact(flt.q)) !== -1)
      );
    }

    function paint() {
      flt.q = f.q.get();
      ["dept", "status", "prog", "session", "year"].forEach(function (k) {
        flt[k] = f[k].get();
      });
      syncFilterBtn();
      A.clear(box);
      A.clear(more);
      var rows = OGA.getQuestions(true)
        .filter(matches)
        .sort(function (a, b) {
          return b.updatedAt.localeCompare(a.updatedAt);
        });
      var total = OGA.get().questions.length;
      count.textContent =
        rows.length +
        " of " +
        total +
        (total === 1 ? " question" : " questions");
      if (!rows.length) {
        box.appendChild(
          total
            ? A.empty(
                "fa-magnifying-glass",
                "No questions match",
                "Change the search or filters.",
              )
            : A.empty(
                "fa-file-circle-plus",
                "No past questions yet",
                "Upload the first question to get started.",
                A.btn(
                  "Upload question",
                  "fa-cloud-arrow-up",
                  "primary",
                  function () {
                    form(root, null);
                  },
                ),
              ),
        );
        return;
      }
      box.appendChild(
        h("div", { class: "q-head", "aria-hidden": "true" }, [
          h("span", { text: "Question" }),
          h("span", { text: "Status" }),
          h("span", { text: "Actions" }),
        ]),
      );
      rows.slice(0, limit).forEach(function (x) {
        box.appendChild(item(x));
      });
      if (rows.length > limit)
        more.appendChild(
          A.btn(
            "Show more (" + (rows.length - limit) + " left)",
            "fa-chevron-down",
            "ghost",
            function () {
              limit += PAGE;
              paint();
            },
          ),
        );
    }

    function item(x) {
      var tags = h("div", { class: "q-tags" }, [
        A.pill(
          x.published ? "Published" : "Draft",
          x.published ? "ok" : "warn",
        ),
        x.featured ? A.pill("Featured", "gold") : null,
        A.pill(docLabel(x.document || (x.fileUrl ? { source: "pdf" } : null))),
      ]);
      var acts = h("div", { class: "q-actions" }, [
        A.btn(
          "",
          "fa-eye",
          "subtle",
          function () {
            details(x);
          },
          "View " + x.courseCode,
        ),
        A.btn(
          "",
          "fa-pen-to-square",
          "subtle",
          function () {
            form(root, x.id);
          },
          "Edit " + x.courseCode,
        ),
        A.btn(
          "",
          x.published ? "fa-eye-slash" : "fa-globe",
          "subtle",
          function () {
            togglePublish(x);
          },
          (x.published ? "Unpublish " : "Publish ") + x.courseCode,
        ),
        A.btn(
          "",
          "fa-star",
          "subtle" + (x.featured ? " on" : ""),
          function () {
            toggle(x, "featured", x.featured ? "Unfeatured" : "Featured");
          },
          (x.featured ? "Unfeature " : "Feature ") + x.courseCode,
        ),
        A.btn(
          "",
          "fa-trash",
          "subtle danger-text",
          function () {
            remove(x);
          },
          "Delete " + x.courseCode,
        ),
      ]);
      return h("article", { class: "q-item" }, [
        h("div", { class: "q-main" }, [
          h("strong", { text: x.courseCode + " – " + x.courseTitle }),
          h("span", {
            class: "muted",
            text: [
              A.deptName(x.departmentId),
              x.level,
              x.semester + " semester",
              "Session " + (OGA.sessionName(x) || "—"),
              "Exam " + x.examYear,
            ].join(" · "),
          }),
        ]),
        tags,
        acts,
      ]);
    }

    function toggle(x, key, msg) {
      if (
        A.commit(function (n) {
          var t = find(n, x.id);
          if (!t) return "That question no longer exists.";
          t[key] = !t[key];
          t.updatedAt = new Date().toISOString();
        })
      ) {
        A.notify(msg + ": " + x.courseCode + ".");
        paint();
      }
    }
    function togglePublish(x) {
      var go = function () {
        toggle(x, "published", x.published ? "Unpublished" : "Published");
      };
      if (!x.published && !x.document && !x.fileUrl)
        return A.confirm(
          "Publish without a document?",
          "Students will see this question but cannot download anything until a PDF is attached.",
          "Publish anyway",
          go,
          false,
        );
      go();
    }
    function remove(x) {
      A.confirm(
        "Delete " + x.courseCode + "?",
        "This permanently removes the question. Unpublishing hides it from students without deleting it.",
        "Delete question",
        function () {
          if (
            A.commit(function (n) {
              n.questions = n.questions.filter(function (y) {
                return y.id !== x.id;
              });
            })
          ) {
            A.notify("Deleted " + x.courseCode + ".");
            paint();
          }
        },
      );
    }

    ["input", "change"].forEach(function (ev) {
      [f.q, f.dept, f.status, f.prog, f.session, f.year].forEach(function (c) {
        c.input.addEventListener(ev, function () {
          limit = PAGE;
          paint();
        });
      });
    });
    paint();
  }

  /* ---------- Details ---------- */
  function details(x) {
    var d = x.document;
    A.dialog(
      x.courseCode + " – " + x.courseTitle,
      A.dl([
        ["Department", A.deptName(x.departmentId)],
        ["Programme", x.programme],
        ["Level", x.level],
        ["Semester", x.semester],
        ["Academic session", OGA.sessionName(x)],
        ["Examination year", x.examYear],
        ["Notes", x.notes],
        [
          "Document",
          d
            ? d.name +
              (d.source === "images"
                ? " (" + d.pageCount + " pages from images)"
                : "")
            : x.fileUrl
              ? x.fileUrl
              : "None attached",
        ],
        ["Status", x.published ? "Published" : "Draft (hidden from students)"],
        ["Featured", x.featured ? "Yes" : "No"],
        ["Added", A.fmtDate(x.createdAt)],
        ["Last updated", A.fmtDate(x.updatedAt)],
        ["Record ID", x.id],
      ]),
    );
  }

  /* ---------- Document picker (PDF or images) ---------- */
  function docBox(existing) {
    var st = { mode: "pdf", pdf: null, images: [] },
      urls = [],
      prog = A.progress();
    function url(f) {
      var u = URL.createObjectURL(f);
      urls.push(u);
      return u;
    }
    function seg(value, label, icon) {
      var i = h("input", { type: "radio", name: "docmode", value: value });
      i.checked = value === "pdf";
      return {
        i: i,
        l: h("label", { class: "seg-item" }, [
          i,
          h("span", {}, [
            h("i", { class: "fa-solid " + icon, "aria-hidden": "true" }),
            " " + label,
          ]),
        ]),
      };
    }
    var sPdf = seg("pdf", "Upload a PDF", "fa-file-pdf"),
      sImg = seg("images", "Upload images", "fa-images");

    /* PDF panel */
    var pdfIn = h("input", {
        type: "file",
        id: "pdf-file",
        accept: "application/pdf,.pdf",
        class: "file-in",
      }),
      pdfSel = h("div"),
      pdfErr = h("p", { class: "err", role: "alert" }),
      pdfPanel = h("div", { class: "panel" }, [
        h("label", { class: "drop", for: "pdf-file" }, [
          h("i", { class: "fa-solid fa-file-pdf", "aria-hidden": "true" }),
          h("strong", { text: "Choose a PDF file" }),
          h("span", {
            class: "muted",
            text: "PDF only, up to " + PDF_MAX / 1048576 + " MB",
          }),
        ]),
        pdfIn,
        pdfSel,
        pdfErr,
      ]);
    function renderPdf() {
      A.clear(pdfSel);
      if (!st.pdf) return;
      pdfSel.appendChild(
        h("div", { class: "file-row" }, [
          h("i", { class: "fa-solid fa-file-pdf", "aria-hidden": "true" }),
          h("span", { class: "file-name" }, [
            h("strong", { text: st.pdf.name }),
            h("span", { class: "muted", text: A.fileSize(st.pdf.size) }),
          ]),
          h("a", {
            href: url(st.pdf),
            target: "_blank",
            rel: "noopener",
            class: "btn subtle sm",
            text: "Preview",
          }),
          A.btn(
            "",
            "fa-xmark",
            "subtle danger-text",
            function () {
              st.pdf = null;
              pdfIn.value = "";
              renderPdf();
            },
            "Remove selected PDF",
          ),
        ]),
      );
    }
    pdfIn.addEventListener("change", function () {
      var f = pdfIn.files[0];
      pdfErr.textContent = "";
      if (!f) return;
      var m =
        !/\.pdf$/i.test(f.name) && f.type !== "application/pdf"
          ? "Choose a PDF file."
          : f.size === 0
            ? "That file is empty."
            : f.size > PDF_MAX
              ? "That PDF is too large. The limit is " +
                PDF_MAX / 1048576 +
                " MB."
              : "";
      if (m) {
        pdfErr.textContent = m;
        pdfIn.value = "";
        return;
      }
      st.pdf = f;
      renderPdf();
    });

    /* Images panel */
    var imgIn = h("input", {
        type: "file",
        id: "img-files",
        accept: IMG_TYPES.join(","),
        multiple: "",
        class: "file-in",
      }),
      thumbs = h("ol", { class: "thumbs" }),
      imgSum = h("p", { class: "hint", role: "status" }),
      imgErr = h("p", { class: "err", role: "alert" }),
      imgPanel = h("div", { class: "panel", hidden: "" }, [
        h("label", { class: "drop", for: "img-files" }, [
          h("i", { class: "fa-solid fa-images", "aria-hidden": "true" }),
          h("strong", { text: "Choose question paper images" }),
          h("span", {
            class: "muted",
            text:
              "JPG, PNG or WebP, up to " +
              IMG_MAX / 1048576 +
              " MB each, max " +
              IMG_COUNT +
              " images",
          }),
        ]),
        imgIn,
        h("p", { class: "note" }, [
          h("i", { class: "fa-solid fa-circle-info", "aria-hidden": "true" }),
          " All selected images are combined into one PDF, in the order shown below. Students always download a single PDF.",
        ]),
        imgErr,
        imgSum,
        thumbs,
      ]);
    function renderImgs() {
      A.clear(thumbs);
      var n = st.images.length;
      imgSum.textContent = n
        ? n +
          (n === 1 ? " image" : " images") +
          " selected: the server will make a " +
          n +
          "-page PDF."
        : "";
      st.images.forEach(function (it, i) {
        function move(d) {
          var j = i + d,
            t = st.images[i];
          st.images[i] = st.images[j];
          st.images[j] = t;
          renderImgs();
        }
        thumbs.appendChild(
          h("li", { class: "thumb" }, [
            h("img", { src: it.url, alt: "Preview of page " + (i + 1) }),
            h("span", { class: "thumb-n", text: "Page " + (i + 1) }),
            h("span", { class: "thumb-name", text: it.file.name }),
            h("span", { class: "thumb-acts" }, [
              A.btn(
                "",
                "fa-arrow-up",
                "subtle sm",
                function () {
                  move(-1);
                },
                "Move page " + (i + 1) + " earlier",
              ),
              A.btn(
                "",
                "fa-arrow-down",
                "subtle sm",
                function () {
                  move(1);
                },
                "Move page " + (i + 1) + " later",
              ),
              A.btn(
                "",
                "fa-xmark",
                "subtle sm danger-text",
                function () {
                  st.images.splice(i, 1);
                  renderImgs();
                },
                "Remove page " + (i + 1),
              ),
            ]),
          ]),
        );
        if (i === 0) thumbs.lastChild.querySelector("button").disabled = true;
        if (i === n - 1)
          thumbs.lastChild.querySelectorAll("button")[1].disabled = true;
      });
    }
    imgIn.addEventListener("change", function () {
      var errs = [];
      Array.prototype.slice.call(imgIn.files).forEach(function (f) {
        if (IMG_TYPES.indexOf(f.type) === -1)
          return errs.push(f.name + ": use JPG, PNG or WebP.");
        if (f.size === 0) return errs.push(f.name + " is empty.");
        if (f.size > IMG_MAX)
          return errs.push(
            f.name + " is too large (limit " + IMG_MAX / 1048576 + " MB).",
          );
        if (
          st.images.some(function (o) {
            return (
              o.file.name === f.name &&
              o.file.size === f.size &&
              o.file.lastModified === f.lastModified
            );
          })
        )
          return errs.push(f.name + " is already selected.");
        if (st.images.length >= IMG_COUNT)
          return errs.push("You can add up to " + IMG_COUNT + " images.");
        st.images.push({ file: f, url: url(f) });
      });
      imgIn.value = "";
      imgErr.textContent =
        errs.slice(0, 3).join(" ") + (errs.length > 3 ? " …" : "");
      renderImgs();
    });

    function setMode() {
      st.mode = sImg.i.checked ? "images" : "pdf";
      pdfPanel.hidden = st.mode !== "pdf";
      imgPanel.hidden = st.mode !== "images";
    }
    sPdf.i.addEventListener("change", setMode);
    sImg.i.addEventListener("change", setMode);

    var kids = [];
    if (existing)
      kids.push(
        h("p", { class: "current" }, [
          h("i", { class: "fa-solid fa-paperclip", "aria-hidden": "true" }),
          " Current document: " +
            existing.name +
            (existing.source === "images"
              ? " (" + existing.pageCount + " pages)"
              : "") +
            ". Choosing a new file replaces it.",
        ]),
      );
    kids.push(
      h(
        "div",
        {
          class: "seg",
          role: "radiogroup",
          "aria-label": "How do you want to add the document?",
        },
        [sPdf.l, sImg.l],
      ),
      pdfPanel,
      imgPanel,
      prog.el,
      h("p", { class: "note" }, [
        h("i", { class: "fa-solid fa-flask", "aria-hidden": "true" }),
        " Prototype: files are checked and previewed here but are not stored until the backend is connected.",
      ]),
    );
    return {
      el: h("div", { class: "docbox" }, kids),
      prog: prog,
      pending: function () {
        if (st.mode === "pdf" && st.pdf)
          return {
            source: "pdf",
            name: st.pdf.name,
            pageCount: null,
            size: st.pdf.size,
          };
        if (st.mode === "images" && st.images.length)
          return {
            source: "images",
            name: "",
            pageCount: st.images.length,
            size: st.images.reduce(function (t, o) {
              return t + o.file.size;
            }, 0),
          };
        return null;
      },
      cleanup: function () {
        urls.forEach(function (u) {
          URL.revokeObjectURL(u);
        });
        urls = [];
      },
    };
  }

  /* ---------- Add / edit form ---------- */
  function form(root, id, prefill) {
    A.clear(root);
    var s = OGA.get(),
      o = s.options,
      ex = id ? OGA.getQuestion(id) : null;
    if (id && !ex) {
      A.notify("That question no longer exists.", "error");
      return list(root);
    }
    var cur = Object.assign(
      {
        departmentId: "",
        programme: "",
        level: "",
        semester: "",
        courseCode: "",
        courseTitle: "",
        examYear: "",
        sessionId: "",
        notes: "",
        featured: false,
        published: true,
      },
      prefill || {},
      ex || {},
    );
    var year = new Date().getFullYear();
    var doc = docBox(ex && ex.document);

    function leave() {
      doc.cleanup();
      list(root);
    }
    root.appendChild(
      A.title(
        ex ? "Edit question" : "Upload past question",
        ex
          ? "Record ID: " + ex.id
          : prefill && prefill.requestId
            ? "Prefilled from a student request."
            : "Fill in the details, then attach the document.",
        [A.btn("Back to questions", "fa-arrow-left", "ghost", leave)],
      ),
    );

    var f = {
      departmentId: A.field({
        id: "qd",
        label: "Department",
        type: "select",
        value: cur.departmentId,
        required: true,
        options: [["", "Select department"]].concat(
          s.departments.map(function (x) {
            return [x.id, x.name];
          }),
        ),
      }),
      programme: A.field({
        id: "qp",
        label: "Programme",
        type: "select",
        value: cur.programme,
        required: true,
        options: [["", "Select programme"]].concat(
          o.programmes.map(function (x) {
            return [x, x];
          }),
        ),
      }),
      level: A.field({
        id: "ql",
        label: "Level",
        type: "select",
        value: "",
        required: true,
        options: [["", "Select level"]],
      }),
      semester: A.field({
        id: "qs",
        label: "Semester",
        type: "select",
        value: cur.semester,
        required: true,
        options: [["", "Select semester"]].concat(
          o.semesters.map(function (x) {
            return [x, x];
          }),
        ),
      }),
      courseCode: A.field({
        id: "qc",
        label: "Course code",
        value: cur.courseCode,
        maxlength: 20,
        required: true,
      }),
      courseTitle: A.field({
        id: "qt",
        label: "Course title",
        value: cur.courseTitle,
        maxlength: 120,
        required: true,
      }),
      sessionId: A.field({
        id: "qa",
        label: "Academic session",
        type: "select",
        value: cur.sessionId,
        required: true,
        hint: "The school session, for example 2025/2026.",
        options: [["", "Select session"]].concat(
          OGA.getSessions().map(function (x) {
            return [x.id, x.name];
          }),
        ),
      }),
      examYear: A.field({
        id: "qy",
        label: "Examination year",
        value: String(cur.examYear || ""),
        maxlength: 4,
        inputmode: "numeric",
        required: true,
        hint: "The calendar year the exam was written, for example 2025.",
      }),
      notes: A.field({
        id: "qn",
        label: "Notes",
        type: "textarea",
        value: cur.notes,
        maxlength: 300,
      }),
      published: A.field({
        id: "qu",
        label: "Published (visible to students)",
        type: "checkbox",
        value: cur.published,
        hint: "Leave unticked to save as a draft.",
      }),
      featured: A.field({
        id: "qfe",
        label: "Featured on the homepage",
        type: "checkbox",
        value: cur.featured,
      }),
    };
    function levels() {
      var keep = f.level.input.value,
        L = o.levels[f.programme.input.value] || [],
        sel = f.level.input;
      A.clear(sel);
      sel.appendChild(
        h("option", {
          value: "",
          text: f.programme.input.value
            ? "Select level"
            : "Choose a programme first",
        }),
      );
      L.forEach(function (l) {
        sel.appendChild(h("option", { value: l, text: l }));
      });
      sel.value = L.indexOf(keep) !== -1 ? keep : "";
    }
    f.level.input.value = cur.level;
    f.programme.input.addEventListener("change", levels);
    levels();
    f.level.input.value =
      (o.levels[cur.programme] || []).indexOf(cur.level) !== -1
        ? cur.level
        : "";

    var fm = h("form", { class: "qform", novalidate: "" });
    fm.appendChild(
      A.card("Question details", [
        h(
          "div",
          { class: "formgrid" },
          [
            "departmentId",
            "programme",
            "level",
            "semester",
            "courseCode",
            "courseTitle",
            "sessionId",
            "examYear",
          ].map(function (k) {
            return f[k].wrap;
          }),
        ),
        f.notes.wrap,
      ]),
    );
    fm.appendChild(A.card("Document", [doc.el]));
    fm.appendChild(A.card("Publishing", [f.published.wrap, f.featured.wrap]));
    var save = h("button", { type: "submit", class: "btn primary" }, [
      h("i", { class: "fa-solid fa-floppy-disk", "aria-hidden": "true" }),
      ex ? "Save changes" : "Save question",
    ]);
    fm.appendChild(
      h("div", { class: "form-actions" }, [
        save,
        A.btn("Cancel", "fa-xmark", "ghost", leave),
      ]),
    );

    fm.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = {};
      Object.keys(f).forEach(function (k) {
        v[k] = f[k].get();
      });
      var er = {};
      er.departmentId = V.choice(
        v.departmentId,
        s.departments.map(function (x) {
          return x.id;
        }),
        "department",
      );
      er.programme = V.choice(v.programme, o.programmes, "programme");
      er.level = v.programme
        ? V.choice(v.level, o.levels[v.programme] || [], "level")
        : "Choose a programme first.";
      er.semester = V.choice(v.semester, o.semesters, "semester");
      er.courseCode = V.code(v.courseCode);
      er.courseTitle = V.text(v.courseTitle, {
        label: "Course title",
        required: true,
        min: 3,
        max: 120,
      });
      er.sessionId = V.choice(
        v.sessionId,
        s.sessions.map(function (x) {
          return x.id;
        }),
        "academic session",
      );
      er.examYear = !v.examYear
        ? "Examination year is required."
        : V.year(v.examYear, o.yearMin, year);
      er.notes = V.text(v.notes, { label: "Notes", max: 300 });
      if (!er.courseCode && !er.examYear && !er.departmentId) {
        var key = [
          v.departmentId,
          v.programme,
          v.level,
          v.semester,
          norm(v.courseCode),
          v.examYear,
        ].join("|");
        if (
          OGA.getQuestions(true).some(function (x) {
            return (
              x.id !== (ex && ex.id) &&
              [
                x.departmentId,
                x.programme,
                x.level,
                x.semester,
                norm(x.courseCode),
                String(x.examYear),
              ].join("|") === key
            );
          })
        )
          er.courseCode =
            "This question already exists for the same department, level, semester and year.";
      }
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(f, er)) {
        A.notify("Not saved. Fix the highlighted fields.", "error");
        return;
      }
      var fresh = doc.pending();
      if (fresh && fresh.source === "images")
        fresh.name = A.slug(v.courseCode) + "-" + v.examYear + ".pdf";
      var record = fresh || (ex && ex.document) || null;
      var go = function () {
        finish(v, record, fresh);
      };
      if (v.published && !record && !(ex && ex.fileUrl))
        return A.confirm(
          "Publish without a document?",
          "Students will see this question but cannot download anything until a PDF is attached.",
          "Publish anyway",
          go,
          false,
        );
      go();
    });

    function finish(v, record, fresh) {
      A.busy(save, true, "Saving…");
      /* Backend: send a multipart request here. Drive doc.prog.set(percent, text) from upload progress,
         then from conversion status ("Converting images to one PDF…"). */
      if (fresh)
        doc.prog.set(
          null,
          "Saving question (prototype: the file is not uploaded)…",
        );
      setTimeout(
        function () {
          var now = new Date().toISOString(),
            savedId = ex ? ex.id : null;
          var ok = A.commit(function (n) {
            var base = {
              departmentId: v.departmentId,
              programme: v.programme,
              level: v.level,
              semester: v.semester,
              courseCode: v.courseCode,
              courseTitle: v.courseTitle,
              sessionId: v.sessionId,
              examYear: +v.examYear,
              notes: v.notes,
              document: record,
              published: v.published,
              featured: v.featured,
              updatedAt: now,
            };
            if (ex) {
              var t = find(n, ex.id);
              if (!t)
                return "That question no longer exists. Nothing was saved.";
              Object.assign(t, base);
            } else {
              savedId = nextId(n.questions);
              n.questions.push(
                Object.assign(
                  { id: savedId, fileUrl: "", demoViews: 0, createdAt: now },
                  base,
                ),
              );
            }
            if (prefill && prefill.requestId) {
              var r = n.requests.filter(function (x) {
                return x.id === prefill.requestId;
              })[0];
              if (r) r.status = "resolved";
            }
          });
          A.busy(save, false);
          doc.prog.hide();
          if (ok) {
            A.notify(
              (ex ? "Saved " : "Added ") +
                v.courseCode +
                (v.published ? "." : " as a draft."),
            );
            leave();
          }
        },
        fresh ? 700 : 0,
      );
    }
    root.appendChild(fm);
    f.departmentId.input.focus();
  }
})();
