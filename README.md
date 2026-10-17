# RAPID Charity

Public site for [RAPID Charity](https://www.rapidcharity.org/) (Reconciliation And Peace Innovative Development), a U.S. 501(c)(3) scholarship charity. This Next.js app replaces the Wix site. Editors change copy in `/admin`. Donations stay an outbound PayPal link. Scholarship applications are collected on `/apply/form`.

## Stack

- Next.js 16, React 19, TypeScript, Zod
- Content: Firestore on Firebase Spark in production, JSON files in `content/` for local development
- Admin: Firebase Authentication, with a local password only when Firebase is not configured
- Images: static files in `public/assets` (no paid Cloud Storage)

## Run locally

```bash
npm install
npm run dev -- -p 5000
```

Open http://127.0.0.1:5000 and http://127.0.0.1:5000/admin.

No `.env.local` and no Firebase credentials are required. Pages render from `content/`, scholarship applications are written to gitignored `data/submissions/`, and uploads land in gitignored `data/uploads/`. Admin sign-in accepts `rapid-local` until you set `ADMIN_LOCAL_PASSWORD` or Firebase Auth. Copy `.env.example` to `.env.local` only when you add those. See [docs/SETUP.md](docs/SETUP.md) for the Firebase Spark and Vercel Hobby steps. Do not commit secrets.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm test
```

`npm test` runs Playwright against `next start` on port 4721. Unit tests cover the Zod content schemas, atomic publish, video embed parsing, and admin session/origin checks.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, the production build, and Playwright.

## Routes

Primary pages: `/`, `/about-us`, `/apply`, `/apply/form`, `/donate`, `/events`, `/blog`, `/reports`, `/general-8`, `/robert-mathais-scholarship`, `/ivy-azariah-scholarship`, `/education-scholarships1`, and `/post/[slug]`.

Scholarship applications (John-Ivy Azariah, Robert Mathias, and Ivy Azariah) are stored in Firestore collection `applications` with stable field names. Without Firebase, they are written to gitignored `data/submissions/`. Document files go to the charity Google Drive through an Apps Script web app, behind a storage adapter so Cloudinary Free can be used instead. Local setup stores files in gitignored `data/uploads/`. Admins review submissions, verify or reject each file, and download a CSV plus the category Excel workbook. After a batch is closed, Archive & purge downloads a final Excel file and then deletes that batch from Firestore and Drive. See `docs/UPLOADS.md`.

Old Wix URLs such as `/form`, `/announcements`, `/do-not-use`, and `/profile/...` redirect to the current page. Scholarship copy, including the live wording quirks, is unchanged.

## Media that is not in the repo

- `public/assets/videos/rapid.mp4` was about 704 MB and is not included. Set `MISSION_VIDEO_EMBED_URL` or the admin field **embedUrl** to a YouTube or Vimeo link. Until then, the Who We Are section shows the poster image and a link to the Facebook video.
- `report-2025.pptx` is not included. Set `REPORT_2025_URL` or add the file at `public/assets/documents/report-2025.pptx`. The reports page keeps the external link from the CMS and explains when a viewer is unavailable.
