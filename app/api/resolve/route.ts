import { NextRequest, NextResponse } from "next/server";
import {
  parseUbdocUrl,
  resolveFile,
  NotDownloadableError,
} from "@/lib/ubdoc";

/**
 * POST /api/resolve
 *
 * Body: { url: string }
 *
 * Parses the supplied ubdoc URL, calls worker.php to retrieve file metadata,
 * and returns the real filename + params needed to construct a download link.
 *
 * Errors:
 *   400 — URL is missing or not a valid ubdoc link
 *   422 — File exists but is not downloadable
 *   502 — Upstream worker.php call failed
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("url" in body) ||
    typeof (body as Record<string, unknown>).url !== "string"
  ) {
    return NextResponse.json(
      { error: 'Body must be { "url": "..." }' },
      { status: 400 }
    );
  }

  const raw = (body as { url: string }).url;
  const params = parseUbdocUrl(raw);

  if (!params) {
    return NextResponse.json(
      {
        error:
          "Not a valid KoreaTech ubdoc link. Expected format: https://lms.koreatech.ac.kr/local/ubdoc/?id=...&tp=...&pg=...",
      },
      { status: 400 }
    );
  }

  try {
    const fileInfo = await resolveFile(params.id, params.tp, params.pg);
    return NextResponse.json(fileInfo);
  } catch (err) {
    if (err instanceof NotDownloadableError) {
      return NextResponse.json(
        { error: "This file is not available for download." },
        { status: 422 }
      );
    }
    console.error("[resolve] upstream error:", err);
    return NextResponse.json(
      { error: "Failed to reach the LMS server. Please try again." },
      { status: 502 }
    );
  }
}
