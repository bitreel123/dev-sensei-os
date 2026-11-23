# Architecture

Use the shared HealthDashboard for the health overview on /chat and /app; retain the existing intelligence conversation at /chat?view=assistant so the visual pivot does not silently replace existing analysis logic.
Keep the health overview presentation separate from clinical processing; anatomical artwork is an educational preview, and unconnected research or simulation tools must not claim live medical results.
Keep the public landing page's sand theme scoped to `.jeradin-landing`; dynamically import its Three.js typography after mounting so the rest of the website retains its theme and server rendering.
Keep landing motion illustrations separate from research processing; animated evidence and anatomy are educational presentation, not generated clinical results.
Use LandingImageArt for uploaded landing storytelling images: lazy-load its Three.js image-plane animation, preserve a static-image fallback, and pause offscreen or for reduced motion so presentation stays accessible without implying data processing.
Bridge older hardcoded dark presentation classes to semantic light tokens under the root white-page scope, excluding the already token-based landing and health dashboard, so legacy pages remain readable without changing their behavior.
The hero exposes dev-only window.__jeradinHero.setTime(seconds) to inspect sequential message fades at a fixed scene time; data-scene-ready signals the loaded skull.
Use AnatomyWalkthrough for landing Three.js overlays and DashboardAnatomy for autonomous ten-second report tours; both use the same uncropped educational atlas instead of procedural stand-ins so organ indicators align with the artwork.
Render the hero's network-human artwork (background removed, edge-faded) as a Three.js plane that forms from sampled particles and streams data from the hand autonomously, with no pointer input; derive its top from the unchanged copy's measured height and suspend motion offscreen or for reduced motion.
Landing anatomy tour uses CSS keyed 10s cycles: organ label fades in, then its explanation, then both fade out before the next organ.
Dashboard content is educational and unconnected; use explicit service-availability notices instead of sample/preview badges so removing badges never implies live research.
Keep Search Explorer on /app (also /chat overview) and Pathogen Mapping on /pathogen with independent feeds; share only the dashboard shell and anatomy renderer so reports are not mixed by navigation shortcuts.
Render additional dashboard pages inside HealthDashboard's content slot with explicit active navigation; keep dataset records explicitly unconnected until licensed sources and downloads are connected.
Keep /assistant as a single-conversation UI preview composed from installed AI Elements, without model calls or persistence; leave the existing /chat?view=assistant processing unchanged until connection is requested.

Keep report downloads out of overview actions; expose full organ explanations through Read full report and place unavailable dossier downloads only at the report end.
- Full reports open at /reports/$kind as news-style articles inside the dashboard shell, reusing DashboardAnatomy; data lives in report-articles.ts until research is connected.
