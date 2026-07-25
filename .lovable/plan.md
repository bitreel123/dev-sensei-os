## Fix Ask Jeradin cross-tab overlay

### Confirmed problem
The current Ask Jeradin sheet is mounted inside the `/chat` React page, so CSS can only display it in the Jeradin tab. The extension currently analyzes inside its popup and its content script only syncs the login session; it never injects an overlay into the Lovable editor or another shared tab.

### Implementation
1. **Inject Ask Jeradin into the shared tab**
   - Extend the browser extension content script with an isolated Shadow DOM overlay.
   - Render the floating pill and attached responsive sheet directly inside the target tab, including Lovable codebase tabs.
   - Support minimize, reopen, close, mobile bottom-sheet, and desktop side-sheet states without changing the host page.

2. **Bridge recording stop to the extension**
   - On Screen Intelligence recording stop, send the captured frame, prompt, and session ID to the extension.
   - Track the most recent non-Jeradin/shared tab so the overlay opens there even when Jeradin temporarily becomes active.
   - Keep the existing in-app fallback when the extension is unavailable.

3. **Stream analysis into that tab**
   - Have the extension service worker call the existing authenticated `/api/intel/screen/stream` endpoint.
   - Forward each NDJSON stage and section to the injected overlay immediately: Thinking, Reading screen, Understanding code, Finding errors, and Generating fixes.
   - Display authentication, unsupported-page, capture, and analysis failures inside the overlay.

4. **Update extension capture behavior**
   - Change “Capture & Analyze” so it opens the injected overlay on the captured tab rather than displaying results only in the small extension popup.
   - Expand host access so the overlay can work on normal web tabs; browser-internal pages remain unavailable due to browser security restrictions.
   - Increment the extension version so users can confirm they installed the corrected package.

5. **IDE-colored code everywhere**
   - Preserve the existing Prism `oneDark` code cards for structured fix steps.
   - Replace plain assistant follow-up rendering in the web chat, Screen Intelligence overlay, and Ask Jeradin pill with the installed AI Elements `MessageResponse`, which renders fenced code as highlighted, wrapped code blocks.
   - Add a compact One Dark-style code renderer to the extension overlay so suggested `codeAfter` is never omitted or shown as uncolored prose.

6. **Verification**
   - Validate extension message routing, session reuse, streaming events, minimize/reopen/close, and wrapped code suggestions.
   - Test the flow by capturing a Lovable editor tab, stopping Screen Intelligence, and confirming the sheet appears over that editor rather than only in Jeradin.
   - Verify desktop and mobile-sized layouts and confirm no visible scrollbars appear in the result surface.