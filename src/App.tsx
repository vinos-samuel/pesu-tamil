import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { getPhrasesWithCreatures, type UnitWithReadiness } from "./lib/queries";
import { sessionSummaryCopy } from "./lib/copy";
import type { PhraseWithCreature, Profile } from "./lib/types";
import Creature, { UNIT_HUES } from "./components/Creature";
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
      <div className="game-world min-h-screen px-6 py-10">
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
        <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 shadow-sm">Pesu Tamil</div>
        <h1 className="mt-6 text-center font-display text-5xl text-slate-800">Who is entering<br />the sanctuary?</h1>
        <p className="mt-2 text-center text-slate-500">Choose your explorer to continue the adventure.</p>

        {loading && <p className="text-gray-500">Loading players...</p>}
        {error && (
          <p className="max-w-md text-center text-red-600">
            Couldn't load players: {error}
          </p>
        )}

        {!loading && !error && (
          <div className="mt-8 flex flex-wrap justify-center gap-5">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProfile(p)}
                className={`group flex min-w-40 flex-col items-center gap-2 rounded-[2rem] border-2 border-white/80 px-7 py-6 shadow-xl transition hover:-translate-y-1 ${
                  p.avatar_color === "teal"
                    ? "bg-teal-100 hover:bg-teal-300"
                    : "bg-marigold-100 hover:bg-marigold-300"
                }`}
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/70 text-5xl transition group-hover:scale-110">🧒</span>
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
          className="mt-7 flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 shadow-lg backdrop-blur"
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
          className="mt-8 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Parent area →
        </button>
        </div>
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
    const guide = phrases[0];
    return (
      <div className="game-world min-h-screen px-6 py-12">
        <button
          onClick={() => setScreen("units")}
          className="game-icon-button absolute left-4 top-4"
        >
          ←
        </button>
        <div className="relative z-10 mx-auto mt-12 max-w-lg overflow-hidden rounded-[2.25rem] border-2 border-white/80 bg-white/80 p-7 text-center shadow-2xl backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">New mission</p>
          <div className="creature-float mx-auto mt-4 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-teal-100">
            {guide && <Creature slug={guide.slug} hueBase={UNIT_HUES[unitSlug] ?? 178} size={120} />}
          </div>
          <h1 className="mt-5 font-display text-4xl text-slate-800">{unitTitle}</h1>
          <p className="mx-auto mt-2 max-w-sm text-slate-600">Your crew is hiding nearby. Use spoken Tamil to find them and bring them home.</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-2xl bg-teal-50 px-2 py-3">🎧 Listen</span>
            <span className="rounded-2xl bg-amber-50 px-2 py-3">🧩 Solve</span>
            <span className="rounded-2xl bg-pink-50 px-2 py-3">🎙️ Speak</span>
          </div>
          <button onClick={() => setScreen("run")} className="game-primary mt-6 w-full bg-teal-700 py-4 text-white hover:bg-teal-800">Enter habitat →</button>
        </div>
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
    const learnedPhrases = runSummary.phraseIds
      .map((id) => phrases.find((phrase) => phrase.id === id))
      .filter((phrase): phrase is PhraseWithCreature => !!phrase)
      .slice(0, 3);
    const featuredTip = learnedPhrases.find((phrase) => phrase.tip)?.tip;
    const accuracy = runSummary.gradedTotal
      ? Math.round((runSummary.gradedCorrect / runSummary.gradedTotal) * 100)
      : 100;
    return (
      <div className="game-world min-h-screen px-5 py-8">
        <div className="relative z-10 mx-auto max-w-xl">
          <section className="overflow-hidden rounded-[2rem] border-2 border-white bg-white/85 p-6 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-300 text-4xl shadow-lg">🏆</div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Mission complete</p>
            <h1 className="font-display text-4xl text-slate-800">{encouragement}</h1>
            <p className="mt-2 text-sm text-slate-500">Your Tamil crew grew stronger.</p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="game-panel bg-amber-50"><span className="text-2xl">⚡</span><strong>+{runSummary.xpGained}</strong><small>energy</small></div>
              <div className="game-panel bg-teal-50"><span className="text-2xl">🎯</span><strong>{accuracy}%</strong><small>accuracy</small></div>
              <div className="game-panel bg-pink-50"><span className="text-2xl">🎙️</span><strong>{runSummary.sayItCount}</strong><small>spoken</small></div>
            </div>

            {learnedPhrases.length > 0 && <div className="mt-6 text-left"><h2 className="font-display text-xl text-slate-800">Words you powered up</h2><div className="mt-2 flex flex-wrap gap-2">{learnedPhrases.map((phrase) => <span key={phrase.id} className="rounded-full bg-teal-100 px-3 py-2 text-sm font-semibold text-teal-900">{phrase.tamil_romanized} · {phrase.english}</span>)}</div></div>}

            {featuredTip && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Creature clue</p><h3 className="mt-1 font-display text-lg text-slate-800">{featuredTip.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{featuredTip.body}</p></div>}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={keepGoing} className="game-primary bg-amber-400 py-4 text-amber-950 hover:bg-amber-300">Keep exploring →</button>
              <button onClick={backToUnits} className="game-primary bg-teal-700 py-4 text-white hover:bg-teal-800">Return to sanctuary</button>
            </div>
            <button onClick={backToPicker} className="mt-5 text-xs font-semibold text-slate-400 hover:text-slate-600">Finish for now</button>
          </section>
        </div>
      </div>
    );
  }

  return null;
}
