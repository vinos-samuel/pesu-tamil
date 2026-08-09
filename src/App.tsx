import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Profile = {
  id: string;
  name: string;
  avatar_color: string | null;
  streak_count: number;
  total_xp: number;
};

const AVATAR_COLORS = ["marigold", "teal"] as const;

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, avatar_color, streak_count, total_xp")
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
    } else {
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
    if (error) {
      setError(error.message);
      return;
    }
    setNewName("");
    loadProfiles();
  }

  if (selected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl text-teal-700">
          Vanakkam, {selected.name}! 👋
        </h1>
        <p className="text-gray-600">
          Units & creatures come next -- this is just the profile picker
          working end to end against Supabase.
        </p>
        <button
          className="mt-4 rounded-full bg-marigold-500 px-6 py-2 font-display text-white shadow hover:bg-marigold-700"
          onClick={() => setSelected(null)}
        >
          ← Switch player
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
      <h1 className="font-display text-4xl text-teal-700">Who's playing?</h1>

      {loading && <p className="text-gray-500">Loading players...</p>}
      {error && (
        <p className="text-red-600 max-w-md text-center">
          Couldn't load players: {error}
        </p>
      )}

      {!loading && !error && (
        <div className="flex flex-wrap justify-center gap-6">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
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
          className="font-body outline-none px-2 py-1"
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
