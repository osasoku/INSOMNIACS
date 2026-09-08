# THE INSOMNIACS — Chapter 001: First Light

A self-contained, static site. No build step required — open `index.html`
in a browser, or deploy the folder as-is to any static host (Vercel,
Netlify, S3 + CloudFront, GitHub Pages, etc.).

```
insomniacs/
├── index.html          structure + content (edit copy here)
├── css/style.css        design system (tokens at the top) + all styles
├── js/grain.js          the animated film-grain background (canvas)
├── js/glitch.js         the periodic glitch bursts on the final state
├── js/intro.js          the 03:17 opening signal sequence
└── js/app.js            state machine, config, waitlist logic
```

## The user journey this implements

**New visitor:** open site → brief full-screen `03:17` signal (~1.6s,
not a loading screen) → main Insomniacs experience (hero → dispatch →
waitlist) → submit the form → `YOU'RE IN. / 03:17 / THEY'RE AWAKE. /
We'll tell you what's next.` → automatic transition into the terminal
state: full-screen `YOU'RE IN / 03:17`, continuously and gently
glitching.

**Returning visitor who already joined:** open site → the same short
`03:17` signal → straight into the terminal `YOU'RE IN / 03:17` state.
No form, no login, no dashboard.

## Editing content

Almost all copy lives directly in `index.html`, marked in clearly
commented sections (`HERO`, `DISPATCH / EDITORIAL`, `WAITLIST`,
`FINAL SIGNAL`, `FOOTER`). Anything the brief didn't specify yet
(venue, date, lineup) is left as a visible `TO BE ANNOUNCED` placeholder
— replace it in place when that information is confirmed. Don't leave
guessed values in; the pattern is intentionally visible so it's obvious
what still needs filling in.

Image slots are currently textured placeholder blocks with a visible
label (e.g. `IMAGE SLOT — 01 / LAGOS / NIGHT / MONO`) rather than stock
photography, per the brief's instruction not to use generic stock
images. To drop in real photography:

1. Replace the `.editorial-block__image` `div` with an `<img>` (or a
   `div` with `background-image`), sized and cropped per the label's
   intent.
2. Serve responsive sizes (`srcset`) and modern formats (AVIF/WebP with
   a JPEG fallback) so mobile doesn't download desktop-sized assets.
3. Keep the existing dark gradient overlay (`::after`) for text
   legibility if any copy sits on top of the image.

## Design system

All color, type, spacing, and motion values are CSS custom properties
at the top of `css/style.css` (`:root { ... }`). Adjust the whole
site's feel from one place — e.g. `--grain-opacity` for how visible
the film grain is, `--glitch-burst-opacity` for how strong the final
signal's glitch reads, or the `--fs-display-*` scale for type sizing.

Typefaces: **Big Shoulders Display** (condensed display type) and
**JetBrains Mono** (technical/monospace, doubling as the utility/body
voice). Both load from Google Fonts in `index.html`'s `<head>` — swap
those `<link>` tags to self-hosted files if you'd rather not depend on
Google Fonts.

## Waitlist backend integration

The frontend currently runs in **local-only mode**: submissions are
validated client-side and stored in `localStorage` on the visitor's own
device, so returning-visitor recognition works, but nothing is sent to
a server yet, and the site doesn't claim otherwise.

To connect a real backend:

1. Open `js/app.js` and set `CONFIG.waitlistEndpoint` to your API URL.
2. `submitToWaitlist()` already has the real `fetch()` call written and
   commented out as a placeholder for the local-only simulation — with
   `waitlistEndpoint` set, it switches to that call automatically.
3. Have your endpoint accept `{ firstName, email, phone }` as JSON and
   return a 2xx response on success.
4. If you want true cross-device "already joined" recognition (e.g. a
   visitor who joined on their phone should also see the terminal state
   on their laptop), that requires an identifier the backend can
   recognize — a magic-link token, an account system, or matching by
   verified email/phone on a subsequent visit. The current
   `localStorage` flag is intentionally scoped to one browser on one
   device; it is not a substitute for that.

## Editable non-content config

Also in `js/app.js`:

- `CONFIG.instagramUrl` / `CONFIG.contactEmail` — currently placeholders,
  wired to the footer and the `[ FOLLOW THE SIGNAL ]` link.
- `CONFIG.confirmHoldMs` — how long the `YOU'RE IN` confirmation copy
  holds before the site transitions into the full-screen terminal
  signal state.

## Performance & accessibility notes

- The moving background is procedural canvas noise (a small tile
  redrawn and stamped across the viewport), not a video file — cheap
  on both desktop and mobile, capped device-pixel-ratio, paused when
  the tab isn't visible, and reduced to a lower frame rate/opacity
  under `prefers-reduced-motion`.
- The final-state glitch is a periodic, brief, JS-scheduled "burst"
  (CSS transform + clip-path), not a per-frame effect — cheap to run
  indefinitely, and reduced to a subtle static flicker under
  `prefers-reduced-motion`.
- All interactive elements are real semantic HTML (`<button>`,
  `<a href>`, labeled `<input>`s) with visible focus states; the form
  announces errors and the "you're in" confirmation via `aria-live`.
- Without JavaScript, a `<noscript>` fallback reveals the static page
  content (the animated intro and grain are progressive enhancement).
