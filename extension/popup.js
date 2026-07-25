// Jeradin popup — uses your jeradin.com sign-in session automatically.
// No copy/paste tokens. If no session is found the popup prompts the user
// to sign in on jeradin.com; the content script picks up the session there
// and forwards it to the extension the next time the popup opens.

const API_BASE = "https://jeradin.com";
const $ = (id) => document.getElementById(id);
const main = $("main");
const who = $("who");

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c == null) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

function statusEl(kind, text) { return h("div", { class: `status ${kind}` }, text); }

async function getSession() {
  const s = await chrome.storage.local.get(["session"]);
  return s.session || null;
}

// Try to pull a fresh session by executing a small reader in any open jeradin.com tab.
async function refreshFromOpenTab() {
  try {
    const tabs = await chrome.tabs.query({ url: ["https://jeradin.com/*"] });
    if (!tabs.length) return null;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
            const p = JSON.parse(localStorage.getItem(k) || "null");
            if (p?.access_token) return { access_token: p.access_token, email: p.user?.email || null, expires_at: p.expires_at || null };
          }
        } catch (_) {}
        return null;
      },
    });
    if (result?.access_token) {
      const session = { ...result, origin: "https://jeradin.com", updated_at: Date.now() };
      await chrome.storage.local.set({ session });
      return session;
    }
  } catch (_) {}
  return null;
}

async function whoami(token) {
  const res = await fetch(`${API_BASE}/api/public/extension/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json();
}

async function captureAndAnalyze(_token, note) {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const response = await chrome.runtime.sendMessage({
    type: "JERADIN_ANALYZE_ACTIVE_TAB",
    payload: { imageBase64: base64, note: note || "", sessionId: crypto.randomUUID() },
  });
  if (!response?.ok) throw new Error(response?.error || "Could not open Ask Jeradin on this tab");
  return response;
}

function renderSignedIn(session) {
  who.textContent = session.email ? `signed in · ${session.email}` : "signed in";
  main.innerHTML = "";
  const note = h("textarea", { rows: 2, placeholder: "Optional: what were you trying to do?" });
  const btn = h("button", {}, "Capture & Analyze");
  const status = h("div");
  const result = h("div", { class: "result" });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.innerHTML = "";
    result.innerHTML = "";
    const s = statusEl("ok", "");
    s.innerHTML = '<span class="spinner"></span>&nbsp;&nbsp;Capturing screen and analyzing…';
    status.appendChild(s);
    const t0 = Date.now();
    try {
      await captureAndAnalyze(session.access_token, note.value.trim());
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      status.innerHTML = "";
      status.appendChild(statusEl("ok", `Ask Jeradin opened on this tab in ${dt}s`));
      setTimeout(() => window.close(), 250);
    } catch (e) {
      status.innerHTML = "";
      status.appendChild(statusEl("err", e.message || "Analysis failed"));
      // Session may have expired — try to refresh from the open tab.
      const fresh = await refreshFromOpenTab();
      if (!fresh) bootstrap();
    } finally {
      btn.disabled = false;
    }
  });

  const signout = h("a", {
    class: "link",
    onclick: async () => { await chrome.storage.local.remove(["session"]); bootstrap(); },
  }, "Forget session");

  main.appendChild(note);
  main.appendChild(h("div", { style: "height:8px" }));
  main.appendChild(btn);
  main.appendChild(status);
  main.appendChild(result);
  main.appendChild(h("div", { class: "hint" }, [
    "Uses your jeradin.com sign-in. ", signout,
  ]));
}

function renderResult(container, analysis, fix) {
  const confidence = typeof fix.confidence === "number"
    ? h("span", { class: "badge-pill" }, `${fix.confidence}%`) : null;
  container.appendChild(h("h4", {}, "What's on screen"));
  container.appendChild(h("div", { class: "summary" }, analysis.summary || "No summary."));
  if (Array.isArray(analysis.errors) && analysis.errors.length > 0) {
    container.appendChild(h("h4", {}, "Errors detected"));
    for (const err of analysis.errors.slice(0, 6)) {
      const item = h("div", { class: "err-item" }, err.message);
      if (err.file) item.appendChild(h("div", { class: "kv" }, `${err.source || ""} ${err.file}${err.line ? ":" + err.line : ""}`));
      container.appendChild(item);
    }
  }
  const rootHeader = h("h4", {}, "Root cause");
  if (confidence) rootHeader.appendChild(confidence);
  container.appendChild(rootHeader);
  container.appendChild(h("div", { class: "hypothesis" }, analysis.hypothesis || "No hypothesis."));
  container.appendChild(h("h4", {}, "Plain-English fix"));
  container.appendChild(h("div", { class: "summary" }, fix.plainExplanation || "No explanation."));
  if (Array.isArray(fix.recommendedActions) && fix.recommendedActions.length > 0) {
    container.appendChild(h("h4", {}, "Do this"));
    const ul = h("ul");
    for (const a of fix.recommendedActions.slice(0, 8)) ul.appendChild(h("li", {}, a));
    container.appendChild(ul);
  }
  if (Array.isArray(fix.steps) && fix.steps.length > 0) {
    container.appendChild(h("h4", {}, "Step-by-step"));
    const ul = h("ul");
    for (const s of fix.steps.slice(0, 6)) ul.appendChild(h("li", {}, `${s.file ? s.file + " — " : ""}${s.change}`));
    container.appendChild(ul);
  }
  if (fix.learnMode) {
    container.appendChild(h("h4", {}, "Learn"));
    container.appendChild(h("div", { class: "summary" }, fix.learnMode));
  }
}

function renderSignedOut() {
  who.textContent = "not signed in";
  main.innerHTML = "";
  const openBtn = h("button", {
    onclick: () => chrome.tabs.create({ url: `${API_BASE}/login` }),
  }, "Sign in on jeradin.com");
  const refresh = h("button", { class: "secondary", onclick: bootstrap }, "I've signed in — refresh");
  main.appendChild(openBtn);
  main.appendChild(h("div", { style: "height:8px" }));
  main.appendChild(refresh);
  main.appendChild(h("div", { class: "hint" }, [
    "Sign in once on jeradin.com. The extension picks up your session automatically — no tokens to copy.",
  ]));
}

async function bootstrap() {
  let session = await getSession();
  // If we have nothing stored, try to grab from any open jeradin.com tab.
  if (!session) session = await refreshFromOpenTab();
  if (!session) return renderSignedOut();
  // Optimistic render, verify in background.
  renderSignedIn(session);
  try {
    const r = await whoami(session.access_token);
    if (r.email && r.email !== session.email) {
      session.email = r.email;
      await chrome.storage.local.set({ session });
      who.textContent = `signed in · ${r.email}`;
    }
  } catch {
    const fresh = await refreshFromOpenTab();
    if (fresh) renderSignedIn(fresh);
    else { await chrome.storage.local.remove(["session"]); renderSignedOut(); }
  }
}

bootstrap();
