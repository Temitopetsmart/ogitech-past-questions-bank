(function () {
  var UI = OGAUI,
    h = UI.h;
  function render(s) {
    var a = OGA.get().about || {
      heading: "About",
      intro: "",
      paragraphs: [],
      feedback: "",
    };
    var box = document.getElementById("about");
    UI.clear(box);
    box.appendChild(
      h("div", { class: "page-head" }, [
        h("h1", { text: a.heading }),
        h("p", { class: "muted", text: a.intro }),
      ]),
    );
    (a.paragraphs || []).forEach(function (t) {
      box.appendChild(h("p", { text: t }));
    });
    var sug = OGA.get().leadership.sug;
    if (sug && sug.visible)
      box.appendChild(
        h("div", { class: "card", style: "margin:1.25rem 0" }, [
          h("h2", { text: sug.heading }),
          h("p", { text: sug.message }),
        ]),
      );
    var c = (s || OGA.getSettings()).contact || {};
    box.appendChild(h("p", { text: a.feedback }));
    var acts = h("p", {}, [
      h("a", {
        class: "btn",
        href: "request-question.html",
        text: "Request a Question",
      }),
    ]);
    if (c.email) {
      acts.appendChild(document.createTextNode(" "));
      acts.appendChild(
        h("a", {
          class: "btn alt",
          href: UI.safeHref("mailto:" + c.email),
          text: "Send feedback",
        }),
      );
    }
    box.appendChild(acts);
  }
  window.OGAPage = { render: render };
  render();
})();
