// Minimal service worker — the popup does all the work. Kept for MV3 compliance
// and so we can wire keyboard commands / context menus in future.
chrome.runtime.onInstalled.addListener(() => {
  // Nothing to do on install; the popup handles pairing on first open.
});
