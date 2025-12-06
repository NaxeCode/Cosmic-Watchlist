import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeToggle } from "@/components/theme-toggle";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("watchlist-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark"
      ? stored
      : prefersDark
        ? "dark"
        : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (error) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) document.documentElement.classList.add("dark");
  }
})();
`;

export const metadata: Metadata = {
  title: "Watchlist",
  description:
    "A premium, server-first watchlist for tracking anime, movies, tv, games, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
