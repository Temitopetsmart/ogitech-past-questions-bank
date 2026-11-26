/*
 * Browse Questions
 * - Search runs only after form submission; filter changes do not search by themselves.
 * - Searching, filtering and numbered pagination are done by the server (real database results).
 * - Applied filters stay unchanged while navigating pages.
 */
(function () {
  "use strict";

  var UI = OGAUI;
  var h = UI.h;
  var PAGE_SIZE = 6;
  var page = 1;
  var pageCount = 1;
  var meta = null;
  var ticket = 0;
  var applied = { q: "", dept: "", prog: "", level: "", sem: "", year: "" };

  var $ = function (id) {
    return document.getElementById(id);
  };

  var el = {
    form: $("filter-form"),
    q: $("f-q"),
    dept: $("f-dept"),
    prog: $("f-prog"),
    level: $("f-level"),
    sem: $("f-sem"),
    year: $("f-year"),
    clear: $("clear"),
    results: $("results"),
    count: $("count"),
    pagination: $("pagination"),
    prev: $("prev-page"),
    next: $("next-page"),
    pageStatus: $("page-status"),
    search: $("search-questions"),
  };

  function fillSelect(select, allLabel, items, selected) {
    UI.clear(select);
    select.appendChild(h("option", { value: "", text: allLabel }));
    items.forEach(function (item) {
      select.appendChild(
        h("option", { value: String(item[0]), text: item[1] }),
      );
    });
    select.value = items.some(function (item) {
      return String(item[0]) === String(selected);
    })
      ? String(selected)
      : "";
  }

  function levelsFor(programmeId) {
    var out = [];
    meta.programmes.forEach(function (p) {
      if (!programmeId || String(p.id) === String(programmeId)) {
        p.levels.forEach(function (l) {
          out.push([l.id, l.name]);
        });
      }
    });
    return out;
  }

  /* Rebuild dropdowns from the server's lists. Does not search. */
  function fillFilters(keep) {
    keep = keep || {};
    fillSelect(
      el.dept,
      "All departments",
      meta.departments.map(function (d) {
        return [d.id, d.name];
      }),
      keep.dept,
    );
    fillSelect(
      el.prog,
      "All programmes",
      meta.programmes.map(function (p) {
        return [p.id, p.name];
      }),
      keep.prog,
    );
    fillSelect(el.level, "All levels", levelsFor(el.prog.value), keep.level);
    fillSelect(
      el.sem,
      "All semesters",
      meta.semesters.map(function (s) {
        return [s.id, s.name];
      }),
      keep.sem,
    );
    fillSelect(
      el.year,
      "All years",
      meta.years.map(function (y) {
        return [y, String(y)];
      }),
      keep.year,
    );
  }

  /* The form is a draft until the student presses Search Questions. */
  function readForm() {
    return {
      q: el.q.value.trim().slice(0, 80),
      dept: el.dept.value,
      prog: el.prog.value,
      level: el.level.value,
      sem: el.sem.value,
      year: el.year.value,
    };
  }

  function copyFilters(f) {
    return {
      q: f.q || "",
      dept: f.dept || "",
      prog: f.prog || "",
      level: f.level || "",
      sem: f.sem || "",
      year: f.year || "",
    };
  }

  function syncUrl() {
    var params = new URLSearchParams();
    Object.keys(applied).forEach(function (key) {
      if (applied[key]) params.set(key, applied[key]);
    });
    params.set("page", String(page));
    var query = params.toString();
    try {
      history.replaceState(
        null,
        "",
        location.pathname + (query ? "?" + query : ""),
      );
      sessionStorage.setItem("oga_last_browse", query);
    } catch (error) {
      // Browsing still works if browser history/storage is unavailable.
    }
  }

  function showEmptyState() {
    var clearButton = h("button", {
      type: "button",
      class: "btn alt",
      text: "Clear filters",
    });
    clearButton.addEventListener("click", clearAll);
    el.results.appendChild(
      h("div", { class: "empty" }, [
        h("h3", { text: "No matching questions found" }),
        h("p", {
          text: "Try another course code, remove a filter, or request the question you need.",
        }),
        h("div", { class: "result-empty-actions" }, [
          clearButton,
          h("a", {
            class: "btn",
            href: "request-question.html",
            text: "Request a Question",
          }),
        ]),
      ]),
    );
  }

  function showProblem(message) {
    var retry = h("button", {
      type: "button",
      class: "btn alt",
      text: "Try again",
    });
    retry.addEventListener("click", load);
    UI.clear(el.results);
    el.results.appendChild(
      h("div", { class: "empty", role: "alert" }, [
        h("h3", { text: "Past questions could not be loaded" }),
        h("p", { text: message }),
        retry,
      ]),
    );
    el.count.textContent = "";
    el.pagination.hidden = true;
  }

  function draw(res) {
    var total = res.meta.total;
    pageCount = res.meta.pages;
    UI.clear(el.results);
    el.results.removeAttribute("aria-busy");

    if (total === 0) {
      el.count.textContent = "0 questions found.";
      showEmptyState();
    } else {
      var list = h("div", { class: "qlist" });
      res.data.forEach(function (question) {
        list.appendChild(UI.qRow(question));
      });
      el.results.appendChild(list);
      var first = (res.meta.page - 1) * PAGE_SIZE + 1;
      var last = Math.min(first + res.data.length - 1, total);
      el.count.textContent =
        "Showing " + first + "–" + last + " of " + total + " questions";
    }
    el.pagination.hidden = total <= PAGE_SIZE;
    el.prev.disabled = page <= 1;
    el.next.disabled = page >= pageCount;
    el.pageStatus.textContent = "Page " + page + " of " + pageCount;
    syncUrl();
  }

  /* Ask the server for the current page of results. Older responses are ignored. */
  function load() {
    var mine = ++ticket;
    UI.clear(el.results);
    el.results.setAttribute("aria-busy", "true");
    el.results.appendChild(
      h("p", { class: "muted", role: "status", text: "Loading questions…" }),
    );
    el.count.textContent = "";
    OGA.questions({
      q: applied.q,
      department: applied.dept,
      programme: applied.prog,
      level: applied.level,
      semester: applied.sem,
      year: applied.year,
      sort: "year",
      page: page,
      perPage: PAGE_SIZE,
    }).then(
      function (res) {
        if (mine !== ticket) return;
        if (page > res.meta.pages) {
          page = res.meta.pages;
          return load();
        }
        draw(res);
      },
      function (err) {
        if (mine !== ticket) return;
        showProblem(err && err.message ? err.message : "Please try again.");
      },
    );
  }

  function applySearch() {
    applied = copyFilters(readForm());
    page = 1;
    load();
  }

  function clearAll() {
    el.q.value = "";
    fillFilters({});
    applied = copyFilters(readForm());
    page = 1;
    load();
  }

  function restoreFromUrl() {
    var params = new URLSearchParams(location.search);
    var wanted = {
      q: (params.get("q") || "").trim().slice(0, 80),
      dept: params.get("dept") || "",
      prog: params.get("prog") || "",
      level: params.get("level") || "",
      sem: params.get("sem") || "",
      year: params.get("year") || "",
    };
    el.q.value = wanted.q;
    fillFilters(wanted);
    // Keep only values that exist in the dropdowns.
    applied = copyFilters(readForm());
    var requested = Number(params.get("page") || 1);
    page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  }

  function init() {
    el.results.setAttribute("aria-busy", "true");
    el.results.appendChild(
      h("p", { class: "muted", role: "status", text: "Loading questions…" }),
    );
    OGA.meta().then(
      function (m) {
        meta = m;
        restoreFromUrl();

        /* Changing the programme only updates the level list; it does not search. */
        el.prog.addEventListener("change", function () {
          fillSelect(
            el.level,
            "All levels",
            levelsFor(el.prog.value),
            el.level.value,
          );
        });
        el.form.addEventListener("submit", function (event) {
          event.preventDefault();
          applySearch();
        });
        el.clear.addEventListener("click", clearAll);
        el.prev.addEventListener("click", function () {
          if (page > 1) {
            page -= 1;
            load();
          }
        });
        el.next.addEventListener("click", function () {
          if (page < pageCount) {
            page += 1;
            load();
          }
        });
        load();
      },
      function (err) {
        showProblem(err && err.message ? err.message : "Please try again.");
      },
    );
  }

  window.OGAPage = {
    render: function () {},
    search: applySearch,
    clear: clearAll,
  };
  init();
})();
