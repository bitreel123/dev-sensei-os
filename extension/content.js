// Session bridge plus the injected Ask Jeradin overlay for any shared tab.
(function () {
  if (window.__jeradinContentInstalled) return;
  window.__jeradinContentInstalled = true;
  const state = { analysis: null, fix: null, stages: new Map(), open: true, error: "" };
  let host = null;
  let root = null;

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

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function highlight(code) {
    return escapeHtml(code).replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|`(?:\\.|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|async|await|import|export|from|class|interface|type|new|throw|try|catch|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g, (token) => {
      let color = "#c678dd";
      if (/^(\/\/|\/\*|#)/.test(token)) color = "#7f848e";
      else if (/^[`"']/.test(token)) color = "#98c379";
      else if (/^\d/.test(token)) color = "#d19a66";
      return `<span style="color:${color}">${token}</span>`;
    });
  }
  function ensureOverlay() {
    if (host?.isConnected) return;
    host = document.createElement("div");
    host.id = "jeradin-screen-intelligence-root";
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    document.documentElement.appendChild(host);
    root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `*{box-sizing:border-box}button{font:inherit}.backdrop{position:fixed;inset:0;background:rgba(0,0,0,.22);pointer-events:auto}.sheet{position:fixed;z-index:2;right:16px;top:16px;bottom:16px;width:min(480px,calc(100vw - 24px));display:flex;flex-direction:column;background:#0a0b0d;color:#f5f5f5;border:1px solid #30333a;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.65);pointer-events:auto;font-family:system-ui,sans-serif;overflow:hidden}.top{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #272a30}.brand{display:flex;align-items:center;gap:9px;font:600 10px ui-monospace,monospace;letter-spacing:.2em}.brand b,.pill b{display:grid;place-items:center;width:24px;height:24px;background:#f97316;color:#111;border-radius:6px}.top button{border:0;background:transparent;color:#a7abb3;font-size:18px;padding:5px 8px;cursor:pointer}.top button:hover{color:#fff;background:#202228;border-radius:5px}main{flex:1;overflow:auto;padding:16px;scrollbar-width:none}main::-webkit-scrollbar{display:none}section{display:grid;gap:10px;margin-bottom:18px}label{font:500 9.5px ui-monospace,monospace;letter-spacing:.2em;color:#8b9099;margin-top:8px}h2{font-size:16px;line-height:1.45;margin:0}p{font-size:12.5px;line-height:1.65;color:#d2d4d8;margin:0}.stages{gap:8px}.stage{display:flex;gap:9px;align-items:center;font-size:12px;color:#a7abb3}.stage.running span{color:#fb923c;animation:pulse 1s infinite}.stage.done span{color:#34d399}.stage.error{color:#fca5a5}.error{padding:9px;border:1px solid #5c292d;background:#271316;border-radius:6px;font-size:12px}.error small{display:block;color:#9da1a9;margin-top:4px;font-family:ui-monospace,monospace}.steps{display:grid;gap:10px}.step{border:1px solid #292c32;background:#111317;border-radius:7px;overflow:hidden}.step>header{display:flex;gap:9px;align-items:center;padding:8px 10px;border-bottom:1px solid #292c32}.step>header span{font:500 9px ui-monospace,monospace;color:#777d87}.step>header code{font:11px ui-monospace,monospace;color:#e4e6e9}.step p{padding:10px}.code{margin:0;border-top:1px solid #292c32;padding:12px 14px;background:#0b0f17;color:#abb2bf;white-space:pre-wrap;overflow-wrap:anywhere;font:11.5px/1.55 ui-monospace,monospace}.fatal{display:none;padding:10px;border:1px solid #7f1d1d;color:#fecaca;background:#2b1113;border-radius:6px;font-size:12px}footer{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-top:1px solid #272a30;color:#777d87;font:500 9px ui-monospace,monospace;letter-spacing:.18em}.pill{position:fixed;right:20px;bottom:24px;display:flex;align-items:center;gap:9px;padding:8px 12px 8px 8px;border:1px solid #3c4048;border-radius:999px;background:#0a0b0d;color:#f5f5f5;box-shadow:0 18px 60px rgba(0,0,0,.65);pointer-events:auto;cursor:pointer;font:500 10px ui-monospace,monospace;letter-spacing:.15em}.pill i{width:7px;height:7px;border-radius:50%;background:#fb923c;box-shadow:0 0 10px #fb923c}@keyframes pulse{50%{opacity:.35}}@media(max-width:600px){.sheet{inset:auto 0 0 0;width:100%;height:min(82vh,720px);border-radius:14px 14px 0 0}.backdrop{background:rgba(0,0,0,.35)}}`;
    root.appendChild(style);
  }
  function render() {
    if (!root) return;
    root.querySelectorAll(":scope > :not(style)").forEach((element) => element.remove());
    if (!state.open) {
      root.innerHTML += `<button class="pill" id="jeradin-open"><i></i><b>J</b><span>ASK JERADIN${state.fix ? " — READY" : ""}</span></button>`;
      root.getElementById("jeradin-open")?.addEventListener("click", () => { state.open = true; render(); });
      return;
    }
    const stages = [...state.stages.values()].map((s) => `<div class="stage ${s.status}"><span>${s.status === "done" ? "✓" : s.status === "error" ? "!" : "◌"}</span>${escapeHtml(s.label)}</div>`).join("");
    const analysis = state.analysis, fix = state.fix;
    const errors = (analysis?.errors || []).map((e) => `<div class="error"><strong>${escapeHtml(e.message)}</strong>${e.file ? `<small>${escapeHtml(e.file)}${e.line ? `:${escapeHtml(e.line)}` : ""}</small>` : ""}</div>`).join("");
    const steps = (fix?.steps || []).map((s, i) => `<article class="step"><header><span>STEP ${i + 1}</span><code>${escapeHtml(s.file || "Suggested change")}</code></header><p>${escapeHtml(s.change)}</p>${s.codeAfter ? `<pre class="code"><code>${highlight(s.codeAfter)}</code></pre>` : ""}</article>`).join("");
    root.innerHTML += `<div class="backdrop" id="jeradin-minimize"></div><aside class="sheet" role="dialog" aria-label="Ask Jeradin screen analysis"><header class="top"><div class="brand"><b>J</b><span>ASK JERADIN</span></div><div><button id="jeradin-collapse" title="Minimize">—</button><button id="jeradin-close" title="Close">×</button></div></header><main>${!analysis ? `<section class="stages">${stages || '<div class="stage running"><span>◌</span>Starting analysis</div>'}</section>` : ""}${analysis ? `<section><label>WHAT'S ON SCREEN</label><h2>${escapeHtml(analysis.summary || "Screen analysis")}</h2>${errors}<label>ROOT CAUSE</label><p>${escapeHtml(analysis.hypothesis || "")}</p></section>` : ""}${fix ? `<section><label>RECOMMENDED FIX</label><p>${escapeHtml(fix.plainExplanation || "")}</p><div class="steps">${steps}</div></section>` : ""}<div class="fatal" style="display:${state.error ? "block" : "none"}">${escapeHtml(state.error)}</div></main><footer><span>${fix ? "READY" : state.error ? "FAILED" : "ANALYZING…"}</span><span>SCREEN INTELLIGENCE</span></footer></aside>`;
    root.getElementById("jeradin-minimize")?.addEventListener("click", minimize);
    root.getElementById("jeradin-collapse")?.addEventListener("click", minimize);
    root.getElementById("jeradin-close")?.addEventListener("click", close);
  }
  function show() { ensureOverlay(); state.analysis = null; state.fix = null; state.error = ""; state.stages.clear(); state.open = true; render(); }
  function minimize() { state.open = false; render(); }
  function close() { host?.remove(); host = null; root = null; }
  function showError(message) { ensureOverlay(); state.error = message || "Analysis failed"; state.open = true; render(); }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "JERADIN_SHOW_OVERLAY") show();
    else if (message?.type === "JERADIN_OVERLAY_EVENT") {
      const event = message.event;
      if (event?.type === "stage") state.stages.set(event.id, event);
      if (event?.type === "section" && event.data?.analysis) state.analysis = event.data.analysis;
      if (event?.type === "section" && event.data?.fix) state.fix = event.data.fix;
      if (event?.type === "error") showError(event.message);
      else render();
    } else if (message?.type === "JERADIN_OVERLAY_ERROR") showError(message.message);
    sendResponse({ ok: true });
    return true;
  });

  if (location.hostname === "jeradin.com") {
    push();
    window.addEventListener("storage", push);
    window.addEventListener("message", (event) => {
      if (event.source === window && event.origin === location.origin && event.data?.type === "JERADIN_ANALYZE_ACTIVE_TAB" && event.data.payload?.imageBase64) {
        chrome.runtime.sendMessage(event.data).then((response) => {
          window.postMessage({ type: "JERADIN_EXTENSION_ACK", requestId: event.data.requestId, ok: Boolean(response?.ok) }, location.origin);
        }).catch(() => {
          window.postMessage({ type: "JERADIN_EXTENSION_ACK", requestId: event.data.requestId, ok: false }, location.origin);
        });
      }
    });
    setTimeout(push, 1500);
    setTimeout(push, 5000);
  }
})();
