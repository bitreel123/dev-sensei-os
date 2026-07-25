import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const messages = [];
let messageListener;

const tabs = [
  { id: 11, active: true, url: "https://jeradin.com/chat", title: "Jeradin" },
  { id: 22, active: false, url: "https://example.dev/editor", title: "Checkout.tsx — Visual Studio Code" },
];

const chrome = {
  tabs: {
    onActivated: { addListener() {} },
    async query(query) {
      if (query.active) return tabs.filter((tab) => tab.active);
      return tabs;
    },
    async get(tabId) { return tabs.find((tab) => tab.id === tabId); },
    async sendMessage(tabId, message) {
      messages.push({ tabId, message });
      return { ok: true };
    },
  },
  scripting: { async executeScript() {} },
  storage: {
    local: {
      async get() { return { session: null }; },
      async set() {},
    },
  },
  runtime: {
    onMessage: { addListener(listener) { messageListener = listener; } },
  },
};

const source = await readFile(new URL("../background.js", import.meta.url), "utf8");
vm.runInNewContext(source, { chrome, URL, fetch, console, TextDecoder, setTimeout, clearTimeout });

assert.equal(typeof messageListener, "function", "background message bridge must register");

const response = await new Promise((resolve, reject) => {
  const keptOpen = messageListener({
    type: "JERADIN_ANALYZE_ACTIVE_TAB",
    payload: {
      imageBase64: "captured-frame",
      note: "Fix checkout",
      sessionId: "00000000-0000-4000-8000-000000000001",
      targetTabTitle: "Checkout.tsx — Visual Studio Code",
    },
  }, { tab: tabs[0] }, resolve);
  assert.equal(keptOpen, true, "async extension response channel must stay open");
  setTimeout(() => reject(new Error("extension routing timed out")), 500);
});

assert.equal(response.ok, true);
const overlayMessage = messages.find(({ message }) => message.type === "JERADIN_SHOW_OVERLAY");
assert.ok(overlayMessage, "recording stop must request the overlay");
assert.equal(overlayMessage.tabId, 22, "overlay must appear on the captured codebase tab");
assert.notEqual(overlayMessage.tabId, 11, "overlay must never appear on the Jeradin tab");

console.log("overlay target e2e: passed");