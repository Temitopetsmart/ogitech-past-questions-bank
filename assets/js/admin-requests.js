/* Requests inbox: questions students asked for through the public "Request a Question" form. */
(function () {
  var A = OGAAdmin,
    h = A.h;
  var filter = "new", page = 1;

  A.register(
    "requests",
    "Requests",
    function (root) {
      return list(root);
    },
    {
      icon: "fa-inbox",
      badge: function () {
        return A.badges.requests;
      },
    },
  );

  function summary(r) {
    return [
      r.department || "Unknown department",
      r.programme,
      r.level,
      r.semester + " semester",
      r.examYear ? "Exam " + r.examYear : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  /* Fetch the list and paint it into root. Returns a promise. */
  function list(root) {
    return A.api("GET", "admin/requests", { query: { status: filter, page: page } }).then(
      function (res) {
        page = res.meta.page;
        A.clear(root);
        A.badges.requests = res.meta.new;
        A.refreshNav();
        paint(root, res);
      },
    );
  }

  function paint(root, res) {
    var meta = res.meta;
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
      ["new", "New", meta.new],
      ["resolved", "Resolved", meta.resolved],
      ["", "All", meta.all],
    ].forEach(function (t) {
      var b = h("button", {
        type: "button",
        class: "tab" + (filter === t[0] ? " on" : ""),
        "aria-pressed": String(filter === t[0]),
        text: t[1] + " (" + t[2] + ")",
      });
      b.addEventListener("click", function () {
        filter = t[0];
        page = 1;
        reload(root);
      });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    if (!res.data.length) {
      root.appendChild(
        meta.all
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
    res.data.forEach(function (r) {
      var isNew = r.status === "new";
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
            A.pill(isNew ? "New" : "Resolved", isNew ? "warn" : "ok"),
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
              isNew ? "fa-check" : "fa-rotate-left",
              "subtle",
              function () {
                setStatus(r, isNew ? "resolved" : "new", root);
              },
              isNew
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
    var pager = A.pagination(meta, function (nextPage) { page = nextPage; reload(root); });
    if (pager) root.appendChild(pager);
  }

  function reload(root) {
    return list(root).then(null, function (err) {
      A.handleError(err);
    });
  }

  function setStatus(r, status, root) {
    A.api("POST", "admin/requests/" + r.id + "/status", {
      json: { status: status },
    }).then(function () {
      A.notify(
        status === "resolved" ? "Marked as resolved." : "Request reopened.",
      );
      return reload(root);
    }, A.handleError);
  }

  function upload(r) {
    A.go("questions", { add: { requestId: r.id, request: r } });
  }

  function view(r, root) {
    var node = h("div", {}, [
      A.dl([
        ["Course", r.courseCode + " – " + r.courseTitle],
        ["Department", r.department || "Unknown department"],
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
        A.api("DELETE", "admin/requests/" + r.id).then(function () {
          A.notify("Request deleted.");
          return reload(root);
        }, A.handleError);
      },
    );
  }
})();
