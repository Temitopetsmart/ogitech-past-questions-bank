const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  public: path.join(root, "assets/js/app.js"),
  admin: path.join(root, "assets/js/admin-core.js"),
  css: path.join(root, "assets/css/style.css"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${name} file: ${file}`);
    process.exit(1);
  }
}

const rules = `
  function patchActionIcons(root) {
    var rules = [
      [/^search|find a question/i, "fa-magnifying-glass"],
      [/^clear|reset filters/i, "fa-rotate-left"],
      [/^browse|back to results|all questions/i, "fa-book-open"],
      [/^download/i, "fa-download"],
      [/^request/i, "fa-paper-plane"],
      [/^send feedback|contact/i, "fa-envelope"],
      [/^submit|save|add |create |upload|import/i, "fa-floppy-disk"],
      [/^edit|change|update/i, "fa-pen-to-square"],
      [/^delete|remove/i, "fa-trash"],
      [/^cancel|close/i, "fa-xmark"],
      [/^preview|view details|read more|learn more/i, "fa-eye"],
      [/^next/i, "fa-arrow-right"],
      [/^previous|^prev/i, "fa-arrow-left"],
      [/^login|sign in/i, "fa-right-to-bracket"],
      [/^logout|sign out/i, "fa-right-from-bracket"],
      [/^dashboard/i, "fa-gauge-high"],
      [/^settings|preferences/i, "fa-gear"],
      [/^export/i, "fa-file-export"],
      [/^publish/i, "fa-globe"],
      [/^unpublish/i, "fa-eye-slash"],
      [/^feature/i, "fa-star"],
      [/^filter/i, "fa-filter"],
      [/^refresh|reload/i, "fa-arrows-rotate"],
      [/^view public website|public site/i, "fa-arrow-up-right-from-square"]
    ];

    function apply(node) {
      if (!node || node.nodeType !== 1) return;
      if (!node.matches("a, button")) return;
      if (node.querySelector(".fa-solid, .fa-regular, .fa-brands")) return;

      var label = (
        node.getAttribute("aria-label") || node.textContent || ""
      ).replace(/\\s+/g, " ").trim();

      for (var i = 0; i < rules.length; i++) {
        if (rules[i][0].test(label)) {
          var icon = document.createElement("i");
          icon.className = "fa-solid " + rules[i][1] + " fa-icon-patch";
          icon.setAttribute("aria-hidden", "true");
          node.insertBefore(icon, node.firstChild);
          return;
        }
      }
    }

    apply(root);

    if (root.querySelectorAll) {
      root.querySelectorAll("a, button").forEach(apply);
    }
  }
`;

function patchFile(file, transform) {
  const original = fs.readFileSync(file, "utf8");
  const updated = transform(original);

  if (updated === original) {
    console.log(`SKIPPED (already patched): ${path.relative(root, file)}`);
    return;
  }

  fs.writeFileSync(file, updated, "utf8");
  console.log(`UPDATED: ${path.relative(root, file)}`);
}

patchFile(files.public, (source) => {
  if (source.includes("function patchActionIcons(root)")) {
    return source;
  }

  const insertionPoint = "  window.OGAUI = {";

  if (!source.includes(insertionPoint)) {
    throw new Error("Could not find OGAUI insertion point in app.js");
  }

  source = source.replace(insertionPoint, rules + "\n" + insertionPoint);

  const renderCall = "  renderAll();";
  const position = source.lastIndexOf(renderCall);

  if (position < 0) {
    throw new Error("Could not find renderAll() in app.js");
  }

  const end = position + renderCall.length;

  source =
    source.slice(0, end) +
    `

  patchActionIcons(document);

  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) patchActionIcons(node);
        });
      });
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }
` +
    source.slice(end);

  return source;
});

patchFile(files.admin, (source) => {
  if (source.includes("function patchAdminActionIcons(root)")) {
    return source;
  }

  const adminRules = rules.replace(
    "function patchActionIcons(root)",
    "function patchAdminActionIcons(root)",
  );

  const insertionPoint = "  function clear(el) {";

  if (!source.includes(insertionPoint)) {
    throw new Error("Could not find insertion point in admin-core.js");
  }

  source = source.replace(insertionPoint, adminRules + "\n" + insertionPoint);

  const routeCall = "    A.route();";
  const position = source.indexOf(routeCall);

  if (position < 0) {
    throw new Error("Could not find initial A.route() in admin-core.js");
  }

  const end = position + routeCall.length;

  source =
    source.slice(0, end) +
    `

    patchAdminActionIcons(document);

    if (window.MutationObserver) {
      new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) patchAdminActionIcons(node);
          });
        });
      }).observe(document.body, {
        childList: true,
        subtree: true
      });
    }
` +
    source.slice(end);

  return source;
});

patchFile(files.css, (source) => {
  if (source.includes(".fa-icon-patch")) return source;

  return (
    source +
    `

/* Font Awesome action icon spacing */
.fa-icon-patch {
  display: inline-block;
  margin-right: 0.45em;
  line-height: 1;
  flex-shrink: 0;
}
`
  );
});

console.log("\\nIcon patch applied. Review the changes before committing.");
