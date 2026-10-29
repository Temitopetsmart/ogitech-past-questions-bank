/* Central data service. Single versioned state object in localStorage.
   Later, each function here is replaced by a PHP API call. */
(function () {
  var KEY = "oga_demo_state",
    VER = 1;

  function q(
    id,
    dept,
    prog,
    level,
    sem,
    code,
    title,
    year,
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
      notes: "",
      fileUrl: "",
      featured: feat,
      published: true,
      demoViews: views,
      createdAt: created,
      updatedAt: created,
    };
  }

  var SAMPLE = {
    schemaVersion: VER,
    settings: {
      siteName: "Past Questions Bank",
      orgLine: "Students' Union Government",
      shortName: "OGITECH",
      logo: "/assets/images/logo.png",
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
    options: {
      programmes: ["ND", "HND"],
      levels: { ND: ["ND I", "ND II"], HND: ["HND I", "HND II"] },
      semesters: ["First", "Second"],
      yearMin: 2000,
    },
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
        false,
        121,
        "2026-09-10T09:00:00.000Z",
      ),
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
    leadership: {
      rector: {
        heading: "Message from the Rector",
        visible: true,
        name: "",
        title: "Rector",
        photo: "",
        message:
          "Placeholder. An approved message from the Rector will appear here once supplied.",
      },
      sug: {
        heading: "Meet the SUG leadership",
        visible: true,
        name: "",
        title: "SUG President",
        photo: "",
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
        "Tell us which past question you need. This prototype only checks your form; nothing is sent anywhere yet.",
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

  var state = null,
    status = { ok: true, message: "" };
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function persist(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error:
          "Browser storage is unavailable or full. Your change was not saved.",
      };
    }
  }

  function valid(s) {
    return (
      s &&
      typeof s === "object" &&
      s.schemaVersion === VER &&
      s.settings &&
      Array.isArray(s.questions) &&
      Array.isArray(s.departments) &&
      Array.isArray(s.hero) &&
      Array.isArray(s.sections) &&
      Array.isArray(s.announcements) &&
      s.leadership &&
      s.options
    );
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
      return clone(SAMPLE);
    }
    if (raw === null) {
      persist(clone(SAMPLE));
      return clone(SAMPLE);
    }
    try {
      var parsed = JSON.parse(raw);
      if (valid(parsed)) return parsed;
    } catch (e) {}
    status = {
      ok: false,
      message:
        "Saved prototype data is damaged or from an unsupported version. Showing sample data. Reset or import a backup from the admin Demo data page.",
    };
    return clone(SAMPLE);
  }

  var OGA = {
    KEY: KEY,
    get: function () {
      if (!state) state = load();
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
      if (r.ok) state = next;
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
    session: function (y) {
      return y - 1 + "/" + y;
    },
    exportData: function () {
      return JSON.stringify(OGA.get(), null, 2);
    },
    importData: function (json) {
      var p;
      try {
        p = JSON.parse(json);
      } catch (e) {
        return { ok: false, error: "That file is not valid JSON." };
      }
      if (!valid(p))
        return {
          ok: false,
          error:
            "That file does not match the expected backup format. Existing data was kept.",
        };
      return OGA.save(p);
    },
    resetDemoData: function () {
      var s = clone(SAMPLE);
      var r = persist(s);
      if (r.ok) {
        state = s;
        status = { ok: true, message: "" };
      }
      return r;
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
