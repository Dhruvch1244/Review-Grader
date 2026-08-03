"use client";

import { useEffect, useState } from "react";
import { apiGet, apiWrite } from "@/lib/api-client";
import type { ClassRow, ClassData, TeamWithStudents } from "@/lib/types";

export default function SetupPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, ClassData>>({});
  const [name, setName] = useState("");
  const [instructorName, setInstructorName] = useState("");
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
    await apiWrite<ClassData>("POST", "/api/classes", {
      name: name.trim(),
      instructorName: instructorName.trim() || undefined,
      headcount,
      teamSize,
    });
    setName("");
    setInstructorName("");
    setCreating(false);
    await refreshList();
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

  function updateExpandedTeam(classId: string, team: TeamWithStudents) {
    setExpanded((prev) => {
      const cls = prev[classId];
      if (!cls) return prev;
      return {
        ...prev,
        [classId]: {
          ...cls,
          teams: cls.teams.map((t) => (t.id === team.id ? team : t)),
        },
      };
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Setup</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          Add each of the 6 classes with a headcount. Teams of {teamSize} are generated
          automatically - fill in real names whenever you have the roster.
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
            <span className="block text-black/60 dark:text-white/60 mb-1">Instructor</span>
            <input
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
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
                  {c.instructor_name ? `${c.instructor_name} · ` : ""}
                  {c.headcount} students
                </p>
              </div>
              <span className="text-xs text-black/40">{expanded[c.id] ? "Hide" : "Manage roster"}</span>
            </button>
            {expanded[c.id] && (
              <div className="border-t border-black/10 dark:border-white/10 p-4 space-y-4">
                {expanded[c.id].teams.map((team) => (
                  <TeamRoster
                    key={team.id}
                    classId={c.id}
                    team={team}
                    onUpdate={(t) => updateExpandedTeam(c.id, t)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamRoster({
  team,
  onUpdate,
}: {
  classId: string;
  team: TeamWithStudents;
  onUpdate: (team: TeamWithStudents) => void;
}) {
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);

  async function autofillFromPaste() {
    const names = paste
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setSaving(true);
    const updated = await apiWrite<TeamWithStudents>(
      "PATCH",
      `/api/teams/${team.id}/students`,
      { names },
      `patch-team-students-${team.id}`
    );
    onUpdate(updated);
    setPaste("");
    setSaving(false);
  }

  async function renameStudent(studentId: string, value: string) {
    onUpdate({
      ...team,
      students: team.students.map((s) => (s.id === studentId ? { ...s, name: value } : s)),
    });
  }

  async function commitRename(studentId: string, value: string) {
    await apiWrite("PATCH", `/api/students/${studentId}`, { name: value }, `rename-${studentId}`);
  }

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-md p-3">
      <p className="text-sm font-medium mb-2">{team.name}</p>
      <div className="space-y-1.5 mb-3">
        {team.students.map((s) => (
          <input
            key={s.id}
            value={s.name}
            onChange={(e) => renameStudent(s.id, e.target.value)}
            onBlur={(e) => commitRename(s.id, e.target.value)}
            className="w-full text-sm border border-black/15 dark:border-white/20 rounded-md px-2 py-1 bg-transparent"
          />
        ))}
      </div>
      <details>
        <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">
          Paste names to autofill this team
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={`One name per line, ${team.students.length} max`}
            rows={3}
            className="w-full text-sm border border-black/15 dark:border-white/20 rounded-md px-2 py-1.5 bg-transparent"
          />
          <button
            onClick={autofillFromPaste}
            disabled={saving}
            className="self-start text-xs bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {saving ? "Saving…" : "Autofill"}
          </button>
        </div>
      </details>
    </div>
  );
}
