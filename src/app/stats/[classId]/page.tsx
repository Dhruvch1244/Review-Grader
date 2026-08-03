"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  LabelList,
} from "recharts";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildExportRows } from "@/lib/export-rows";
import {
  teamOverallAverages,
  teamTrendByReview,
  classAverageTrend,
  studentLeaderboard,
  categoryBreakdownByReview,
  criteriaHeatmap,
  scoreHistogram,
  teamScatterData,
  scoreHealthByReview,
  radarDataForReview,
} from "@/lib/stats-utils";
import { CATEGORICAL_LIGHT, CATEGORICAL_DARK, CHROME, STATUS, sequentialBlue, usePrefersDark } from "@/lib/chart-colors";
import type {
  ClassData,
  ReviewDef,
  CriterionDef,
  TeamScoreRow,
  IndividualScoreRow,
} from "@/lib/types";

type ReviewWithCriteria = ReviewDef & { criteria: CriterionDef[] };

export default function StatsPage() {
  const { classId } = useParams<{ classId: string }>();
  const dark = usePrefersDark();
  const categorical = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const chrome = dark ? CHROME.dark : CHROME.light;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [reviews, setReviews] = useState<ReviewWithCriteria[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScoreRow[]>([]);
  const [individualScores, setIndividualScores] = useState<IndividualScoreRow[]>([]);
  const [reviewFocus, setReviewFocus] = useState<number | "all">("all");
  const [radarTeams, setRadarTeams] = useState<string[]>([]);

  useEffect(() => {
    if (!classId) return;
    apiGet<ClassData>(`/api/classes/${classId}`).then((d) => {
      if (d) {
        setClassData(d);
        setRadarTeams((prev) => (prev.length ? prev : d.teams.slice(0, 3).map((t) => t.name)));
      }
    });
    apiGet<ReviewWithCriteria[]>("/api/reviews").then((r) => setReviews(r ?? []));
    apiGet<{ teamScores: TeamScoreRow[]; individualScores: IndividualScoreRow[] }>(
      `/api/scores?classId=${classId}`
    ).then((d) => {
      if (!d) return;
      setTeamScores(d.teamScores);
      setIndividualScores(d.individualScores);
    });
  }, [classId]);

  const rows = useMemo(() => {
    if (!classData || reviews.length === 0) return null;
    return buildExportRows(classData, reviews, teamScores, individualScores);
  }, [classData, reviews, teamScores, individualScores]);

  const heatmapReview = reviewFocus === "all" ? reviews[reviews.length - 1] : reviews.find((r) => r.number === reviewFocus);

  if (!classData || !rows || reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const teamAverages = teamOverallAverages(classData, rows.teamScoreRows);
  const teamTrend = teamTrendByReview(classData, reviews, rows.teamScoreRows);
  const classTrend = classAverageTrend(reviews, rows.teamScoreRows);
  const leaderboard = studentLeaderboard(rows.teamScoreRows, rows.individualScoreRows);
  const categoryTrend = categoryBreakdownByReview(reviews, rows.teamScoreRows);
  const histogram = scoreHistogram(rows.teamScoreRows, rows.individualScoreRows);
  const scatter = teamScatterData(classData, rows.teamScoreRows, rows.individualScoreRows);
  const health = scoreHealthByReview(reviews, rows.teamScoreRows);
  const heatmap = heatmapReview ? criteriaHeatmap(classData, heatmapReview, rows.teamScoreRows) : null;
  const radar = heatmapReview ? radarDataForReview(heatmapReview, rows.teamScoreRows, radarTeams) : null;

  const scoredStudents = leaderboard.filter((s) => s.reviewsScored > 0).length;
  const classOverallAvg =
    leaderboard.length > 0
      ? Math.round(
          (leaderboard.reduce((sum, s) => sum + (s.overall ?? 0), 0) /
            Math.max(1, leaderboard.filter((s) => s.overall !== null).length)) *
            100
        ) / 100
      : null;

  const axisStyle = { fontSize: 11, fill: chrome.muted };
  const tooltipStyle = {
    background: chrome.surface,
    border: `1px solid ${chrome.grid}`,
    borderRadius: 6,
    fontSize: 12,
    color: chrome.textPrimary,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{classData.class.name} - Stats</h1>
          <p className="text-sm text-muted-foreground">
            {classData.class.reviewer_name ?? "No reviewer set"}
          </p>
        </div>
        <Link href={`/score/${classData.class.id}`}>
          <Button variant="outline">Back to scoring</Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Students" value={String(leaderboard.length)} />
        <StatTile label="Teams" value={String(classData.teams.length)} />
        <StatTile label="Class avg (overall)" value={classOverallAvg !== null ? String(classOverallAvg) : "—"} />
        <StatTile label="Students with a score" value={`${scoredStudents}/${leaderboard.length}`} />
      </div>

      {/* 1. Team comparison bar */}
      <ChartCard title="Team comparison" subtitle="Overall average score across everything scored so far">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={teamAverages} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
            <XAxis dataKey="team" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
            <YAxis domain={[0, 5]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "Avg score"]} />
            <Bar dataKey="avg" fill={sequentialBlue(0.7, dark)} radius={[4, 4, 0, 0]} maxBarSize={56}>
              <LabelList dataKey="avg" position="top" style={{ fontSize: 11, fill: chrome.textSecondary }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Team trend across reviews */}
      <ChartCard title="Team trend across reviews" subtitle="Team baseline average, R1 → R4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={teamTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
            <XAxis dataKey="review" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
            <YAxis domain={[0, 5]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {classData.teams.map((t, i) => (
              <Line
                key={t.id}
                type="monotone"
                dataKey={t.name}
                stroke={categorical[i % categorical.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 3. Class average trend */}
        <ChartCard title="Class average trend" subtitle="Whole class, R1 → R4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={classTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
              <XAxis dataKey="review" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
              <YAxis domain={[0, 5]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="avg" stroke={categorical[0]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Category breakdown by review */}
        <ChartCard title="Build vs Security" subtitle="Class-wide average by category, per review">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
              <XAxis dataKey="review" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
              <YAxis domain={[0, 5]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Build" fill={categorical[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Security" fill={categorical[1]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 5. Student leaderboard */}
      <ChartCard title="Student leaderboard" subtitle="Overall final score (team avg + individual delta), all reviews">
        <ResponsiveContainer width="100%" height={Math.max(220, leaderboard.length * 26)}>
          <BarChart
            data={leaderboard}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 6]} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="student"
              width={120}
              tick={{ fontSize: 11, fill: chrome.textSecondary }}
              axisLine={{ stroke: chrome.baseline }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, _n, p) => [String(v), `Overall (${p.payload.team})`]}
            />
            <Bar dataKey="overall" fill={sequentialBlue(0.6, dark)} radius={[0, 4, 4, 0]} maxBarSize={16}>
              <LabelList dataKey="overall" position="right" style={{ fontSize: 11, fill: chrome.textSecondary }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 6. Score distribution histogram */}
        <ChartCard title="Score distribution" subtitle="How many students land in each final-score band">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histogram} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
              <XAxis dataKey="bucket" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "Students"]} />
              <Bar dataKey="count" fill={sequentialBlue(0.5, dark)} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. Score health across reviews */}
        <ChartCard title="Score health" subtitle="Low (1-2) / Mid (3) / High (4-5) criteria scores, R1 → R4">
          {health.every((h) => h.Low + h.Mid + h.High === 0) ? (
            <EmptyState message="No criteria scored yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={health} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="review" tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisStyle} axisLine={{ stroke: chrome.baseline }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Low" stackId="health" fill={STATUS.critical} maxBarSize={48} />
                <Bar dataKey="Mid" stackId="health" fill={STATUS.warning} maxBarSize={48} />
                <Bar dataKey="High" stackId="health" fill={STATUS.good} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 8. Team scatter */}
      <ChartCard
        title="Team baseline vs. individual delta"
        subtitle="Do individual Q&As compensate for a weaker team score, or reinforce a strong one?"
      >
        {scatter.filter((s) => s.teamAvg !== null).length === 0 ? (
          <EmptyState message="No team has a baseline score yet." />
        ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 40, left: -8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} />
            <XAxis
              type="number"
              dataKey="teamAvg"
              name="Team avg"
              domain={[0, 5]}
              tick={axisStyle}
              axisLine={{ stroke: chrome.baseline }}
              tickLine={false}
              label={{ value: "Team baseline avg", position: "insideBottom", offset: -4, fontSize: 11, fill: chrome.muted }}
            />
            <YAxis
              type="number"
              dataKey="avgDelta"
              name="Avg delta"
              domain={[-2, 2]}
              tick={axisStyle}
              axisLine={{ stroke: chrome.baseline }}
              tickLine={false}
              label={{ value: "Avg individual delta", angle: -90, position: "insideLeft", fontSize: 11, fill: chrome.muted }}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={scatter.filter((s) => s.teamAvg !== null)} fill={categorical[0]}>
              <LabelList dataKey="team" position="right" style={{ fontSize: 11, fill: chrome.textSecondary }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          A team with no individual scores yet plots at delta = 0.
        </p>
      </ChartCard>

      {/* Review-scoped section: heatmap + radar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Focus review for the charts below:</span>
        <Button
          size="sm"
          variant={reviewFocus === "all" ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => setReviewFocus("all")}
        >
          Latest
        </Button>
        {reviews.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={reviewFocus === r.number ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setReviewFocus(r.number)}
          >
            R{r.number}
          </Button>
        ))}
      </div>

      {/* 9. Heatmap */}
      {heatmap && (
        <ChartCard title="Criteria heatmap" subtitle={`Every criterion vs. every team - ${heatmapReview?.label}`}>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="text-left font-medium p-1.5 sticky left-0 bg-inherit">Criterion</th>
                  {heatmap.teams.map((t) => (
                    <th key={t} className="p-1.5 font-medium text-center whitespace-nowrap">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.rows.map((row) => (
                  <tr key={row.criterion}>
                    <td className="p-1.5 max-w-xs align-top">
                      <Badge variant={row.category === "Security" ? "secondary" : "outline"} className="mr-1 h-4 px-1 text-[9px] uppercase tracking-wide align-middle">
                        {row.category}
                      </Badge>
                      {row.criterion}
                    </td>
                    {row.values.map((v, i) => (
                      <td key={i} className="p-1.5 text-center">
                        <div
                          className="w-9 h-9 mx-auto rounded flex items-center justify-center font-medium"
                          style={{
                            background: v === null ? "transparent" : sequentialBlue(v / 5, dark),
                            border: v === null ? `1px dashed ${chrome.baseline}` : "none",
                            color: v === null ? chrome.muted : v / 5 > 0.55 ? "#fff" : chrome.textPrimary,
                          }}
                          title={v === null ? "Not scored" : `${v}/5`}
                        >
                          {v ?? "–"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* 10. Radar */}
      {radar && (
        <ChartCard title="Criteria shape by team" subtitle={`Pick up to 3 teams to overlay - ${heatmapReview?.label}`}>
          <div className="flex gap-2 flex-wrap mb-2">
            {classData.teams.map((t) => {
              const active = radarTeams.includes(t.name);
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setRadarTeams((prev) =>
                      active ? prev.filter((n) => n !== t.name) : prev.length < 3 ? [...prev, t.name] : prev
                    )
                  }
                  className={`text-xs px-2 py-1 rounded-md border ${active ? "border-transparent text-white dark:text-black" : "border-black/15 dark:border-white/20"}`}
                  style={active ? { background: categorical[radarTeams.indexOf(t.name) % categorical.length] } : undefined}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radar.data} outerRadius={120}>
              <PolarGrid stroke={chrome.grid} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: chrome.muted }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9, fill: chrome.muted }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {radarTeams.map((teamName, i) => (
                <Radar
                  key={teamName}
                  name={teamName}
                  dataKey={teamName}
                  stroke={categorical[i % categorical.length]}
                  fill={categorical[i % categorical.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-1">Unscored criteria show as 0.</p>
        </ChartCard>
      )}

      {/* Table view (accessible fallback + raw numbers) */}
      <ChartCard title="All students" subtitle="Raw numbers behind every chart above">
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Team</th>
                <th className="text-left px-3 py-2 font-medium">Student</th>
                <th className="text-right px-3 py-2 font-medium">Reviews scored</th>
                <th className="text-right px-3 py-2 font-medium">Overall final score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((s) => (
                <tr key={`${s.team}-${s.student}`} className="border-t border-t">
                  <td className="px-3 py-2">{s.team}</td>
                  <td className="px-3 py-2">{s.student}</td>
                  <td className="px-3 py-2 text-right">{s.reviewsScored}/4</td>
                  <td className="px-3 py-2 text-right font-medium">{s.overall ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-3">
      <CardContent className="px-4">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
      {message}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
