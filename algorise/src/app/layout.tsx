import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoRise — Competitive programming, with direction",
  description: "Diagnose skill gaps, follow a personal roadmap, practice original problems, and grow with evidence-backed AI coaching.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
