# Sample applicants (test mode)

Three fake applicants, one per scholarship, so the 8-step form can be filled
and checked in seconds. Everything here is fake: names are invented, emails are
`sample.applicant+...@example.com`, CNICs are placeholder numbers, and the
uploaded files are stamped SAMPLE.

## What it looks like

At the top of the form card on `/apply/form`, above "Step 1 of 8", a box reads
**Test with a sample applicant** with one chip per applicant (name, then the
scholarship in small text):

| Chip | id | Scholarship | Notes |
| --- | --- | --- | --- |
| Akram Naseem | `john-ivy` | John-Ivy Azariah | Male, new, FCCU BS Computer Science, part-time job, Faisalabad. Guardian: Father. Semester 5, GPA 3.21 of 4.00, requests PKR 100,000 |
| Ayesha Khan | `ivy` | Ivy Azariah (women only) | Female, new, Kinnaird College BS Nursing, Lahore. Guardian: Other guardian (maternal uncle, Clerk). Semester 3, GPA 3.60 of 4.00, requests PKR 70,000 |
| Bilal Masih | `robert` | Robert Mathias | Male, continuing, Punjab University BBA, 25% other award, RAPID scholarship before, reuses CNIC (uploads a new photo). Permanent address differs from current. Semester 5, GPA 3.42 of 4.00, requests PKR 60,000 |

Every sample also fills the portal fields: Country (Pakistan), Community
(Christian), Disability No, Family monthly income, three Education history
rows (Matriculation and Intermediate completed with a result %, Bachelor's in
progress), the Statement of financial need, and the priest or pastor name and
contact. Qualification proofs are optional, so the samples leave them empty.

Tapping a chip fills every step (scholarship included) and shows
"Filled with Akram Naseem's sample. Tap Continue to move through the steps."
with a **Clear sample** link. On the Personal step the SAMPLE passport-size
photo (`passport-photo-sample.jpg`, a 600 x 600 placeholder drawn by
`scripts/generate-sample-documents.mjs`) is attached automatically and shown in
the round preview; Continue reads "Adding photo…" until it is in. When you
reach the Documents step the other SAMPLE files are attached automatically
through the normal upload pipeline (compression, text checks, preview);
Continue reads "Attaching sample files…" until they are in. Then keep tapping
Continue to Review, which shows the photo next to the name.

### When file storage is not set up

On a server with no storage (for example Vercel before the Firebase, Google
Drive or Cloudinary env vars are added) the upload route answers 503 with
"Uploads are temporarily unavailable. Please try again later or contact us."
and logs the cause on the server. In sample mode the SAMPLE photo and
documents are then attached in the browser only and listed as **Sample file
(not uploaded)**, so the walk-through still reaches Review. Submit still asks
for confirmation, and then fails with "This sample used sample files that were
not uploaded, because file storage is not set up here. Nothing was submitted."
Real applicants on such a server see the unavailable message on each upload.

The box always shows: "Samples are for testing. Submitting one creates a real
test application." On Review, **Submit application** with sample data asks for
confirmation first (a browser confirm dialog). Cancel sends nothing.

## When sample mode is on

| Situation | Sample mode |
| --- | --- |
| `npm run dev` (NODE_ENV is not production) | On |
| `next start` with `NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1` | On |
| `next start` without the flag | Off, unless unlocked (below) |
| Vercel production (`VERCEL_ENV=production`) | Off for the public, even if the flag is set; the private unlock still works |

### Private unlock (works on Vercel, no env var)

Open any apply URL with `?demo=rapid2027`, for example:

```
https://rapidcharity.vercel.app/apply/form?demo=rapid2027
https://rapidcharity.vercel.app/apply?demo=rapid2027
https://rapidcharity.vercel.app/apply?mock=ivy&demo=rapid2027
```

The browser remembers the key in `localStorage` (`rapid-charity-demo`) and the
parameter is removed from the address bar, so later visits to `/apply/form` in
that browser show the chips too. To turn it off in that browser, open any apply
URL with `?demo=off`.

The key is the constant `DEMO_UNLOCK_KEY` in `lib/application/mockGate.ts`.
It is only compared on the server: by the `/apply` and `/apply/form` pages
(query parameter), and by `/api/dev/mock-applications` and
`/api/dev/sample-documents` (the `x-rapid-demo` header, or `?demo=` on the
sample-document route). Without a match those routes return 404 and the pages
render no sample data. The key and the sample data are not in the client
JavaScript bundle.

This is security by obscurity. Anyone with the link can load the samples. The
data is fake, but submitting a sample still creates a real application, so
change the key in `mockGate.ts` if the link leaks.

## Other ways to load a sample

1. **URL:** `/apply?mock=ivy`, `/apply?mock=john-ivy` or `/apply?mock=robert`
   (the scholarship id also works, `/apply?mock=robert-mathias`). On a server
   where sample mode is off, add `&demo=rapid2027`. The `mock` and `demo`
   parameters are removed from the address bar after loading.
2. **Documents step button:** in sample mode the Documents step also shows
   **Upload sample documents**, which attaches the SAMPLE file for every
   required slot that is still empty (handy after editing answers by hand).
3. **Pick files by hand:** the same files are in
   `tests/fixtures/sample-documents/`. That folder also has
   `phone-photo-sample.jpg`, `.png` and a real `.heic` for upload testing.
   Regenerate them with `node scripts/generate-sample-documents.mjs`
   (add `--heic` to rebuild the HEIC file; it needs Python `pillow-heif`).
   `next.config.ts` includes them in the serverless bundle for the
   sample-document route.

Data lives in `content/mock-applications/*.json`. Every field passes the same
Zod schema the real form uses; `tests/unit/mock-applications.test.ts` checks
this step by step, plus the names, CNIC format and the unlock key.

## Before you press Submit

- Submitting a sample creates a real record in whatever backend the server
  uses. Locally with no Firestore keys it goes to `data/submissions/` (git
  ignored). On Vercel, or with Firestore, Google Drive or Cloudinary keys set,
  the record and the SAMPLE files go to those real services, so delete them
  in the admin afterwards, or do not submit.
- The same CNIC cannot submit twice. To submit a sample again, delete the
  earlier record (locally `data/submissions/` and `data/uploads/`), or change
  the CNIC.
- The sample files are the same on every run and show "Sample Applicant", so
  the form may warn that the name does not match or that a file was already
  seen on another application. That is expected for test data.

## Automated check

```
npx playwright test tests/e2e/mock-applications.spec.ts
```

Runs against the normal `next start` server with no env flag. It checks that
the chips and sample routes are hidden without the key, that `?demo=rapid2027`
is remembered and `?demo=off` forgets it, and walks each chip through all 8
steps to Review at 360, 393, 412, 768, 1024 and 1440 px, checking on every
step that there are no validation errors, no horizontal overflow, no clipped
text and no tap target under 44 px. It never submits: the Submit test
dismisses the confirm dialog. Set `MOCK_SHOTS_DIR` to save screenshots, and
`AUDIT_SHOTS_DIR` for the Personal photo, education rows and Review shots.

Two opt-in specs cover the rest:

```
# Demo flow with no storage (start this server first)
VERCEL=1 VERCEL_ENV=production npx next start -H 127.0.0.1 -p 4731
NO_STORAGE_BASE_URL=http://127.0.0.1:4731 npx playwright test tests/e2e/demo-no-storage.spec.ts

# Local submission, admin photo, decision form and portal CSV (writes to data/, then deletes it)
ADMIN_PORTAL_E2E=1 npx playwright test tests/e2e/admin-portal.spec.ts
```
