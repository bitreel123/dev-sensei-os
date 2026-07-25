// Session sync, target-tab tracking, and cross-tab Screen Intelligence streaming.
const API_BASE = "https://jeradin.com";
let lastNonJeradinTabId = null;

function isJeradinUrl(url) {
  try {
    const hostname = new URL(url || "").hostname;
    return hostname === "jeradin.com" || hostname === "www.jeradin.com" || hostname.includes("f3f1273c-9023-417a-8f01-2102307dd572");
  } catch { return false; }
}

function isInjectableTab(tab) {
  return Boolean(tab?.id && tab.url && /^(https?|file):/i.test(tab.url));
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && !isJeradinUrl(tab.url) && !tab.url.startsWith("chrome://")) {
      lastNonJeradinTabId = tabId;
      await chrome.storage.local.set({ lastNonJeradinTabId: tabId });
    }
  } catch (_) {}
});

async function sendToTab(tabId, message) {
  try { return await chrome.tabs.sendMessage(tabId, message); }
  catch (_) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function normalizedTitle(value) {
  return String(value || "")
    .replace(/\s*[-–—]\s*(Google Chrome|Chromium|Microsoft Edge|Brave|Arc)\s*$/i, "")
    .trim()
    .toLowerCase();
}

async function resolveTargetTab(senderTab, capturedTitle) {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  const senderId = senderTab?.id;
  const wantedTitle = normalizedTitle(capturedTitle);
  if (wantedTitle) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const exact = tabs.find((tab) => {
      const title = normalizedTitle(tab.title);
      return isInjectableTab(tab) && tab.id !== senderId && !isJeradinUrl(tab.url) &&
        (title === wantedTitle || title.includes(wantedTitle) || wantedTitle.includes(title));
    });
    if (exact) return exact;
  }
  if (isInjectableTab(active) && active.id !== senderId && !isJeradinUrl(active.url)) return active;
  if (!lastNonJeradinTabId) {
    const stored = await chrome.storage.local.get(["lastNonJeradinTabId"]);
    lastNonJeradinTabId = stored.lastNonJeradinTabId || null;
  }
  if (lastNonJeradinTabId && lastNonJeradinTabId !== senderId) {
    try {
      const remembered = await chrome.tabs.get(lastNonJeradinTabId);
      if (isInjectableTab(remembered) && !isJeradinUrl(remembered.url)) return remembered;
    } catch (_) {}
  }
  // Screen sharing does not activate the tab selected in Chrome's picker.
  // Fall back to the most recently used injectable tab other than Jeradin.
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const recent = tabs
    .filter((tab) => isInjectableTab(tab) && tab.id !== senderId && !isJeradinUrl(tab.url))
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  return recent || null;
}

async function streamAnalysis(tabId, payload) {
  const stored = await chrome.storage.local.get(["session"]);
  const token = stored.session?.access_token;
  if (!token) {
    await sendToTab(tabId, { type: "JERADIN_OVERLAY_ERROR", message: "Sign in to Jeradin, then try again." });
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/api/intel/screen/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok || !response.body) throw new Error((await response.text()).slice(0, 400) || `Analysis failed (${response.status})`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          try { await sendToTab(tabId, { type: "JERADIN_OVERLAY_EVENT", event: JSON.parse(line) }); } catch (_) {}
        }
        newline = buffer.indexOf("\n");
      }
    }
    if (buffer.trim()) await sendToTab(tabId, { type: "JERADIN_OVERLAY_EVENT", event: JSON.parse(buffer.trim()) });
  } catch (error) {
    await sendToTab(tabId, { type: "JERADIN_OVERLAY_ERROR", message: error instanceof Error ? error.message : "Analysis failed" }).catch(() => undefined);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "JERADIN_SESSION" && msg.session?.access_token) {
    chrome.storage.local.set({ session: {
      access_token: msg.session.access_token,
      email: msg.session.email || null,
      expires_at: msg.session.expires_at || null,
      origin: msg.session.origin || API_BASE,
      updated_at: Date.now(),
    } });
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "JERADIN_ANALYZE_ACTIVE_TAB" && msg.payload?.imageBase64) {
    void (async () => {
      const target = await resolveTargetTab(sender.tab, msg.payload.targetTabTitle);
      if (!target?.id) throw new Error("Open the codebase tab once, then stop sharing again.");
      lastNonJeradinTabId = target.id;
      await chrome.storage.local.set({ lastNonJeradinTabId: target.id });
      await sendToTab(target.id, { type: "JERADIN_SHOW_OVERLAY", title: msg.payload.note || "Screen analysis" });
      void streamAnalysis(target.id, msg.payload);
      sendResponse({ ok: true, tabId: target.id });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
