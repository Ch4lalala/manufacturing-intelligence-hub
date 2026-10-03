"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>View could not load</h1>
      <p>An unexpected error occurred while loading this view. Please try again or return to the overview.</p>
      <div className="button-row">
        <button type="button" className="button primary" onClick={reset}>Retry view</button>
        <Link href="/" className="button">Return to overview</Link>
      </div>
    </main>
  );
}
