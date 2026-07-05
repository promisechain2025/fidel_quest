# Fidel Quest v2 — single-file artifact prototype

A Duolingo-inspired rebuild of the game as one React source file
(`src/FidelQuestApp.jsx`), compiled to a self-contained HTML page for
Claude Artifacts (vite-plugin-singlefile inlines everything).

Differences from the main app: rigid table-driven state machine
(IDLE / PRESENTATION / AWAITING_INPUT / SUCCESS_BURST / ERROR_RECOVERY /
LEVEL_COMPLETE), deterministic seeded RNG threaded through the context,
invariant self-test suite at module load, Framer Motion micro-interactions,
chunky press-down buttons, and bottom feedback sheets.

Build: npm install && npm run build (dist/index.html is the artifact).
