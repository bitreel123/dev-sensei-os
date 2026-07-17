// Jeradin popup — pair with your account, then capture + analyze the current tab.

const API_BASE_DEFAULT = "https://jeradin.com";

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

async function getSettings() {
  const s = await chrome.storage.local.get(["token", "apiBase", "email"]);
  return { token: s.token || null, apiBase: s.apiBase || API_BASE_DEFAULT, email: s.email || null };
}
async function setSettings(patch) {
  await chrome.storage.local.set(patch);
}

async function verifyToken(apiBase, token) {
  const res = await fetch(`${apiBase}/api/public/extension/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Token rejected — please re-pair.");
  return res.json();
}

async function captureAndAnalyze(apiBase, token, note) {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const res = await fetch(`${apiBase}/api/public/extension/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageBase64: base64, note: note || "" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`);
  return body;
}

// ---------- render helpers ----------
function statusEl(kind, text) {
  return h("div", { class: `status ${kind}` }, text);
}

function renderPaired({ token, apiBase, email }) {
  who.textContent = email ? `paired · ${email}` : "paired";
  main.innerHTML = "";

  const note = h("textarea", { rows: 2, placeholder: "Optional: what were you trying to do?" });
  const btn = h("button", {}, "Capture & Analyze");
  const status = h("div");
  const result = h("div", { class: "result" });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.innerHTML = "";
    result.innerHTML = "";
    status.appendChild(statusEl("ok", ""));
    status.firstChild.innerHTML = '<span class="spinner"></span>&nbsp;&nbsp;Capturing screen and analyzing…';
    const t0 = Date.now();
    try {
      const { analysis, fix } = await captureAndAnalyze(apiBase, token, note.value.trim());
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      status.innerHTML = "";
      status.appendChild(statusEl("ok", `Done in ${dt}s`));
      renderResult(result, analysis, fix);
    } catch (e) {
      status.innerHTML = "";
      status.appendChild(statusEl("err", e.message || "Analysis failed"));
    } finally {
      btn.disabled = false;
    }
  });

  const unpair = h(
    "a",
    {
      class: "link",
      onclick: async () => {
        await chrome.storage.local.remove(["token", "email"]);
        bootstrap();
      },
    },
    "Unpair"
  );

  main.appendChild(note);
  main.appendChild(h("div", { style: "height:8px" }));
  main.appendChild(btn);
  main.appendChild(status);
  main.appendChild(result);
  main.appendChild(
    h("div", { class: "hint" }, [
      "Screen is sent to your Jeradin workspace over HTTPS. ",
      unpair,
    ])
  );
}

function renderResult(container, analysis, fix) {
  const confidence =
    typeof fix.confidence === "number"
      ? h("span", { class: "badge-pill" }, `${fix.confidence}%`)
      : null;

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
    for (const s of fix.steps.slice(0, 6)) {
      ul.appendChild(h("li", {}, `${s.file ? s.file + " — " : ""}${s.change}`));
    }
    container.appendChild(ul);
  }

  if (fix.learnMode) {
    container.appendChild(h("h4", {}, "Learn"));
    container.appendChild(h("div", { class: "summary" }, fix.learnMode));
  }
}

function renderUnpaired({ apiBase }) {
  who.textContent = "not paired";
  main.innerHTML = "";

  const input = h("input", { type: "text", placeholder: "Paste your jex_… token" });
  const pair = h("button", {}, "Pair extension");
  const status = h("div");

  pair.addEventListener("click", async () => {
    const token = input.value.trim();
    if (!token.startsWith("jex_")) {
      status.innerHTML = "";
      status.appendChild(statusEl("err", "Token must start with jex_"));
      return;
    }
    pair.disabled = true;
    status.innerHTML = "";
    status.appendChild(statusEl("ok", "Verifying…"));
    try {
      const r = await verifyToken(apiBase, token);
      await setSettings({ token, email: r.email || null });
      bootstrap();
    } catch (e) {
      status.innerHTML = "";
      status.appendChild(statusEl("err", e.message || "Could not verify token"));
      pair.disabled = false;
    }
  });

  const openBtn = h(
    "button",
    {
      class: "secondary",
      onclick: () => chrome.tabs.create({ url: `${apiBase}/extension` }),
    },
    "Open Jeradin to get a token"
  );

  main.appendChild(openBtn);
  main.appendChild(h("div", { style: "height:10px" }));
  main.appendChild(input);
  main.appendChild(h("div", { style: "height:8px" }));
  main.appendChild(pair);
  main.appendChild(status);
  main.appendChild(
    h("div", { class: "hint" }, [
      "1. Click above to open your Jeradin account. 2. Sign in and generate a connection token. 3. Paste it here.",
    ])
  );
  main.appendChild(h("div", { class: "hint muted" }, `API: ${apiBase}`));
}

async function bootstrap() {
  const s = await getSettings();
  if (!s.token) return renderUnpaired(s);
  // Optimistically render paired; verify in background.
  renderPaired(s);
  verifyToken(s.apiBase, s.token)
    .then((r) => setSettings({ email: r.email || null }).then(() => {
      if (who) who.textContent = r.email ? `paired · ${r.email}` : "paired";
    }))
    .catch(async () => {
      await chrome.storage.local.remove(["token", "email"]);
      renderUnpaired({ apiBase: s.apiBase });
    });
}

bootstrap();
