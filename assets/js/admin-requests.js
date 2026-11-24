/* Requests inbox: questions students asked for through the public "Request a Question" form. */
(function () {
  var A = OGAAdmin,
    h = A.h;
  var filter = "new";

  A.register(
    "requests",
    "Requests",
    function (root) {
      list(root);
    },
    {
      icon: "fa-inbox",
      badge: function () {
        return A.newRequests();
      },
    },
  );

  function summary(r) {
    return [
      A.deptName(r.departmentId),
      r.programme,
      r.level,
      r.semester + " semester",
      r.examYear ? "Exam " + r.examYear : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function setStatus(r, status) {
    if (
      A.commit(function (n) {
        var t = n.requests.filter(function (x) {
          return x.id === r.id;
        })[0];
        if (!t) return "That request no longer exists.";
        t.status = status;
      })
    ) {
      A.notify(
        status === "resolved" ? "Marked as resolved." : "Request reopened.",
      );
      A.refreshNav();
      return true;
    }
    return false;
  }

  function list(root) {
    A.clear(root);
    var all = OGA.get().requests;
    root.appendChild(
      A.title(
        "Question requests",
        "Past questions that students asked for. Upload the question, then mark the request resolved.",
      ),
    );

    var tabs = h("div", {
      class: "tabs",
      role: "group",
      "aria-label": "Filter requests",
    });
    [
      ["new", "New"],
      ["resolved", "Resolved"],
      ["", "All"],
    ].forEach(function (t) {
      var n = all.filter(function (r) {
        return !t[0] || r.status === t[0];
      }).length;
      var b = h("button", {
        type: "button",
        class: "tab" + (filter === t[0] ? " on" : ""),
        "aria-pressed": String(filter === t[0]),
        text: t[1] + " (" + n + ")",
      });
      b.addEventListener("click", function () {
        filter = t[0];
        list(root);
      });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    var rows = all.filter(function (r) {
      return !filter || r.status === filter;
    });
    if (!rows.length) {
      root.appendChild(
        all.length
          ? A.empty(
              "fa-circle-check",
              filter === "new" ? "No new requests" : "Nothing here",
              "Switch the filter above to see other requests.",
            )
          : A.empty(
              "fa-inbox",
              "No requests yet",
              "Requests sent from the public Request a Question page appear here.",
            ),
      );
      return;
    }
    var box = h("div", { class: "qlist" });
    rows.forEach(function (r) {
      box.appendChild(
        h("article", { class: "q-item" }, [
          h("div", { class: "q-main" }, [
            h("strong", { text: r.courseCode + " – " + r.courseTitle }),
            h("span", { class: "muted", text: summary(r) }),
            h("span", {
              class: "muted",
              text: (r.name || "Anonymous") + " · " + A.fmtDate(r.createdAt),
            }),
          ]),
          h("div", { class: "q-tags" }, [
            A.pill(
              r.status === "new" ? "New" : "Resolved",
              r.status === "new" ? "warn" : "ok",
            ),
          ]),
          h("div", { class: "q-actions" }, [
            A.btn(
              "",
              "fa-eye",
              "subtle",
              function () {
                view(r, root);
              },
              "View request for " + r.courseCode,
            ),
            A.btn(
              "",
              "fa-cloud-arrow-up",
              "subtle",
              function () {
                upload(r);
              },
              "Upload question for " + r.courseCode,
            ),
            A.btn(
              "",
              r.status === "new" ? "fa-check" : "fa-rotate-left",
              "subtle",
              function () {
                if (setStatus(r, r.status === "new" ? "resolved" : "new"))
                  list(root);
              },
              r.status === "new"
                ? "Mark " + r.courseCode + " resolved"
                : "Reopen " + r.courseCode,
            ),
            A.btn(
              "",
              "fa-trash",
              "subtle danger-text",
              function () {
                remove(r, root);
              },
              "Delete request for " + r.courseCode,
            ),
          ]),
        ]),
      );
    });
    root.appendChild(box);
  }

  function upload(r) {
    A.go("questions", {
      add: {
        requestId: r.id,
        departmentId: r.departmentId,
        programme: r.programme,
        level: r.level,
        semester: r.semester,
        courseCode: r.courseCode,
        courseTitle: r.courseTitle,
        examYear: r.examYear || "",
      },
    });
  }

  function view(r, root) {
    var node = h("div", {}, [
      A.dl([
        ["Course", r.courseCode + " – " + r.courseTitle],
        ["Department", A.deptName(r.departmentId)],
        ["Programme", r.programme],
        ["Level", r.level],
        ["Semester", r.semester],
        ["Examination year", r.examYear || "Not given"],
        ["Details", r.details],
        ["Requested by", r.name || "Anonymous"],
        ["Email", r.email || "Not given"],
        ["Received", A.fmtDate(r.createdAt)],
        ["Status", r.status === "new" ? "New" : "Resolved"],
      ]),
    ]);
    A.dialog("Question request", node, {
      confirm: "Upload this question",
      cancel: "Close",
    }).then(function (res) {
      if (res.isConfirmed) upload(r);
    });
  }

  function remove(r, root) {
    A.confirm(
      "Delete this request?",
      "The request for " + r.courseCode + " will be removed permanently.",
      "Delete request",
      function () {
        if (
          A.commit(function (n) {
            n.requests = n.requests.filter(function (x) {
              return x.id !== r.id;
            });
          })
        ) {
          A.notify("Request deleted.");
          A.refreshNav();
          list(root);
        }
      },
    );
  }
})();
