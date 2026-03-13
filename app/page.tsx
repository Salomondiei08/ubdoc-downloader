"use client";

import { useState, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type IdleState = { status: "idle" };
type ResolvingState = { status: "resolving" };
type ReadyState = {
  status: "ready";
  realName: string;
  id: string;
  tp: string;
  pg: string;
};
type ErrorState = { status: "error"; message: string };

type AppState = IdleState | ResolvingState | ReadyState | ErrorState;

// ─── How it works steps ───────────────────────────────────────────────────────

const steps = [
  {
    number: "1",
    title: "Copy the link",
    body: "Open the file page on the KoreaTech LMS. Copy the full URL from your browser — it should look like lms.koreatech.ac.kr/local/ubdoc/?id=…",
  },
  {
    number: "2",
    title: "Paste and check",
    body: "Paste the URL into the box below and click Check. This contacts the LMS to verify the file is available and retrieves the real filename.",
  },
  {
    number: "3",
    title: "Download",
    body: "Click Download and your browser will save the file directly. No login, no redirect — the file is proxied through this server to bypass CORS restrictions.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCheck() {
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    setState({ status: "resolving" });

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not resolve this link.";
        setState({ status: "error", message });
        return;
      }

      const info = data as {
        realName: string;
        id: string;
        tp: string;
        pg: string;
      };
      setState({
        status: "ready",
        realName: info.realName,
        id: info.id,
        tp: info.tp,
        pg: info.pg,
      });
    } catch {
      setState({
        status: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  }

  function handleDownload(id: string, tp: string, pg: string) {
    const params = new URLSearchParams({ id, tp, pg });
    window.location.href = `/api/download?${params.toString()}`;
  }

  function handleReset() {
    setUrl("");
    setState({ status: "idle" });
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const isLoading = state.status === "resolving";

  return (
    <main
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      className="min-h-screen"
    >
      {/* ── Hero / header ─────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
        className="px-4 py-10 text-center"
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: "var(--accent-light)",
            marginBottom: 16,
            fontSize: 26,
          }}
        >
          📥
        </div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            marginBottom: 8,
          }}
        >
          KoreaTech LMS Downloader
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-muted)",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Paste any{" "}
          <code
            style={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              backgroundColor: "var(--surface-2)",
              padding: "1px 5px",
              borderRadius: 4,
              color: "var(--text)",
            }}
          >
            lms.koreatech.ac.kr/local/ubdoc/
          </code>{" "}
          link and download the file in one click — no login required.
        </p>
      </header>

      <div className="px-4 py-10" style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* ── Downloader card ───────────────────────────────────────── */}
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Enter link
          </h2>

          {/* Input row */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (state.status === "error") setState({ status: "idle" });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCheck();
              }}
              placeholder="https://lms.koreatech.ac.kr/local/ubdoc/?id=..."
              disabled={isLoading}
              aria-label="LMS ubdoc URL"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 12px",
                fontSize: "0.875rem",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? "not-allowed" : "text",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border-strong)")
              }
            />
            <button
              onClick={handleCheck}
              disabled={isLoading || !url.trim()}
              style={{
                flexShrink: 0,
                padding: "10px 20px",
                borderRadius: 10,
                backgroundColor:
                  isLoading || !url.trim()
                    ? "var(--accent-light)"
                    : "var(--accent)",
                color:
                  isLoading || !url.trim()
                    ? "var(--accent-text)"
                    : "#ffffff",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "none",
                cursor:
                  isLoading || !url.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && url.trim())
                  e.currentTarget.style.backgroundColor = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isLoading && url.trim())
                  e.currentTarget.style.backgroundColor = "var(--accent)";
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"
                      style={{ opacity: 0.25 }}
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                      style={{ opacity: 0.75 }}
                    />
                  </svg>
                  Checking…
                </>
              ) : (
                "Check"
              )}
            </button>
          </div>

          {/* Result: ready */}
          {state.status === "ready" && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: "var(--accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  📄
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "var(--text)",
                      wordBreak: "break-word",
                    }}
                  >
                    {state.realName}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--accent)",
                      marginTop: 2,
                      fontWeight: 500,
                    }}
                  >
                    Ready to download
                  </p>
                </div>
              </div>
              <div
                style={{ display: "flex", gap: 8, marginTop: 14 }}
              >
                <button
                  onClick={() =>
                    handleDownload(state.id, state.tp, state.pg)
                  }
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 10,
                    backgroundColor: "var(--accent)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--accent-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--accent)")
                  }
                >
                  <svg
                    style={{ width: 16, height: 16 }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Download
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--border)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--surface-2)")
                  }
                >
                  New link
                </button>
              </div>
            </div>
          )}

          {/* Result: error */}
          {state.status === "error" && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 10,
                backgroundColor: "var(--danger-light)",
                border: "1px solid var(--danger-border)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 16, marginTop: 1 }}>⚠️</span>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--danger)",
                  lineHeight: 1.5,
                }}
              >
                {state.message}
              </p>
            </div>
          )}
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 4,
            }}
          >
            How to use it
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            Three steps from LMS to your downloads folder.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {steps.map((step) => (
              <div
                key={step.number}
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: "var(--accent-light)",
                    color: "var(--accent-text)",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {step.number}
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {step.title}
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works technically ──────────────────────────────── */}
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 32,
          }}
        >
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            How it works
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              lineHeight: 1.7,
              marginBottom: 14,
            }}
          >
            The KoreaTech LMS stores downloadable files through a service called{" "}
            <strong style={{ color: "var(--text)" }}>ubdoc</strong>. Each file
            page URL contains three identifiers —{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: "0.8125rem",
                backgroundColor: "var(--surface-2)",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              id
            </code>
            ,{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: "0.8125rem",
                backgroundColor: "var(--surface-2)",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              tp
            </code>
            , and{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: "0.8125rem",
                backgroundColor: "var(--surface-2)",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              pg
            </code>{" "}
            — that point to the underlying file.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--surface-2)",
                borderRadius: 10,
                borderLeft: "3px solid var(--accent)",
              }}
            >
              <strong style={{ color: "var(--text)" }}>Step A — Resolve.</strong>{" "}
              This app sends those three values to{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.8125rem",
                }}
              >
                worker.php
              </code>{" "}
              on the LMS. That endpoint returns the real filename and confirms
              whether the file is downloadable — no session cookie needed.
            </div>
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--surface-2)",
                borderRadius: 10,
                borderLeft: "3px solid var(--accent)",
              }}
            >
              <strong style={{ color: "var(--text)" }}>Step B — Proxy.</strong>{" "}
              When you click Download, this server fetches the file from{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.8125rem",
                }}
              >
                download.php
              </code>{" "}
              and streams it directly to your browser. The proxy step is
              necessary because browsers block cross-origin requests to the LMS
              server.
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-subtle)",
              marginBottom: 12,
            }}
          >
            Only works with{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: "0.8125rem",
                backgroundColor: "var(--surface-2)",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              lms.koreatech.ac.kr/local/ubdoc/
            </code>{" "}
            links.
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-subtle)" }}>
            Made with{" "}
            <span style={{ color: "#ef4444" }} aria-label="love">
              ♥
            </span>{" "}
            by{" "}
            <a
              href="https://salomon.reinvent-labs.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 500,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.textDecoration = "underline")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.textDecoration = "none")
              }
            >
              Salomon Diei
            </a>
          </p>
        </div>
      </div>

      {/* Spinner keyframe — injected inline since we're not using Tailwind animate */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        input::placeholder { color: var(--text-subtle); }
        input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: transparent !important; }
      `}</style>
    </main>
  );
}
