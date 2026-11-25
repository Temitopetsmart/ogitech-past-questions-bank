/* Dashboard: every figure and chart comes from the database (never invented). */
(function () {
  var A = OGAAdmin,
    h = A.h,
    charts = [];

  A.destroyCharts = function () {
    charts.forEach(function (c) {
      try {
        c.destroy();
      } catch (e) {}
    });
    charts = [];
  };

  function stat(icon, n, label, tone) {
    return h("div", { class: "stat" }, [
      h("span", { class: "stat-icon " + (tone || ""), "aria-hidden": "true" }, [
        h("i", { class: "fa-solid " + icon }),
      ]),
      h("div", {}, [
        h("b", { text: String(n) }),
        h("span", { class: "muted", text: label }),
      ]),
    ]);
  }

  function chartCard(title, sub, ariaLabel, build, hasData) {
    var body;
    if (!hasData)
      body = A.empty(
        "fa-chart-simple",
        "No data yet",
        "This chart fills in as questions are added.",
      );
    else if (!window.Chart)
      body = h("p", {
        class: "notice",
        text: "Charts could not load. Check your internet connection and reload.",
      });
    else {
      var canvas = h("canvas", { role: "img", "aria-label": ariaLabel });
      body = h("div", { class: "chart-box" }, [canvas]);
      setTimeout(function () {
        if (canvas.isConnected) charts.push(build(canvas));
      }, 0);
    }
    return A.card(
      title,
      [sub ? h("p", { class: "muted", text: sub }) : null, body],
      "chart-card",
    );
  }

  var base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  A.register(
    "dashboard",
    "Dashboard",
    function (root) {
      return A.api("GET", "admin/dashboard").then(function (d) {
        A.badges.requests = d.totals.newRequests;
        draw(root, d);
      });
    },
    { icon: "fa-gauge-high" },
  );

  function monthLabel(m) {
    var p = m.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, 1)).toLocaleDateString(
      undefined,
      { month: "short", year: "2-digit", timeZone: "UTC" },
    );
  }

  function draw(root, d) {
    var user = A.user(),
      t = d.totals;

    root.appendChild(
      A.title(
        "Dashboard",
        "Welcome, " + user.name + ". Here is the state of the question bank.",
      ),
    );
    root.appendChild(
      h("div", { class: "stats" }, [
        stat("fa-file-lines", t.questions, "Total past questions"),
        stat("fa-circle-check", t.published, "Published", "ok"),
        stat("fa-file-pen", t.drafts, "Draft / unpublished", "warn"),
        stat("fa-building", t.departments, "Departments"),
      ]),
    );

    var nr = t.newRequests;
    if (nr)
      root.appendChild(
        h("div", { class: "banner" }, [
          h("i", { class: "fa-solid fa-inbox", "aria-hidden": "true" }),
          h("span", {
            text:
              nr +
              (nr === 1
                ? " new question request needs"
                : " new question requests need") +
              " attention.",
          }),
          A.btn("Review", "fa-arrow-right", "ghost sm", function () {
            A.go("requests");
          }),
        ]),
      );

    var actions = h("div", { class: "quick" }, [
      A.btn(
        "Upload past question",
        "fa-cloud-arrow-up",
        "primary",
        function () {
          A.go("questions", { add: {} });
        },
      ),
      A.btn("All questions", "fa-file-lines", "ghost", function () {
        A.go("questions");
      }),
      A.btn("Requests", "fa-inbox", "ghost", function () {
        A.go("requests");
      }),
    ]);
    if (A.can("departments"))
      actions.appendChild(
        A.btn("Departments", "fa-building", "ghost", function () {
          A.go("departments");
        }),
      );
    if (A.can("academic"))
      actions.appendChild(
        A.btn("Academic structure", "fa-sitemap", "ghost", function () {
          A.go("academic");
        }),
      );
    root.appendChild(A.card("Quick actions", [actions]));

    var anyUploads = d.uploadTrend.some(function (m) {
      return m.count > 0;
    });
    var grid = h("div", { class: "chart-grid" });
    grid.appendChild(
      chartCard(
        "Questions by department",
        "All questions, including drafts.",
        "Bar chart of questions per department",
        function (cv) {
          return new Chart(cv, {
            type: "bar",
            data: {
              labels: d.byDepartment.map(function (x) {
                return x.name;
              }),
              datasets: [
                {
                  data: d.byDepartment.map(function (x) {
                    return x.count;
                  }),
                  backgroundColor: "#0b5d34",
                  borderRadius: 4,
                },
              ],
            },
            options: Object.assign({}, base, {
              indexAxis: "y",
              scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
            }),
          });
        },
        t.questions > 0 && d.byDepartment.length > 0,
      ),
    );
    grid.appendChild(
      chartCard(
        "Questions by examination year",
        "The year each exam was written.",
        "Bar chart of questions per examination year",
        function (cv) {
          return new Chart(cv, {
            type: "bar",
            data: {
              labels: d.byYear.map(function (x) {
                return String(x.year);
              }),
              datasets: [
                {
                  data: d.byYear.map(function (x) {
                    return x.count;
                  }),
                  backgroundColor: "#1fa45a",
                  borderRadius: 4,
                },
              ],
            },
            options: Object.assign({}, base, {
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            }),
          });
        },
        t.questions > 0,
      ),
    );
    grid.appendChild(
      chartCard(
        "Upload trend",
        "Questions added in the last 6 months.",
        "Line chart of questions added per month",
        function (cv) {
          return new Chart(cv, {
            type: "line",
            data: {
              labels: d.uploadTrend.map(function (m) {
                return monthLabel(m.month);
              }),
              datasets: [
                {
                  data: d.uploadTrend.map(function (m) {
                    return m.count;
                  }),
                  borderColor: "#0b5d34",
                  backgroundColor: "rgba(11,93,52,.12)",
                  fill: true,
                  tension: 0.3,
                  pointBackgroundColor: "#c9a227",
                },
              ],
            },
            options: Object.assign({}, base, {
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            }),
          });
        },
        anyUploads,
      ),
    );
    root.appendChild(grid);

    var list = h("ul", { class: "recent" });
    d.recent.forEach(function (x) {
      var open = h("button", { type: "button", class: "recent-item" }, [
        h("span", { class: "recent-main" }, [
          h("strong", { text: x.courseCode + " – " + x.courseTitle }),
          h("span", {
            class: "muted",
            text:
              x.department + " · " + x.level + " · " + A.fmtDate(x.createdAt),
          }),
        ]),
        A.pill(x.published ? "Published" : "Draft", x.published ? "ok" : ""),
      ]);
      open.addEventListener("click", function () {
        A.go("questions", { view: x.id });
      });
      list.appendChild(h("li", {}, [open]));
    });
    root.appendChild(
      A.card("Recent uploads", [
        d.recent.length
          ? list
          : A.empty(
              "fa-file-circle-plus",
              "No questions yet",
              "Upload the first past question to get started.",
            ),
      ]),
    );
  }
})();
