import { useMemo, useState } from "react";
import { audioUrl, bumpProgress, logAttempt } from "../lib/queries";
import { creatureEmoji, type PhraseWithCreature, type Profile } from "../lib/types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Recognize({
  phrases,
  profile,
  onDone,
}: {
  phrases: PhraseWithCreature[];
  profile: Profile;
  onDone: (correctCount: number) => void;
}) {
  const [order] = useState(() => shuffle(phrases));
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const target = order[index];

  const options = useMemo(() => {
    const others = phrases.filter((p) => p.id !== target.id);
    const distractors = shuffle(others).slice(0, Math.min(2, others.length));
    return shuffle([target, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  function playOption(p: PhraseWithCreature) {
    if (p.audio_path) new Audio(audioUrl(p.audio_path)).play();
  }

  async function choose(p: PhraseWithCreature) {
    if (picked) return; // already answered this question
    setPicked(p.id);
    playOption(p);
    const correct = p.id === target.id;
    if (correct) setCorrectCount((c) => c + 1);
    else setHearts((h) => Math.max(0, h - 1));

    await logAttempt({
      profile_id: profile.id,
      phrase_id: target.id,
      tier: "recognize",
      correct,
    });
    await bumpProgress({ profile_id: profile.id, phrase_id: target.id, correct });
  }

  function next() {
    if (index + 1 < order.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      onDone(correctCount);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-body text-gray-500">
        Recognize {index + 1} / {order.length} · {"❤️".repeat(hearts)}
        {"🤍".repeat(3 - hearts)}
      </p>

      <p className="font-display text-2xl text-teal-700">
        Which one means "{target.english}"?
      </p>

      <div className="flex flex-wrap justify-center gap-5">
        {options.map((opt) => {
          const isPicked = picked === opt.id;
          const isCorrectAnswer = opt.id === target.id;
          const showResult = picked !== null;
          let ring = "";
          if (showResult && isCorrectAnswer) ring = "ring-4 ring-teal-500";
          else if (showResult && isPicked && !isCorrectAnswer)
            ring = "ring-4 ring-red-400";

          return (
            <button
              key={opt.id}
              onClick={() => choose(opt)}
              className={`flex h-28 w-28 items-center justify-center rounded-3xl bg-marigold-100 text-5xl shadow transition hover:scale-105 active:scale-95 ${ring}`}
            >
              {creatureEmoji(opt.creature?.species)}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="flex flex-col items-center gap-3">
          <p className="font-body text-gray-600">
            {picked === target.id
              ? "Correct! 🎉"
              : `Not quite -- that was "${target.english}"`}
          </p>
          <button
            onClick={next}
            className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
          >
            {index + 1 < order.length ? "Next →" : "Finish →"}
          </button>
        </div>
      )}
    </div>
  );
}
