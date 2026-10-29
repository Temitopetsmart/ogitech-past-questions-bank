# Test report

## How it was tested

81 automated checks ran against the real code in a simulated browser (jsdom): 20 on the public pages, 33 on the first admin sections and 28 on the rest, all passing at the end.
They cover logic and rendering, not appearance. A real browser has not been used yet.

## Checked (automated, passing)

- Search is case-insensitive, matches partial text and spaced or unspaced codes (for example "csc101"); filters combine; clear restores the full list; load more works; empty state shows; URL filters are applied and invalid values ignored.
- Hostile text in search, names and settings is shown as plain text, not as HTML. `javascript:` links are refused.
- Request form: empty fields, whitespace-only text, bad email, future year, level not matching programme are rejected with messages beside the field, focus moves to the first error, entered values are kept, success is shown only when valid, and says nothing was sent.
- Question details: correct metadata, honest "no document" state with Download disabled, unknown or unpublished IDs handled.
- Admin: demo gate; dashboard numbers from data; settings, hero slides (add, edit, reorder, hide, delete with confirmation), questions (add, edit, unpublish, feature, delete, duplicates and bad years rejected), departments (add, hide, duplicate name blocked, deleting one that has questions forces moving them), leadership, announcements, page text, homepage sections (hide, reorder, item counts), footer, menu and social links.
- Public pages show each saved change after reload; unpublished and hidden content does not appear.
- Failed saves (simulated full storage) show an error and leave data unchanged.
- Export, reset and import round trip is identical; invalid JSON, orphaned questions and bad levels are rejected with reasons and existing data is kept.

## Not checked yet (please test by hand)

- Layout and spacing at 320, 375, 768, 1024 and 1440 px, portrait and landscape; no sideways scrolling; mobile menu feel.
- Colour contrast measurements, visible focus on every control, and a keyboard-only walkthrough; screen reader behaviour.
- Updates between two real tabs (the storage event), real image and PDF file selection, real export download and import upload.
- Hero photo and logo appearance; Google Fonts loading; performance on a slow mobile connection.
- Browser support beyond a current Chrome, Edge, Firefox or Safari.

## Known limitations

- No sample PDFs are bundled, so no document preview or download can be demonstrated until you add files.
- Announcement full text is stored but not shown on the homepage.
- Hero shows slides with Previous and Next buttons only (no automatic rotation).
- Only one level of undo: Cancel before saving. There is no revision history.
- Sample course codes, questions, announcements and leadership text are illustrative, not verified OGITECH records.
