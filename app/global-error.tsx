"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Me2U root render failure", { digest: error.digest });
  }, [error.digest]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          color: "#10221a",
          background: "#f5faf7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          role="alert"
          aria-live="assertive"
          style={{
            width: "min(100%, 440px)",
            padding: "32px",
            border: "1px solid #dce8df",
            borderRadius: "24px",
            background: "#fff",
            boxShadow: "0 18px 50px rgb(16 34 26 / 10%)",
          }}
        >
          <p style={{ margin: "0 0 8px", color: "#148345", fontWeight: 700 }}>Me2U</p>
          <h1 style={{ margin: "0 0 12px", fontSize: "1.5rem" }}>This page could not load</h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.6 }}>
            Your account and payment records have not been changed by this screen. Try loading
            the page again. If the problem continues, contact Me2U support.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              onClick={retry}
              style={{
                minHeight: "44px",
                padding: "0 18px",
                border: 0,
                borderRadius: "999px",
                color: "#fff",
                background: "#148345",
                font: "inherit",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                padding: "0 18px",
                border: "1px solid #dce8df",
                borderRadius: "999px",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Go to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
