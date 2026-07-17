// Receives session pushes from jeradin.com content script and stores them.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "JERADIN_SESSION" && msg.session?.access_token) {
    chrome.storage.local.set({
      session: {
        access_token: msg.session.access_token,
        email: msg.session.email || null,
        expires_at: msg.session.expires_at || null,
        origin: msg.session.origin || "https://jeradin.com",
        updated_at: Date.now(),
      },
    });
    sendResponse({ ok: true });
    return true;
  }
});
