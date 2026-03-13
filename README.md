# KoreaTech LMS Downloader

A lightweight Next.js web app that lets you download files from KoreaTech LMS (`lms.koreatech.ac.kr`) without logging in. Paste any `ubdoc` file link, click Check, then Download — the file lands straight in your browser's downloads folder.

---

## How to use it

**1. Copy the link**
Open the file page on the KoreaTech LMS. Copy the full URL from your browser address bar. It will look like:
```
https://lms.koreatech.ac.kr/local/ubdoc/?id=403298&tp=m&pg=ubfile
```

**2. Paste and check**
Paste the URL into the input field and click **Check**. The app contacts the LMS to verify the file is available and reads back the real filename.

**3. Download**
Click **Download**. Your browser saves the file immediately — no login prompt, no redirect.

---

## How it works

The KoreaTech LMS stores downloadable course materials through an internal service called **ubdoc**. Each file page URL contains three identifiers — `id`, `tp`, and `pg` — that reference the underlying file.

This app uses two unauthenticated endpoints exposed by the LMS:

**Resolve phase** — `POST /api/resolve`
Sends `id`, `tp`, and `pg` to `worker.php` on the LMS server. That endpoint returns the real filename and confirms whether the file can be downloaded. No session cookie is required.

**Download phase** — `GET /api/download?id=…&tp=…&pg=…`
The Next.js server fetches the file from `download.php` on the LMS and streams it back to the browser with a `Content-Disposition: attachment` header. This server-side proxy is necessary because browsers block direct cross-origin requests to the LMS domain (CORS).

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Node.js 18+ required.

## Environment variables

None. The LMS endpoints used here are publicly accessible and require no authentication.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Tailwind CSS v4](https://tailwindcss.com/)
