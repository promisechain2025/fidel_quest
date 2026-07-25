# eGeez — website

The public site for the eGeez learning hub: the homeschooling/remote-teacher
vision, the Amharic journey, Tigrinya waitlist, teacher applications, and
homeschool guidance. Independent Vite app — imports nothing from the app in
`../src`; brand tokens are hand-copied into `src/tokens.css`.

## Run

```bash
cd website
npm install
npm run dev        # local dev
npm run build      # static output in dist/
```

## Configuration (Vite env vars, all optional)

| Var                  | Default                     | Purpose                                   |
| -------------------- | --------------------------- | ----------------------------------------- |
| `VITE_APP_URL`       | `https://fidelquest.app`    | where "Open the app" CTAs point           |
| `VITE_API_URL`       | *(empty)*                   | the hub API (`../api`); empty = forms fall back to a prefilled mailto |
| `VITE_CONTACT_EMAIL` | owner address               | mailto fallback + contact                  |

## Structure

```
src/
  main.jsx, App.jsx       # router shell (6 routes)
  tokens.css              # brand tokens copied from ../src/index.css + tibeb/tile/chunk primitives
  config.js               # APP_URL / API_URL / CONTACT_EMAIL
  api.js                  # submitForm() -> hub API, mailto fallback
  i18n.js                 # t(key, fallback) - site translations land here
  components.jsx          # Header/Footer/Section/Card/CtaButton/LetterTile/Tibeb/fields
  pages/                  # Home, Amharic, Tigrinya, Teachers, Homeschool, About
```

Light + dark themes follow the visitor's system preference; the header toggle
persists a choice in `egz.site.theme` (set before paint in `index.html`).

## Deploy

Any static host. For SPA routing, add a history fallback (all paths ->
`index.html`) — on Netlify: `/* /index.html 200` in `_redirects`.
