// Runs on jeradin.com pages. Reads the Supabase session from localStorage
// and forwards { access_token, email, expires_at } to the extension so the
// popup can call the API without any manual token pasting.

(function () {
  function readSession() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const access_token = parsed?.access_token;
        const expires_at = parsed?.expires_at ?? null;
        const email = parsed?.user?.email ?? null;
        if (access_token) return { access_token, expires_at, email, origin: location.origin };
      }
    } catch (_) {}
    return null;
  }

  function push() {
    const session = readSession();
    if (session) {
      try {
        chrome.runtime.sendMessage({ type: "JERADIN_SESSION", session });
      } catch (_) {}
    }
  }

  push();
  // Re-push after login events / storage changes.
  window.addEventListener("storage", push);
  setTimeout(push, 1500);
  setTimeout(push, 5000);
})();
