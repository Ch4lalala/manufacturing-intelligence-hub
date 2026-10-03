import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <h1>Page not found</h1>
      <p>The requested page could not be located. Return to the operations overview to continue.</p>
      <div className="button-row">
        <Link href="/" className="button primary">Return to overview</Link>
      </div>
    </main>
  );
}
