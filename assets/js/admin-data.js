/* Demo data: storage status, export, import (validated), reset. */
(function () {
  var A = OGAAdmin,
    h = A.h;

  /* Deep structural check of a backup. Returns an array of problems (empty = OK). */
  A.checkBackup = function (d) {
    var p = [];
    function arr(k) {
      if (!Array.isArray(d[k])) {
        p.push('"' + k + '" must be a list.');
        return [];
      }
      return d[k];
    }
    if (!d || typeof d !== "object" || Array.isArray(d))
      return ["The file must contain one JSON object."];
    if (d.schemaVersion !== 1)
      p.push(
        "Unsupported schema version: " +
          String(d.schemaVersion) +
          " (expected 1).",
      );
    if (!d.settings || typeof d.settings !== "object")
      p.push('Missing "settings".');
    else {
      if (
        typeof d.settings.siteName !== "string" ||
        !d.settings.siteName.trim()
      )
        p.push("settings.siteName is required.");
      if (!Array.isArray(d.settings.nav) || !d.settings.nav.length)
        p.push("settings.nav must be a non-empty list.");
    }
    if (
      !d.options ||
      !Array.isArray(d.options.programmes) ||
      !d.options.levels ||
      !Array.isArray(d.options.semesters)
    )
      p.push('"options" is missing programmes, levels or semesters.');
    if (!d.leadership || !d.leadership.rector || !d.leadership.sug)
      p.push('"leadership" needs rector and sug.');
    var deps = arr("departments"),
      qs = arr("questions"),
      hero = arr("hero"),
      secs = arr("sections"),
      ann = arr("announcements"),
      ids = {};
    deps.forEach(function (x, i) {
      if (
        !x ||
        typeof x.id !== "string" ||
        typeof x.name !== "string" ||
        !Array.isArray(x.programmes)
      )
        p.push("Department " + (i + 1) + " is malformed.");
      else {
        if (ids["d" + x.id]) p.push("Duplicate department id: " + x.id);
        ids["d" + x.id] = 1;
      }
    });
    var seen = {},
      o = d.options || {};
    qs.forEach(function (x, i) {
      var w = "Question " + (i + 1) + ": ";
      if (!x || typeof x.id !== "string" || !x.id)
        return p.push(w + "missing id.");
      if (seen[x.id]) p.push("Duplicate question id: " + x.id);
      seen[x.id] = 1;
      if (!ids["d" + x.departmentId])
        p.push(w + 'department "' + x.departmentId + '" does not exist.');
      if (o.programmes && o.programmes.indexOf(x.programme) === -1)
        p.push(w + "invalid programme.");
      if (o.levels && (o.levels[x.programme] || []).indexOf(x.level) === -1)
        p.push(w + "invalid level for programme.");
      if (o.semesters && o.semesters.indexOf(x.semester) === -1)
        p.push(w + "invalid semester.");
      if (
        typeof x.courseCode !== "string" ||
        typeof x.courseTitle !== "string" ||
        !x.courseCode.trim() ||
        !x.courseTitle.trim()
      )
        p.push(w + "course code and title are required.");
      if (
        !Number.isInteger(x.examYear) ||
        x.examYear < 2000 ||
        x.examYear > 2100
      )
        p.push(w + "invalid examination year.");
      if (typeof x.published !== "boolean" || typeof x.featured !== "boolean")
        p.push(w + "published and featured must be true or false.");
      if (typeof x.createdAt !== "string" || typeof x.updatedAt !== "string")
        p.push(w + "missing timestamps.");
    });
    hero.forEach(function (x, i) {
      if (!x || typeof x.heading !== "string" || typeof x.enabled !== "boolean")
        p.push("Hero slide " + (i + 1) + " is malformed.");
    });
    secs.forEach(function (x, i) {
      if (
        !x ||
        typeof x.id !== "string" ||
        typeof x.enabled !== "boolean" ||
        typeof x.heading !== "string"
      )
        p.push("Section " + (i + 1) + " is malformed.");
    });
    ann.forEach(function (x, i) {
      if (
        !x ||
        typeof x.id !== "string" ||
        typeof x.title !== "string" ||
        typeof x.date !== "string" ||
        typeof x.published !== "boolean"
      )
        p.push("Announcement " + (i + 1) + " is malformed.");
    });
    return p.slice(0, 8);
  };

  /* Validate, ask for confirmation, then replace. Existing data is untouched on any failure. */
  A.importText = function (text, done) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return A.notify(
        "Import failed: that file is not valid JSON. Your data was not changed.",
        "error",
      );
    }
    var problems = A.checkBackup(data);
    if (problems.length) {
      return A.modal(
        "This backup cannot be imported",
        [
          h("p", {
            text: "Your current data was not changed. Problems found:",
          }),
          h(
            "ul",
            {},
            problems.map(function (x) {
              return h("li", { text: x });
            }),
          ),
        ],
        [{ label: "Close", onClick: function () {} }],
      );
    }
    A.confirm(
      "Replace current data?",
      "This replaces everything saved in this browser with the contents of the file. Export first if you want to keep the current version.",
      "Replace with backup",
      function () {
        var r = OGA.importData(text);
        if (!r.ok) return A.notify("Import failed: " + r.error, "error");
        A.notify("Backup imported.");
        if (done) done();
      },
    );
  };

  A.register("data", "Demo data", function (root) {
    root.appendChild(
      A.title(
        "Demo data",
        "Everything is saved in this browser only. It is not shared with other people or devices, and clearing site data erases it.",
      ),
    );
    var s = OGA.get(),
      st = OGA.status(),
      raw = OGA.exportData(),
      canWrite = true;
    try {
      localStorage.setItem("oga_demo_probe", "1");
      localStorage.removeItem("oga_demo_probe");
    } catch (e) {
      canWrite = false;
    }
    root.appendChild(h("h2", { text: "Storage status" }));
    var ul = h("ul");
    [
      [
        "Storage",
        canWrite
          ? "Available"
          : "Unavailable or full. Changes cannot be saved.",
      ],
      ["Data format version", String(s.schemaVersion)],
      [
        "Approximate size",
        (raw.length / 1024).toFixed(1) + " KB (browsers allow roughly 5 MB)",
      ],
      [
        "Questions / departments",
        s.questions.length + " / " + s.departments.length,
      ],
      ["Announcements", String(s.announcements.length)],
      ["Health", st.ok ? "OK" : st.message],
    ].forEach(function (r) {
      ul.appendChild(h("li", { text: r[0] + ": " + r[1] }));
    });
    root.appendChild(ul);

    root.appendChild(h("h2", { text: "Export" }));
    root.appendChild(
      h("p", {
        class: "muted",
        text: "Downloads all current content as one JSON file.",
      }),
    );
    var ex = h("button", {
      type: "button",
      class: "btn",
      text: "Export data (JSON)",
    });
    ex.onclick = function () {
      try {
        var url = URL.createObjectURL(
          new Blob([OGA.exportData()], { type: "application/json" }),
        );
        var a = h("a", {
          href: url,
          download:
            "oga-past-questions-backup-" +
            new Date().toISOString().slice(0, 10) +
            ".json",
        });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
        A.notify("Export started. Check your downloads.");
      } catch (e) {
        A.notify("Export failed in this browser.", "error");
      }
    };
    root.appendChild(h("p", {}, [ex]));

    root.appendChild(h("h2", { text: "Import" }));
    var file = h("input", {
      type: "file",
      id: "impfile",
      accept: "application/json,.json",
      "aria-describedby": "impmsg",
    });
    var msg = h("p", {
      class: "hint",
      id: "impmsg",
      text: "Choose a backup exported from this prototype (JSON, up to 2 MB). It is checked before anything is replaced.",
    });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/\.json$/i.test(f.name) && f.type !== "application/json") {
        msg.textContent = "Please choose a .json file.";
        file.value = "";
        return;
      }
      if (f.size > 2 * 1048576) {
        msg.textContent = "That file is larger than 2 MB.";
        file.value = "";
        return;
      }
      var r = new FileReader();
      r.onload = function () {
        file.value = "";
        A.importText(String(r.result), function () {
          A.route();
        });
      };
      r.onerror = function () {
        A.notify("Could not read that file.", "error");
      };
      r.readAsText(f);
    });
    root.appendChild(
      h("div", { class: "field" }, [
        h("label", { for: "impfile", text: "Backup file" }),
        file,
        msg,
      ]),
    );

    root.appendChild(
      h("h2", { text: "Reset to the original demonstration content" }),
    );
    root.appendChild(
      h("p", {
        class: "muted",
        text: "Replaces every local change (questions, settings, slides, announcements and so on) with the original sample data.",
      }),
    );
    var rs = h("button", {
      type: "button",
      class: "btn danger",
      text: "Reset demo data",
    });
    rs.onclick = function () {
      A.confirm(
        "Reset all demo data?",
        "This replaces your local prototype changes with the original sample data. Export first if you want a copy.",
        "Reset everything",
        function () {
          var r = OGA.resetDemoData();
          if (!r.ok) return A.notify(r.error, "error");
          A.notify("Demo data restored.");
          A.route();
        },
      );
    };
    root.appendChild(h("p", {}, [rs]));
  });
})();
