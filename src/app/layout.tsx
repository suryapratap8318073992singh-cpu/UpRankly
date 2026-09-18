import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ensureAdminExists } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "UpRankly — Turn Your Website Into a Search Growth Engine",
  description:
    "AI-powered SEO audits, strategy and ongoing optimization for businesses that want a stronger search presence. Honest automation, real data, no fake promises.",
};

// Ensure admin user exists on app startup
ensureAdminExists().catch((err) => {
  console.error("[startup] Failed to ensure admin exists:", err);
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#05070c] font-sans text-zinc-200 antialiased">{children}</body>
    </html>
  );
}
