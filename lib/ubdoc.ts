/**
 * Core logic for interacting with the KoreaTech LMS ubdoc service.
 *
 * The ubdoc system exposes two unauthenticated endpoints:
 *   - worker.php  — returns file metadata (real name, download eligibility)
 *   - download.php — streams the actual file bytes
 *
 * Both accept id, tp, and pg query params extracted from any ubdoc page URL.
 */

const WORKER_URL = "https://lms.koreatech.ac.kr/local/ubdoc/worker.php";

export interface UbdocParams {
  id: string;
  tp: string;
  pg: string;
}

export interface FileInfo extends UbdocParams {
  realName: string;
}

/**
 * Extract id/tp/pg from any LMS ubdoc URL.
 *
 * Handles both forms:
 *   https://lms.koreatech.ac.kr/local/ubdoc/?id=403298&tp=m&pg=ubfile
 *   https://lms.koreatech.ac.kr/local/ubdoc/index.php?id=403298&tp=m&pg=ubfile
 *
 * Returns null if the URL is not a recognisable ubdoc link or is missing required params.
 */
export function parseUbdocUrl(raw: string): UbdocParams | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  // Must be on the KoreaTech LMS domain, inside the ubdoc path
  if (
    !url.hostname.includes("koreatech.ac.kr") ||
    !url.pathname.includes("/local/ubdoc")
  ) {
    return null;
  }

  const id = url.searchParams.get("id");
  const tp = url.searchParams.get("tp");
  const pg = url.searchParams.get("pg");

  if (!id || !tp || !pg) return null;

  return { id, tp, pg };
}

/**
 * Call worker.php to get the real filename and confirm the file can be downloaded.
 *
 * worker.php responds with XML that includes a <realName> element and a
 * <downEnable> flag. We parse both to surface a clean FileInfo or throw.
 */
export async function resolveFile(
  id: string,
  tp: string,
  pg: string
): Promise<FileInfo> {
  const body = new URLSearchParams({ job: "checkState", id, tp, pg });

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`worker.php responded with HTTP ${res.status}`);
  }

  const xml = await res.text();

  // Extract <realName> — the original filename
  const nameMatch = xml.match(/<realName[^>]*>([\s\S]*?)<\/realName>/i);
  const realName = nameMatch ? nameMatch[1].trim() : "";

  if (!realName) {
    throw new Error("Could not read file name from worker response");
  }

  // Extract <downEnable> — "1" means downloadable
  const enableMatch = xml.match(/<downEnable[^>]*>([\s\S]*?)<\/downEnable>/i);
  const downEnable = enableMatch ? enableMatch[1].trim() : "0";

  if (downEnable !== "1") {
    throw new NotDownloadableError(
      `Download not enabled for this file (downEnable=${downEnable})`
    );
  }

  return { id, tp, pg, realName };
}

export class NotDownloadableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotDownloadableError";
  }
}
