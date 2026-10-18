# Frontend notes

## What existed before

A frontend already existed: a Next.js 16 (App Router) + React 19 app in `algorise/`, styled with one hand-written CSS file (`src/app/globals.css`, minified, with Tailwind v4 imported) and lucide-react icons.

- `src/app/page.tsx`: marketing/landing page (hero, dashboard preview, learning loop, integrity section).
- `src/app/dashboard/page.tsx`: local demo workspace (sidebar, metrics, Skill Radar, coach preview, weekly roadmap, import, pairing).
- `src/components/CodeforcesImport.tsx`, `PairingCard.tsx`, `Logo.tsx`: client widgets.
- `algorise/extension/popup.*`: browser-extension popup (not changed).

The stack, structure and visual direction (dark ink, cyan/lime accents) are unchanged. This pass fixed accessibility, responsiveness and a few frontend bugs.

## What changed

### `src/app/globals.css`
- Added a global `:focus-visible` ring. Before this, keyboard focus was invisible everywhere except the handle input.
- Added a `button:disabled` style. Disabled buttons used to look clickable.
- Added a `.skip-link` style for the dashboard's skip link.
- Added a `prefers-reduced-motion` block that turns off smooth scrolling, the spinner animation and hover transitions.
- Lowered the hero `h1` minimum size from 50px to 38px so "programming," no longer overflows 320–375px phones.
- **Mobile dashboard bug:** at ≤720px the sidebar hid every link except "Overview", so Roadmap, Import and Companion could not be reached from the nav. All links now stay visible in a horizontally scrollable row.
- Raised readable text from 9–11px to 11–13px: coach list, insight text, week cards, import copy and label, result banners, pairing copy, footer.
- Fixed text that failed WCAG AA contrast: the footer (#5f7580, 3.7:1), coach disclaimer (#657a84, 4.0:1) and loop step numbers (#4b626f, 2.8:1) now all pass 4.5:1.
- The Import button now has a 44px minimum touch height.
- Added styles for the new `.tz-chip` and for the insight link that replaced a button (`.radar-insight a`).

### `src/app/page.tsx`
- The hero preview `div` with `aria-label` (an ARIA label on a generic element, which is invalid) is now a `<figure>`.

### `src/app/dashboard/page.tsx`
- Added a "Skip to workspace" link. The main area got `id="workspace"`.
- The sidebar `<nav>` got `aria-label`, and the active link got `aria-current="page"`.
- Removed three controls that looked interactive but did nothing:
  - The "Repository" icon button is now `type="button"`, disabled, and has an `aria-label` that says it isn't connected yet.
  - "View evidence" was a button with no handler. It is now a link "Import evidence" that jumps to `#import`.
  - "Asia/Dhaka" was a button with no handler. It is now a non-interactive time-zone chip.
- Each week card now has screen-reader text ("Done", "In progress" or "Upcoming"). Before, status was shown only by colour and icon.

### `src/components/CodeforcesImport.tsx`
- Import results and errors now sit in an `aria-live="polite"` region, so screen readers announce them.
- The spinner-only loading button now has an `aria-label` ("Importing").

### `src/components/PairingCard.tsx`
- **Bug:** `navigator.clipboard.writeText` throws outside secure contexts and when permission is denied, and that error was unhandled. It is now caught, and the user is told to copy the code manually.
- The status message is now `role="status"`, and the copy button has a descriptive `aria-label`.

## How to run

As documented in `algorise/README.md`:

```bash
cd algorise
cp .env.example .env.local   # set NEXTAUTH_SECRET; ALLOW_LOCAL_DEMO_AUTH=true for a localhost demo
npm install
npm run dev                  # http://localhost:3000 and /dashboard
```

Production build: `npm run build && npm start`.

## Verification done

- `npm run lint`, `npm run typecheck` and `npm run build` all pass.
- Ran `next start` and confirmed `/` and `/dashboard` return 200 and contain the new markup: figure, skip link, `aria-current`, live region, `sr-only` status text. Also confirmed the `sr-only` utility is in the built CSS.
- **Not done:** browser-based visual and responsive checks. Playwright's Chromium won't start in this environment because the system library `libatk-1.0` is missing. `npm run visual:smoke` was not run either, because it overwrites the committed screenshots in `docs/evidence/`.
- With no `.env` loaded, `/api/import/extension/pair` returns 500 (`NO_SECRET` from next-auth). That is the existing auth configuration, not a frontend change.
