# Art pipeline: from code-drawn to authored art

The app's characters are drawn procedurally on canvas (draw-functions shared
between DOM sprites and WebGL textures - see `FidelQuestApp.jsx`). That keeps
the bundle tiny and offline, but caps how polished the art can look. This is
the on-ramp to higher-fidelity authored art without a rewrite.

## What exists now

- **`components/AnbessaSvg.jsx`** - Anbessa as authored SVG (vector), a clear
  step up from the canvas sprite: soft gradients, expressive face, tail, chest
  star, `happy` and `cheer` expressions. Scales cleanly at any size; gradient
  ids are namespaced with `useId` so multiple instances never collide.

SVG is the free path (I draw it in code). Two paid paths can drop in later
through the SAME seam: AI-generated art (you run the tool, prompts + spec
provided) or a commissioned illustrator. All three end as a component or an
asset the seam below can render.

## The seam: where authored art can replace the sprite

Adopt `AnbessaSvg` on **DOM surfaces that do NOT need wearable compositing**:

- Greetings / onboarding, empty states, celebration overlays.
- The website (marketing, `/progress`, success screens) - pure React, ideal.

```jsx
import AnbessaSvg from './components/AnbessaSvg'
<AnbessaSvg size={140} expression="cheer" title="Anbessa" />
```

## What stays canvas for now (on purpose)

Two surfaces keep the code-drawn sprite until a rasterization step is added:

1. **Anbessa's Closet** composites earned wearables over the sprite with
   `drawWearables` (canvas). SVG art would need each wearable re-authored as
   SVG layers, or the SVG rasterized to a canvas Anbessa the wearables draw
   onto.
2. **WebGL textures** (the 3D runner) need a raster source. An SVG can be
   rasterized to an offscreen canvas (`<img>` from an SVG data URL ->
   `drawImage`) and used as a texture, but that is an async step not wired
   yet.

Neither blocks adopting `AnbessaSvg` on the many surfaces that just show a
plain Anbessa. Do that first; tackle wearable/WebGL rasterization only if the
authored look is worth carrying everywhere.

## Adding more authored characters

Kokeb (star), Jibby (hyena), and the zebra friends can follow the same
pattern - one SVG component each, same palette discipline, namespaced ids.
Keep them on-model with the canvas colors so the two art systems can coexist
during the transition.

## If you later buy or generate art

- Confirm the license covers **commercial use and redistribution in a paid
  store app** (asset-marketplace packs and AI tools vary; check per source).
- Export at 2x-3x the largest on-screen size; prefer SVG where the source is
  vector, PNG with transparency otherwise.
- Drop it in behind the same component boundary so call sites do not change.
