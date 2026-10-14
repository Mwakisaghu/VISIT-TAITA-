"use client";

/** The last resort: shown only if the page's own frame (header, footer, language) fails to build. It replaces the whole page, so it carries its own styles and is in English. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#EAE2CC", color: "#1E1A16", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <main role="alert" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong on our side.</h1>
          <p style={{ maxWidth: 360, margin: "12px 0 0", lineHeight: 1.5 }}>We couldn&apos;t load this page. Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ marginTop: 28, minHeight: 44, padding: "0 28px", borderRadius: 999, border: 0, background: "#A8553A", color: "#EAE2CC", fontSize: "0.95rem", cursor: "pointer" }}>Try again</button>
          {error.digest && <p style={{ marginTop: 24, fontSize: "0.75rem", opacity: 0.75 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
