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

// "Which one fits?" -- Nests. Tests whether a kid can tell a phrase apart
// from its closest semantic neighbor (e.g. saapdu vs saapidunga, same word
// different respect register) given a real situation, not just recall.
// Same shape as Recognize.tsx, including the `mystery` treatment on
// options -- this is exactly the audibly-close/visually-distinguishable
// case that fix exists for (cluster members are deliberately similar
// phrases, the last place a shape-leak should be reintroduced).
export default function Cluster({
  situationEn,
  target,
  distractorPool,
  profile,
  unitSlug,
  onDone,
  onExit,
  progressOverride,
}: {
  situationEn: string;
  target: PhraseWithCreature;
  distractorPool: PhraseWithCreature[];
  profile: Profile;
  unitSlug: string;
  onDone: (correct: boolean) => void;
  onExit: () => void;
  progressOverride?: { label: string; current: number; total: number };
}) {
  const [previewed, setPreviewed] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [resultCopy, setResultCopy] = useState("");
  const hueBase = UNIT_HUES[unitSlug] ?? 178;

  const options = useMemo(() => {
    const distractors = shuffle(distractorPool.filter((p) => p.id !== target.id));
    return shuffle([target, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  function preview(p: PhraseWithCreature) {
    if (picked) return;
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
      tier: "cluster",
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
        label={progressOverride?.label ?? "Which one fits?"}
        current={progressOverride?.current ?? 1}
        total={progressOverride?.total ?? 1}
      />

      <p className="max-w-sm font-display text-2xl text-teal-700">{situationEn}</p>
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
