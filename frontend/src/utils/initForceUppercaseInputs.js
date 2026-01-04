export function initForceUppercaseInputs() {
  document.addEventListener(
    "input",
    (e) => {
      const t = e.target;
      if (!t || t.tagName !== "INPUT") return; // only inputs
      const allowed = ["text", "search", "email", "tel", "url"];
      const type = (t.type || "text").toLowerCase();
      if (!allowed.includes(type)) return;

      const start = t.selectionStart;
      const end = t.selectionEnd;
      const upper = t.value.toUpperCase();
      if (t.value !== upper) {
        t.value = upper;
        try {
          t.setSelectionRange(start, end);
        } catch (err) {}
        // notify React / other listeners
        const ev = new Event("input", { bubbles: true });
        t.dispatchEvent(ev);
      }
    },
    { passive: true }
  );
}