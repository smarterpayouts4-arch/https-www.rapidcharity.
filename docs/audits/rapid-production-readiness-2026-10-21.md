# RAPID Charity Preview — Production readiness audit (2026-10-21)

**Scope:** Rapid Charity Preview only. Excel Analyzr is out of scope.

**Step 2 status:** **Complete** (with documented test-environment blockers; no production services used).

---

## 1. Executive conclusion

**Not ready for production** on a stateless multi-instance host until Step 3 (Firestore upload ownership, unified upload auth, rate limits, remove prod demo/dev pathways).

Investigation and local verification are sufficient to proceed to **Step 3** when approved. E2E apply/submit specs did not pass on this audit date because the configured Spring 2027 intake is **closed** (after 15 October 2026 Karachi time) and `.env.local` enables mock-application UI gates.

---

## 2. Test isolation (Step 2 preflight)

| Check | Result |
|-------|--------|
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (process env) | unset |
| `GOOGLE_DRIVE_*`, `CLOUDINARY_*` | unset |
| `VERCEL`, `VERCEL_ENV` | unset |
| `.env.local` | present; **only** `NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS` (name only) |
| `ADMIN_PORTAL_E2E` | unset (destructive admin E2E **disabled**) |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:4721` |
| Server storage mode | local `data/submissions` + `data/uploads` (no Firestore credentials loaded) |

**Stop condition:** not triggered — no production Firebase/Drive/Cloudinary credentials in the audit environment.

---

## 3. Production-readiness scorecard

| Area | Status | Highest | Notes |
|------|--------|---------|-------|
| Admin auth | Partial | P0 | Code OK; production not verified |
| Applicant upload auth | Fail | P0 | F-P0-01–03 |
| Data integrity (serverless) | Fail | P0 | Local manifest |
| Build | Pass | — | `npm run build` exit 0 |
| HTTP smoke (routes) | Pass | — | Stabilization: 0 HTTP audit failures |
| E2E (full) | Partial | P1 | 46 failures — testing mode + uncommitted hero UI |
| Unit tests | Pass | — | Stabilization: 66/66 with isolated batch test |
| Ops/git | Partial | P1 | Baseline `2785d71`; Step 2 `522ab40`; stabilization commit follows |

---

## 4. Findings register (counts)

| Severity | Count | IDs |
|----------|-------|-----|
| **P0** | 4 | F-P0-01 … F-P0-04 |
| **P1** | 6+ | F-P1-01 … F-P1-06, E2E/HTTP gaps |
| **P2** | 3+ | CSV injection, category dup, admin errors |
| **P3** | 1 | Provisional dead files (7 paths) |

---

## 5. Duplicate hash groups (exact SHA-256)

| Group | Files | Classification |
|-------|-------|----------------|
| 1 | `content/site.json`, `content/site.draft.json` | **Published/draft lifecycle pair** — bytes match today; not accidental duplicate |
| 2 | `content/blog.json`, `content/blog.draft.json` | **Published/draft lifecycle pair** |
| 3 | `content/events.json`, `content/events.draft.json` | **Published/draft lifecycle pair** |

**Exact duplicate groups (content):** 3 (all lifecycle pairs). **Do not delete** because hashes match.

---

## 6. Provisional deletion candidates — reachability

| File | Static import | Dynamic import | fs path load | Scripts | Tests | Seeds/CMS | Runtime route | Conclusion |
|------|---------------|----------------|--------------|---------|-------|-----------|---------------|------------|
| `lib/application/data/cities.json` | No | No | No | No | No | No | No | **Unreachable**; `constants.ts` is runtime source |
| `lib/application/data/provinces.json` | No | No | No | No | No | No | No | **Unreachable** |
| `lib/application/data/denominations.json` | No | No | No | No | No | No | No | **Unreachable** |
| `lib/application/data/heard-about.json` | No | No | No | No | No | No | No | **Unreachable** |
| `lib/application/data/occupations.json` | No | No | No | No | No | No | No | **Unreachable** |
| `lib/application/data/relationships.json` | No | No | No | No | No | No | No | **Unreachable** |
| `content/posts.ts` | No | No | No | No | No | No | No | **Unreachable** in repo; legacy compat shim — prefer `loadBlogContent()` |

**Deletion not approved (Step 4).** Blocker fixes may obsolete additional code later.

---

## 7. Production gates (20) — Preview

| # | Gate | Result |
|---|------|--------|
| 1 | Real reviewer authentication | **Partial** |
| 2 | Private routes authorized | **Partial** (401 API verified locally) |
| 3 | File download object auth | **Partial** |
| 4 | Google OAuth callback | **N/A** |
| 5 | Secrets outside repo | **Partial** (demo key in source) |
| 6 | Log redaction | **Partial** |
| 7–8 | Luna / OpenAI | **N/A Pass** |
| 9 | Durable prod storage | **Fail** |
| 10 | Migrations/backup | **Fail ops** |
| 11–14 | Workers / Drive dup | **N/A** |
| 15 | Final workbook eligibility | **Partial** |
| 16 | Candidate Summary | **N/A** |
| 17 | Counts reconcile | **Partial** |
| 18 | Build/tests | **Partial** |
| 19–20 | Monitoring/rollback | **Fail** |

---

## 8. Test and build results (exact)

### Step 2 baseline (audit commit `522ab40`, before stabilization)

| Command | Exit | Result |
|---------|------|--------|
| `npm run typecheck` | 0 | Pass |
| `npm run lint` | 0 | Pass |
| `npm run test:unit` | 1 | 63 pass, 1 fail — EPERM on shared `data/submissions/batches.json` |
| `npm run build` | 0 | Pass |
| `AUDIT_BASE=http://127.0.0.1:4721 npm run qa:final:http` | 1 | 1 failure — `report-2025.pptx` 200 vs stale script expectation 404 |
| Full Playwright (`PLAYWRIGHT_SKIP_WEBSERVER=1`) | 1 | 83 pass, 47 fail, 6 skip |

