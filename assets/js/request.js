/* Request form: validation only. Nothing is sent, saved or emailed in this prototype. */
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
  var touched = {},
    locked = false;

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
  function fill() {
    var o = OGA.get().options,
      k = {};
    NAMES.forEach(function (n) {
      k[n] = $(n).value;
    });
    opts(
      $("dept"),
      "Select department",
      OGA.getDepartments().map(function (d) {
        return [d.id, d.name];
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
    var L = OGA.get().options.levels[$("prog").value] || [];
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
    var o = OGA.get().options,
      v = $(n).value,
      prog = $("prog").value;
    switch (n) {
      case "name":
        return V.text(v, { label: "Name", max: 80 });
      case "email":
        return V.email(v);
      case "dept":
        return V.choice(
          v,
          OGA.getDepartments().map(function (d) {
            return d.id;
          }),
          "department",
        );
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
  function show(n) {
    var msg = check(n);
    $("err-" + n).textContent = msg;
    if (msg) $(n).setAttribute("aria-invalid", "true");
    else $(n).removeAttribute("aria-invalid");
    return msg;
  }

  function submit(e) {
    e.preventDefault();
    if (locked) return;
    var first = null;
    NAMES.forEach(function (n) {
      touched[n] = true;
      if (show(n) && !first) first = n;
    });
    if (first) {
      $(first).focus();
      return;
    }
    locked = true;
    $("submit").disabled = true;
    var box = $("done");
    UI.clear(box);
    var again = h("button", {
      type: "button",
      class: "btn alt",
      text: "Request another question",
    });
    again.onclick = function () {
      $("req").reset();
      NAMES.forEach(function (n) {
        $("err-" + n).textContent = "";
        $(n).removeAttribute("aria-invalid");
        touched[n] = false;
      });
      fill();
      count();
      locked = false;
      $("submit").disabled = false;
      box.hidden = true;
      $("name").focus();
    };
    box.appendChild(h("h2", { text: "Your request passed all checks" }));
    box.appendChild(
      h("p", {
        text:
          "Request for " +
          $("code").value.trim() +
          " – " +
          $("title").value.trim() +
          " is valid.",
      }),
    );
    box.appendChild(
      h("p", {
        class: "muted",
        text: "Demonstration only: this prototype does not send, save or email your request, and no administrator has received it.",
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
    fill();
    NAMES.forEach(function (n) {
      $(n).addEventListener("blur", function () {
        touched[n] = true;
        show(n);
      });
      $(n).addEventListener(
        n === "dept" || n === "prog" || n === "level" || n === "sem"
          ? "change"
          : "input",
        function () {
          if (touched[n] || $("err-" + n).textContent) show(n);
        },
      );
    });
    $("prog").addEventListener("change", function () {
      fillLevels("");
      if (touched.level) show("level");
    });
    $("details").addEventListener("input", count);
    $("req").addEventListener("submit", submit);
  }
  window.OGAPage = { render: fill };
  init();
})();
