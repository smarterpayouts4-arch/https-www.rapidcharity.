"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section">
      <div className="container prose">
        <h1>Something went wrong</h1>
        <p>This page could not be loaded. Try again, or return to the home page.</p>
        <p>
          <button type="button" className="btn" onClick={() => reset()}>
            Try again
          </button>{" "}
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </section>
  );
}
