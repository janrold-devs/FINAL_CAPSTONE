export function initForceUppercaseInputs() {
  const allowedInputTypes = new Set(["text", "search", "tel", "url"]);
  const shouldProcess = (el) => {
    if (!el) return false;
    
    // Skip if element has data-no-uppercase attribute
    if (el.hasAttribute('data-no-uppercase')) return false;
    
    // Skip if element has class that indicates no uppercase
    if (el.classList.contains('no-uppercase')) return false;
    
    // Skip email and password inputs entirely
    if (el.type === 'email' || el.type === 'password') return false;
    
    // Skip inputs in auth forms (login/register)
    if (el.closest('.auth-form') || el.closest('[data-auth-form]')) return false;
    
    if (el.tagName === "TEXTAREA") return true; // include textarea if you want
    if (el.tagName !== "INPUT") return false;
    return allowedInputTypes.has((el.type || "text").toLowerCase());
  };

  const toUppercaseIfNeeded = (t) => {
    if (!shouldProcess(t)) return;
    // preserve selection/caret
    const start = t.selectionStart;
    const end = t.selectionEnd;
    const upper = t.value ? t.value.toUpperCase() : "";
    if (t.value !== upper) {
      t.value = upper;
      try { t.setSelectionRange(start, end); } catch (err) {}
      // dispatch input so React and other listeners receive the updated value
      const ev = new Event("input", { bubbles: true });
      t.dispatchEvent(ev);
    }
  };

  // Use capture phase so this runs before React's delegated handlers
  const handler = (e) => toUppercaseIfNeeded(e.target);

  // input covers typing and programmatic changes; compositionend for IME, paste to catch paste events
  document.addEventListener("input", handler, true);
  document.addEventListener("compositionend", handler, true);
  document.addEventListener("paste", (e) => {
    // wait for paste to apply then convert
    setTimeout(() => toUppercaseIfNeeded(e.target), 0);
  }, true);

  // Optional cleanup return (not used here but useful for tests)
  return () => {
    document.removeEventListener("input", handler, true);
    document.removeEventListener("compositionend", handler, true);
    // paste listener not removed here (if you want, wrap and remove similarly)
  };
}