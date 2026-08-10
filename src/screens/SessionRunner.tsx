import { useEffect, useMemo, useRef, useState } from "react";
import {
  advanceRun,
  completeRun,
  createRun,
  getActiveRun,
  getClusterPromptDetails,
  getSchedulingInfo,
  type ClusterPromptDetails,
  type SessionRun,
} from "../lib/queries";
import { supabase } from "../lib/supabase";
import { buildEncounterQueue, type Encounter } from "../lib/scheduler";
import type { PhraseWithCreature, Profile } from "../lib/types";
import Learn from "./Learn";
import Recognize from "./Recognize";
import ReverseRecognize from "./ReverseRecognize";
import SayIt from "./SayIt";
import BuildIt from "./BuildIt";
import Cluster from "./Cluster";

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
  cluster: "Which one fits?",
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
  const [clusterDetails, setClusterDetails] = useState<ClusterPromptDetails | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);

  const phraseById = useMemo(() => new Map(phrases.map((p) => [p.id, p])), [phrases]);
  const currentPromptId = queue?.[index]?.type === "cluster" ? queue[index].promptId : undefined;

  // Cluster encounters need one extra fetch (situation text + full cluster
  // membership) that the other encounter types don't -- the queue only
  // carries a promptId, not the resolved details.
  useEffect(() => {
    if (!currentPromptId) {
      setClusterDetails(null);
      return;
    }
    let cancelled = false;
    setClusterLoading(true);
    getClusterPromptDetails(currentPromptId)
      .then((details) => {
        if (!cancelled) setClusterDetails(details);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setClusterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPromptId]);

  // React 18 StrictMode double-invokes this effect in dev specifically to
  // catch exactly this class of bug: two invocations racing past
  // getActiveRun() before either createRun() lands, producing two
  // incomplete rows for the same profile+unit (caught live, 2026-08-10).
  // A ref that just blocks the second invocation isn't the fix -- in
  // StrictMode the FIRST invocation is the one that gets torn down
  // (cancelled=true), so blocking the second one leaves nothing left to
  // ever call setState and the screen hangs on "Loading..." forever
  // (caught live too, immediately after the first fix attempt). The
  // correct pattern: share the *same in-flight promise* across both
  // invocations, so the DB is only hit once, but whichever invocation
  // survives still awaits it and sets state.
  const runPromiseRef = useRef<Promise<SessionRun> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureRun(): Promise<SessionRun> {
      if (!runPromiseRef.current) {
        runPromiseRef.current = (async () => {
          const existing = await getActiveRun(profile.id, unitId);
          if (existing) return existing;
          const infos = await getSchedulingInfo(profile.id, phrases);
          const newQueue = buildEncounterQueue(infos);
          return createRun(profile.id, unitId, newQueue);
        })();
      }
      return runPromiseRef.current;
    }

    async function load() {
      setLoading(true);
      try {
        const run = await ensureRun();
        if (!cancelled) {
          setRunId(run.id);
          setQueue(run.queue);
          setIndex(run.current_index);
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
    // XP itself is already persisted incrementally (see advance()) -- this
    // is just reporting the final tally upward, not writing it again.
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

    // Written after every encounter, not batched to the end -- a kid who
    // exits mid-run (or whose tab reloads) keeps whatever XP they already
    // earned. Batching this to only-on-completion silently lost it (caught
    // live testing resume, 2026-08-10): the run's local tallies reset on
    // remount, but nothing had been saved yet for the encounters done
    // before the exit.
    if (xpDelta > 0) {
      const { error: xpErr } = await supabase
        .from("profiles")
        .update({ total_xp: profile.total_xp + newXp })
        .eq("id", profile.id);
      if (xpErr) throw xpErr;
    }

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

  if (encounter.type === "cluster" && (clusterLoading || !clusterDetails)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-body text-gray-500">Loading...</p>
      </div>
    );
  }

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
    case "cluster": {
      // clusterDetails is guaranteed non-null here (checked above), and
      // memberPhraseIds resolves against this unit's own phrases -- Nests
      // clusters are authored within one unit (see docs/nests-draft.md).
      const details = clusterDetails!;
      const distractorPool = details.memberPhraseIds
        .map((id) => phraseById.get(id))
        .filter((p): p is PhraseWithCreature => !!p);
      return (
        <>
          {heartsRow}
          <Cluster
            situationEn={details.situationEn}
            target={phrase}
            distractorPool={distractorPool}
            profile={profile}
            unitSlug={unitSlug}
            onDone={handleGraded}
            onExit={onExit}
            progressOverride={progressOverride}
          />
        </>
      );
    }
  }
}
