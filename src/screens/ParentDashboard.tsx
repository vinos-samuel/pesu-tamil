import { useEffect, useState } from "react";
import {
  flagContentIssue,
  getDashboardStats,
  getFlags,
  getRecentRecordings,
  resolveFlag,
  setParentGrade,
  type DashboardStats,
  type FlagRow,
  type RecordingRow,
} from "../lib/queries";
import { audioUrl } from "../lib/queries";
import { recordingUrl } from "../lib/recording";
import { playAudio } from "../lib/playAudio";
import Creature, { UNIT_HUES } from "../components/Creature";

type Tab = "recordings" | "flags";

// Deliberate register-break (per PRD): plain data, cream/daylight palette,
// no game copy. Never shown to the kid.
export default function ParentDashboard({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("recordings");
  const [rows, setRows] = useState<RecordingRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [recordings, dashStats, flagRows] = await Promise.all([
        getRecentRecordings(),
        getDashboardStats(),
        getFlags(),
      ]);
      setRows(recordings);
      setStats(dashStats);
      setFlags(flagRows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function grade(row: RecordingRow, value: boolean | null) {
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, parent_grade: value } : r))
    );
    await setParentGrade(row.id, value);
  }

  async function flagRecordingPhrase(row: RecordingRow) {
    if (!row.phrases) return;
    await flagContentIssue(row.phrases.id);
    setFlags(await getFlags());
  }

  async function toggleResolved(flag: FlagRow) {
    const resolved = !flag.resolved_at;
    setFlags((prev) =>
      prev.map((f) =>
        f.id === flag.id ? { ...f, resolved_at: resolved ? new Date().toISOString() : null } : f
      )
    );
    await resolveFlag(flag.id, resolved);
  }

  const openFlags = flags.filter((f) => !f.resolved_at);
  const resolvedFlags = flags.filter((f) => f.resolved_at);

  return (
    <div className="min-h-screen bg-cream px-6 py-10 text-gray-800">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">Parent dashboard</h1>
          <button
            onClick={onBack}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            ← Back
          </button>
        </div>

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Day streak" value={`🔥 ${stats.streak}`} />
            <StatCard label="Sessions this week" value={String(stats.sessionsThisWeek)} />
            <StatCard label="Creatures tamed" value={String(stats.creaturesTamed)} />
            <StatCard label="Total XP" value={String(stats.totalXp)} />
          </div>
        )}

        <div className="mb-4 flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setTab("recordings")}
            className={`px-3 py-2 text-sm font-semibold ${
              tab === "recordings"
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Recordings to review
          </button>
          <button
            onClick={() => setTab("flags")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold ${
              tab === "flags"
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Flags
            {openFlags.length > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                {openFlags.length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300">
            Word cards
            <span className="rounded bg-marigold-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-marigold-700">
              Soon
            </span>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">Couldn't load: {error}</p>}

        {!loading && !error && tab === "recordings" && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Recent Say-it recordings. Play, compare to the native audio, and mark
              whether the pronunciation was on track. This is the only real grading
              Say-it gets — it's deliberately ungraded in the app itself.
            </p>

            {rows.length === 0 && <p className="text-gray-500">No recordings yet.</p>}

            <ul className="flex flex-col gap-3">
              {rows.map((row) => {
                const unitSlug = row.phrases?.units?.slug;
                const hueBase = unitSlug ? UNIT_HUES[unitSlug] ?? 178 : 178;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-marigold-100">
                        {row.phrases && (
                          <Creature slug={row.phrases.slug} hueBase={hueBase} size={30} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-800">
                          {row.phrases?.english ?? "(unknown phrase)"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {row.profiles?.name ?? "?"} ·{" "}
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => playAudio(recordingUrl(row.recording_path))}
                        className="rounded-full bg-teal-500 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
                        title="Hear the recording"
                      >
                        🔊 Kid
                      </button>
                      {row.phrases?.audio_path && (
                        <button
                          onClick={() => playAudio(audioUrl(row.phrases!.audio_path!))}
                          className="rounded-full bg-marigold-500 px-3 py-1.5 text-sm text-white hover:bg-marigold-700"
                          title="Hear the native recording"
                        >
                          🔊 Native
                        </button>
                      )}
                      <button
                        onClick={() => grade(row, row.parent_grade === true ? null : true)}
                        className={`rounded-full px-2.5 py-1.5 text-sm ${
                          row.parent_grade === true
                            ? "bg-teal-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title="Sounded right"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => grade(row, row.parent_grade === false ? null : false)}
                        className={`rounded-full px-2.5 py-1.5 text-sm ${
                          row.parent_grade === false
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title="Needs another try"
                      >
                        👎
                      </button>
                      <button
                        onClick={() => flagRecordingPhrase(row)}
                        className="rounded-full bg-gray-100 px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-200"
                        title="Flag this phrase's content as wrong"
                      >
                        🚩
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!loading && !error && tab === "flags" && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              🧒 = Savyr tapped "I didn't get it" (just reshows the phrase sooner, no action
              needed). 👤 = flagged from a recording as possibly-wrong content — worth a look
              next time you're authoring or reviewing content.
            </p>

            {flags.length === 0 && <p className="text-gray-500">No flags yet.</p>}

            {openFlags.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {openFlags.map((f) => (
                  <FlagRowItem key={f.id} flag={f} onToggle={() => toggleResolved(f)} />
                ))}
              </ul>
            )}

            {resolvedFlags.length > 0 && (
              <>
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Resolved</p>
                <ul className="flex flex-col gap-2 opacity-60">
                  {resolvedFlags.map((f) => (
                    <FlagRowItem key={f.id} flag={f} onToggle={() => toggleResolved(f)} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FlagRowItem({ flag, onToggle }: { flag: FlagRow; onToggle: () => void }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-800">
          {flag.source === "kid" ? "🧒" : "👤"} {flag.phrases?.english ?? "(unknown phrase)"}
        </p>
        <p className="text-xs text-gray-400">
          {flag.kind === "reshow" ? "reshow sooner" : "content issue"} ·{" "}
          {new Date(flag.created_at).toLocaleString()}
          {flag.note && <> · {flag.note}</>}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`rounded-full px-3 py-1.5 text-sm ${
          flag.resolved_at
            ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
            : "bg-teal-600 text-white hover:bg-teal-700"
        }`}
      >
        {flag.resolved_at ? "Reopen" : "Resolve"}
      </button>
    </li>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-marigold-50 px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums text-teal-700">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
