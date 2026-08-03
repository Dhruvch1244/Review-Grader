"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";
import type { ClassRow } from "@/lib/types";

export default function HomePage() {
  const [classes, setClasses] = useState<ClassRow[] | undefined>(undefined);

  useEffect(() => {
    apiGet<ClassRow[]>("/api/classes").then(setClasses);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Score teams and individuals across the 4 capstone reviews. Works offline - edits sync
          automatically when you&apos;re back online.
        </p>
      </div>

      {classes === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}

      {classes && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {c.reviewer_name ? `${c.reviewer_name} · ` : "No reviewer set · "}
                  {c.headcount} students
                </p>
              </CardHeader>
              <CardContent className="mt-auto flex items-center gap-2">
                <Link href={`/score/${c.id}`} className="flex-1">
                  <Button className="w-full">Score</Button>
                </Link>
                <Link href={`/stats/${c.id}`}>
                  <Button variant="outline" size="icon" title="Stats">
                    <BarChart3 className="size-4" />
                  </Button>
                </Link>
                <a href={`/api/export?classId=${c.id}`}>
                  <Button variant="outline" size="icon" title="Export .xlsx">
                    <Download className="size-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
