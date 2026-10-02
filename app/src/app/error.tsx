"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>View could not load</h1>
      <p>The source snapshot remains unchanged. Retry the local view.</p>
      <button onClick={reset}>Retry view</button>
      <Link href="/">Return to overview</Link>
    </main>
  );
}
