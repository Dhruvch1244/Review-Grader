"use client";

import { useEffect, useState } from "react";
import { apiGet, apiWrite } from "@/lib/api-client";
import type { ClassRow, ClassData, TeamWithStudents } from "@/lib/types";

export default function SetupPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, ClassData>>({});
  const [name, setName] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [headcount, setHeadcount] = useState(22);
  const [teamSize, setTeamSize] = useState(6);
  const [creating, setCreating] = useState(false);

  async function refreshList() {
    const data = await apiGet<ClassRow[]>("/api/classes");
    setClasses(data ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    refreshList();
  }, []);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !headcount) return;
    setCreating(true);
    const created = await apiWrite<ClassData>("POST", "/api/classes", {
      name: name.trim(),
      reviewerName: reviewerName.trim() || undefined,
      headcount,
      teamSize,
    });
    setName("");
    setReviewerName("");
    setCreating(false);
    await refreshList();
    if (created?.class?.id) setExpanded((prev) => ({ ...prev, [created.class.id]: created }));
  }

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
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Setup</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Add each of the 6 classes with a headcount. Teams of {teamSize} are generated
          automatically - paste the whole roster in one go below and it lands in the right
          teams, or fill it in later.
        </p>
      </div>

      <form onSubmit={createClass} className="border border-black/10 dark:border-white/10 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium">Add a class</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-black/60 dark:text-white/60 mb-1">Class name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Class A"
              className="w-full border border-black/15 dark:border-white/20 rounded-md px-2 py-1.5 bg-transparent"
              required
            />
          </label>
          <label className="text-sm">
            <span className="block text-black/60 dark:text-white/60 mb-1">Reviewer</span>
            <input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="optional"
              className="w-full border border-black/15 dark:border-white/20 rounded-md px-2 py-1.5 bg-transparent"
            />
          </label>
          <label className="text-sm">
            <span className="block text-black/60 dark:text-white/60 mb-1">Headcount</span>
            <input
              type="number"
              min={1}
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
              className="w-full border border-black/15 dark:border-white/20 rounded-md px-2 py-1.5 bg-transparent"
              required
            />
          </label>
          <label className="text-sm">
            <span className="block text-black/60 dark:text-white/60 mb-1">Team size</span>
            <input
              type="number"
              min={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full border border-black/15 dark:border-white/20 rounded-md px-2 py-1.5 bg-transparent"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-black text-white dark:bg-white dark:text-black text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add class"}
        </button>
      </form>

      <div className="space-y-4">
        {classes.map((c) => (
          <div key={c.id} className="border border-black/10 dark:border-white/10 rounded-lg">
            <button
              onClick={() => toggleExpand(c.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {c.reviewer_name ? `${c.reviewer_name} · ` : ""}
                  {c.headcount} students
                </p>
              </div>
              <span className="text-xs text-black/40">{expanded[c.id] ? "Hide" : "Manage roster"}</span>
            </button>
            {expanded[c.id] && (
              <div className="border-t border-black/10 dark:border-white/10 p-4 space-y-4">
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BulkImport({
  classData,
  onUpdate,
}: {
  classData: ClassData;
  onUpdate: (data: ClassData) => void;
}) {
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const totalSlots = classData.teams.reduce((n, t) => n + t.students.length, 0);

  async function apply() {
    const names = paste
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setSaving(true);
    setResult(null);
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
      setResult(
        leftover > 0
          ? `Applied ${res.applied} of ${res.totalSlots} slots - ${leftover} name(s) had no team slot left.`
          : `Applied ${res.applied} of ${res.totalSlots} slots.`
      );
    }
  }

  return (
    <div className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 rounded-md p-3">
      <p className="text-sm font-medium mb-1">Bulk-import this class&apos;s roster</p>
      <p className="text-xs text-black/60 dark:text-white/60 mb-2">
        Paste all {totalSlots} names in one go, one per line, in the order you want them filled -
        Team 1&apos;s slots first, then Team 2&apos;s, and so on. Hit apply once and every team
        updates together.
      </p>
      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder={`One name per line (up to ${totalSlots})`}
        rows={5}
        className="w-full text-sm border border-black/15 dark:border-white/20 rounded-md px-2 py-1.5 bg-white dark:bg-black/30 mb-2"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={apply}
          disabled={saving}
          className="text-sm bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {saving ? "Applying…" : "Apply to all teams"}
        </button>
        {result && <p className="text-xs text-black/60 dark:text-white/60">{result}</p>}
      </div>
    </div>
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
    // optimistic local move between the two team lists
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

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-md p-3">
      <p className="text-sm font-medium mb-2">{team.name}</p>
      <div className="space-y-1.5">
        {team.students.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <input
              value={s.name}
              onChange={(e) => renameLocally(s.id, e.target.value)}
              onBlur={(e) => commitRename(s.id, e.target.value)}
              className="flex-1 min-w-0 text-sm border border-black/15 dark:border-white/20 rounded-md px-2 py-1 bg-transparent"
            />
            <select
              value={team.id}
              onChange={(e) => moveStudent(s.id, e.target.value)}
              title="Move to a different team"
              className="text-xs border border-black/15 dark:border-white/20 rounded-md px-1 py-1 bg-transparent"
            >
              {classData.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        {team.students.length === 0 && (
          <p className="text-xs text-black/40 italic">No one on this team yet.</p>
        )}
      </div>
    </div>
  );
}
