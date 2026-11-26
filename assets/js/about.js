(function () {
  "use strict";

  var UI = OGAUI;
  var h = UI.h;

  function section(box, heading, content) {
    content = String(content || "").trim();
    if (!content) return;

    box.appendChild(
      h("section", { class: "about-section" }, [
        h("h2", { text: heading }),
        h("p", { class: "about-copy", text: content }),
      ]),
    );
  }

  function render() {
    var box = document.getElementById("about");
    UI.clear(box);

    box.appendChild(
      h("p", {
        class: "muted",
        role: "status",
        text: "Loading institutional history…",
      }),
    );

    OGA.about().then(
      function (data) {
        UI.clear(box);

        var content = data.content || {};
        var people = data.people || [];

        box.appendChild(
          h("header", { class: "about-intro" }, [
            h("h1", {
              text: content.heading || "About OGITECH Past Questions Bank",
            }),
            content.introduction
              ? h("p", {
                  class: "about-copy about-lead",
                  text: content.introduction,
                })
              : null,
          ]),
        );

        section(box, "History of the Project", content.projectHistory);
        section(box, "About the Institution", content.institutionHistory);
        section(box, "Purpose and Objectives", content.projectPurpose);
        section(box, "Historical Record", content.historicalNote);

        if (people.length) {
          var list = h("div", { class: "about-people-grid" });

          people.forEach(function (person) {
            var details = [person.organisation, person.tenurePeriod]
              .filter(Boolean)
              .join(" · ");

            list.appendChild(
              h("article", { class: "about-person-card" }, [
                h(
                  "div",
                  { class: "about-person-mark", "aria-hidden": "true" },
                  [h("i", { class: "fa-solid fa-user-tie" })],
                ),
                h("div", { class: "about-person-body" }, [
                  h("p", {
                    class: "about-person-position",
                    text: person.position,
                  }),
                  h("h3", { text: person.name }),
                  details
                    ? h("p", {
                        class: "muted about-person-meta",
                        text: details,
                      })
                    : null,
                  person.biography
                    ? h("p", { class: "about-copy", text: person.biography })
                    : null,
                ]),
              ]),
            );
          });

          box.appendChild(
            h("section", { class: "about-section" }, [
              h("h2", { text: "People and Leadership" }),
              h("p", {
                class: "muted",
                text: "A record of people who have served the institution and its student community.",
              }),
              list,
            ]),
          );
        }

        if (
          !content.projectHistory &&
          !content.institutionHistory &&
          !content.projectPurpose &&
          !content.historicalNote &&
          !content.introduction &&
          !people.length
        ) {
          box.appendChild(
            h("p", {
              class: "empty",
              text: "The institutional history is being prepared.",
            }),
          );
        }

        var actions = h("div", { class: "about-actions" }, [
          h("a", {
            class: "btn",
            href: "request-question.html",
            text: "Request a Question",
          }),
        ]);

        box.appendChild(actions);
      },
      function () {
        UI.clear(box);
        box.appendChild(
          h("div", { class: "empty", role: "alert" }, [
            h("h2", { text: "About page could not be loaded" }),
            h("p", {
              text: "Please refresh the page and try again.",
            }),
          ]),
        );
      },
    );
  }

  window.OGAPage = { render: render };
  render();
})();
