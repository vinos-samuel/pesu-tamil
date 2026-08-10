import { useEffect, useMemo, useState } from "react";
import {
  advanceRun,
  completeRun,
  createRun,
  getActiveRun,
  getSchedulingInfo,
} from "../lib/queries";
import { supabase } from "../lib/supabase";
import { buildEncounterQueue, type Encounter } from "../lib/scheduler";
import type { PhraseWithCreature, Profile } from "../lib/types";
import Learn from "./Learn";
import Recognize from "./Recognize";
import ReverseRecognize from "./ReverseRecognize";
import SayIt from "./SayIt";
import BuildIt from "./BuildIt";

export type RunSummary = {
  gradedCorrect: number;
  gradedTotal: number;
  sayItCount: number;
  xpGained: number;
};

const ENCOUNTER_LABELS: Record<Encounter["type"], string> = {
  learn: "Getting to know your creatures",
  recognize: "Guess who's calling!",
  "reverse-recognize": "What did they say?",
  "build-it": "Put the words in order!",
  "say-it": "Your turn to say it!",
};

// Owns one "encounter run" -- 6-8 short, mixed activities instead of the
// old block-by-tier flow (every phrase through Learn, then every phrase
// through Recognize, then Say-it...). Replaces App.tsx's old
// learn/recognize/sayit/buildit states.
export default function SessionRunner({
  phrases,
  profile,
  unitId,
  unitSlug,
  onDone,
  onExit,
}: {
  phrases: PhraseWithCreature[];
  profile: Profile;
  unitId: string;
  unitSlug: string;
  onDone: (summary: RunSummary, updatedProfile: Profile) => void;
  onExit: () => void;
}) {
  const [runId, setRunId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Encounter[] | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gradedCorrect, setGradedCorrect] = useState(0);
  const [gradedTotal, setGradedTotal] = useState(0);
  const [sayItCount, setSayItCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0); // run-level "hearts", not per-encounter

  const phraseById = useMemo(() => new Map(phrases.map((p) => [p.id, p])), [phrases]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const existing = await getActiveRun(profile.id, unitId);
        if (existing) {
          if (!cancelled) {
            setRunId(existing.id);
            setQueue(existing.queue);
            setIndex(existing.current_index);
          }
          return;
        }
        const infos = await getSchedulingInfo(profile.id, phrases);
        const newQueue = buildEncounterQueue(infos);
        const created = await createRun(profile.id, unitId, newQueue);
        if (!cancelled) {
          setRunId(created.id);
          setQueue(created.queue);
          setIndex(0);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, unitId]);

  async function finalize(finalXp: number, finalCorrect: number, finalTotal: number, finalSayIt: number) {
    if (runId) await completeRun(runId);
    if (finalXp > 0) {
      const { error: xpErr } = await supabase
        .from("profiles")
        .update({ total_xp: profile.total_xp + finalXp })
        .eq("id", profile.id);
      if (xpErr) throw xpErr;
    }
    onDone(
      { gradedCorrect: finalCorrect, gradedTotal: finalTotal, sayItCount: finalSayIt, xpGained: finalXp },
      { ...profile, total_xp: profile.total_xp + finalXp }
    );
  }

  async function advance(xpDelta: number, correctDelta: number, totalDelta: number, sayItDelta: number) {
    const newXp = xpGained + xpDelta;
    const newCorrect = gradedCorrect + correctDelta;
    const newTotal = gradedTotal + totalDelta;
    const newSayIt = sayItCount + sayItDelta;
    setXpGained(newXp);
    setGradedCorrect(newCorrect);
    setGradedTotal(newTotal);
    setSayItCount(newSayIt);

    const nextIndex = index + 1;
    if (!queue || nextIndex >= queue.length) {
      await finalize(newXp, newCorrect, newTotal, newSayIt);
    } else {
      setIndex(nextIndex);
      if (runId) await advanceRun(runId, nextIndex);
    }
  }

  function handleGraded(correct: boolean) {
    setWrongStreak(correct ? 0 : (w) => w + 1);
    void advance(correct ? 10 : 0, correct ? 1 : 0, 1, 0);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-body text-gray-500">Loading your quest...</p>
      </div>
    );
  }

  if (error || !queue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-red-600">Couldn't start this quest: {error}</p>
        <button onClick={onExit} className="text-sm text-gray-500 underline hover:text-gray-700">
          ← Back
        </button>
      </div>
    );
  }

  const encounter = queue[index];
  const phrase = phraseById.get(encounter.phraseId);
  if (!phrase) return null; // defensive -- shouldn't happen, don't crash the run

  const progressOverride = {
    label: ENCOUNTER_LABELS[encounter.type],
    current: index + 1,
    total: queue.length,
  };

  const heartsRow = wrongStreak > 0 && (
    <p className="absolute right-4 top-4 text-sm">
      {"🤍".repeat(Math.min(wrongStreak, 3))}
      {wrongStreak >= 3 && (
        <span className="ml-1 text-xs text-gray-400">still learning, keep going 💪</span>
      )}
    </p>
  );

  switch (encounter.type) {
    case "learn":
      return (
        <>
          {heartsRow}
          <Learn
            phrases={[phrase]}
            profile={profile}
            unitSlug={unitSlug}
            onDone={() => void advance(0, 0, 0, 0)}
            onExit={onExit}
            progressOverride={progressOverride}
          />
        </>
      );
    case "recognize":
      return (
        <>
          {heartsRow}
          <Recognize
            target={phrase}
            distractorPool={phrases}
            profile={profile}
            unitSlug={unitSlug}
            onDone={handleGraded}
            onExit={onExit}
            progressOverride={progressOverride}
          />
        </>
      );
    case "reverse-recognize":
      return (
        <>
          {heartsRow}
          <ReverseRecognize
            target={phrase}
            distractorPool={phrases}
            profile={profile}
            unitSlug={unitSlug}
            onDone={handleGraded}
            onExit={onExit}
            progressOverride={progressOverride}
          />
        </>
      );
    case "build-it":
      return (
        <>
          {heartsRow}
          <BuildIt
            phrases={[phrase]}
            profile={profile}
            unitSlug={unitSlug}
            onDone={(correctCount) => handleGraded(correctCount > 0)}
            onExit={onExit}
            progressOverride={progressOverride}
          />
        </>
      );
    case "say-it":
      return (
        <SayIt
          phrases={[phrase]}
          profile={profile}
          unitSlug={unitSlug}
          onDone={() => void advance(5, 0, 0, 1)}
          onExit={onExit}
          progressOverride={progressOverride}
        />
      );
  }
}
