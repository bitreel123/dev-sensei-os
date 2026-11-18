# Architecture

Use the shared HealthDashboard for the health overview on /chat and /app; retain the existing intelligence conversation at /chat?view=assistant so the visual pivot does not silently replace existing analysis logic.
Keep the health overview presentation separate from clinical processing; anatomical artwork is an educational preview, and unconnected research or simulation tools must not claim live medical results.
Keep the public landing page's sand theme scoped to `.jeradin-landing`; dynamically import its Three.js typography after mounting so the rest of the website retains its theme and server rendering.
Keep landing motion illustrations separate from research processing; animated evidence and anatomy are educational presentation, not generated clinical results.
Bridge older hardcoded dark presentation classes to semantic light tokens under the root white-page scope, excluding the already token-based landing and health dashboard, so legacy pages remain readable without changing their behavior.
The hero exposes dev-only window.__jeradinHero.setTime(seconds) to inspect sequential message fades at a fixed scene time; data-scene-ready signals the loaded skull.
Use the shared browser-only AnatomyWalkthrough for ten-second organ tours and Three.js connection overlays; dashboard anatomy uses the same educational atlas artwork as the landing instead of procedural body stand-ins, preserving label selection and zoom.
Render the hero's network-human artwork (background removed, edge-faded) as a Three.js plane that forms from sampled particles and streams data from the hand autonomously, with no pointer input; derive its top from the unchanged copy's measured height and suspend motion offscreen or for reduced motion.
Landing anatomy tour uses CSS keyed 10s cycles: organ label fades in, then its explanation, then both fade out before the next organ.