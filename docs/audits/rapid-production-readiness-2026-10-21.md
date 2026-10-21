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
| HTTP smoke (routes) | Partial | P2 | 1 asset expectation mismatch |
| E2E (full) | Partial | P1 | 47 failures — closed form + env gates |
| Unit tests | Partial | P1 | 1 EPERM on local `batches.json` |
| Ops/git | Partial | P1 | Baseline `2785d71`; Step 2 audit commit follows |

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

| Command | Exit | Result |
|---------|------|--------|
| `npm run typecheck` | 0 | Pass |
| `npm run lint` | 0 | Pass |
| `npm run test:unit` | 1 | **63 pass, 1 fail** — `tests/unit/application-batch.test.ts` → `archive and purge deletes one batch…` → `EPERM` renaming `data/submissions/batches.json` (local file lock / existing dev data; not production) |
| `npm run build` | 0 | Pass (prior successful build; no app source change since except audit/docs) |
| Server | — | `npx next start -H 127.0.0.1 -p 4721` — ready after ~4s (log: `qa/server-4721.log`, gitignored) |
| `AUDIT_BASE=http://127.0.0.1:4721 npm run qa:final:http` | 1 | **99 checks OK, 1 failure:** `/assets/documents/report-2025.pptx` returned **200**, audit expects **404** (file exists in `public/`; script comment expects missing asset) |
| Playwright smoke | 0 | **5 passed** — `/`, `/about-us`, `/apply`, 404 unknown, primary nav (`tests/e2e/smoke.spec.ts`, `navigation.spec.ts`) |
| Playwright admin 401 | 0 | **1 passed** — `admin API rejects anonymous reads and writes` (`tests/e2e/final-system.spec.ts:33`) |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npm test` (full `tests/e2e`) | 1 | **83 passed, 47 failed, 6 skipped** (~3.6m). Log: `qa/playwright-full.log` (gitignored) |

### Skipped E2E (6)

| Spec | Reason |
|------|--------|
| `admin-portal.spec.ts` | `ADMIN_PORTAL_E2E` unset — avoids local submit/purge |
| `demo-no-storage.spec.ts` | `NO_STORAGE_BASE_URL` unset |
| `testing-mode.spec.ts` (2) | Mock/testing env gate on server |
| `mock-applications.spec.ts` (1) | Env gate on server |

### Playwright failure pattern (47)

- **Primary:** `tests/e2e/apply-flow.spec.ts` — locators not found / wrong disabled state on form steps and **submit *** tests.
- **Likely cause (verified):** Audit date **2026-10-21** is after Spring 2027 intake deadline (**15 Oct 2026** Karachi); form resolves **closed** (`lib/application/formState.ts` + unit intakes tests). Closed UI breaks apply-flow expectations.
- **Contributing:** `.env.local` sets `NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1` → extra testing/sample UI (`mock-applications.spec.ts` skips some cases).
- **Other failures:** `final-system.spec.ts` admin UI workflow (needs local admin sign-in), `hero-layout.spec.ts`, several `mock-applications` chip walks, `navigation.spec.ts` internal links, one `smoke.spec.ts` apply chrome test.
- **Not a hang:** suite completed; no single test exceeded global timeout without finishing.

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
