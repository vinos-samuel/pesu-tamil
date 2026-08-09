import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { getPhrasesWithCreatures, getUnitBySlug } from "./lib/queries";
import type { PhraseWithCreature, Profile } from "./lib/types";
import Learn from "./screens/Learn";
import Recognize from "./screens/Recognize";

type Screen = "picker" | "intro" | "learn" | "recognize" | "done";

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
  const [earnedCorrect, setEarnedCorrect] = useState(0);

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

  async function selectProfile(p: Profile) {
    setProfile(p);
    const unit = await getUnitBySlug("greetings");
    setUnitTitle(unit.title);
    const withCreatures = await getPhrasesWithCreatures(unit.id);
    setPhrases(withCreatures);
    setScreen("intro");
  }

  async function finishRecognize(correctCount: number) {
    setEarnedCorrect(correctCount);
    if (profile) {
      const xpGain = correctCount * 10;
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
    loadProfiles();
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
      </div>
    );
  }

  // -- Unit intro ------------------------------------------------------------
  if (screen === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
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
      />
    );
  }

  // -- Recognize ---------------------------------------------------------
  if (screen === "recognize" && profile) {
    return (
      <Recognize phrases={phrases} profile={profile} onDone={finishRecognize} />
    );
  }

  // -- Done ----------------------------------------------------------------
  if (screen === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl text-marigold-700">
          Quest complete! 🎉
        </h1>
        <p className="font-body text-gray-600">
          {earnedCorrect} / {phrases.length} correct · +{earnedCorrect * 10} XP
        </p>
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
