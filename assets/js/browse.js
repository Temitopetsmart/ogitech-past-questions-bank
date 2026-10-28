/* Browse page: search + combined filters + load more. Data comes from OGA only. */
(function () {
  var UI = OGAUI,
    h = UI.h,
    PAGE = 6,
    shown = PAGE;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var el = {
    q: $("f-q"),
    dept: $("f-dept"),
    prog: $("f-prog"),
    level: $("f-level"),
    sem: $("f-sem"),
    year: $("f-year"),
  };

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase();
  }
  function compact(s) {
    return norm(s).replace(/[^a-z0-9]/g, "");
  }

  function option(sel, value, label) {
    sel.appendChild(h("option", { value: value, text: label }));
  }
  function fillSelect(sel, all, items, keep) {
    UI.clear(sel);
    option(sel, "", all);
    items.forEach(function (i) {
      option(sel, i[0], i[1]);
    });
    sel.value = items.some(function (i) {
      return i[0] === keep;
    })
      ? keep
      : "";
  }

  function levelsFor(prog) {
    var L = OGA.get().options.levels;
    return prog && L[prog]
      ? L[prog]
      : [].concat.apply(
          [],
          Object.keys(L).map(function (k) {
            return L[k];
          }),
        );
  }

  /* Options come from saved data, so admin edits show up here. */
  function fill(keep) {
    var o = OGA.get().options,
      years = {};
    OGA.getQuestions().forEach(function (x) {
      years[x.examYear] = 1;
    });
    fillSelect(
      el.dept,
      "All departments",
      OGA.getDepartments().map(function (d) {
        return [d.id, d.name];
      }),
      keep.dept,
    );
    fillSelect(
      el.prog,
      "All programmes",
      o.programmes.map(function (p) {
        return [p, p];
      }),
      keep.prog,
    );
    fillSelect(
      el.level,
      "All levels",
      levelsFor(el.prog.value).map(function (l) {
        return [l, l];
      }),
      keep.level,
    );
    fillSelect(
      el.sem,
      "All semesters",
      o.semesters.map(function (s) {
        return [s, s];
      }),
      keep.sem,
    );
    fillSelect(
      el.year,
      "All years",
      Object.keys(years)
        .sort()
        .reverse()
        .map(function (y) {
          return [y, y];
        }),
      keep.year,
    );
  }

  function current() {
    return {
      q: el.q.value.trim().slice(0, 80),
      dept: el.dept.value,
      prog: el.prog.value,
      level: el.level.value,
      sem: el.sem.value,
      year: el.year.value,
    };
  }

  function matches(x, f) {
    if (f.dept && x.departmentId !== f.dept) return false;
    if (f.prog && x.programme !== f.prog) return false;
    if (f.level && x.level !== f.level) return false;
    if (f.sem && x.semester !== f.sem) return false;
    if (f.year && String(x.examYear) !== f.year) return false;
    if (!f.q) return true;
    var dep = OGA.getDepartment(x.departmentId);
    var hay = [
      x.courseCode,
      x.courseTitle,
      dep ? dep.name : "",
      x.level,
      x.semester,
      x.examYear,
      OGA.session(x.examYear),
      x.notes,
    ].join(" ");
    var tokens = norm(f.q).split(/\s+/).filter(Boolean),
      lower = norm(hay);
    var all = tokens.every(function (t) {
      return lower.indexOf(t) !== -1;
    });
    var c = compact(f.q);
    return all || (c.length > 0 && compact(hay).indexOf(c) !== -1);
  }

  function sync(f) {
    var p = new URLSearchParams();
    Object.keys(f).forEach(function (k) {
      if (f[k]) p.set(k, f[k]);
    });
    var qs = p.toString();
    try {
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
      sessionStorage.setItem("oga_last_browse", qs);
    } catch (e) {}
  }

  function run() {
    var f = current();
    sync(f);
    var list = OGA.getQuestions()
      .filter(function (x) {
        return matches(x, f);
      })
      .sort(function (a, b) {
        return (
          b.examYear - a.examYear || a.courseCode.localeCompare(b.courseCode)
        );
      });
    var box = $("results");
    UI.clear(box);
    var count = $("count");
    if (!list.length) {
      count.textContent = "No questions found.";
      var clr = h("button", {
        type: "button",
        class: "btn alt",
        text: "Clear filters",
      });
      clr.onclick = clearAll;
      box.appendChild(
        h("div", { class: "empty" }, [
          h("p", {
            text: "Nothing matches your search and filters. Check the course code, remove a filter, or request the question.",
          }),
          clr,
          " ",
          h("a", {
            class: "btn",
            href: "request-question.html",
            text: "Request a Question",
          }),
        ]),
      );
      $("more").hidden = true;
      return;
    }
    var list2 = h("div", { class: "qlist" });
    list.slice(0, shown).forEach(function (x) {
      list2.appendChild(UI.qRow(x));
    });
    box.appendChild(list2);
    count.textContent =
      "Showing " +
      Math.min(shown, list.length) +
      " of " +
      list.length +
      " question" +
      (list.length === 1 ? "" : "s") +
      ".";
    $("more").hidden = shown >= list.length;
  }

  function changed(resetLevel) {
    if (resetLevel) {
      var f = current();
      fill(f);
    }
    shown = PAGE;
    run();
  }
  function clearAll() {
    el.q.value = "";
    fill({});
    shown = PAGE;
    run();
  }

  function init() {
    var p = new URLSearchParams(location.search);
    var keep = {
      dept: p.get("dept") || "",
      prog: p.get("prog") || "",
      level: p.get("level") || "",
      sem: p.get("sem") || "",
      year: p.get("year") || "",
    };
    el.q.value = (p.get("q") || "").trim().slice(0, 80);
    fillSelect(
      el.prog,
      "All programmes",
      OGA.get().options.programmes.map(function (x) {
        return [x, x];
      }),
      keep.prog,
    );
    fill(keep); // unknown URL values are dropped by fillSelect
    if (
      el.q.value ||
      el.dept.value ||
      el.prog.value ||
      el.level.value ||
      el.sem.value ||
      el.year.value ||
      matchMedia("(min-width:800px)").matches
    )
      $("filters").open = true;
    el.q.addEventListener("input", function () {
      changed(false);
    });
    el.prog.addEventListener("change", function () {
      changed(true);
    }); // levels depend on programme
    ["dept", "level", "sem", "year"].forEach(function (k) {
      el[k].addEventListener("change", function () {
        changed(false);
      });
    });
    $("filter-form").addEventListener("submit", function (e) {
      e.preventDefault();
    });
    $("clear").addEventListener("click", clearAll);
    $("more").addEventListener("click", function () {
      shown += PAGE;
      run();
    });
    run();
  }

  window.OGAPage = {
    render: function () {
      var f = current();
      fill(f);
      run();
    },
  };
  init();
})();
