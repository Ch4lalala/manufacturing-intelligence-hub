import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CALIBER | Manufacturing Decision Hub",
  description:
    "CALIBER Manufacturing Decision Hub · Industrial Asset Intelligence & Operational Reliability Platform.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
