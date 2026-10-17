"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", background: "#F7F4EF", color: "#1A1A1A", padding: "4rem 1.5rem" }}>
        <h1>Something went wrong</h1>
        <p>RAPID Charity could not load this page.</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
