/* Data layer for the public site and the admin.
   - Site text that is not question-bank data (header, hero, leadership, about, ...) is HARDCODED in HARD below.
   - Everything else comes from the PHP API through the functions at the bottom (window.OGA).
   The API folder is found relative to this script, so it works from the site root and from /admin/. */
(function () {
  "use strict";

  var script = document.currentScript;
  var API = "api/";
  try {
    if (script && script.src) API = new URL("../../api/", script.src).href;
  } catch (e) {}

  /* ---------- Hardcoded public content (not editable in admin) ---------- */
  var HARD = {
    settings: {
      siteName: "Past Questions Bank",
      orgLine: "Students' Union Government",
      shortName: "OGITECH",
      logo: "assets/images/logo.png",
      tagline:
        "Find past examination questions by department, programme, level, semester and course.",
      metaDescription:
        "Past examination questions for students of Ogun State Institute of Technology, Igbesa.",
      footerText:
        "An academic resource for OGITECH students. Not necessarily an official institutional website unless confirmed.",
      copyright: "© 2026 OGITECH SUG Past Questions Bank.",
      contact: { email: "", phone: "", address: "Igbesa, Ogun State, Nigeria" },
      social: [],
      links: { school: "", sug: "" },
      nav: [
        { label: "Home", href: "index.html" },
        { label: "Browse Questions", href: "browse.html" },
        { label: "Departments", href: "index.html#departments" },
        { label: "About", href: "about.html" },
        { label: "Request a Question", href: "request-question.html" },
      ],
      theme: { green: "#0b5d34", accent: "#c8102e", gold: "#c9a227" },
    },
    hero: [
      {
        id: "s1",
        enabled: true,
        eyebrow: "Your study resource",
        heading: "Prepare Better. Study Smarter.",
        text: "Find past examination questions by department, programme, level, semester and course.",
        image: "assets/images/gate.png",
        primaryLabel: "Search",
        secondaryLabel: "Browse Questions",
        secondaryHref: "browse.html",
      },
    ],
    announcements: [
      {
        id: "a1",
        title: "Sample: Past questions bank prototype",
        summary:
          "Demonstration content. Replace with a real academic update from the admin panel.",
        content: "",
        image: "",
        date: "2026-10-01",
        published: true,
        featured: true,
      },
    ],
    /* Replace name, message and photo below with the approved text and images. */
    leadership: {
      rector: {
        heading: "Message from the Rector",
        visible: true,
        name: "",
        title: "Rector",
        photo: "assets/images/logo.png",
        message:
          "Placeholder. An approved message from the Rector will appear here once supplied.",
      },
      sug: {
        heading: "Meet the SUG leadership",
        visible: true,
        name: "",
        title: "SUG President",
        photo: "assets/images/logo.png",
        message:
          "Placeholder. An approved introduction to the SUG leadership and this academic resource initiative will appear here.",
      },
    },
    about: {
      heading: "About the Past Questions Bank",
      intro:
        "A simple place for OGITECH students to find past examination questions for revision.",
      paragraphs: [
        "Choose your department, programme, level and semester, or search by course code or title, then open a question to preview or download it.",
        "Studying past questions helps you see how topics are examined and how to manage your time. Use them alongside your lecture notes, not instead of them.",
        "This is a student initiative. Sample content is marked as such until approved material is supplied.",
      ],
      feedback:
        "Cannot find a question? Send a request and tell us the course and year you need.",
      requestIntro:
        "Tell us which past question you need. Your request goes to the administrators, who will review it.",
    },
    sections: [
      {
        id: "departments",
        enabled: true,
        heading: "Browse by Department",
        description: "Explore past questions from your department",
        limit: 6,
      },
      {
        id: "recent",
        enabled: true,
        heading: "Recently Added Questions",
        description: "Latest past questions on the platform",
        limit: 4,
      },
      {
        id: "featured",
        enabled: true,
        heading: "Featured Questions",
        description: "Picked by the SUG",
        limit: 3,
      },
      {
        id: "popular",
        enabled: true,
        heading: "Frequently Opened",
        description: "The most viewed past questions",
        limit: 3,
      },
      {
        id: "how",
        enabled: true,
        heading: "How it works",
        description: "",
        limit: 3,
      },
      {
        id: "leadership",
        enabled: true,
        heading: "From the leadership",
        description: "Sample content until approved text is supplied",
        limit: 2,
      },
      {
        id: "announcements",
        enabled: true,
        heading: "Announcements",
        description: "Sample content",
        limit: 3,
      },
    ],
  };

  /* ---------- API client (XMLHttpRequest, so uploads can report progress) ---------- */
  var csrf = null;

  function ApiError(status, code, message, fields) {
    var e = new Error(message);
    e.name = "ApiError";
    e.status = status;
    e.code = code;
    e.fields = fields || null;
    return e;
  }

  function request(method, path, o) {
    o = o || {};
    return new Promise(function (resolve, reject) {
      var url = API + path;
      if (o.query) {
        var qs = Object.keys(o.query)
          .filter(function (k) {
            return o.query[k] !== "" && o.query[k] != null;
          })
          .map(function (k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(o.query[k]);
          })
          .join("&");
        if (qs) url += (url.indexOf("?") === -1 ? "?" : "&") + qs;
      }
      var x = new XMLHttpRequest();
      x.open(method, url, true);
      x.setRequestHeader("Accept", "application/json");
      if (csrf && method !== "GET") x.setRequestHeader("X-CSRF-Token", csrf);
      var body = null;
      if (o.json !== undefined) {
        x.setRequestHeader("Content-Type", "application/json");
        body = JSON.stringify(o.json);
      } else if (o.form) body = o.form;
      x.timeout = o.timeout || (o.form ? 300000 : 30000);
      if (o.onUpload && x.upload) {
        x.upload.onprogress = function (e) {
          if (e.lengthComputable)
            o.onUpload(Math.round((e.loaded / e.total) * 100));
        };
        x.upload.onload = function () {
          o.onUpload(100);
        };
      }
      x.onload = function () {
        var data = null;
        try {
          data = x.responseText ? JSON.parse(x.responseText) : {};
        } catch (e) {}
        if (x.status >= 200 && x.status < 300 && data !== null)
          return resolve(data);
        var err = data && data.error ? data.error : {};
        reject(
          ApiError(
            x.status,
            err.code || "server_error",
            err.message ||
              "The server returned an unexpected response (" + x.status + ").",
            err.fields,
          ),
        );
      };
      x.onerror = function () {
        reject(
          ApiError(
            0,
            "network",
            "Could not reach the server. Check your connection and try again.",
          ),
        );
      };
      x.ontimeout = function () {
        reject(
          ApiError(
            0,
            "timeout",
            "The server took too long to respond. Please try again.",
          ),
        );
      };
      x.send(body);
    });
  }

  var metaPromise = null;

  function normMeta(m) {
    var names = {};
    m.programmes.forEach(function (p) {
      names[p.id] = p.name;
    });
    m.departments.forEach(function (d) {
      d.programmes = d.programmeIds
        .map(function (id) {
          return names[id];
        })
        .filter(Boolean);
    });
    var levels = {};
    m.programmes.forEach(function (p) {
      levels[p.name] = p.levels.map(function (l) {
        return l.name;
      });
    });
    m.options = {
      programmes: m.programmes.map(function (p) {
        return p.name;
      }),
      levels: levels,
      semesters: m.semesters.map(function (s) {
        return s.name;
      }),
      yearMin: m.yearMin,
    };
    return m;
  }

  var OGA = {
    API: API,
    /* Hardcoded site content. */
    get: function () {
      return HARD;
    },
    getSettings: function () {
      return HARD.settings;
    },

    /* Low-level API call (used by the admin). */
    api: request,
    setCsrf: function (t) {
      csrf = t;
    },
    ApiError: ApiError,

    /* Public data. */
    meta: function () {
      if (!metaPromise) {
        metaPromise = request("GET", "public/meta").then(
          normMeta,
          function (e) {
            metaPromise = null;
            throw e;
          },
        );
      }
      return metaPromise;
    },
    questions: function (params) {
      return request("GET", "public/questions", { query: params });
    },
    question: function (id) {
      return request("GET", "public/questions/" + encodeURIComponent(id)).then(
        function (r) {
          return r.data;
        },
      );
    },
    fileUrl: function (id, download) {
      return (
        API +
        "public/questions/" +
        encodeURIComponent(id) +
        "/file" +
        (download ? "?download=1" : "")
      );
    },
    addRequest: function (payload) {
      return request("POST", "public/requests", { json: payload });
    },
    leadership: function () {
      return request("GET", "public/leadership").then(function (res) {
        return res.data || [];
      });
    },
  };
  window.OGA = OGA;
})();
