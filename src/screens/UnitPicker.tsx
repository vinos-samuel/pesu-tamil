import { useEffect, useState } from "react";
import { getUnitsWithReadiness, type UnitWithReadiness } from "../lib/queries";
import type { Profile } from "../lib/types";

const UNIT_EMOJI: Record<string, string> = {
  greetings: "🦚",
  family: "🌸",
  mealtime: "🔥",
  numbers: "🐐",
  actions: "🦦",
};

export default function UnitPicker({
  profile,
  onPick,
}: {
  profile: Profile;
  onPick: (unit: UnitWithReadiness) => void;
}) {
  const [units, setUnits] = useState<UnitWithReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUnitsWithReadiness()
      .then(setUnits)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
      <h1 className="font-display text-4xl text-teal-700">
        Which quest, {profile.name}?
      </h1>

      {loading && <p className="text-gray-500">Loading units...</p>}
      {error && <p className="max-w-md text-center text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="flex flex-wrap justify-center gap-5">
          {units.map((u) => (
            <button
              key={u.id}
              onClick={() => u.ready && onPick(u)}
              disabled={!u.ready}
              className={`flex w-40 flex-col items-center gap-2 rounded-3xl px-5 py-6 shadow-md transition ${
                u.ready
                  ? "bg-marigold-100 hover:-translate-y-1 hover:bg-marigold-300"
                  : "cursor-not-allowed bg-gray-100 opacity-60"
              }`}
            >
              <span className="text-5xl">{UNIT_EMOJI[u.slug] ?? "🥚"}</span>
              <span className="font-display text-lg text-gray-800">
                {u.title}
              </span>
              <span className="text-xs text-gray-500">
                {u.ready ? `${u.phraseCount} creatures` : "Recordings coming soon"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
