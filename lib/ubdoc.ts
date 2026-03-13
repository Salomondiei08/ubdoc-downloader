/**
 * Core logic for interacting with the KoreaTech LMS ubdoc service.
 *
 * The ubdoc system exposes two unauthenticated endpoints:
 *   - worker.php  — returns file metadata as JSON (real name, download eligibility)
 *   - download.php — streams the actual file bytes
 *
 * Both accept id, tp, and pg query params extracted from any ubdoc page URL.
 *
 * worker.php JSON shape (confirmed from live response):
 * {
 *   file_realname: "Week 02 Point Operators.pdf",
 *   file_download: "1",   // "1" = downloadable
 *   state_code: "100",
 *   ...
 * }
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

interface WorkerResponse {
  file_realname?: string;
  file_download?: string;
  state_code?: string;
  state_message?: string;
}

/**
 * Extract id/tp/pg from any LMS ubdoc URL.
 *
 * Accepts both fully-qualified and protocol-less forms:
 *   https://lms.koreatech.ac.kr/local/ubdoc/?id=403298&tp=m&pg=ubfile
 *   lms.koreatech.ac.kr/local/ubdoc/?id=403298&tp=m&pg=ubfile
 *
 * Returns null if the URL is not a recognisable ubdoc link or is missing params.
 */
export function parseUbdocUrl(raw: string): UbdocParams | null {
  const trimmed = raw.trim();

  // If no protocol is present, prepend https:// so new URL() can parse it
  const candidate =
    /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
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
 * Returns a FileInfo on success, throws NotDownloadableError if the file
 * exists but is not available for download, or a generic Error otherwise.
 */
export async function resolveFile(
  id: string,
  tp: string,
  pg: string
): Promise<FileInfo> {
  const body = new URLSearchParams({ job: "checkState", id, tp, pg });

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Send a plausible Referer so the LMS doesn't reject the request
      Referer: `https://lms.koreatech.ac.kr/local/ubdoc/?id=${id}&tp=${tp}&pg=${pg}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`worker.php responded with HTTP ${res.status}`);
  }

  // worker.php returns JSON (not XML)
  let data: WorkerResponse;
  try {
    data = (await res.json()) as WorkerResponse;
  } catch {
    throw new Error("Unexpected response format from the LMS server");
  }

  const realName = data.file_realname?.trim() ?? "";
  if (!realName) {
    throw new Error("Could not read file name from worker response");
  }

  // file_download: "1" means the file is available for download
  if (data.file_download !== "1") {
    throw new NotDownloadableError(
      `Download not enabled for this file (file_download=${data.file_download})`
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
