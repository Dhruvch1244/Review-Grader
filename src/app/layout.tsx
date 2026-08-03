import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import SyncStatus from "@/components/SyncStatus";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ThemeSync from "@/components/ThemeSync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Review Grader",
  description: "Capstone review scoring - team + individual, offline-capable",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#171717",
};

const NAV_LINKS = [
  { href: "/setup", label: "Setup" },
  { href: "/questions", label: "Question bank" },
  { href: "/normalize", label: "Normalize" },
  { href: "/merge", label: "Merge" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted">
        <ThemeSync />
        <ServiceWorkerRegister />
        <TooltipProvider delay={200}>
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
              <nav className="flex items-center gap-6">
                <Link href="/" className="font-semibold tracking-tight text-[15px]">
                  Review Grader
                </Link>
                <div className="hidden sm:flex items-center gap-1">
                  {NAV_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </nav>
              <SyncStatus />
            </div>
          </header>
          <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
