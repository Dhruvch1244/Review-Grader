"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { CHROME, sequentialBlue, usePrefersDark } from "@/lib/chart-colors";
import type { ClassNormSummary, StudentNormRow } from "@/lib/normalization";

export default function NormalizePage() {
  const dark = usePrefersDark();
  const chrome = dark ? CHROME.dark : CHROME.light;
  const [data, setData] = useState<{ perClass: ClassNormSummary[]; students: StudentNormRow[] } | null>(null);

  useEffect(() => {
    apiGet<{ perClass: ClassNormSummary[]; students: StudentNormRow[] }>("/api/normalize").then(
      (d) => d && setData(d)
    );
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const axisStyle = { fontSize: 11, fill: chrome.muted };
  const tooltipStyle = {
    background: chrome.surface,
    border: `1px solid ${chrome.grid}`,
    borderRadius: 6,
    fontSize: 12,
    color: chrome.textPrimary,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cross-class normalization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Different classes score differently even for equal work - normalize before comparing
          students across classes.
        </p>
      </div>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>How this works</AlertTitle>
        <AlertDescription>
          Each student&apos;s overall score is converted to a z-score against their own class&apos;s
          mean and spread, then rescaled to a 0-100 band centered on 50 (a T-score) - so a 3.8 in a
          strict class and a 4.3 in a lenient one can land at the same normalized value if they were
          equally strong relative to their own classmates.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Before: raw average by class</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.perClass} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="className" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
                <YAxis domain={[0, 6]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="mean" fill={sequentialBlue(0.6, dark)} radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="mean" position="top" style={{ fontSize: 11, fill: chrome.textSecondary }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">After: normalized average by class</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.perClass.map((c) => ({ className: c.className, normalizedMean: 50 }))}
                margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="className" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="normalizedMean" fill={sequentialBlue(0.4, dark)} radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="normalizedMean" position="top" style={{ fontSize: 11, fill: chrome.textSecondary }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-1">
              Every class centers on 50 by construction - it&apos;s each <em>student&apos;s</em>{" "}
              distance from their class&apos;s center (below) that becomes comparable.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Every student, normalized</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Class</th>
                  <th className="text-left px-3 py-2 font-medium">Team</th>
                  <th className="text-left px-3 py-2 font-medium">Student</th>
                  <th className="text-right px-3 py-2 font-medium">Raw</th>
                  <th className="text-right px-3 py-2 font-medium">Z-score</th>
                  <th className="text-right px-3 py-2 font-medium">Normalized</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={`${s.classId}-${s.team}-${s.student}`} className="border-t">
                    <td className="px-3 py-2">{s.className}</td>
                    <td className="px-3 py-2">{s.team}</td>
                    <td className="px-3 py-2">{s.student}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.raw}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.z > 0 ? `+${s.z}` : s.z}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{s.normalized}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
