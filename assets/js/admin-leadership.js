/* Leadership management — admin */
(function () {
  "use strict";

  var A = OGAAdmin;
  var h = A.h;

  A.register(
    "leadership",
    "Leadership",
    function (root) {
      return list(root);
    },
    { icon: "fa-user-tie", roles: ["main", "manager"], group: "work" },
  );

  function imageUrl(item) {
    return item.photoUrl || item.imageUrl || "";
  }

  function list(root) {
    return A.api("GET", "admin/leadership").then(function (res) {
      var items = res.data || [];
      A.clear(root);

      root.appendChild(
        A.title(
          "Leadership",
          "Manage the names, photographs and messages displayed in the public leadership section.",
          [
            A.btn("Add leader", "fa-plus", "primary", function () {
              edit(root, null);
            }),
          ],
        ),
      );

      if (!items.length) {
        root.appendChild(
          A.empty(
            "fa-user-tie",
            "No leadership profiles yet",
            "Add a leader to display their photograph, name, position and message on the homepage.",
            A.btn("Add first leader", "fa-plus", "primary", function () {
              edit(root, null);
            }),
          ),
        );
        return;
      }

      var box = h("div", { class: "leadership-admin-list" });

      items.forEach(function (item) {
        var photo = imageUrl(item);
        var preview = photo
          ? h("img", {
              class: "leadership-admin-thumb",
              src: photo,
              alt: "",
            })
          : h("div", { class: "leadership-admin-thumb empty-photo" }, [
              h("i", { class: "fa-solid fa-user" }),
            ]);

        var status = item.visible
          ? A.pill("Visible", "ok")
          : A.pill("Hidden", "warn");

        box.appendChild(
          h("article", { class: "leadership-admin-item" }, [
            preview,
            h("div", { class: "leadership-admin-info" }, [
              h("strong", { text: item.name }),
              h("span", {
                class: "muted",
                text: item.position || item.title || "Leadership",
              }),
              status,
            ]),
            h("div", { class: "q-actions" }, [
              A.btn("Edit", "fa-pen-to-square", "subtle", function () {
                edit(root, item);
              }),
              A.btn(
                item.visible ? "Hide" : "Show",
                item.visible ? "fa-eye-slash" : "fa-eye",
                "subtle",
                function () {
                  toggleVisibility(root, item);
                },
              ),
              A.btn(
                "",
                "fa-trash",
                "subtle danger-text",
                function () {
                  remove(root, item);
                },
                "Delete " + item.name,
              ),
            ]),
          ]),
        );
      });

      root.appendChild(box);
    });
  }

  function reload(root) {
    list(root).catch(A.handleError);
  }

  function edit(root, item) {
    var current = item || {
      name: "",
      position: "",
      message: "",
      visible: true,
    };

    A.clear(root);

    root.appendChild(
      A.title(
        item ? "Edit leadership profile" : "Add leadership profile",
        null,
        [
          A.btn("Back to leadership", "fa-arrow-left", "ghost", function () {
            reload(root);
          }),
        ],
      ),
    );

    var fields = {
      name: A.field({
        id: "leader-name",
        label: "Full name",
        value: current.name,
        maxlength: 100,
        required: true,
      }),

      message: A.field({
        id: "leader-message",
        label: "Message",
        type: "textarea",
        value: current.message,
        rows: 7,
        required: true,
        hint: "Enter the approved message to display below the leader's name.",
      }),

      visible: A.field({
        id: "leader-visible",
        label: "Display this profile publicly",
        type: "checkbox",
        value: current.visible !== false,
      }),
    };

    var upload = h("input", {
      type: "file",
      id: "leader-photo",
      accept: "image/jpeg,image/png,image/webp",
    });

    var uploadField = h("div", { class: "field" }, [
      h("label", { for: "leader-photo", text: "Leadership photograph" }),
      upload,
      h("p", {
        class: "hint",
        text: item
          ? "Choose a new image only if you want to replace the current photograph. JPG, PNG or WebP."
          : "Upload a clear portrait photograph. JPG, PNG or WebP.",
      }),
    ]);

    var existingPhoto = imageUrl(current);
    var preview = h("img", {
      class: "leadership-form-preview",
      src: existingPhoto || "",
      alt: "Leadership photograph preview",
      hidden: !existingPhoto,
    });
    var previewPlaceholder = h(
      "div",
      {
        class: "leadership-form-placeholder",
        hidden: !!existingPhoto,
      },
      [h("i", { class: "fa-solid fa-user-tie" })],
    );

    upload.addEventListener("change", function () {
      var file = upload.files && upload.files[0];
      if (!file) return;

      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        upload.value = "";
        A.notify("Choose a JPG, PNG or WebP image.", "error");
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        preview.src = reader.result;
        preview.hidden = false;
        previewPlaceholder.hidden = true;
      };
      reader.readAsDataURL(file);
    });

    var save = h("button", { type: "submit", class: "btn primary" }, [
      h("i", { class: "fa-solid fa-floppy-disk", "aria-hidden": "true" }),
      item ? "Save changes" : "Add leader",
    ]);

    var form = h("form", { class: "qform", novalidate: "" }, [
      A.card("Profile details", [
        h("div", { class: "formgrid" }, [fields.name.wrap]),
        fields.message.wrap,
        fields.visible.wrap,
      ]),
      A.card("Photograph", [
        h("div", { class: "leadership-upload-layout" }, [
          h("div", { class: "leadership-preview-wrap" }, [
            preview,
            previewPlaceholder,
          ]),
          uploadField,
        ]),
      ]),
      h("div", { class: "form-actions" }, [
        save,
        A.btn("Cancel", "fa-xmark", "ghost", function () {
          reload(root);
        }),
      ]),
    ]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = fields.name.get();
      var message = fields.message.get();
      var visible = fields.visible.get();

      var errors = {};
      if (name.length < 2) errors.name = "Enter the leader's full name.";
      if (!message) errors.message = "Enter the leadership message.";
      if (!A.applyErrors(fields, errors)) {
        A.notify("Please correct the highlighted fields.", "error");
        return;
      }

      var file = upload.files && upload.files[0];
      if (!item && !file) {
        A.notify("Upload a photograph for this leader.", "error");
        upload.focus();
        return;
      }

      var data = new FormData();
      data.append("name", name);
      data.append("message", message);
      data.append("visible", visible ? "1" : "0");
      if (file) data.append("image", file);

      A.busy(save, true, "Saving…");

      A.api(
        "POST",
        "admin/leadership" + (item ? "/" + encodeURIComponent(item.id) : ""),
        { form: data },
      ).then(
        function () {
          A.notify(
            item ? "Leadership profile updated." : "Leadership profile added.",
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

  function toggleVisibility(root, item) {
    var data = new FormData();
    data.append("name", item.name);
    data.append("message", item.message);
    data.append("visible", item.visible ? "0" : "1");

    A.api("POST", "admin/leadership/" + encodeURIComponent(item.id), {
      form: data,
    }).then(function () {
      A.notify(item.visible ? "Profile hidden." : "Profile is now visible.");
      reload(root);
    }, A.handleError);
  }

  function remove(root, item) {
    A.confirm(
      "Delete this leadership profile?",
      "The profile and its uploaded photograph will be removed.",
      "Delete profile",
      function () {
        A.api("DELETE", "admin/leadership/" + encodeURIComponent(item.id)).then(
          function () {
            A.notify("Leadership profile deleted.");
            reload(root);
          },
          A.handleError,
        );
      },
    );
  }
})();
