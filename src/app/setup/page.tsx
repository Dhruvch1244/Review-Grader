"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiWrite } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Shuffle, ChevronDown, ChevronRight, BarChart3, Download, ClipboardList, AlertTriangle } from "lucide-react";
import { generateIndianNames } from "@/lib/indian-names";
import type { ClassRow, ClassData, TeamWithStudents, StudentRow } from "@/lib/types";

export default function SetupPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, ClassData>>({});

  async function refreshList() {
    const data = await apiGet<ClassRow[]>("/api/classes");
    setClasses(data ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    refreshList();
  }, []);

  async function toggleExpand(classId: string) {
    if (expanded[classId]) {
      const next = { ...expanded };
      delete next[classId];
      setExpanded(next);
      return;
    }
    const data = await apiGet<ClassData>(`/api/classes/${classId}`);
    if (data) setExpanded((prev) => ({ ...prev, [classId]: data }));
  }

  function setClassData(classId: string, data: ClassData) {
    setExpanded((prev) => ({ ...prev, [classId]: data }));
    setClasses((prev) => prev.map((c) => (c.id === classId ? data.class : c)));
  }

  async function resetAll() {
    if (
      !window.confirm(
        "Reset ALL scores, ratings, and session state for every class? Rosters stay as they are. This can't be undone."
      )
    ) {
      return;
    }
    await apiWrite("DELETE", "/api/reset-all");
    toast.success("All scoring data reset across every class");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The 6 classes are ready to go with a full roster - rename anyone, shuffle in fresh
            names, or add and remove teams and members as your real roster comes in.
          </p>
        </div>
        <Button variant="outline" className="text-destructive hover:text-destructive shrink-0" onClick={resetAll}>
          <AlertTriangle className="size-4" /> Reset all data
        </Button>
      </div>

      <div className="space-y-3">
        {classes.map((c) => (
          <Card key={c.id} className="overflow-hidden py-0">
            <div className="flex items-center justify-between px-5 py-4 gap-3">
              <button
                onClick={() => toggleExpand(c.id)}
                className="flex-1 flex items-center gap-3 text-left hover:opacity-70 transition-opacity min-w-0"
              >
                {expanded[c.id] ? (
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.reviewer_name ? `${c.reviewer_name} · ` : ""}
                    {c.headcount} students
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link href={`/score/${c.id}`}>
                  <Button variant="outline" size="sm">
                    <ClipboardList className="size-3.5" /> Score
                  </Button>
                </Link>
                <Link href={`/stats/${c.id}`}>
                  <Button variant="outline" size="icon" className="size-8" title="Stats">
                    <BarChart3 className="size-4" />
                  </Button>
                </Link>
                <a href={`/api/export?classId=${c.id}`}>
                  <Button variant="outline" size="icon" className="size-8" title="Export .xlsx">
                    <Download className="size-4" />
                  </Button>
                </a>
                <Badge variant="secondary" className="cursor-pointer" onClick={() => toggleExpand(c.id)}>
                  {expanded[c.id] ? "Hide" : "Manage roster"}
                </Badge>
              </div>
            </div>
            {expanded[c.id] && (
              <CardContent className="border-t pt-5 pb-5 space-y-5">
                <ClassSettings classData={expanded[c.id]} onUpdate={(d) => setClassData(c.id, d)} />
                <BulkImport classData={expanded[c.id]} onUpdate={(d) => setClassData(c.id, d)} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {expanded[c.id].teams.map((team) => (
                    <TeamRoster
                      key={team.id}
                      classData={expanded[c.id]}
                      team={team}
                      onUpdate={(d) => setClassData(c.id, d)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await apiWrite("POST", `/api/classes/${c.id}/teams`, {});
                      const data = await apiGet<ClassData>(`/api/classes/${c.id}`);
                      if (data) setClassData(c.id, data);
                    }}
                  >
                    <Plus className="size-3.5" /> Add team
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const totalSlots = expanded[c.id].teams.reduce((n, t) => n + t.students.length, 0);
                      const names = generateIndianNames(totalSlots);
                      const res = await apiWrite<ClassData>("PATCH", `/api/classes/${c.id}/autofill`, { names });
                      setClassData(c.id, { class: res.class, teams: res.teams });
                      toast.success("Shuffled in a fresh set of names");
                    }}
                  >
                    <Shuffle className="size-3.5" /> Shuffle names
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ClassSettings({ classData, onUpdate }: { classData: ClassData; onUpdate: (data: ClassData) => void }) {
  const [reviewer, setReviewer] = useState(classData.class.reviewer_name ?? "");

  async function commitReviewer() {
    await apiWrite("PATCH", `/api/classes/${classData.class.id}`, { reviewerName: reviewer });
    onUpdate({ ...classData, class: { ...classData.class, reviewer_name: reviewer || null } });
  }

  return (
    <div className="flex items-end gap-3">
      <label className="text-sm">
        <span className="block text-muted-foreground mb-1">Reviewer</span>
        <Input
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          onBlur={commitReviewer}
          placeholder="assign a reviewer"
          className="w-56"
        />
      </label>
    </div>
  );
}

function BulkImport({ classData, onUpdate }: { classData: ClassData; onUpdate: (data: ClassData) => void }) {
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const totalSlots = classData.teams.reduce((n, t) => n + t.students.length, 0);

  async function apply() {
    const names = paste
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setSaving(true);
    const res = await apiWrite<ClassData & { applied: number; totalSlots: number }>(
      "PATCH",
      `/api/classes/${classData.class.id}/autofill`,
      { names },
      `class-autofill-${classData.class.id}`
    );
    onUpdate({ class: res.class, teams: res.teams });
    setSaving(false);
    setPaste("");
    if (typeof res.applied === "number") {
      const leftover = names.length - res.applied;
      toast.success(
        leftover > 0
          ? `Applied ${res.applied} of ${res.totalSlots} slots - ${leftover} name(s) had no team slot left.`
          : `Applied ${res.applied} of ${res.totalSlots} slots.`
      );
    }
  }

  return (
    <Card className="bg-accent/30 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Bulk-import this class&apos;s roster</CardTitle>
        <p className="text-xs text-muted-foreground">
          Paste all {totalSlots} names in one go, one per line, in the order you want them filled -
          Team 1&apos;s slots first, then Team 2&apos;s, and so on.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={`One name per line (up to ${totalSlots})`}
          rows={4}
          className="w-full text-sm border rounded-md px-3 py-2 bg-background"
        />
        <Button size="sm" onClick={apply} disabled={saving}>
          {saving ? "Applying…" : "Apply to all teams"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamRoster({
  classData,
  team,
  onUpdate,
}: {
  classData: ClassData;
  team: TeamWithStudents;
  onUpdate: (data: ClassData) => void;
}) {
  function patchTeamLocally(updated: TeamWithStudents) {
    onUpdate({
      ...classData,
      teams: classData.teams.map((t) => (t.id === updated.id ? updated : t)),
    });
  }

  function renameLocally(studentId: string, value: string) {
    patchTeamLocally({
      ...team,
      students: team.students.map((s) => (s.id === studentId ? { ...s, name: value } : s)),
    });
  }

  async function commitRename(studentId: string, value: string) {
    await apiWrite("PATCH", `/api/students/${studentId}`, { name: value }, `rename-${studentId}`);
  }

  async function moveStudent(studentId: string, targetTeamId: string) {
    if (targetTeamId === team.id) return;
    const student = team.students.find((s) => s.id === studentId);
    if (!student) return;
    const targetTeam = classData.teams.find((t) => t.id === targetTeamId);
    onUpdate({
      ...classData,
      teams: classData.teams.map((t) => {
        if (t.id === team.id) return { ...t, students: t.students.filter((s) => s.id !== studentId) };
        if (t.id === targetTeamId && targetTeam) return { ...t, students: [...t.students, student] };
        return t;
      }),
    });
    await apiWrite("PATCH", `/api/students/${studentId}/team`, { teamId: targetTeamId }, `move-${studentId}`);
  }

  async function addMember() {
    const student = await apiWrite<StudentRow>("POST", `/api/teams/${team.id}/students`, {});
    patchTeamLocally({ ...team, students: [...team.students, student] });
  }

  async function removeMember(studentId: string) {
    patchTeamLocally({ ...team, students: team.students.filter((s) => s.id !== studentId) });
    await apiWrite("DELETE", `/api/students/${studentId}`, undefined, `delete-student-${studentId}`);
  }

  async function removeTeam() {
    onUpdate({ ...classData, teams: classData.teams.filter((t) => t.id !== team.id) });
    await apiWrite("DELETE", `/api/teams/${team.id}`, undefined, `delete-team-${team.id}`);
  }

  return (
    <Card className="gap-2">
      <CardHeader className="flex-row items-center justify-between pb-1">
        <CardTitle className="text-sm">{team.name}</CardTitle>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive" onClick={removeTeam}>
          <Trash2 className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {team.students.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <Input
              value={s.name}
              onChange={(e) => renameLocally(s.id, e.target.value)}
              onBlur={(e) => commitRename(s.id, e.target.value)}
              className="h-8 text-sm"
            />
            <Select value={team.id} onValueChange={(v) => v && moveStudent(s.id, v)}>
              <SelectTrigger size="sm" className="w-[92px] text-xs">
                <SelectValue>
                  {(v: string) => classData.teams.find((t) => t.id === v)?.name ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classData.teams.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeMember(s.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {team.students.length === 0 && <p className="text-xs text-muted-foreground italic">No one on this team yet.</p>}
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full justify-start" onClick={addMember}>
          <Plus className="size-3.5" /> Add member
        </Button>
      </CardContent>
    </Card>
  );
}
