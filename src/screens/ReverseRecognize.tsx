import { useMemo, useState } from "react";
import { audioUrl, recomputeMasteryState, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
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

// Opposite direction of Recognize: hear the Tamil, pick the matching English
// caption. This is the "second modality" that lets phrases with no Build-it
// breakdown still reach the mastery gate (recomputeMasteryState needs >=2
// distinct graded tiers, not just repeat Recognize answers). Single
// question per mount, same as Recognize -- SessionRunner advances between
// encounters. Options are plain text, not <Creature> -- no shape to leak,
// so no `mystery` treatment needed here.
export default function ReverseRecognize({
  target,
  distractorPool,
  profile,
  onDone,
  onExit,
  progressOverride,
}: {
  target: PhraseWithCreature;
  distractorPool: PhraseWithCreature[];
  profile: Profile;
  unitSlug: string; // kept for signature parity with Recognize.tsx (unused here -- no Creature to color)
  onDone: (correct: boolean) => void;
  onExit: () => void;
  progressOverride?: { label: string; current: number; total: number };
}) {
  const [previewed, setPreviewed] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [resultCopy, setResultCopy] = useState("");
  const [played, setPlayed] = useState(false);

  const options = useMemo(() => {
    const distractors = shuffle(distractorPool.filter((p) => p.id !== target.id)).slice(0, 2);
    return shuffle([target, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  function play() {
    if (!target.audio_path) return;
    playAudio(audioUrl(target.audio_path));
    setPlayed(true);
  }

  function select(p: PhraseWithCreature) {
    if (picked) return;
    setPreviewed(p.id);
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
      tier: "reverse-recognize",
      correct,
    });
    await recomputeMasteryState({ profile_id: profile.id, phrase_id: target.id });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <button
        onClick={onExit}
        className="absolute left-4 top-4 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Exit
      </button>

      <QuestProgress
        label={progressOverride?.label ?? "What did they say?"}
        current={progressOverride?.current ?? 1}
        total={progressOverride?.total ?? 1}
      />

      <button
        onClick={play}
        className="flex h-28 w-28 items-center justify-center rounded-full bg-teal-100 text-5xl shadow-lg transition hover:scale-105 active:scale-95"
        aria-label={played ? "Play sound again" : "Play sound"}
      >
        🔊
      </button>
      <p className="font-body text-sm text-gray-500">
        {played ? "Tap to hear again" : "Tap to listen"}
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {options.map((opt) => {
          const isPreviewed = previewed === opt.id;
          const isPicked = picked === opt.id;
          const isCorrectAnswer = opt.id === target.id;
          const showResult = picked !== null;
          let ring = "border-gray-200";
          if (showResult && isCorrectAnswer) ring = "border-teal-500 bg-teal-50 text-teal-700";
          else if (showResult && isPicked && !isCorrectAnswer) ring = "border-red-400 bg-red-50 text-red-600";
          else if (!showResult && isPreviewed) ring = "border-marigold-500 bg-marigold-50";

          return (
            <button
              key={opt.id}
              onClick={() => select(opt)}
              disabled={!played || picked !== null}
              className={`rounded-2xl border-2 bg-white px-6 py-4 font-display text-lg text-gray-800 shadow transition disabled:opacity-40 ${ring}`}
            >
              {opt.english}
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
