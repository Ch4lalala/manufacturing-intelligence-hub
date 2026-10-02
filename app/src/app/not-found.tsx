import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <h1>Page not found</h1>
      <p>Open the manufacturing workspace to choose a view.</p>
      <Link href="/">Open workspace</Link>
    </main>
  );
}
