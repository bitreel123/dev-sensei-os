# Architecture

Use the shared HealthDashboard for the health overview on /chat and /app; retain the existing intelligence conversation at /chat?view=assistant so the visual pivot does not silently replace existing analysis logic.
Keep the health overview presentation separate from clinical processing; anatomical artwork is an educational preview, and unconnected research or simulation tools must not claim live medical results.
Keep the public landing page's sand theme scoped to `.jeradin-landing`; dynamically import its Three.js typography after mounting so the rest of the website retains its theme and server rendering.
Keep landing motion illustrations separate from research processing; animated evidence and anatomy are educational presentation, not generated clinical results.
Render the hero's locally hosted CC0 anatomical skull as wireframe with outward data particles and sequential canvas-texture messages in the browser-only Three.js scene; derive its top from the unchanged copy's measured height so papers remain visible without overlap, and suspend motion offscreen or for reduced motion.
Bridge older hardcoded dark presentation classes to semantic light tokens under the root white-page scope, excluding the already token-based landing and health dashboard, so legacy pages remain readable without changing their behavior.
The hero exposes dev-only window.__jeradinHero.setTime(seconds) to inspect sequential message fades at a fixed scene time; data-scene-ready signals the loaded skull.
Use the shared browser-only AnatomyWalkthrough for ten-second organ tours and Three.js connection overlays; dashboard anatomy uses the same educational atlas artwork as the landing instead of procedural body stand-ins, preserving label selection and zoom.