import { NextRequest, NextResponse } from "next/server";
import { parseUbdocUrl } from "@/lib/ubdoc";

const DOWNLOAD_BASE = "https://lms.koreatech.ac.kr/local/ubdoc/download.php";

/**
 * GET /api/download?id=...&tp=...&pg=...
 *
 * Server-side proxy for download.php. This route exists solely to bypass
 * CORS restrictions — the browser never talks to the LMS server directly.
 *
 * Forwards Content-Type, Content-Length, and sets Content-Disposition so the
 * browser triggers a "Save As" dialog with the correct filename.
 *
 * Note: filename is read from Content-Disposition returned by the LMS if
 * present, otherwise left blank (browser will infer from URL).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const tp = searchParams.get("tp");
  const pg = searchParams.get("pg");

  if (!id || !tp || !pg) {
    return NextResponse.json(
      { error: "Missing required query params: id, tp, pg" },
      { status: 400 }
    );
  }

  // Basic sanity check — only proxy requests that look like real ubdoc params
  // (alphanumeric, short strings) to prevent open-proxy abuse.
  if (
    !/^[\w-]{1,64}$/.test(id) ||
    !/^[\w-]{1,32}$/.test(tp) ||
    !/^[\w-]{1,64}$/.test(pg)
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const upstream = new URL(DOWNLOAD_BASE);
  upstream.searchParams.set("id", id);
  upstream.searchParams.set("tp", tp);
  upstream.searchParams.set("pg", pg);

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream.toString());
  } catch (err) {
    console.error("[download] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach the LMS server." },
      { status: 502 }
    );
  }

  if (!upstreamRes.ok) {
    return NextResponse.json(
      { error: `LMS returned HTTP ${upstreamRes.status}` },
      { status: 502 }
    );
  }

  // Build response headers — forward content type + length, force attachment download
  const headers = new Headers();

  const contentType = upstreamRes.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const contentLength = upstreamRes.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);

  // If the LMS sends its own Content-Disposition, honour the filename from it;
  // otherwise fall back to a plain attachment directive.
  const upstreamDisposition = upstreamRes.headers.get("content-disposition");
  if (upstreamDisposition) {
    headers.set("content-disposition", upstreamDisposition);
  } else {
    headers.set("content-disposition", "attachment");
  }

  return new NextResponse(upstreamRes.body, {
    status: 200,
    headers,
  });
}
