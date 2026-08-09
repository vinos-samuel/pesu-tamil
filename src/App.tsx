import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { getPhrasesWithCreatures, type UnitWithReadiness } from "./lib/queries";
import { isBuildItEligible, type PhraseWithCreature, type Profile } from "./lib/types";
import Learn from "./screens/Learn";
import Recognize from "./screens/Recognize";
import SayIt from "./screens/SayIt";
import BuildIt from "./screens/BuildIt";
import ParentDashboard from "./screens/ParentDashboard";
import UnitPicker from "./screens/UnitPicker";

type Screen =
  | "picker"
  | "parent"
  | "units"
  | "intro"
  | "learn"
  | "recognize"
  | "sayit"
  | "buildit"
  | "done";

const AVATAR_COLORS = ["marigold", "teal"] as const;

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [screen, setScreen] = useState<Screen>("picker");
  const [unitTitle, setUnitTitle] = useState("");
  const [phrases, setPhrases] = useState<PhraseWithCreature[]>([]);
  const [recognizeCorrect, setRecognizeCorrect] = useState(0);
  const [sayItCount, setSayItCount] = useState(0);
  const [buildItCorrect, setBuildItCorrect] = useState(0);
  const [xpGained, setXpGained] = useState(0);

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
    setUnitTitle(unit.title);
    const withCreatures = await getPhrasesWithCreatures(unit.id);
    setPhrases(withCreatures);
    setScreen("intro");
  }

  async function finishRecognize(correctCount: number) {
    setRecognizeCorrect(correctCount);
    const xpGain = correctCount * 10;
    setXpGained((prev) => prev + xpGain);
    if (profile) {
      await supabase
        .from("profiles")
        .update({ total_xp: profile.total_xp + xpGain })
        .eq("id", profile.id);
      setProfile({ ...profile, total_xp: profile.total_xp + xpGain });
    }
    setScreen("sayit");
  }

  async function finishSayIt(attemptedCount: number) {
    // Say-it is ungraded by design (see PRD) -- flat participation XP, not
    // tied to self-grade, and it doesn't feed SRS/progress.
    setSayItCount(attemptedCount);
    const xpGain = attemptedCount * 5;
    setXpGained((prev) => prev + xpGain);
    if (profile) {
      await supabase
        .from("profiles")
        .update({ total_xp: profile.total_xp + xpGain })
        .eq("id", profile.id);
      setProfile({ ...profile, total_xp: profile.total_xp + xpGain });
    }
    const eligible = phrases.filter(isBuildItEligible);
    if (eligible.length === 0) {
      setScreen("done");
    } else {
      setScreen("buildit");
    }
  }

  async function finishBuildIt(correctCount: number) {
    setBuildItCorrect(correctCount);
    const xpGain = correctCount * 10;
    setXpGained((prev) => prev + xpGain);
    if (profile) {
      await supabase
        .from("profiles")
        .update({ total_xp: profile.total_xp + xpGain })
        .eq("id", profile.id);
    }
    setScreen("done");
  }

  function backToPicker() {
    setProfile(null);
    setScreen("picker");
    setRecognizeCorrect(0);
    setSayItCount(0);
    setBuildItCorrect(0);
    setXpGained(0);
    loadProfiles();
  }

  function backToUnits() {
    setScreen("units");
    setRecognizeCorrect(0);
    setSayItCount(0);
    setBuildItCorrect(0);
    setXpGained(0);
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
    return <UnitPicker profile={profile} onPick={pickUnit} onExit={backToPicker} />;
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
          {phrases.length} creatures are waiting to be tamed, {profile?.name}!
        </p>
        <button
          onClick={() => setScreen("learn")}
          className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
        >
          Start →
        </button>
      </div>
    );
  }

  // -- Learn -------------------------------------------------------------
  if (screen === "learn" && profile) {
    return (
      <Learn
        phrases={phrases}
        profile={profile}
        onDone={() => setScreen("recognize")}
        onExit={backToUnits}
      />
    );
  }

  // -- Recognize ---------------------------------------------------------
  if (screen === "recognize" && profile) {
    return (
      <Recognize
        phrases={phrases}
        profile={profile}
        onDone={finishRecognize}
        onExit={backToUnits}
      />
    );
  }

  // -- Say-it --------------------------------------------------------------
  if (screen === "sayit" && profile) {
    return (
      <SayIt phrases={phrases} profile={profile} onDone={finishSayIt} onExit={backToUnits} />
    );
  }

  // -- Build-it --------------------------------------------------------------
  if (screen === "buildit" && profile) {
    const eligible = phrases.filter(isBuildItEligible);
    return (
      <BuildIt
        phrases={eligible}
        profile={profile}
        onDone={finishBuildIt}
        onExit={backToUnits}
      />
    );
  }

  // -- Done ----------------------------------------------------------------
  if (screen === "done") {
    const buildItTotal = phrases.filter(isBuildItEligible).length;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl text-marigold-700">
          Quest complete! 🎉
        </h1>
        <p className="font-body text-gray-600">
          {recognizeCorrect} / {phrases.length} correct · {sayItCount} said out loud
          {buildItTotal > 0 && <> · {buildItCorrect} / {buildItTotal} built</>}
        </p>
        <p className="font-body text-gray-500">+{xpGained} XP</p>
        <button
          onClick={backToPicker}
          className="mt-4 rounded-full bg-teal-500 px-6 py-2 font-display text-white shadow hover:bg-teal-700"
        >
          ← Switch player
        </button>
      </div>
    );
  }

  return null;
}
