## Fix the chat dashboard only

1. **Expose the hidden dashboard exception**
   - Update the existing root error reporting so authenticated client-render failures preserve and report the actual error and stack instead of only showing “This page didn’t load.”
   - Keep the user-facing fallback, but ensure the failing route/module is identifiable in preview and live logs.

2. **Harden `/chat` startup dependencies**
   - Isolate optional dashboard services (account credits, GitHub status, notifications, cloud history) so a failed query, rejected auth call, malformed saved history item, or unavailable table cannot crash the whole chat route.
   - Add defensive handling to auth/session initialization so a rejected session request ends loading safely instead of leaving or breaking the page.
   - Preserve the existing dashboard UI and functionality; no redesign or unrelated feature changes.

3. **Fix the exact exception revealed by verification**
   - Reproduce the authenticated failure after instrumentation.
   - Patch only the confirmed crashing component/data path and any directly shared equivalent used by `/pricing` if the same exception affects it.

4. **Verify preview and live behavior**
   - Test `/chat` startup with authenticated account data, including the legacy `grant` plan already confirmed in the database.
   - Confirm the dashboard renders, the composer is visible, optional service failures remain non-fatal, and no browser/runtime exception occurs.
   - Verify `/pricing` still opens because it shares account data loading.