### Stabilization checkpoint (2026-10-21, commit `2578941aa00d2194fd2a2f896a0c49d3c6a0abdd`)

| Command | Exit | Result |
|---------|------|--------|
| `npm run typecheck` | 0 | Pass |
| `npm run lint` | 0 | Pass (0 errors; 0 warnings after batch-test import cleanup) |
| `npm run test:unit` | 0 | **66 pass, 0 fail** — batch purge uses temp `RAPID_SUBMISSIONS_DIR` / `RAPID_UPLOADS_DIR`; shared `data/submissions` untouched |
| `npm run build` | 0 | Pass |
| Server | — | `$env:RAPID_TEST_NOW='2026-10-10T12:00:00+05:00'; npx next start -H 127.0.0.1 -p 4721` (log: `qa/server-4721.log`, gitignored) |
| `AUDIT_BASE=http://127.0.0.1:4721 npm run qa:final:http` | 0 | **100 checks OK, 0 failures** — script now expects `report-2025.pptx` **200** |
| Playwright smoke subset | 1 | 50 pass, 2 fail — see E2E groups below |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4721 npx playwright test` | 1 | **84 pass, 46 fail, 6 skip** (~4.8m). Log: `qa/playwright-full.log` |

**Controlled clock:** `lib/application/clock.ts` → `resolveApplicationNow()` used by `loadFormState()` only when `RAPID_TEST_NOW` is set. Playwright `webServer` defaults to `2026-10-10T12:00:00+05:00`. Production deploys leave the variable unset. Unit coverage: `tests/unit/formState.test.ts` (before / during / deadline day / after for `follow-intake`) and `tests/unit/application-clock.test.ts`.

**October 15 deadline:** unchanged in content. Published `applicationForm.availability` is **`always-open`**, so the live form is not closed solely because the audit calendar date is after 15 Oct 2026. Remaining apply-flow failures are **not** “correct closed-form behavior”; they track **testing mode** (see below).

### 8.1 Uncommitted working tree (not in stabilization commit)

| Path | Change | Origin | Needed? | App vs test |
|------|--------|--------|---------|-------------|
| `components/Header.module.css` | Nav/layout spacing | Parallel home polish (predates audit commit) | Unknown — Oscar | **Application UI** |
| `components/home/DonateBanner.module.css` | Compact mobile donate band | Same | Unknown | **Application UI** |
| `components/home/Hero.module.css` | Two-line fluid headline layout | Same | Unknown | **Application UI** |
| `components/home/Hero.tsx` | Removed `TitleLine`; single-line spans for title | Same | Unknown | **Application UI** |
| `components/home/Leadership.module.css` | Board section compact layout | Same | Unknown | **Application UI** |
| `components/home/Leadership.tsx` | Board list / “7 Board Directors” copy | Same | Unknown | **Application UI** |
| `components/home/ReportsShowcase.module.css` | Report cards / CTA sizing | Same | Unknown | **Application UI** |
| `components/home/ReportsShowcase.tsx` | Report block structure | Same | Unknown | **Application UI** |
| `tests/e2e/apply-flow.spec.ts` | +20 lines: mobile home board/report/donate compact test | Matches Leadership/Reports UI work | Yes if UI lands | **Test only** |
| `tests/e2e/hero-layout.spec.ts` | 2-line headline assertions; `HERO_SHOT_DIR` env | Matches Hero refactor | Yes if Hero lands | **Test only** |
| `qa/` (untracked) | Playwright/server logs | Audit runs | Ephemeral | N/A |

**Action taken:** none of the above was reset, stashed, or committed. Step 3 should branch from audit `522ab40` or commit stabilization first, then merge UI work deliberately.

### 8.2 Unit-test isolation

- **Cause:** `application-batch.test.ts` called `forgetBatch()` against repo `data/submissions/batches.json` (Windows EPERM under lock).
- **Fix:** `lib/application/runtimePaths.ts` — optional `RAPID_SUBMISSIONS_DIR` / `RAPID_UPLOADS_DIR` (test-only). Batch purge test uses `mkdtemp` + `t.after` cleanup.
- **Acceptance:** `npm run test:unit` **66/66**; production paths unchanged when env overrides unset.

### 8.3 `report-2025.pptx` exposure

| Question | Answer |
|----------|--------|
| Source | `public/assets/documents/report-2025.pptx` (static file) |
| In `public/`? | Yes |
| Referenced by | `content/site.json` (`downloadHref`, `pptxPath`), `ReportsShowcase`, `/reports`, `lib/content/media.ts`, README |
| Sensitive? | Public annual report deck — marketing content, not applicant data |
| Intentional? | **Yes** — README documents local file; remote override via `REPORT_2025_URL` only when file absent |
| Audit script | Was stale (expected 404). **Updated** to expect **200** like other CMS-linked assets |
| Delete? | **Not recommended** — would break home/reports download links |

### 8.4 Remaining E2E failures by root cause (46)

| Group | Count (approx.) | First root cause |
|-------|-----------------|------------------|
| Apply validation / submit (`apply-flow.spec.ts`, 1× `smoke.spec.ts`) | 23 | `.env.local` **`NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1`** → `testingModeFromEnv()` true on `next start` → `goNext()` skips validation (`ApplicationForm.tsx`); **`[data-form-issues]` never appears** |
| Mock chip walks (`mock-applications.spec.ts`) | 18 | Same testing-mode path + specs expect non-testing validation/submit behavior |
| Hero layout (`hero-layout.spec.ts`) | 1 | **Uncommitted Hero/CSS** vs test expecting 2-line fit metrics (product + test in flux) |
| Admin UI (`final-system.spec.ts`) | 2 | No signed-in admin session in default local `next start` |
| Navigation crawl (`navigation.spec.ts:109`) | 1 | 30s timeout in link harvest (likely slow page under parallel load; not form-deadline) |
| Skipped (unchanged) | 6 | `ADMIN_PORTAL_E2E`, `NO_STORAGE_BASE_URL`, production-only testing-mode cases |

**Not classified as deadline closure:** published form is `always-open`; failures persist with `RAPID_TEST_NOW` mid-window.

### 8.5 Regression baseline trust (Step 3 gate)

| Gate | Trustworthy? |
|------|----------------|
| typecheck / lint / build | **Yes** |
| unit (66) | **Yes** |
| HTTP audit | **Yes** (after script fix) |
| Full E2E as prod-blocker guard | **No** — run with testing flag off (or dedicated env) before treating E2E as release gate |
| Step 3A (demo/dev removal) | **Proceed with caution** — use unit + targeted E2E after unsetting mock env; do not rely on full suite until env/UI debt resolved |

### Skipped E2E (6)

| Spec | Reason |
|------|--------|
| `admin-portal.spec.ts` | `ADMIN_PORTAL_E2E` unset |
| `demo-no-storage.spec.ts` | `NO_STORAGE_BASE_URL` unset |
| `testing-mode.spec.ts` (2) | Production-only cases |
| `mock-applications.spec.ts` (1) | Env gate |

---

## 9. Environment matrix

| Requirement | Local audit | Production | Status |
|-------------|-------------|------------|--------|
| Firestore | Off | Required | Partial |
| File bytes | Local or none | Drive **or** Cloudinary (pick one) | Fail until Step 3 |
| Admin secret | Playwright default in CI only | Required | Partial |

---

## 10. Remediation phases

1. Repository baseline — **done** (`2785d71`)
2. Investigation — **done** (this document)
3. **Production blockers** — not started
4. Dead-code cleanup — not approved
5. Consolidation — not approved
6. Production validation — not approved

---

## 11. Safe cleanup batch

**None approved.**

---

## 12. Open decisions

- Confirm **one** production file provider (Drive preferred in code when both env sets present).
- Confirm Vercel production domain.

---

## Step 1 rollback

- Baseline: `2785d718ea554d02c9a1d074ae530d4bac368300`
- Pre-commit scan: [pre-commit-scan-2026-10-21.md](./pre-commit-scan-2026-10-21.md)

---

## Recommended first Step 3 batch

1. Firestore-backed upload ownership (remove production dependence on `data/uploads/manifest.json`; multi-instance default).
2. Single shared server upload validator + mandatory rate limits (magic bytes, size, slot, draft session, re-upload scope/expiry).
3. Remove production demo/dev pathways entirely (no `?demo=`, no `/api/dev/*` on prod).
4. Designate one active cloud storage provider in production config.

Do **not** delete the seven provisional files until after Step 3.
