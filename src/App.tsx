import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { getPhrasesWithCreatures, type UnitWithReadiness } from "./lib/queries";
import { sessionSummaryCopy } from "./lib/copy";
import type { PhraseWithCreature, Profile } from "./lib/types";
import ParentDashboard from "./screens/ParentDashboard";
import UnitPicker from "./screens/UnitPicker";
import Sanctuary from "./screens/Sanctuary";
import SessionRunner, { type RunSummary } from "./screens/SessionRunner";

type Screen = "picker" | "parent" | "units" | "sanctuary" | "intro" | "run" | "done";

const AVATAR_COLORS = ["marigold", "teal"] as const;

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [screen, setScreen] = useState<Screen>("picker");
  const [unitId, setUnitId] = useState("");
  const [unitTitle, setUnitTitle] = useState("");
  const [unitSlug, setUnitSlug] = useState("");
  const [phrases, setPhrases] = useState<PhraseWithCreature[]>([]);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [encouragement, setEncouragement] = useState("");

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, avatar_color, streak_count, total_xp")
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else {
      setProfiles(data ?? []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function addProfile(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const color = AVATAR_COLORS[profiles.length % AVATAR_COLORS.length];
    const { error } = await supabase
      .from("profiles")
      .insert({ name, avatar_color: color });
    setAdding(false);
    if (error) setError(error.message);
    else {
      setNewName("");
      loadProfiles();
    }
  }

  function selectProfile(p: Profile) {
    setProfile(p);
    setScreen("units");
  }

  async function pickUnit(unit: UnitWithReadiness) {
    setUnitId(unit.id);
    setUnitTitle(unit.title);
    setUnitSlug(unit.slug);
    const withCreatures = await getPhrasesWithCreatures(unit.id);
    setPhrases(withCreatures);
    setScreen("intro");
  }

  function finishRun(summary: RunSummary, updatedProfile: Profile) {
    setRunSummary(summary);
    setEncouragement(sessionSummaryCopy(summary.gradedCorrect, summary.gradedTotal));
    setProfile(updatedProfile);
    setScreen("done");
  }

  function backToPicker() {
    setProfile(null);
    setScreen("picker");
    setRunSummary(null);
    loadProfiles();
  }

  function backToUnits() {
    setScreen("units");
    setRunSummary(null);
  }

  // "Keep going" from the done screen -- same unit, same loaded phrases,
  // straight back into a fresh run rather than forcing a detour through
  // the unit picker. SessionRunner's own setup effect builds a brand-new
  // queue since the previous run is already marked completed.
  function keepGoing() {
    setRunSummary(null);
    setScreen("run");
  }

  // -- Picker --------------------------------------------------------------
  if (screen === "picker") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
        <h1 className="font-display text-4xl text-teal-700">Who's playing?</h1>

        {loading && <p className="text-gray-500">Loading players...</p>}
        {error && (
          <p className="max-w-md text-center text-red-600">
            Couldn't load players: {error}
          </p>
        )}

        {!loading && !error && (
          <div className="flex flex-wrap justify-center gap-6">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProfile(p)}
                className={`flex flex-col items-center gap-2 rounded-3xl px-6 py-5 shadow-md transition hover:-translate-y-1 ${
                  p.avatar_color === "teal"
                    ? "bg-teal-100 hover:bg-teal-300"
                    : "bg-marigold-100 hover:bg-marigold-300"
                }`}
              >
                <span className="text-5xl">🧒</span>
                <span className="font-display text-xl text-gray-800">
                  {p.name}
                </span>
                <span className="text-xs text-gray-500">
                  🔥 {p.streak_count} · ⭐ {p.total_xp} XP
                </span>
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={addProfile}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a player..."
            className="font-body px-2 py-1 outline-none"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="rounded-full bg-teal-500 px-4 py-1.5 font-display text-white disabled:opacity-40 hover:bg-teal-700"
          >
            Add
          </button>
        </form>

        <button
          onClick={() => setScreen("parent")}
          className="mt-2 text-xs text-gray-400 underline hover:text-gray-600"
        >
          Parent dashboard
        </button>
      </div>
    );
  }

  // -- Parent dashboard ------------------------------------------------------
  if (screen === "parent") {
    return <ParentDashboard onBack={() => setScreen("picker")} />;
  }

  // -- Unit picker -----------------------------------------------------------
  if (screen === "units" && profile) {
    return (
      <UnitPicker
        profile={profile}
        onPick={pickUnit}
        onExit={backToPicker}
        onSanctuary={() => setScreen("sanctuary")}
      />
    );
  }

  // -- Sanctuary (creature collection) ----------------------------------------
  if (screen === "sanctuary" && profile) {
    return <Sanctuary profile={profile} onExit={() => setScreen("units")} />;
  }

  // -- Unit intro ------------------------------------------------------------
  if (screen === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <button
          onClick={() => setScreen("units")}
          className="absolute left-4 top-4 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back
        </button>
        <h1 className="font-display text-4xl text-teal-700">{unitTitle}</h1>
        <p className="font-body text-gray-600">
          Your crew is waiting, {profile?.name}!
        </p>
        <button
          onClick={() => setScreen("run")}
          className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
        >
          Start →
        </button>
      </div>
    );
  }

  // -- Session run (mixed encounters -- Learn/Recognize/Say-it/Build-it) -----
  if (screen === "run" && profile) {
    return (
      <SessionRunner
        phrases={phrases}
        profile={profile}
        unitId={unitId}
        unitSlug={unitSlug}
        onDone={finishRun}
        onExit={backToUnits}
      />
    );
  }

  // -- Done ----------------------------------------------------------------
  if (screen === "done" && runSummary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl text-marigold-700">
          Quest complete! 🎉
        </h1>
        <p className="font-display text-xl text-teal-700">{encouragement}</p>
        <p className="font-body text-gray-600">
          {runSummary.gradedTotal > 0 && (
            <>
              {runSummary.gradedCorrect} / {runSummary.gradedTotal} correct
            </>
          )}
          {runSummary.gradedTotal > 0 && runSummary.sayItCount > 0 && " · "}
          {runSummary.sayItCount > 0 && <>{runSummary.sayItCount} said out loud</>}
        </p>
        <p className="font-body text-gray-500">+{runSummary.xpGained} XP</p>

        <div className="mt-4 flex flex-col items-center gap-3">
          <button
            onClick={keepGoing}
            className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
          >
            Keep going →
          </button>
          <button
            onClick={backToUnits}
            className="font-body text-sm text-teal-700 underline hover:text-teal-900"
          >
            Choose another quest
          </button>
          <button
            onClick={backToPicker}
            className="font-body text-xs text-gray-400 underline hover:text-gray-600"
          >
            ← Switch player
          </button>
        </div>
      </div>
    );
  }

  return null;
}
