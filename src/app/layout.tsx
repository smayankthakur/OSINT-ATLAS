import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSINT ATLAS",
  description: "Live public cameras & open intelligence on one map",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
