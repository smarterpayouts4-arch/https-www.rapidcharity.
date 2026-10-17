# AGENTS.md — RAPID Charity site migration

The Next.js app lives at the repository root (it is no longer nested in `rapid-charity-next/`).

## Project layout
```
./                      # Next.js 16 App Router app
  app/ components/ lib/ content/ public/ tests/
  docs/                 # audits, manifests, known-issues, setup
```

## Architecture
- **Source:** Wix site https://www.rapidcharity.org/
- **Target:** Next.js App Router — behavioral + visual parity, **not** Wix architectural parity
- **Forbidden:** any `wix` / `@wix` SDK, long-term hotlinking `static.wixstatic.com`
- Feature classes: (1) reproduce locally (2) external integration (3) static/local content (4) later CMS — see `docs/wix-feature-decisions.md`

## Commands (Next app)
- `npm install` / `npm run dev` / `npm run build` / `npm run lint` / `npm run typecheck` / `npm run test:unit` / `npm test` — from the repository root
- Prefer `next/image` for all local assets copied from `source-reference/assets/`

## Conventions
- Mirror public URL paths (`/general-8`, `/robert-mathais-scholarship`, `/blog`, `/post/[slug]`, …)
- Shared header/footer layout matching nav order: Home, About Us, Scholarship Programs ▾, Apply, Events, News, Donate
- Brand: crimson `#B20F3A`, text `#393F44`; fonts Poppins / Cormorant Garamond (+ licensed substitutes)
- Contact: info@rapidcharity.org; Facebook profile in footer CONNECT

## Parity rules
- Preserve observable copy **including** known issues (grammar, 1/3/3 numbering, Mathais/Mathias) unless product explicitly changes them — see `docs/source-known-issues.md`
- Google Forms + PayPal = outbound links only (never auto-submit)
- Newsletter / Log In = UI shell only in Phase 1 (class 4)
- Legacy/DO-NOT-USE routes: document; stub or redirect — do not promote

## Asset handling
1. Inventory source URLs in `docs/asset-manifest.md`
2. Download originals into `source-reference/assets/` with descriptive names
3. Copy needed files into `rapid-charity-next/public/assets/` for serving
4. Never leave production builds depending on Wix CDN

## Validation
- Compare against `source-reference/screenshots/{desktop,tablet,mobile}/`
- Check routes in `docs/route-inventory.md`
- Confirm external targets in `docs/external-links.md`
- No Wix packages in lockfile; no hotlinked wixstatic in shipped pages


## Mandatory preflight
Before claiming blocked: verify Desktop `Rapid Charity` read/write, shell, Node, npm, local server, Playwright, and browser tools against live + localhost. If one capability fails, continue all other work and report only the true blocker.

## Crawl ledger (definition of not-done)
Maintain `docs/crawl-ledger.csv` with columns:
URL, Discovery Method, HTTP Result, Page Type, In Navigation?, Archived?, Implemented?, Desktop Compared?, Mobile Compared?, Tests Passing?, Notes.

Do **not** declare Phase 1 complete while any **current** nav route or discovered article has Implemented?/Desktop Compared?/Mobile Compared?/Tests Passing? = no (unless explicitly deferred in Notes with reason).

## Deterministic visual comparison viewports
Compare live Wix vs local Next at exactly:
- 360×800
- 390×844
- 430×932
- 768×1024
- 1024×768
- 1280×800
- 1440×900
- 1920×1080

Same URL, same dimensions, both sites. Store under `source-reference/screenshots/` (source) and `rapid-charity-next` QA output (local).

## Phase freeze
After human review of replication: `git tag wix-parity-v1` (also acceptable: `baseline/wix-parity`). Do not overwrite that baseline for redesign.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
