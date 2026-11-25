/* Past questions: list, search/filter, details, add/edit, publish, feature, delete.
   Searching and paging happen on the server. A PDF or several images are uploaded with the form;
   the server combines images into ONE PDF and reports back when it is done. */
(function () {
  var A = OGAAdmin,
    h = A.h,
    V = OGAValidate;
  var PAGE = 20,
    flt = {
      q: "",
      department: "",
      status: "",
      programme: "",
      session: "",
      year: "",
    },
    filtersOpen = false;
  /* Frontend limits (the server enforces its own, from api/config.php). Keep them in step. */
  var PDF_MAX = 20 * 1048576,
    IMG_MAX = 8 * 1048576,
    IMG_COUNT = 30,
    IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function S() {
    return A.structure;
  }
  function docLabel(x) {
    if (!x.document) return "No document";
    return x.document.source === "images"
      ? "PDF from " + x.document.pages + " images"
      : "PDF attached";
  }

  A.register(
    "questions",
    "Past Questions",
    function (root) {
      var p = A.pending;
      A.pending = null;
      if (p && p.add) return form(root, null, p.add);
      var first = list(root);
      if (p && p.view)
        return first.then(function () {
          return A.api("GET", "admin/questions/" + p.view).then(
            function (r) {
              details(r.data);
            },
            function () {},
          );
        });
      return first;
    },
    { icon: "fa-file-lines" },
  );

  /* ---------- List ---------- */
  function list(root) {
    A.clear(root);
    var rows = [],
      total = 0,
      page = 1,
      ticket = 0,
      timer = null;
    root.appendChild(
      A.title(
        "Past questions",
        "Upload, publish and manage examination questions.",
        [
          A.btn("Upload question", "fa-cloud-arrow-up", "primary", function () {
            open(form(root, null));
          }),
        ],
      ),
    );
    function open(p) {
      p.then(null, A.handleError);
    }

    var st = S(),
      yearNow = new Date().getFullYear(),
      years = [];
    for (var y = yearNow; y >= st.yearMin; y--)
      years.push([String(y), String(y)]);
    var f = {
      q: A.field({
        id: "fq",
        label: "Search",
        type: "search",
        value: flt.q,
        maxlength: 80,
        noSuffix: true,
      }),
      department: A.field({
        id: "fd",
        label: "Department",
        type: "select",
        value: flt.department,
        noSuffix: true,
        options: [["", "All departments"]].concat(
          st.departments.map(function (d) {
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
      programme: A.field({
        id: "fp",
        label: "Programme",
        type: "select",
        value: flt.programme,
        noSuffix: true,
        options: [["", "All programmes"]].concat(
          st.programmes.map(function (p) {
            return [p.id, p.name];
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
          st.sessions.map(function (x) {
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
        options: [["", "All years"]].concat(years),
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
      f.department.wrap,
      f.status.wrap,
      f.programme.wrap,
      f.session.wrap,
      f.year.wrap,
      h("div", { class: "field end" }, [
        A.btn("Clear filters", "fa-rotate-left", "ghost", function () {
          flt = {
            q: "",
            department: "",
            status: "",
            programme: "",
            session: "",
            year: "",
          };
          open(list(root));
        }),
      ]),
    ]);
    function syncFilterBtn() {
      var n = ["department", "status", "programme", "session", "year"].filter(
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

    function readFilters() {
      flt.q = f.q.get();
      ["department", "status", "programme", "session", "year"].forEach(
        function (k) {
          flt[k] = f[k].get();
        },
      );
      syncFilterBtn();
    }

    /* Ask the server for a page. reset = start again from page 1. */
    function fetchPage(reset) {
      var mine = ++ticket;
      if (reset) page = 1;
      if (reset) {
        A.clear(box);
        box.appendChild(
          h("p", { class: "loading", role: "status" }, [
            A.spinner(),
            " Loading…",
          ]),
        );
      }
      more.hidden = true;
      return A.api("GET", "admin/questions", {
        query: {
          q: flt.q,
          department: flt.department,
          status: flt.status,
          programme: flt.programme,
          session: flt.session,
          year: flt.year,
          page: page,
          perPage: PAGE,
        },
      }).then(
        function (res) {
          if (mine !== ticket) return;
          rows = reset ? res.data : rows.concat(res.data);
          total = res.meta.total;
          paint();
        },
        function (err) {
          if (mine !== ticket) return;
          A.clear(box);
          A.clear(count);
          box.appendChild(
            A.empty(
              "fa-triangle-exclamation",
              "Questions could not be loaded",
              err.message,
              A.btn("Try again", "fa-rotate-right", "ghost", function () {
                fetchPage(true);
              }),
            ),
          );
          if (err.status === 401) return;
        },
      );
    }

    function paint() {
      A.clear(box);
      A.clear(more);
      more.hidden = false;
      count.textContent =
        rows.length +
        " of " +
        total +
        (total === 1 ? " question" : " questions");
      if (!rows.length) {
        var filtered =
          flt.q ||
          flt.department ||
          flt.status ||
          flt.programme ||
          flt.session ||
          flt.year;
        box.appendChild(
          filtered
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
                    open(form(root, null));
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
      rows.forEach(function (x) {
        box.appendChild(item(x));
      });
      if (rows.length < total)
        more.appendChild(
          A.btn(
            "Show more (" + (total - rows.length) + " left)",
            "fa-chevron-down",
            "ghost",
            function () {
              page += 1;
              fetchPage(false);
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
        A.pill(docLabel(x)),
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
            open(form(root, x.id));
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
            flag(
              x,
              "feature",
              !x.featured,
              x.featured ? "Unfeatured" : "Featured",
            );
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
              x.department,
              x.level,
              x.semester + " semester",
              "Session " + (x.session || "—"),
              "Exam " + x.examYear,
            ].join(" · "),
          }),
        ]),
        tags,
        acts,
      ]);
    }

    function flag(x, what, value, msg) {
      A.api("POST", "admin/questions/" + x.id + "/" + what, {
        json: { value: value },
      }).then(function (res) {
        rows = rows.map(function (r) {
          return r.id === x.id ? res.data : r;
        });
        A.notify(msg + ": " + x.courseCode + ".");
        paint();
      }, A.handleError);
    }
    function togglePublish(x) {
      var go = function () {
        flag(
          x,
          "publish",
          !x.published,
          x.published ? "Unpublished" : "Published",
        );
      };
      if (!x.published && !x.document)
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
        "This permanently removes the question and its document. Unpublishing hides it from students without deleting it.",
        "Delete question",
        function () {
          A.api("DELETE", "admin/questions/" + x.id).then(function () {
            rows = rows.filter(function (r) {
              return r.id !== x.id;
            });
            total = Math.max(0, total - 1);
            A.notify("Deleted " + x.courseCode + ".");
            paint();
          }, A.handleError);
        },
      );
    }

    f.q.input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        readFilters();
        fetchPage(true);
      }, 300);
    });
    ["department", "status", "programme", "session", "year"].forEach(
      function (k) {
        f[k].input.addEventListener("change", function () {
          readFilters();
          fetchPage(true);
        });
      },
    );
    syncFilterBtn();
    return fetchPage(true);
  }

  /* ---------- Details ---------- */
  function details(x) {
    var d = x.document;
    var node = h("div", {}, [
      A.dl([
        ["Department", x.department],
        ["Programme", x.programme],
        ["Level", x.level],
        ["Semester", x.semester],
        ["Academic session", x.session],
        ["Examination year", x.examYear],
        ["Notes", x.notes],
        [
          "Document",
          d
            ? (d.source === "images"
                ? "PDF made from " + d.pages + " images"
                : "PDF" + (d.originalName ? " (" + d.originalName + ")" : "")) +
              ", " +
              A.fileSize(d.size)
            : "None attached",
        ],
        ["Status", x.published ? "Published" : "Draft (hidden from students)"],
        ["Featured", x.featured ? "Yes" : "No"],
        ["Views / downloads", x.views + " / " + x.downloads],
        ["Added", A.fmtDate(x.createdAt)],
        ["Last updated", A.fmtDate(x.updatedAt)],
        ["Record ID", x.id],
      ]),
      d
        ? h("p", {}, [
            h("a", {
              href: A.fileUrl(x.id),
              target: "_blank",
              rel: "noopener",
              text: "Open the document in a new tab",
            }),
          ])
        : null,
    ]);
    A.dialog(x.courseCode + " – " + x.courseTitle, node);
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
            (existing.source === "images"
              ? "PDF made from " + existing.pages + " images"
              : "PDF" +
                (existing.originalName
                  ? " (" + existing.originalName + ")"
                  : "")) +
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
    );
    return {
      el: h("div", { class: "docbox" }, kids),
      prog: prog,
      /* The new file(s) chosen in the active mode, or null. */
      pending: function () {
        if (st.mode === "pdf" && st.pdf) return { mode: "pdf", file: st.pdf };
        if (st.mode === "images" && st.images.length)
          return {
            mode: "images",
            files: st.images.map(function (o) {
              return o.file;
            }),
          };
        return null;
      },
      showError: function (m) {
        (st.mode === "pdf" ? pdfErr : imgErr).textContent = m;
      },
      cleanup: function () {
        urls.forEach(function (u) {
          URL.revokeObjectURL(u);
        });
        urls = [];
      },
    };
  }

  /* Turn a student request into form defaults (names -> ids). */
  function fromRequest(r) {
    var st = S(),
      prog = st.programmes.filter(function (p) {
        return p.name === r.programme;
      })[0],
      level =
        prog &&
        prog.levels.filter(function (l) {
          return l.name === r.level;
        })[0],
      sem = st.semesters.filter(function (s) {
        return s.name === r.semester;
      })[0];
    return {
      requestId: r.id,
      departmentId: r.departmentId || "",
      programmeId: prog ? prog.id : "",
      levelId: level ? level.id : "",
      semesterId: sem ? sem.id : "",
      courseCode: r.courseCode,
      courseTitle: r.courseTitle,
      examYear: r.examYear || "",
    };
  }

  /* ---------- Add / edit form ---------- */
  function form(root, id, prefill) {
    if (!id)
      return Promise.resolve(
        buildForm(
          root,
          null,
          prefill && prefill.request ? fromRequest(prefill.request) : prefill,
        ),
      );
    return A.api("GET", "admin/questions/" + id).then(function (res) {
      buildForm(root, res.data, null);
    });
  }

  function buildForm(root, ex, prefill) {
    A.clear(root);
    var st = S(),
      cur = Object.assign(
        {
          departmentId: "",
          programmeId: "",
          levelId: "",
          semesterId: "",
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
    var saving = false;

    function leave() {
      doc.cleanup();
      var p = list(root);
      p.then(null, A.handleError);
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

    function deptById(id) {
      return st.departments.filter(function (d) {
        return String(d.id) === String(id);
      })[0];
    }
    function progOptions(deptId) {
      var d = deptById(deptId);
      return st.programmes
        .filter(function (p) {
          return !d || d.programmeIds.indexOf(p.id) !== -1;
        })
        .map(function (p) {
          return [p.id, p.name];
        });
    }
    var f = {
      departmentId: A.field({
        id: "qd",
        label: "Department",
        type: "select",
        value: cur.departmentId,
        required: true,
        options: [["", "Select department"]].concat(
          st.departments.map(function (x) {
            return [x.id, x.name];
          }),
        ),
      }),
      programmeId: A.field({
        id: "qp",
        label: "Programme",
        type: "select",
        value: "",
        required: true,
        options: [["", "Select programme"]],
      }),
      levelId: A.field({
        id: "ql",
        label: "Level",
        type: "select",
        value: "",
        required: true,
        options: [["", "Select level"]],
      }),
      semesterId: A.field({
        id: "qs",
        label: "Semester",
        type: "select",
        value: cur.semesterId,
        required: true,
        options: [["", "Select semester"]].concat(
          st.semesters.map(function (x) {
            return [x.id, x.name];
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
          st.sessions.map(function (x) {
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
    function fillSelect(sel, placeholder, items, keep) {
      A.clear(sel);
      sel.appendChild(h("option", { value: "", text: placeholder }));
      items.forEach(function (i) {
        sel.appendChild(h("option", { value: String(i[0]), text: i[1] }));
      });
      sel.value = items.some(function (i) {
        return String(i[0]) === String(keep);
      })
        ? String(keep)
        : "";
    }
    function fillLevels(keep) {
      var p = st.programmes.filter(function (x) {
        return String(x.id) === f.programmeId.input.value;
      })[0];
      fillSelect(
        f.levelId.input,
        p ? "Select level" : "Choose a programme first",
        p
          ? p.levels.map(function (l) {
              return [l.id, l.name];
            })
          : [],
        keep,
      );
    }
    function fillProgrammes(keepProg, keepLevel) {
      fillSelect(
        f.programmeId.input,
        "Select programme",
        progOptions(f.departmentId.input.value),
        keepProg,
      );
      fillLevels(keepLevel);
    }
    /* Only programmes the chosen department offers can be picked; levels follow the programme. */
    fillProgrammes(cur.programmeId, cur.levelId);
    f.departmentId.input.addEventListener("change", function () {
      fillProgrammes(f.programmeId.input.value, f.levelId.input.value);
    });
    f.programmeId.input.addEventListener("change", function () {
      fillLevels(f.levelId.input.value);
    });

    var fm = h("form", { class: "qform", novalidate: "" });
    fm.appendChild(
      A.card("Question details", [
        h(
          "div",
          { class: "formgrid" },
          [
            "departmentId",
            "programmeId",
            "levelId",
            "semesterId",
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
      if (saving) return;
      var v = {};
      Object.keys(f).forEach(function (k) {
        v[k] = f[k].get();
      });
      var er = {};
      er.departmentId = v.departmentId ? "" : "Choose a department.";
      er.programmeId = v.programmeId ? "" : "Choose a programme.";
      er.levelId = v.levelId
        ? ""
        : v.programmeId
          ? "Choose a level."
          : "Choose a programme first.";
      er.semesterId = v.semesterId ? "" : "Choose a semester.";
      er.courseCode = V.code(v.courseCode);
      er.courseTitle = V.text(v.courseTitle, {
        label: "Course title",
        required: true,
        min: 3,
        max: 120,
      });
      er.sessionId = v.sessionId ? "" : "Choose an academic session.";
      er.examYear = !v.examYear
        ? "Examination year is required."
        : V.year(v.examYear, st.yearMin, year);
      er.notes = V.text(v.notes, { label: "Notes", max: 300 });
      Object.keys(er).forEach(function (k) {
        if (!er[k]) delete er[k];
      });
      if (!A.applyErrors(f, er)) {
        A.notify("Not saved. Fix the highlighted fields.", "error");
        return;
      }
      var fresh = doc.pending();
      var go = function () {
        send(v, fresh);
      };
      if (v.published && !fresh && !(ex && ex.document))
        return A.confirm(
          "Publish without a document?",
          "Students will see this question but cannot download anything until a PDF is attached.",
          "Publish anyway",
          go,
          false,
        );
      go();
    });

    function send(v, fresh) {
      var fd = new FormData();
      [
        "departmentId",
        "programmeId",
        "levelId",
        "semesterId",
        "sessionId",
        "courseCode",
        "courseTitle",
        "examYear",
        "notes",
      ].forEach(function (k) {
        fd.append(k, v[k]);
      });
      fd.append("published", v.published ? "1" : "0");
      fd.append("featured", v.featured ? "1" : "0");
      if (!ex && prefill && prefill.requestId)
        fd.append("requestId", String(prefill.requestId));
      if (fresh && fresh.mode === "pdf")
        fd.append("pdf", fresh.file, fresh.file.name);
      if (fresh && fresh.mode === "images") {
        fresh.files.forEach(function (file) {
          fd.append("images[]", file, file.name);
        });
        fd.append("imageCount", String(fresh.files.length));
      }
      saving = true;
      A.busy(save, true, "Saving…");
      if (fresh) doc.prog.set(0, "Uploading… 0%");
      A.api("POST", "admin/questions" + (ex ? "/" + ex.id : ""), {
        form: fd,
        onUpload: fresh
          ? function (pct) {
              if (pct < 100) doc.prog.set(pct, "Uploading… " + pct + "%");
              else
                doc.prog.set(
                  null,
                  fresh.mode === "images"
                    ? "Combining " +
                        fresh.files.length +
                        " images into one PDF…"
                    : "Checking and saving the PDF…",
                );
            }
          : null,
      }).then(
        function (res) {
          saving = false;
          A.busy(save, false);
          doc.prog.hide();
          A.notify(
            (ex ? "Saved " : "Added ") +
              res.data.courseCode +
              (res.data.published ? "." : " as a draft."),
          );
          if (!ex && prefill && prefill.requestId)
            A.badges.requests = Math.max(0, A.badges.requests - 1);
          leave();
        },
        function (err) {
          saving = false;
          A.busy(save, false);
          doc.prog.hide();
          if (err.fields && (err.fields.pdf || err.fields.images))
            doc.showError(err.fields.pdf || err.fields.images);
          A.handleError(err, f);
        },
      );
    }
    root.appendChild(fm);
  }
})();
