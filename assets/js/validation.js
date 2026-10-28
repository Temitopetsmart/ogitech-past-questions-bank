/* Shared client-side validators. Each returns an error string, or '' when valid.
   Re-validate every input on the server when the PHP backend is added. */
(function () {
  var V = {
    text: function (v, o) {
      v = String(v || "").trim();
      if (!v) return o.required ? o.label + " is required." : "";
      if (o.min && v.length < o.min)
        return o.label + " must be at least " + o.min + " characters.";
      if (v.length > o.max)
        return o.label + " must be " + o.max + " characters or fewer.";
      return "";
    },
    email: function (v) {
      v = String(v || "").trim();
      if (!v) return "";
      if (v.length > 120) return "Email must be 120 characters or fewer.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
        ? ""
        : "Enter an email like name@example.com, or leave it blank.";
    },
    code: function (v) {
      v = String(v || "").trim();
      if (!v) return "Course code is required.";
      if (v.length < 2 || v.length > 20)
        return "Course code must be 2 to 20 characters.";
      return /^[A-Za-z0-9][A-Za-z0-9 \/-]*$/.test(v)
        ? ""
        : "Use letters, numbers, spaces, hyphens or slashes only, for example CSC 101.";
    },
    year: function (v, min, max) {
      v = String(v || "").trim();
      if (!v) return "";
      if (!/^\d{4}$/.test(v))
        return "Enter a four-digit year, or leave it blank if unknown.";
      var n = +v;
      return n < min || n > max
        ? "Year must be between " + min + " and " + max + "."
        : "";
    },
    choice: function (v, allowed, label) {
      if (!v) return "Choose a " + label + ".";
      return allowed.indexOf(v) === -1
        ? "That " + label + " is not available. Choose one from the list."
        : "";
    },
  };
  window.OGAValidate = V;
})();
