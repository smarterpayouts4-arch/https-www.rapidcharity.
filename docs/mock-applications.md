# Mock applications (test mode)

Sample applications for the three scholarships, so the 8-step form can be
filled and checked in seconds. Everything here is fake and clearly labeled
SAMPLE. Never enable this on Vercel.

## When test mode is on

Test mode is decided on the server at request time
(`lib/application/mockGate.ts`):

| Situation | Test mode |
| --- | --- |
| `npm run dev` (NODE_ENV is not production) | On |
| `next start` with `NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1` | On |
| `next start` without the flag | Off |
| Any Vercel production deployment (`VERCEL_ENV=production`) | Always off, even if the flag is set |

When it is off, the public site has no mock data at all: the mock JSON is
only passed to the form from the server when the gate is on, so it is not in
the client bundle, and `/api/dev/sample-documents` returns 404.

### Preview on localhost:5000

Add this line to `.env.local` (never commit `.env.local`, never add the
variable in the Vercel dashboard):

```
NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1
```

Then:

```
npm run build
npx next start -p 5000
```

The flag is read when the server starts, so changing it only needs a restart
of `next start`, not a new build.

## The three mocks

| id | Scholarship | Applicant | Notes |
| --- | --- | --- | --- |
| `ivy` | Ivy Azariah (women only) | Sample Ivy Tester, Female, new | Kinnaird College, BS Nursing, Lahore |
| `john-ivy` | John-Ivy Azariah | Sample John Tester, Male, new | FCCU, BS Computer Science, part-time job |
| `robert` | Robert Mathias | Sample Robert Tester, Female, continuing | Punjab University, BBA, already received Rapid support, 25% other award, reuses photo and CNIC |

Data lives in `content/mock-applications/*.json`. All emails are fake
(`sample.applicant+ivy@example.com`, `sample.applicant+john-ivy@example.com`,
`sample.applicant+robert@example.com`) and the CNICs are placeholder numbers
(`35202-0000001-2` and so on). Every field passes the same Zod schema the real
form uses; `tests/unit/mock-applications.test.ts` checks this step by step.

## How to use

1. **URL:** open `/apply?mock=ivy`, `/apply?mock=john-ivy` or
   `/apply?mock=robert`. The scholarship id also works
   (`/apply?mock=robert-mathias`). The form opens filled in and the `mock`
   parameter is removed from the address bar.
2. **Buttons:** on `/apply/form`, a dashed "Test mode" box shows one button
   per mock. Clicking one replaces the current form with that sample.
3. **Documents:** on the Documents step, click **Upload sample documents**.
   It uploads the SAMPLE files for every required slot through the normal
   upload pipeline (compression, checks, preview).
4. **Pick files by hand:** the same files are in
   `tests/fixtures/sample-documents/`. That folder also has
   `phone-photo-sample.jpg`, `.png` and a real `.heic` for upload testing.
   Regenerate them with `node scripts/generate-sample-documents.mjs`
   (add `--heic` to rebuild the HEIC file; it needs Python `pillow-heif`).

Then press Continue through to Review. Review should show no issues and the
Submit button should be enabled.

## Before you press Submit

- Submitting a mock creates a real record in whatever backend `.env.local`
  points to. With no Firestore keys it goes to `data/submissions/` (git
  ignored). With Firestore, Google Drive or Cloudinary keys set, the record
  and the SAMPLE files go to those real services, so delete them afterwards
  or do not submit.
- The same CNIC cannot submit twice. To submit a mock again, delete the
  earlier local record in `data/submissions/` (and its files in
  `data/uploads/`), or change the CNIC.
- The sample files are the same on every run, so after the first upload the
  form may warn that a file was already seen on another application. That is
  expected for test data.

## Automated check

```
npx playwright test tests/e2e/mock-applications.spec.ts
```

It runs each mock through all 8 steps at phone width, uploads the sample
documents and stops at Review. It never submits. Set `MOCK_SHOTS_DIR` to save
screenshots of the Documents and Review steps.
