import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CALIBER | Manufacturing Decision Hub",
  description: "Local evidence-led manufacturing prototype for CALIBER Case 2.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
