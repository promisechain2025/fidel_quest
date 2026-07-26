# Third-party components

eGeez is proprietary (see LICENSE). It builds on open-source components used
under their own permissive licenses. This file records the notable ones; the
authoritative license text for each ships inside its package under
`node_modules/<pkg>/LICENSE`.

## Runtime libraries (all MIT unless noted)

- React, React DOM, React Router — MIT
- Vite, @vitejs/plugin-react — MIT
- TailwindCSS, @tailwindcss/vite — MIT
- framer-motion — MIT
- lucide-react — ISC
- Express, helmet, cors, jsonwebtoken, bcryptjs, dotenv, nodemailer — MIT
- mongoose — MIT
- stripe (server SDK) — MIT
- @revenuecat/purchases-capacitor — MIT
- three, @react-three/fiber, @react-three/drei, @react-spring/three — MIT

All of the above permit commercial use and embedding; obligations are limited to
retaining their copyright/license notices (npm keeps these in `node_modules`).

## Fonts

- **Nunito** (variable) — SIL Open Font License 1.1
- **Noto Sans Ethiopic** — SIL Open Font License 1.1

The SIL OFL permits bundling and commercial use of the fonts within a product;
the fonts themselves may not be sold on their own and any modified font must not
use the reserved font name. Bundling them in the app/website as done here is
fully permitted.

## Reference data

- The Ethiopic fidel character set is a writing system (not copyrightable). The
  curated word/example data in `src/data/fidelGameData.js` is original to eGeez.
