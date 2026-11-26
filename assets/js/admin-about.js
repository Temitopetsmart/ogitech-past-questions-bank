/* About page and institutional history management — Main Admin only. */
(function () {
  "use strict";

  var A = OGAAdmin;
  var h = A.h;

  A.register(
    "about",
    "About Page",
    function (root) {
      return load(root);
    },
    { icon: "fa-landmark", roles: ["main"], group: "admin" },
  );

  var current = null;

  function load(root) {
    return A.api("GET", "admin/about").then(function (res) {
      current = res.data || {};
      render(root);
    });
  }

  function reload(root) {
    load(root).catch(A.handleError);
  }

  function field(id, label, value, rows, hint) {
    return A.field({
      id: id,
      label: label,
      type: "textarea",
      value: value || "",
      rows: rows || 4,
      hint: hint || "",
    });
  }

  function render(root) {
    A.clear(root);

    var content = current.content || {};
    var people = current.people || [];

    root.appendChild(
      A.title(
        "About Page",
        "Maintain the permanent record of the project, the institution and the people associated with it.",
      ),
    );

    var fields = {
      heading: A.field({
        id: "about-heading",
        label: "Page heading",
        value: content.heading || "",
        maxlength: 160,
        required: true,
      }),
      introduction: field(
        "about-introduction",
        "Introduction",
        content.introduction,
        4,
        "A short introduction displayed at the beginning of the page.",
      ),
      projectHistory: field(
        "about-project-history",
        "History of the Past Questions Bank",
        content.projectHistory,
        7,
        "Explain when and why the project started, how it developed and what it represents.",
      ),
      institutionHistory: field(
        "about-institution-history",
        "About OGITECH",
        content.institutionHistory,
        7,
        "Enter the approved background and history of the institution.",
      ),
      projectPurpose: field(
        "about-project-purpose",
        "Purpose and objectives",
        content.projectPurpose,
        5,
        "Explain the project's objectives and its value to students.",
      ),
      historicalNote: field(
        "about-historical-note",
        "Historical record / special note",
        content.historicalNote,
        5,
        "Record the context of this period, important milestones and other details worth preserving.",
      ),
    };

    var save = h("button", {
      type: "submit",
      class: "btn primary",
      text: "Save About Page",
    });

    var form = h("form", { class: "qform", novalidate: "" }, [
      A.card("Project and institutional information", [
        fields.heading.wrap,
        fields.introduction.wrap,
        fields.projectHistory.wrap,
        fields.institutionHistory.wrap,
        fields.projectPurpose.wrap,
        fields.historicalNote.wrap,
        h("div", { class: "form-actions" }, [save]),
      ]),
    ]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var errors = {};
      if (fields.heading.get().length < 3) {
        errors.heading = "Enter a page heading.";
      }

      if (!A.applyErrors(fields, errors)) {
        A.notify("Please correct the highlighted fields.", "error");
        return;
      }

      var payload = {
        heading: fields.heading.get(),
        introduction: fields.introduction.get(),
        projectHistory: fields.projectHistory.get(),
        institutionHistory: fields.institutionHistory.get(),
        projectPurpose: fields.projectPurpose.get(),
        historicalNote: fields.historicalNote.get(),
      };

      A.busy(save, true, "Saving…");

      A.api("POST", "admin/about", { json: payload }).then(
        function (res) {
          current = res.data || current;
          A.notify("About page content saved.");
          render(root);
        },
        function (err) {
          A.busy(save, false);
          A.handleError(err, fields);
        },
      );
    });

    root.appendChild(form);

    root.appendChild(
      A.title(
        "Historical People and Office Holders",
        "Add current and former institutional leaders, SUG executives and other important contributors. Keep previous records and hide them only when necessary.",
        [
          A.btn("Add person", "fa-plus", "primary", function () {
            editPerson(root, null);
          }),
        ],
      ),
    );

    if (!people.length) {
      root.appendChild(
        A.empty(
          "fa-users",
          "No historical people added yet",
          "Add the Rector, SUG President and other people whose names and offices should be preserved in this record.",
          A.btn("Add first person", "fa-plus", "primary", function () {
            editPerson(root, null);
          }),
        ),
      );
      return;
    }

    var list = h("div", { class: "about-admin-list" });

    people.forEach(function (person) {
      list.appendChild(
        h("article", { class: "about-admin-item" }, [
          h("div", { class: "about-admin-info" }, [
            h("strong", { text: person.name }),
            h("span", {
              class: "muted",
              text: person.position,
            }),
            h("span", {
              class: "muted",
              text: [person.organisation, person.tenurePeriod]
                .filter(Boolean)
                .join(" · "),
            }),
            A.pill(
              person.visible ? "Visible publicly" : "Hidden",
              person.visible ? "ok" : "warn",
            ),
          ]),
          h("div", { class: "q-actions" }, [
            A.btn("Edit", "fa-pen-to-square", "subtle", function () {
              editPerson(root, person);
            }),
            A.btn(
              person.visible ? "Hide" : "Show",
              person.visible ? "fa-eye-slash" : "fa-eye",
              "subtle",
              function () {
                savePerson(root, person, !person.visible);
              },
            ),
          ]),
        ]),
      );
    });

    root.appendChild(list);
  }

  function editPerson(root, person) {
    var item = person || {
      name: "",
      position: "",
      organisation: "OGITECH",
      tenurePeriod: "",
      biography: "",
      visible: true,
    };

    A.clear(root);

    root.appendChild(
      A.title(
        person ? "Edit historical record" : "Add historical person",
        "Enter the person's verified name, official position and period of service.",
        [
          A.btn("Back to About Page", "fa-arrow-left", "ghost", function () {
            reload(root);
          }),
        ],
      ),
    );

    var fields = {
      name: A.field({
        id: "person-name",
        label: "Full name",
        value: item.name,
        maxlength: 120,
        required: true,
      }),
      position: A.field({
        id: "person-position",
        label: "Official position / title",
        value: item.position,
        maxlength: 160,
        required: true,
      }),
      organisation: A.field({
        id: "person-organisation",
        label: "Organisation",
        value: item.organisation,
        maxlength: 160,
      }),
      tenurePeriod: A.field({
        id: "person-tenure",
        label: "Tenure / period",
        value: item.tenurePeriod,
        maxlength: 100,
        hint: "Example: 2025–2027. Leave blank if not applicable.",
      }),
      biography: field(
        "person-biography",
        "Short biography / historical note",
        item.biography,
        5,
        "Optional. Include verified information about the person's contribution or role.",
      ),
      visible: A.field({
        id: "person-visible",
        label: "Display this record on the public About page",
        type: "checkbox",
        value: item.visible !== false,
      }),
    };

    var save = h("button", {
      type: "submit",
      class: "btn primary",
      text: person ? "Save changes" : "Add historical record",
    });

    var form = h("form", { class: "qform", novalidate: "" }, [
      A.card("Person's details", [
        h("div", { class: "formgrid" }, [
          fields.name.wrap,
          fields.position.wrap,
          fields.organisation.wrap,
          fields.tenurePeriod.wrap,
        ]),
        fields.biography.wrap,
        fields.visible.wrap,
        h("div", { class: "form-actions" }, [
          save,
          A.btn("Cancel", "fa-xmark", "ghost", function () {
            reload(root);
          }),
        ]),
      ]),
    ]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var errors = {};
      if (fields.name.get().length < 2) errors.name = "Enter the full name.";
      if (fields.position.get().length < 2)
        errors.position = "Enter the official position.";

      if (!A.applyErrors(fields, errors)) {
        A.notify("Please correct the highlighted fields.", "error");
        return;
      }

      var payload = {
        name: fields.name.get(),
        position: fields.position.get(),
        organisation: fields.organisation.get(),
        tenurePeriod: fields.tenurePeriod.get(),
        biography: fields.biography.get(),
        visible: fields.visible.get(),
      };

      A.busy(save, true, "Saving…");

      A.api(
        "POST",
        "admin/about/people" +
          (person ? "/" + encodeURIComponent(person.id) : ""),
        { json: payload },
      ).then(
        function () {
          A.notify(
            person ? "Historical record updated." : "Historical record added.",
          );
          reload(root);
        },
        function (err) {
          A.busy(save, false);
          A.handleError(err, fields);
        },
      );
    });

    root.appendChild(form);
  }

  function savePerson(root, person, visible) {
    var payload = {
      name: person.name,
      position: person.position,
      organisation: person.organisation,
      tenurePeriod: person.tenurePeriod,
      biography: person.biography,
      visible: visible,
    };

    A.api("POST", "admin/about/people/" + encodeURIComponent(person.id), {
      json: payload,
    }).then(function () {
      A.notify(
        visible
          ? "Record is now visible."
          : "Record hidden. It remains saved in the database.",
      );
      reload(root);
    }, A.handleError);
  }
})();
