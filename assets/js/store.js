/* Central data service (frontend prototype). Everything that touches data goes through window.OGA.
   Public site content (header, hero, leadership, about, ...) is HARDCODED in HARD below.
   Only question-bank data is persisted (localStorage key "pqb_state").
   Backend later: each function here becomes a PHP API call. */
(function () {
  var KEY = "pqb_state",
    VER = 2;
  var PERSIST = [
    "schemaVersion",
    "options",
    "sessions",
    "departments",
    "questions",
    "requests",
    "adminUsers",
  ];

  function q(
    id,
    dept,
    prog,
    level,
    sem,
    code,
    title,
    year,
    sess,
    feat,
    views,
    created,
  ) {
    return {
      id: id,
      departmentId: dept,
      programme: prog,
      level: level,
      semester: sem,
      courseCode: code,
      courseTitle: title,
      examYear: year,
      sessionId: sess,
      notes: "",
      document: null,
      fileUrl: "",
      featured: feat,
      published: true,
      demoViews: views,
      createdAt: created,
      updatedAt: created,
    };
  }

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
      copyright: "© 2026 OGITECH SUG Past Questions Bank. Prototype.",
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
        "This is a student initiative prototype. Sample content is marked as such until approved material is supplied.",
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
        description: "Demonstration statistics, not real usage",
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

  /* ---------- Seed data for the question bank ---------- */
  var SEED = {
    schemaVersion: VER,
    options: {
      programmes: ["ND", "HND"],
      levels: { ND: ["ND I", "ND II"], HND: ["HND I", "HND II"] },
      semesters: ["First", "Second"],
      yearMin: 2000,
    },
    sessions: [
      { id: "2022-2023", name: "2022/2023" },
      { id: "2023-2024", name: "2023/2024" },
      { id: "2024-2025", name: "2024/2025" },
      { id: "2025-2026", name: "2025/2026" },
    ],
    departments: [
      {
        id: "cse",
        name: "Computer Science & Engineering",
        description: "",
        programmes: ["ND", "HND"],
        visible: true,
        order: 1,
      },
      {
        id: "mech",
        name: "Mechanical Engineering",
        description: "",
        programmes: ["ND", "HND"],
        visible: true,
        order: 2,
      },
      {
        id: "eee",
        name: "Electrical & Electronics Engineering",
        description: "",
        programmes: ["ND", "HND"],
        visible: true,
        order: 3,
      },
      {
        id: "bam",
        name: "Business Administration",
        description: "",
        programmes: ["ND", "HND"],
        visible: true,
        order: 4,
      },
      {
        id: "mcm",
        name: "Mass Communication",
        description: "",
        programmes: ["ND", "HND"],
        visible: true,
        order: 5,
      },
    ],
    questions: [
      q(
        "q001",
        "cse",
        "ND",
        "ND I",
        "First",
        "CSC 101",
        "Introduction to Programming",
        2025,
        "2024-2025",
        true,
        412,
        "2026-09-28T09:00:00.000Z",
      ),
      q(
        "q002",
        "mech",
        "ND",
        "ND II",
        "Second",
        "MTH 102",
        "Mathematics for Engineers",
        2025,
        "2024-2025",
        true,
        358,
        "2026-09-27T09:00:00.000Z",
      ),
      q(
        "q003",
        "eee",
        "HND",
        "HND I",
        "First",
        "EEN 101",
        "Basic Electrical Engineering",
        2024,
        "2023-2024",
        true,
        290,
        "2026-09-26T09:00:00.000Z",
      ),
      q(
        "q004",
        "bam",
        "HND",
        "HND II",
        "Second",
        "BUS 201",
        "Business Law",
        2024,
        "2023-2024",
        false,
        244,
        "2026-09-25T09:00:00.000Z",
      ),
      q(
        "q005",
        "cse",
        "ND",
        "ND II",
        "Second",
        "CSC 212",
        "Database Fundamentals",
        2025,
        "2024-2025",
        false,
        301,
        "2026-09-24T09:00:00.000Z",
      ),
      q(
        "q006",
        "cse",
        "HND",
        "HND I",
        "First",
        "SWD 301",
        "Web Application Development",
        2024,
        "2023-2024",
        false,
        187,
        "2026-09-20T09:00:00.000Z",
      ),
      q(
        "q007",
        "mcm",
        "ND",
        "ND I",
        "First",
        "MAC 101",
        "Introduction to Mass Communication",
        2025,
        "2024-2025",
        false,
        156,
        "2026-09-18T09:00:00.000Z",
      ),
      q(
        "q008",
        "mech",
        "HND",
        "HND I",
        "Second",
        "MEC 305",
        "Thermodynamics",
        2023,
        "2022-2023",
        false,
        133,
        "2026-09-15T09:00:00.000Z",
      ),
      q(
        "q009",
        "eee",
        "ND",
        "ND I",
        "Second",
        "EEE 112",
        "Circuit Theory",
        2023,
        "2022-2023",
        false,
        98,
        "2026-09-12T09:00:00.000Z",
      ),
      q(
        "q010",
        "bam",
        "ND",
        "ND II",
        "First",
        "BAM 210",
        "Principles of Marketing",
        2024,
        "2023-2024",
        false,
        121,
        "2026-09-10T09:00:00.000Z",
      ),
    ],
    requests: [],
    /* PROTOTYPE demo accounts (plain text on purpose). The backend uses password_hash and server sessions. */
    adminUsers: [
      {
        id: "u1",
        name: "Main Admin",
        username: "mainadmin",
        password: "Admin@2026",
        role: "main",
        active: true,
        createdAt: "2026-09-01T09:00:00.000Z",
      },
      {
        id: "u2",
        name: "Question Manager",
        username: "manager",
        password: "Manager@2026",
        role: "manager",
        active: true,
        createdAt: "2026-09-01T09:00:00.000Z",
      },
    ],
  };

  var state = null,
    status = { ok: true, message: "" };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function valid(s) {
    return !!(
      s &&
      typeof s === "object" &&
      s.schemaVersion === VER &&
      s.options &&
      Array.isArray(s.options.programmes) &&
      s.options.levels &&
      Array.isArray(s.options.semesters) &&
      ["sessions", "departments", "questions", "requests", "adminUsers"].every(
        function (k) {
          return Array.isArray(s[k]);
        },
      )
    );
  }

  function pick(s) {
    var o = {};
    PERSIST.forEach(function (k) {
      o[k] = s[k];
    });
    return o;
  }

  function merge(p) {
    var o = clone(HARD);
    PERSIST.forEach(function (k) {
      o[k] = p[k];
    });
    return o;
  }

  function persist(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(pick(s)));
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error:
          "Browser storage is unavailable or full. Your change was not saved.",
      };
    }
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      status = {
        ok: false,
        message:
          "Browser storage is blocked. Showing sample data; changes will not persist.",
      };
      return clone(SEED);
    }
    if (raw === null) {
      persist(clone(SEED));
      return clone(SEED);
    }
    try {
      var parsed = JSON.parse(raw);
      if (valid(parsed)) return parsed;
    } catch (e) {}
    status = {
      ok: false,
      message:
        "Saved prototype data is damaged or from an unsupported version. Showing sample data.",
    };
    return clone(SEED);
  }

  var OGA = {
    KEY: KEY,
    get: function () {
      if (!state) state = merge(load());
      return state;
    },
    status: function () {
      OGA.get();
      return status;
    },
    save: function (next) {
      if (!valid(next))
        return {
          ok: false,
          error: "Data failed validation and was not saved.",
        };
      var r = persist(next);
      if (r.ok) state = merge(pick(next));
      return r;
    },
    getSettings: function () {
      return OGA.get().settings;
    },
    getQuestions: function (includeUnpublished) {
      return OGA.get().questions.filter(function (x) {
        return includeUnpublished || x.published;
      });
    },
    getQuestion: function (id) {
      return (
        OGA.get().questions.filter(function (x) {
          return x.id === id;
        })[0] || null
      );
    },
    getDepartments: function (includeHidden) {
      return OGA.get()
        .departments.filter(function (d) {
          return includeHidden || d.visible;
        })
        .sort(function (a, b) {
          return a.order - b.order;
        });
    },
    getDepartment: function (id) {
      return (
        OGA.get().departments.filter(function (d) {
          return d.id === id;
        })[0] || null
      );
    },
    getSessions: function () {
      return OGA.get()
        .sessions.slice()
        .sort(function (a, b) {
          return b.name.localeCompare(a.name);
        });
    },
    /* Academic session name of a question, e.g. "2025/2026". Separate from examYear. */
    sessionName: function (question) {
      var s = OGA.get().sessions.filter(function (x) {
        return x.id === (question && question.sessionId);
      })[0];
      return s ? s.name : "";
    },
    /* Public request form -> admin Requests inbox. */
    addRequest: function (r) {
      var next = clone(OGA.get());
      next.requests.unshift(
        Object.assign(
          {
            id:
              "r" +
              Date.now().toString(36) +
              Math.random().toString(36).slice(2, 6),
            status: "new",
            createdAt: new Date().toISOString(),
          },
          r,
        ),
      );
      return OGA.save(next);
    },
    onChange: function (fn) {
      window.addEventListener("storage", function (e) {
        if (e.key === KEY) {
          state = null;
          fn();
        }
      });
    },
  };
  window.OGA = OGA;
})();
