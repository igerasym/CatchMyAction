# CatchMyAction design system — "Viewfinder" (shipped on the homepage 2026-11-03)

Reference implementation (read these first, match them):
- `src/app/globals.css` — primitives: `.disp`, `.hud`, `.brk` (+ `.brk-rec .brk-soft .brk-sm .brk-lg .brk-hover`),
  `.tag-rec`, `.tag-ghost`, `.rec-dot`, `.btn-pri`, `.btn-sec`, `.btn-rec`, `.ticks`
- `tailwind.config.ts` — tokens: `ink #121315`, `char` / `char-2` / `char-3`, `line #383a40`, `bone #f2ede4`,
  `mute #b3ada3`, `dim #948f86`, `rec #ff4433` (+ `rec-ink #160806` text on rec). Fonts: `font-sans` = Archivo,
  `font-mono` = JetBrains Mono.
- `src/app/components/home/*.tsx`, `src/app/navbar.tsx`, `src/app/components/footer.tsx`, `src/app/page.tsx`.
- Map markers: `src/app/components/map-inner.tsx` (REC-red square with photo count + mono label chip).

## Rules
- Surfaces: page `bg-char`, raised panels `bg-char-2`, deepest/contrast bands `bg-ink`, editorial light band `bg-bone text-ink`.
  Hairlines `border-line`. NO `bg-[#1a1a2e]`, `bg-[#0a0a0a]`, `bg-[#111]`, `bg-white/5` cards, NO `ocean-*` anywhere.
- Shape: square corners (no `rounded-xl/2xl/lg` on cards, buttons, inputs). Avatars/dots may stay round.
  Instead of rounded cards use hairline rules (`border-t border-line`) or `bg-char-2` panels, optionally a `.brk` frame.
- Type: headings `.disp` (wide Archivo), sizes via `text-[clamp(...)]`. Small labels / metadata / counts in `.hud` or
  `font-mono text-[11px] tracking-[0.12em] uppercase text-dim`. Body `text-mute`, primary text `text-bone`.
  Do not go below text-dim (#948f86) for readable text — no `text-white/20..40` (fails contrast).
- Accent: `rec` is the ONLY accent and means "you / action / live". Primary CTA `.btn-pri` (bone), checkout/
  find-me/destructive-forward `.btn-rec`, secondary `.btn-sec`. Links hover to `text-rec`.
- Inputs: `bg-ink border border-line text-bone placeholder:text-dim px-3.5 py-3 focus:border-bone focus:outline-none`,
  labels `.hud` above the field, associate `<label htmlFor>` with `id`.
- Matched / "it's you" photos: `.brk brk-rec` frame + `.tag-rec` label. Hover on photo tiles: `.brk brk-hover`.
- Icons: lucide-react, `aria-hidden` when decorative. No emojis in UI.
- Section intro pattern: `<p className="hud mb-5">NN / Name</p>` + `<h2 className="disp ...">Title<span className="text-rec">.</span></h2>`.

## Hard constraints
- Presentation only. Do NOT change data fetching, API calls, request bodies, state logic, props contracts,
  purchase / checkout / download / find-me / upload / auth behaviour. Only markup structure + classNames + copy
  where copy is clearly a label.
- Keep every interactive element working (buttons, forms, modals, lightbox, cart, infinite scroll, map clicks).
- Accessibility: keep/add aria-labels on icon-only buttons, alt text on images, label/id pairs.
- Verify with `npx tsc --noEmit -p .` (do NOT run `next build` / `next dev`, another agent may be building).
- Do not touch files outside your assigned list. No git operations, no npm install.
