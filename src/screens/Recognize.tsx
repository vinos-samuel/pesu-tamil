import { useMemo, useState } from "react";
import { audioUrl, recomputeMasteryState, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import Creature, { UNIT_HUES } from "../components/Creature";
import QuestProgress from "../components/QuestProgress";
import ReshowFlag from "../components/ReshowFlag";
import { correctCopy, recognizeIncorrectCopy } from "../lib/copy";
import type { PhraseWithCreature, Profile } from "../lib/types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Single question per mount: SessionRunner advances between encounters, so
// this component owns just one target + its distractor pool, not a whole
// quiz sequence (that used to live here as `order`/`index` when a Unit ran
// Recognize as one big block -- see git history if you need the old shape).
export default function Recognize({
  target,
  distractorPool,
  profile,
  unitSlug,
  onDone,
  onExit,
  progressOverride,
}: {
  target: PhraseWithCreature;
  distractorPool: PhraseWithCreature[];
  profile: Profile;
  unitSlug: string;
  onDone: (correct: boolean) => void;
  onExit: () => void;
  progressOverride?: { label: string; current: number; total: number };
}) {
  const [previewed, setPreviewed] = useState<string | null>(null); // listened to, not yet committed
  const [picked, setPicked] = useState<string | null>(null); // committed answer
  const [resultCopy, setResultCopy] = useState("");
  const hueBase = UNIT_HUES[unitSlug] ?? 178;

  const options = useMemo(() => {
    const distractors = shuffle(distractorPool.filter((p) => p.id !== target.id)).slice(0, 2);
    return shuffle([target, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  function preview(p: PhraseWithCreature) {
    if (picked) return; // already committed
    setPreviewed(p.id);
    if (p.audio_path) playAudio(audioUrl(p.audio_path));
  }

  async function confirm() {
    if (!previewed || picked) return;
    setPicked(previewed);
    const correct = previewed === target.id;
    const species = target.creature?.species;
    if (correct) setResultCopy(correctCopy(species));
    else setResultCopy(recognizeIncorrectCopy(species, target.english));

    await logAttempt({
      profile_id: profile.id,
      phrase_id: target.id,
      tier: "recognize",
      correct,
    });
    await recomputeMasteryState({ profile_id: profile.id, phrase_id: target.id });
  }

  return (
    <div className="game-world min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <button
        onClick={onExit}
        className="absolute left-4 top-4 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Exit
      </button>

      <QuestProgress
        label={progressOverride?.label ?? "Guess who's calling!"}
        current={progressOverride?.current ?? 1}
        total={progressOverride?.total ?? 1}
      />

      <p className="font-display text-2xl text-teal-700">
        Which one means "{target.english}"?
      </p>
      <p className="text-xs text-gray-400">Tap to listen, tap any as many times as you want</p>

      <div className="flex flex-wrap justify-center gap-5">
        {options.map((opt) => {
          const isPreviewed = previewed === opt.id;
          const isPicked = picked === opt.id;
          const isCorrectAnswer = opt.id === target.id;
          const showResult = picked !== null;
          let ring = "";
          if (showResult && isCorrectAnswer) ring = "ring-4 ring-teal-500";
          else if (showResult && isPicked && !isCorrectAnswer) ring = "ring-4 ring-red-400";
          else if (!showResult && isPreviewed) ring = "ring-4 ring-marigold-500";

          // Only the correct answer ever reveals its real creature, and
          // only after commit -- otherwise a kid could shape-match the
          // same creature Learn just showed without listening to any
          // Tamil at all.
          const revealReal = showResult && isCorrectAnswer;

          return (
            <button
              key={opt.id}
              onClick={() => preview(opt)}
              className={`flex h-28 w-28 items-center justify-center rounded-3xl bg-marigold-100 shadow transition hover:scale-105 active:scale-95 ${ring}`}
            >
              {revealReal ? (
                <Creature slug={opt.slug} hueBase={hueBase} size={80} />
              ) : (
                <Creature mystery size={80} />
              )}
            </button>
          );
        })}
      </div>

      {!picked && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={confirm}
            disabled={!previewed}
            className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow disabled:opacity-30 hover:bg-marigold-700"
          >
            Choose this one ✓
          </button>
          <ReshowFlag profileId={profile.id} phraseId={target.id} />
        </div>
      )}

      {picked && (
        <div className="flex flex-col items-center gap-3">
          <p className="font-body text-gray-600">{resultCopy}</p>
          <button
            onClick={() => onDone(picked === target.id)}
            className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
