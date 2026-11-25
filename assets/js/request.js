/* Request form: validates, then sends the request to the API so administrators see it in their Requests inbox. */
(function () {
  var UI = OGAUI,
    h = UI.h,
    V = OGAValidate;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var NAMES = [
    "name",
    "email",
    "dept",
    "prog",
    "level",
    "sem",
    "code",
    "title",
    "year",
    "details",
  ];
  /* API field name -> form field id */
  var FIELD_MAP = {
    name: "name",
    email: "email",
    departmentId: "dept",
    programme: "prog",
    level: "level",
    semester: "sem",
    courseCode: "code",
    courseTitle: "title",
    examYear: "year",
    details: "details",
  };
  var touched = {},
    locked = false,
    meta = null;

  function opts(sel, placeholder, items, keep) {
    UI.clear(sel);
    sel.appendChild(h("option", { value: "", text: placeholder }));
    items.forEach(function (i) {
      sel.appendChild(h("option", { value: i[0], text: i[1] }));
    });
    sel.value = items.some(function (i) {
      return i[0] === keep;
    })
      ? keep
      : "";
  }
  function deptIds() {
    return meta.departments.map(function (d) {
      return String(d.id);
    });
  }
  function fill() {
    var o = meta.options,
      k = {};
    NAMES.forEach(function (n) {
      k[n] = $(n).value;
    });
    opts(
      $("dept"),
      "Select department",
      meta.departments.map(function (d) {
        return [String(d.id), d.name];
      }),
      k.dept,
    );
    opts(
      $("prog"),
      "Select programme",
      o.programmes.map(function (p) {
        return [p, p];
      }),
      k.prog,
    );
    opts(
      $("sem"),
      "Select semester",
      o.semesters.map(function (s) {
        return [s, s];
      }),
      k.sem,
    );
    fillLevels(k.level);
  }
  function fillLevels(keep) {
    var L = meta.options.levels[$("prog").value] || [];
    opts(
      $("level"),
      $("prog").value ? "Select level" : "Choose a programme first",
      L.map(function (l) {
        return [l, l];
      }),
      keep,
    );
    $("level").disabled = !$("prog").value;
  }

  function check(n) {
    var o = meta.options,
      v = $(n).value,
      prog = $("prog").value;
    switch (n) {
      case "name":
        return V.text(v, { label: "Name", max: 80 });
      case "email":
        return V.email(v);
      case "dept":
        return V.choice(v, deptIds(), "department");
      case "prog":
        return V.choice(v, o.programmes, "programme");
      case "level":
        return prog
          ? V.choice(v, o.levels[prog] || [], "level")
          : "Choose a programme first.";
      case "sem":
        return V.choice(v, o.semesters, "semester");
      case "code":
        return V.code(v);
      case "title":
        return V.text(v, {
          label: "Course title",
          required: true,
          min: 3,
          max: 120,
        });
      case "year":
        return V.year(v, o.yearMin, new Date().getFullYear());
      case "details":
        return V.text(v, { label: "Additional details", max: 500 });
    }
    return "";
  }
  function setError(n, msg) {
    $("err-" + n).textContent = msg;
    if (msg) $(n).setAttribute("aria-invalid", "true");
    else $(n).removeAttribute("aria-invalid");
    return msg;
  }
  function show(n) {
    return setError(n, check(n));
  }

  function submit(e) {
    e.preventDefault();
    if (locked || !meta) return;
    var first = null;
    NAMES.forEach(function (n) {
      touched[n] = true;
      if (show(n) && !first) first = n;
    });
    if (first) {
      $(first).focus();
      return;
    }
    var box = $("done");
    var year = $("year").value.trim();
    var btn = $("submit");
    var label = btn.textContent;
    locked = true;
    btn.disabled = true;
    btn.textContent = "Sending…";
    OGA.addRequest({
      name: $("name").value.trim(),
      email: $("email").value.trim(),
      departmentId: +$("dept").value,
      programme: $("prog").value,
      level: $("level").value,
      semester: $("sem").value,
      courseCode: $("code").value.trim(),
      courseTitle: $("title").value.trim(),
      examYear: year ? +year : null,
      details: $("details").value.trim(),
    }).then(
      function () {
        btn.textContent = label;
        sent(box);
      },
      function (err) {
        locked = false;
        btn.disabled = false;
        btn.textContent = label;
        var firstBad = null;
        if (err.fields) {
          Object.keys(err.fields).forEach(function (k) {
            var id = FIELD_MAP[k];
            if (id) {
              setError(id, err.fields[k]);
              if (!firstBad) firstBad = id;
            }
          });
        }
        if (firstBad) return $(firstBad).focus();
        UI.clear(box);
        box.appendChild(h("h2", { text: "Your request was not sent" }));
        box.appendChild(h("p", { text: err.message || "Please try again." }));
        box.hidden = false;
        box.focus();
      },
    );
  }

  function sent(box) {
    UI.clear(box);
    var again = h("button", {
      type: "button",
      class: "btn alt",
      text: "Request another question",
    });
    again.onclick = function () {
      $("req").reset();
      NAMES.forEach(function (n) {
        setError(n, "");
        touched[n] = false;
      });
      fill();
      count();
      locked = false;
      $("submit").disabled = false;
      box.hidden = true;
      $("name").focus();
    };
    box.appendChild(h("h2", { text: "Request sent" }));
    box.appendChild(
      h("p", {
        text:
          "Your request for " +
          $("code").value.trim() +
          " – " +
          $("title").value.trim() +
          " has been sent to the administrators.",
      }),
    );
    box.appendChild(again);
    box.hidden = false;
    box.focus();
  }

  function count() {
    $("counter").textContent = $("details").value.length + " / 500";
  }

  function init() {
    $("intro").textContent = (OGA.get().about || {}).requestIntro || "";
    $("submit").disabled = true;
    OGA.meta().then(
      function (m) {
        meta = m;
        fill();
        $("submit").disabled = locked;
      },
      function (err) {
        var box = $("done");
        UI.clear(box);
        box.appendChild(h("h2", { text: "The form could not be loaded" }));
        box.appendChild(
          h("p", { text: (err && err.message) || "Please refresh the page." }),
        );
        box.hidden = false;
      },
    );
    NAMES.forEach(function (n) {
      $(n).addEventListener("blur", function () {
        if (!meta) return;
        touched[n] = true;
        show(n);
      });
      $(n).addEventListener(
        n === "dept" || n === "prog" || n === "level" || n === "sem"
          ? "change"
          : "input",
        function () {
          if (meta && (touched[n] || $("err-" + n).textContent)) show(n);
        },
      );
    });
    $("prog").addEventListener("change", function () {
      if (!meta) return;
      fillLevels("");
      if (touched.level) show("level");
    });
    $("details").addEventListener("input", count);
    $("req").addEventListener("submit", submit);
  }
  window.OGAPage = { render: function () {} };
  init();
})();
