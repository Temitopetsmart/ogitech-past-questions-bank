/*
 * Browse Questions
 * - Search runs only after form submission.
 * - Filter changes do not automatically execute a search.
 * - Results use numbered pagination instead of "Load more".
 * - Applied filters remain unchanged while navigating pages.
 * - Data currently comes from OGA; a future PHP API can replace this layer.
 */
(function () {
  "use strict";

  var UI = OGAUI;
  var h = UI.h;
  var PAGE_SIZE = 6;
  var page = 1;
  var applied = {
    q: "",
    dept: "",
    prog: "",
    level: "",
    sem: "",
    year: "",
  };

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

  function norm(value) {
    return String(value == null ? "" : value).toLowerCase();
  }

  function compact(value) {
    return norm(value).replace(/[^a-z0-9]/g, "");
  }

  function option(select, value, label) {
    select.appendChild(
      h("option", {
        value: value,
        text: label,
      }),
    );
  }

  function fillSelect(select, allLabel, items, selected) {
    UI.clear(select);
    option(select, "", allLabel);

    items.forEach(function (item) {
      option(select, item[0], item[1]);
    });

    select.value = items.some(function (item) {
      return item[0] === selected;
    })
      ? selected
      : "";
  }

  function levelsFor(programme) {
    var levels = OGA.get().options.levels;

    if (programme && levels[programme]) {
      return levels[programme];
    }

    return [].concat
      .apply(
        [],
        Object.keys(levels).map(function (key) {
          return levels[key];
        }),
      )
      .filter(function (value, index, all) {
        return all.indexOf(value) === index;
      });
  }

  /*
   * Rebuild dropdowns from the current data.
   * This function does not search or render results.
   */
  function fillFilters(keep) {
    keep = keep || {};

    var data = OGA.get();
    var years = {};

    OGA.getQuestions().forEach(function (question) {
      if (question.examYear) {
        years[String(question.examYear)] = true;
      }
    });

    fillSelect(
      el.dept,
      "All departments",
      OGA.getDepartments().map(function (department) {
        return [department.id, department.name];
      }),
      keep.dept || "",
    );

    fillSelect(
      el.prog,
      "All programmes",
      data.options.programmes.map(function (programme) {
        return [programme, programme];
      }),
      keep.prog || "",
    );

    fillSelect(
      el.level,
      "All levels",
      levelsFor(el.prog.value).map(function (level) {
        return [level, level];
      }),
      keep.level || "",
    );

    fillSelect(
      el.sem,
      "All semesters",
      data.options.semesters.map(function (semester) {
        return [semester, semester];
      }),
      keep.sem || "",
    );

    fillSelect(
      el.year,
      "All years",
      Object.keys(years)
        .sort(function (a, b) {
          return Number(b) - Number(a);
        })
        .map(function (year) {
          return [year, year];
        }),
      keep.year || "",
    );
  }

  /*
   * Read the current form.
   * This is a draft until the student presses Search Questions.
   */
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

  function copyFilters(filters) {
    return {
      q: filters.q || "",
      dept: filters.dept || "",
      prog: filters.prog || "",
      level: filters.level || "",
      sem: filters.sem || "",
      year: filters.year || "",
    };
  }

  function matches(question, filters) {
    if (filters.dept && question.departmentId !== filters.dept) {
      return false;
    }

    if (filters.prog && question.programme !== filters.prog) {
      return false;
    }

    if (filters.level && question.level !== filters.level) {
      return false;
    }

    if (filters.sem && question.semester !== filters.sem) {
      return false;
    }

    if (filters.year && String(question.examYear) !== String(filters.year)) {
      return false;
    }

    if (!filters.q) {
      return true;
    }

    var department = OGA.getDepartment(question.departmentId);

    var searchableText = [
      question.courseCode,
      question.courseTitle,
      department ? department.name : "",
      question.programme,
      question.level,
      question.semester,
      question.examYear,
      OGA.session(question.examYear),
      question.notes,
    ].join(" ");

    var tokens = norm(filters.q).split(/\s+/).filter(Boolean);
    var lowerText = norm(searchableText);

    var allTokensMatch = tokens.every(function (token) {
      return lowerText.indexOf(token) !== -1;
    });

    var compactQuery = compact(filters.q);

    return (
      allTokensMatch ||
      (compactQuery.length > 0 &&
        compact(searchableText).indexOf(compactQuery) !== -1)
    );
  }

  function syncUrl() {
    var params = new URLSearchParams();

    Object.keys(applied).forEach(function (key) {
      if (applied[key]) {
        params.set(key, applied[key]);
      }
    });

    params.set("page", String(page));

    var query = params.toString();

    try {
      history.replaceState(
        null,
        "",
        location.pathname + (query ? "?" + query : ""),
      );

      sessionStorage.setItem("oga_last_browse", params.toString());
    } catch (error) {
      // Browsing should still work if browser history/storage is unavailable.
    }
  }

  function getFilteredQuestions() {
    return OGA.getQuestions()
      .filter(function (question) {
        return matches(question, applied);
      })
      .sort(function (a, b) {
        return (
          Number(b.examYear || 0) - Number(a.examYear || 0) ||
          String(a.courseCode || "").localeCompare(String(b.courseCode || ""))
        );
      });
  }

  function showEmptyState() {
    var clearButton = h("button", {
      type: "button",
      class: "btn alt",
      text: "Clear filters",
    });

    clearButton.addEventListener("click", clearAll);

    var requestLink = h("a", {
      class: "btn",
      href: "request-question.html",
      text: "Request a Question",
    });

    el.results.appendChild(
      h("div", { class: "empty" }, [
        h("h3", {
          text: "No matching questions found",
        }),
        h("p", {
          text: "Try another course code, remove a filter, or request the question you need.",
        }),
        h("div", { class: "result-empty-actions" }, [clearButton, requestLink]),
      ]),
    );
  }

  function render() {
    var allQuestions = getFilteredQuestions();
    var total = allQuestions.length;
    var pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (page > pageCount) {
      page = pageCount;
    }

    var startIndex = (page - 1) * PAGE_SIZE;
    var visibleQuestions = allQuestions.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );

    UI.clear(el.results);

    if (total === 0) {
      el.count.textContent = "0 questions found.";
      showEmptyState();
    } else {
      var list = h("div", { class: "qlist" });

      visibleQuestions.forEach(function (question) {
        list.appendChild(UI.qRow(question));
      });

      el.results.appendChild(list);

      var firstResult = startIndex + 1;
      var lastResult = Math.min(startIndex + PAGE_SIZE, total);

      el.count.textContent =
        "Showing " +
        firstResult +
        "–" +
        lastResult +
        " of " +
        total +
        " questions";
    }

    el.pagination.hidden = total <= PAGE_SIZE;

    el.prev.disabled = page <= 1;
    el.next.disabled = page >= pageCount;

    el.pageStatus.textContent = "Page " + page + " of " + pageCount;

    syncUrl();
  }

  /*
   * Called only when the user explicitly submits the search form.
   */
  function applySearch() {
    applied = copyFilters(readForm());
    page = 1;
    render();
  }

  function clearAll() {
    el.q.value = "";
    fillFilters({});
    applied = copyFilters(readForm());
    page = 1;
    render();
  }

  function restoreFromUrl() {
    var params = new URLSearchParams(location.search);

    var requestedFilters = {
      q: (params.get("q") || "").trim().slice(0, 80),
      dept: params.get("dept") || "",
      prog: params.get("prog") || "",
      level: params.get("level") || "",
      sem: params.get("sem") || "",
      year: params.get("year") || "",
    };

    el.q.value = requestedFilters.q;
    fillFilters(requestedFilters);

    // Use only values that survived dropdown validation.
    applied = copyFilters({
      q: el.q.value,
      dept: el.dept.value,
      prog: el.prog.value,
      level: el.level.value,
      sem: el.sem.value,
      year: el.year.value,
    });

    var requestedPage = Number(params.get("page") || 1);

    page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  }

  function init() {
    restoreFromUrl();

    /*
     * Changing the programme may change which levels are available.
     * It updates the level dropdown only; it does not search.
     */
    el.prog.addEventListener("change", function () {
      var selectedLevel = el.level.value;

      fillSelect(
        el.level,
        "All levels",
        levelsFor(el.prog.value).map(function (level) {
          return [level, level];
        }),
        selectedLevel,
      );
    });

    /*
     * Typing is intentionally not connected to render() or applySearch().
     */
    el.form.addEventListener("submit", function (event) {
      event.preventDefault();
      applySearch();
    });

    el.clear.addEventListener("click", clearAll);

    el.prev.addEventListener("click", function () {
      if (page > 1) {
        page -= 1;
        render();
      }
    });

    el.next.addEventListener("click", function () {
      var totalPages = Math.max(
        1,
        Math.ceil(getFilteredQuestions().length / PAGE_SIZE),
      );

      if (page < totalPages) {
        page += 1;
        render();
      }
    });

    render();
  }

  /*
   * Preserve compatibility with existing code that refreshes this page.
   * Calling render() does not read unsubmitted form changes.
   */
  window.OGAPage = {
    render: render,
    search: applySearch,
    clear: clearAll,
  };

  init();
})();
