"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import type { ClassRow } from "@/lib/types";

export default function HomePage() {
  const [classes, setClasses] = useState<ClassRow[] | undefined>(undefined);

  useEffect(() => {
    apiGet<ClassRow[]>("/api/classes").then(setClasses);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Classes</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Score teams and individuals across the 4 capstone reviews. Works offline - edits sync
          automatically when you&apos;re back online.
        </p>
      </div>

      {classes === undefined && <p className="text-sm text-black/50">Loading…</p>}

      {classes && classes.length === 0 && (
        <div className="border border-dashed border-black/15 dark:border-white/20 rounded-lg p-6 text-center">
          <p className="text-sm text-black/60 dark:text-white/60 mb-3">No classes set up yet.</p>
          <Link
            href="/setup"
            className="inline-block bg-black text-white dark:bg-white dark:text-black text-sm font-medium px-4 py-2 rounded-md"
          >
            Go to Setup
          </Link>
        </div>
      )}

      {classes && classes.length > 0 && (
        <ul className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
          {classes.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {c.reviewer_name ? `${c.reviewer_name} · ` : ""}
                  {c.headcount} students
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/score/${c.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  Score
                </Link>
                <Link href={`/stats/${c.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  Stats
                </Link>
                <a
                  href={`/api/export?classId=${c.id}`}
                  className="text-black/60 dark:text-white/60 hover:underline"
                >
                  Export
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {classes && classes.length > 0 && (
        <Link href="/setup" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          + Add another class
        </Link>
      )}
    </div>
  );
}
