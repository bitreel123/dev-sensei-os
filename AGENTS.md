# Architecture

Use the shared HealthDashboard for the health overview on /chat and /app; retain the existing intelligence conversation at /chat?view=assistant so the visual pivot does not silently replace existing analysis logic.
Keep the health overview presentation separate from clinical processing; anatomical artwork is an educational preview, and unconnected research or simulation tools must not claim live medical results.
Keep the public landing page's sand theme scoped to `.jeradin-landing`; dynamically import its Three.js typography after mounting so the rest of the website retains its theme and server rendering.
Keep landing motion illustrations separate from research processing; animated evidence and anatomy are educational presentation, not generated clinical results.