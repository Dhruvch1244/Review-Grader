import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import SyncStatus from "@/components/SyncStatus";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <nav className="flex items-center gap-5 text-sm font-medium">
              <Link href="/" className="font-semibold">
                Review Grader
              </Link>
              <Link href="/setup" className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white">
                Setup
              </Link>
              <Link href="/merge" className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white">
                Merge
              </Link>
            </nav>
            <SyncStatus />
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
