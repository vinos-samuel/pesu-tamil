import { useEffect, useState } from "react";
import { audioUrl, getSanctuaryData, type SanctuaryPhrase } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import Creature, { UNIT_HUES } from "../components/Creature";
import type { Profile } from "../lib/types";

const UNIT_TITLES: Record<string, string> = {
  greetings: "Greetings",
  family: "Family",
  mealtime: "Mealtime",
  numbers: "Numbers",
  actions: "Actions",
};

// The collection screen the app promised ("N creatures are waiting to be
// tamed") and never delivered before this. Grey/wild = not yet tamed
// (no `progress` row for this profile+phrase); color/tamed = has one.
export default function Sanctuary({
  profile,
  onExit,
}: {
  profile: Profile;
  onExit: () => void;
}) {
  const [units, setUnits] = useState<{ slug: string; title: string }[]>([]);
  const [phrases, setPhrases] = useState<SanctuaryPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSanctuaryData(profile.id)
      .then(({ units, phrases }) => {
        setUnits(units);
        setPhrases(phrases);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [profile.id]);

  function tapCreature(p: SanctuaryPhrase) {
    // Following creatures are met, just not mastered yet -- still worth a
    // replay. Only wild (never engaged) stays silent.
    if (p.state !== "wild" && p.audio_path) playAudio(audioUrl(p.audio_path));
  }

  const tamedCount = phrases.filter((p) => p.state === "tamed").length;
  const pct = phrases.length ? Math.round((tamedCount / phrases.length) * 100) : 0;

  return (
    <div className="min-h-screen px-6 py-10">
      <button
        onClick={onExit}
        className="absolute left-4 top-4 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Back to quests
      </button>

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <h1 className="font-display text-4xl text-teal-700">My Sanctuary</h1>

        {!loading && !error && (
          <div className="flex w-full max-w-sm items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-marigold-100">
              <div
                className="h-full rounded-full bg-marigold-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="whitespace-nowrap font-body text-xs text-gray-500">
              {tamedCount} / {phrases.length} tamed
            </span>
          </div>
        )}

        {loading && <p className="text-gray-500">Loading your creatures...</p>}
        {error && <p className="max-w-md text-center text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="flex w-full flex-wrap justify-center gap-2">
            {units.map((u) => (
              <a
                key={u.slug}
                href={`#sanctuary-${u.slug}`}
                className="rounded-full bg-marigold-100 px-3 py-1.5 font-body text-xs font-semibold text-marigold-700 hover:bg-marigold-300"
              >
                {UNIT_TITLES[u.slug] ?? u.title}
              </a>
            ))}
          </div>
        )}

        {!loading &&
          !error &&
          units.map((u) => {
            const unitPhrases = phrases.filter((p) => p.unitSlug === u.slug);
            const hueBase = UNIT_HUES[u.slug] ?? 178;
            const unitTamed = unitPhrases.filter((p) => p.state === "tamed").length;
            return (
              <div key={u.slug} id={`sanctuary-${u.slug}`} className="w-full scroll-mt-6">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-lg text-gray-800">
                    {UNIT_TITLES[u.slug] ?? u.title}
                  </h2>
                  <span className="font-body text-xs text-gray-400">
                    {unitTamed} / {unitPhrases.length}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {unitPhrases.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => tapCreature(p)}
                      disabled={p.state === "wild"}
                      title={
                        p.state === "tamed"
                          ? p.english
                          : p.state === "following"
                          ? `${p.english} (still following you)`
                          : "Not tamed yet"
                      }
                      className={`flex aspect-square items-center justify-center rounded-2xl shadow-sm transition ${
                        p.state === "wild"
                          ? "cursor-default bg-gray-100"
                          : "bg-white hover:scale-105 active:scale-95"
                      }`}
                    >
                      <Creature
                        slug={p.slug}
                        hueBase={hueBase}
                        wild={p.state === "wild"}
                        size={56}
                        // Following = met but not mastered -- full color,
                        // dimmed, so it reads as "on its way" rather than
                        // fully caught. Tamed = full opacity.
                        className={p.state === "following" ? "opacity-55" : undefined}
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
