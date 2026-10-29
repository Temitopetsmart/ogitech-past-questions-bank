/*
 * Homepage hero editor.
 * One hero slide and one replaceable custom image.
 * The default image remains in assets/images/gate.png.
 *
 * Frontend-only storage: uploaded images are stored as data URLs.
 * The PHP backend will later replace this with a real file upload.
 */
(function () {
  "use strict";

  var A = OGAAdmin;
  var h = A.h;
  var DEFAULT_IMAGE = "assets/images/gate.png";
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;

  A.register("hero", "Homepage hero", function (root) {
    var existing = OGA.get().hero || [];
    var original = existing[0] || {
      id: "homepage-hero",
      enabled: true,
      eyebrow: "Your study resource",
      heading: "Prepare Better. Study Smarter.",
      text: "Find past examination questions by department, programme, level, semester and course.",
      image: "",
      primaryLabel: "Search",
      secondaryLabel: "Browse Questions",
      secondaryHref: "browse.html",
    };

    var draft = JSON.parse(JSON.stringify(original));
    var uploadedImage = "";
    var fileInput;
    var preview = h("div", { class: "hero-editor-preview" });
    var imageStatus = h("p", {
      class: "hint",
      role: "status",
    });

    function field(label, value, options) {
      options = options || {};

      var input = options.multiline
        ? h("textarea", {
            rows: options.rows || "4",
            maxlength: String(options.maxlength || 200),
          })
        : h("input", {
            type: "text",
            maxlength: String(options.maxlength || 80),
          });

      input.value = value || "";

      var labelEl = h("label", {
        text: label,
      });

      labelEl.appendChild(input);

      var wrap = h("div", { class: "field" }, [labelEl]);

      if (options.hint) {
        wrap.appendChild(
          h("p", {
            class: "hint",
            text: options.hint,
          }),
        );
      }

      return {
        wrap: wrap,
        input: input,
      };
    }

    var eyebrow = field("Small heading", draft.eyebrow, {
      maxlength: 40,
    });

    var heading = field("Main heading", draft.heading, {
      maxlength: 60,
    });

    var description = field("Description", draft.text, {
      multiline: true,
      rows: 4,
      maxlength: 200,
    });

    var primaryLabel = field("Search button label", draft.primaryLabel, {
      maxlength: 20,
    });

    var secondaryLabel = field("Secondary button label", draft.secondaryLabel, {
      maxlength: 30,
    });

    var secondaryHref = field(
      "Secondary button destination",
      draft.secondaryHref,
      {
        maxlength: 200,
        hint: "For example, browse.html",
      },
    );

    var enabled = h("input", {
      type: "checkbox",
    });
    enabled.checked = draft.enabled !== false;

    var enabledLabel = h(
      "label",
      {
        class: "chk",
      },
      [
        enabled,
        h("span", {
          text: "Show the hero on the homepage",
        }),
      ],
    );

    var uploadButton = h("button", {
      type: "button",
      class: "btn",
      text: "Upload hero image",
    });

    var replaceButton = h("button", {
      type: "button",
      class: "btn alt",
      text: "Replace image",
    });

    var defaultButton = h("button", {
      type: "button",
      class: "btn alt",
      text: "Use default image",
    });

    var saveButton = h("button", {
      type: "button",
      class: "btn",
      text: "Save hero changes",
    });

    fileInput = h("input", {
      type: "file",
      accept: "image/jpeg,image/png,image/webp,image/gif",
      "aria-label": "Choose a hero image",
    });

    fileInput.hidden = true;

    function currentImage() {
      return uploadedImage || draft.image || "";
    }

    function isDataImage(value) {
      return /^data:image\/(jpeg|png|webp|gif);base64,/i.test(value || "");
    }

    function previewUrl(value) {
      if (!value) return "../" + DEFAULT_IMAGE;

      if (isDataImage(value)) return value;

      if (/^https?:\/\//i.test(value)) return value;

      return "../" + value.replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
    }

    function paintPreview() {
      A.clear(preview);

      var image = h("img", {
        class: "hero-editor-image",
        alt: "Preview of the homepage hero image",
      });

      image.src = previewUrl(currentImage());

      image.onerror = function () {
        image.onerror = null;
        image.src = "../" + DEFAULT_IMAGE;
        imageStatus.textContent =
          "The selected image could not be displayed. The default image is shown instead.";
      };

      preview.appendChild(image);

      preview.appendChild(
        h("div", { class: "hero-editor-preview-copy" }, [
          h("span", {
            class: "hero-editor-eyebrow",
            text: eyebrow.input.value || "Your study resource",
          }),
          h("h2", {
            text: heading.input.value || "Your homepage heading",
          }),
          h("p", {
            text:
              description.input.value || "Your hero description appears here.",
          }),
          h("span", {
            class: "hero-editor-preview-button",
            text: primaryLabel.input.value || "Search",
          }),
        ]),
      );

      imageStatus.textContent = uploadedImage
        ? "A new image is selected. Save your changes to apply it."
        : draft.image
          ? "Current custom hero image."
          : "Using the default hero image.";
    }

    function markChanged() {
      A.editing = true;
      paintPreview();
    }

    [
      eyebrow,
      heading,
      description,
      primaryLabel,
      secondaryLabel,
      secondaryHref,
    ].forEach(function (item) {
      item.input.addEventListener("input", markChanged);
    });

    enabled.addEventListener("change", markChanged);

    function openFilePicker() {
      fileInput.click();
    }

    uploadButton.addEventListener("click", openFilePicker);
    replaceButton.addEventListener("click", openFilePicker);

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];

      if (!file) return;

      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        A.notify("Choose a JPG, PNG, WEBP or GIF image.", "error");
        fileInput.value = "";
        return;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        A.notify("The image must be 2 MB or smaller.", "error");
        fileInput.value = "";
        return;
      }

      var reader = new FileReader();

      reader.onerror = function () {
        A.notify("The selected image could not be read.", "error");
        fileInput.value = "";
      };

      reader.onload = function () {
        if (typeof reader.result !== "string" || !isDataImage(reader.result)) {
          A.notify("This image format could not be processed.", "error");
          fileInput.value = "";
          return;
        }

        uploadedImage = reader.result;
        A.editing = true;
        paintPreview();
        A.notify("Image selected. Save to publish the change.");
      };

      reader.readAsDataURL(file);
    });

    defaultButton.addEventListener("click", function () {
      A.confirm(
        "Use the default hero image?",
        "The custom image will be removed from the saved hero and the built-in image will be used instead.",
        "Use default image",
        function () {
          uploadedImage = "";
          draft.image = "";
          A.editing = true;
          fileInput.value = "";
          paintPreview();
        },
      );
    });

    saveButton.addEventListener("click", function () {
      var cleanHeading = heading.input.value.trim();
      var cleanPrimary = primaryLabel.input.value.trim();
      var cleanDestination = secondaryHref.input.value.trim();

      if (cleanHeading.length < 2) {
        A.notify("Enter a heading with at least 2 characters.", "error");
        heading.input.focus();
        return;
      }

      if (!cleanPrimary) {
        A.notify("Enter a label for the search button.", "error");
        primaryLabel.input.focus();
        return;
      }

      if (
        cleanDestination &&
        A.safeHref(cleanDestination) === "#" &&
        cleanDestination !== "#"
      ) {
        A.notify("Enter a valid secondary button destination.", "error");
        secondaryHref.input.focus();
        return;
      }

      var finalImage = uploadedImage || draft.image || "";

      if (
        finalImage &&
        !isDataImage(finalImage) &&
        A.safeHref(finalImage) === "#"
      ) {
        A.notify("The existing hero image path is invalid.", "error");
        return;
      }

      var clean = {
        id: draft.id || "homepage-hero",
        enabled: enabled.checked,
        eyebrow: eyebrow.input.value.trim(),
        heading: cleanHeading,
        text: description.input.value.trim(),
        image: finalImage,
        primaryLabel: cleanPrimary,
        secondaryLabel: secondaryLabel.input.value.trim(),
        secondaryHref: cleanDestination || "browse.html",
      };

      var result = A.commit(function (state) {
        /*
         * Keep one hero record rather than accumulating slides.
         * The image itself is replaced in this record.
         */
        state.hero = [clean];
      }, "Homepage hero updated");

      if (result) {
        draft = JSON.parse(JSON.stringify(clean));
        uploadedImage = "";
        fileInput.value = "";
        A.editing = false;
        paintPreview();
        A.notify("Homepage hero saved successfully.");
      }
    });

    root.appendChild(
      A.title(
        "Homepage hero",
        "Update the homepage message and image. The default image is restored whenever no custom image is selected.",
      ),
    );

    var imageCard = h(
      "section",
      {
        class: "slide-card hero-editor-card",
      },
      [
        h("h2", { text: "Hero image" }),
        preview,
        imageStatus,
        h(
          "div",
          {
            class: "acts hero-editor-actions",
          },
          [uploadButton, replaceButton, defaultButton],
        ),
        fileInput,
      ],
    );

    var contentCard = h(
      "section",
      {
        class: "slide-card hero-editor-card",
      },
      [
        h("h2", { text: "Hero content" }),
        eyebrow.wrap,
        heading.wrap,
        description.wrap,
        primaryLabel.wrap,
        secondaryLabel.wrap,
        secondaryHref.wrap,
        enabledLabel,
      ],
    );

    root.appendChild(imageCard);
    root.appendChild(contentCard);
    root.appendChild(h("div", { class: "hero-editor-save" }, [saveButton]));

    paintPreview();
  });
})();
