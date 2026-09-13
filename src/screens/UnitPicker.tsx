import { useEffect, useState } from "react";
import Creature, { UNIT_HUES } from "../components/Creature";
import {
  getSanctuaryData,
  getUnitsWithReadiness,
  type SanctuaryPhrase,
  type UnitWithReadiness,
} from "../lib/queries";
import type { Profile } from "../lib/types";

const UNIT_EMOJI: Record<string, string> = {
  greetings: "🦚",
  family: "🌸",
  mealtime: "🔥",
  numbers: "🐐",
  actions: "🦦",
};

const UNIT_BLURB: Record<string, string> = {
  greetings: "Meet your first crew and make them answer back.",
  family: "Help the flower folk find everyone at home.",
  mealtime: "Feed the fire creatures with useful words.",
  numbers: "Count the hill herd before they wander off.",
  actions: "Teach the river crew what to do next.",
};

export default function UnitPicker({
  profile,
  onPick,
  onExit,
  onSanctuary,
}: {
  profile: Profile;
  onPick: (unit: UnitWithReadiness) => void;
  onExit: () => void;
  onSanctuary: () => void;
}) {
  const [units, setUnits] = useState<UnitWithReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatures, setCreatures] = useState<SanctuaryPhrase[]>([]);

  useEffect(() => {
    Promise.all([getUnitsWithReadiness(), getSanctuaryData(profile.id)])
      .then(([nextUnits, sanctuary]) => {
        setUnits(nextUnits);
        setCreatures(sanctuary.phrases);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [profile.id]);

  const following = creatures.filter((p) => p.state === "following").length;
  const tamed = creatures.filter((p) => p.state === "tamed").length;
  const rank = Math.max(1, Math.floor(profile.total_xp / 100) + 1);

  return (
    <div className="game-world min-h-screen overflow-hidden px-5 pb-12 pt-6">
      <button
        onClick={onExit}
        className="game-icon-button absolute left-4 top-5 z-20"
      >
        ←
      </button>
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="ml-12 flex items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/75 px-4 py-3 shadow-lg backdrop-blur sm:ml-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Kural Sanctuary</p>
            <h1 className="font-display text-2xl text-slate-800">Vanakkam, {profile.name}!</h1>
          </div>
          <div className="flex gap-2 text-sm font-bold">
            <span className="game-stat">⚡ {profile.total_xp}</span>
            <span className="game-stat">🔥 {profile.streak_count}</span>
            <span className="game-stat hidden sm:inline-flex">🏅 Rank {rank}</span>
          </div>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border-2 border-white/70 bg-gradient-to-br from-teal-700 to-cyan-600 px-6 py-7 text-white shadow-xl">
          <div className="relative z-10 max-w-lg">
            <p className="text-sm font-semibold text-cyan-100">TODAY'S MISSION</p>
            <h2 className="mt-1 font-display text-3xl leading-tight">Bring a Tamil creature home</h2>
            <p className="mt-2 max-w-md text-sm text-cyan-50/90">Listen, speak, and solve word puzzles. Every answer changes your sanctuary.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => units.find((u) => u.ready) && onPick(units.find((u) => u.ready)!)} className="game-primary bg-amber-400 text-amber-950 hover:bg-amber-300">Start mission →</button>
              <button onClick={onSanctuary} className="game-primary border border-white/40 bg-white/15 text-white hover:bg-white/25">Visit sanctuary</button>
            </div>
          </div>
          <div className="creature-float absolute -bottom-5 right-3 opacity-95 sm:right-12">
            <Creature slug={`${profile.name}-guide`} hueBase={48} size={150} />
          </div>
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        </section>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <button onClick={onSanctuary} className="game-panel text-left"><span className="text-2xl">🏡</span><strong>{tamed}</strong><small>tamed</small></button>
          <div className="game-panel"><span className="text-2xl">👣</span><strong>{following}</strong><small>following</small></div>
          <div className="game-panel"><span className="text-2xl">✨</span><strong>{Math.max(0, 100 - (profile.total_xp % 100))}</strong><small>to next rank</small></div>
        </div>

        <div className="mt-8 flex items-end justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">Explore the map</p><h2 className="font-display text-2xl text-slate-800">Choose a habitat</h2></div>
        </div>

      {loading && <p className="mt-10 text-center text-gray-500">Preparing your world...</p>}
      {error && <p className="max-w-md text-center text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u, unitIndex) => {
            const unitCreatures = creatures.filter((p) => p.unitSlug === u.slug);
            const unitTamed = unitCreatures.filter((p) => p.state === "tamed").length;
            const guide = unitCreatures[0];
            return (
            <button
              key={u.id}
              onClick={() => u.ready && onPick(u)}
              disabled={!u.ready}
              className={`habitat-card group text-left ${
                u.ready
                  ? "hover:-translate-y-1"
                  : "cursor-not-allowed grayscale opacity-55"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl">{UNIT_EMOJI[u.slug] ?? "🥚"}</span>
                {guide ? <Creature slug={guide.slug} hueBase={UNIT_HUES[u.slug] ?? 178} wild={guide.state === "wild"} size={66} className="transition group-hover:scale-110" /> : <span className="text-4xl">🥚</span>}
              </div>
              <span className="mt-3 block font-display text-xl text-slate-800">{u.title}</span>
              <span className="mt-1 block min-h-10 text-sm leading-snug text-slate-600">{UNIT_BLURB[u.slug] ?? "A new Tamil adventure is waiting."}</span>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-teal-500" style={{ width: `${unitCreatures.length ? (unitTamed / unitCreatures.length) * 100 : 0}%` }} /></div>
              <span className="mt-2 flex justify-between text-xs font-semibold text-slate-500"><span>{u.ready ? `${u.phraseCount} creatures` : "Locked"}</span><span>{unitTamed}/{unitCreatures.length} home</span></span>
              {u.ready && unitIndex === 0 && <span className="mt-3 inline-block rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-900">Recommended</span>}
            </button>
          )})}
        </div>
      )}
      </div>
    </div>
  );
}
