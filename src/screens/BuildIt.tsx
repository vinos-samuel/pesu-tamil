import { useMemo, useState } from "react";
import { audioUrl, bumpProgress, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import Creature, { UNIT_HUES } from "../components/Creature";
import QuestProgress from "../components/QuestProgress";
import { correctCopy, buildItTryAgainCopy } from "../lib/copy";
import {
  parseWordGloss,
  type PhraseWithCreature,
  type Profile,
} from "../lib/types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function BuildIt({
  phrases,
  profile,
  unitSlug,
  onDone,
  onExit,
}: {
  phrases: PhraseWithCreature[]; // already filtered to Build-it-eligible
  profile: Profile;
  unitSlug: string;
  onDone: (correctCount: number) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]); // indices into `words`, in tap order
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [resultCopy, setResultCopy] = useState("");

  const phrase = phrases[index];
  const hueBase = UNIT_HUES[unitSlug] ?? 178;
  const words = useMemo(() => parseWordGloss(phrase.word_gloss), [phrase.id]);
  const order = useMemo(
    () => shuffle(words.map((_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phrase.id]
  );

  const isCorrect = checked && picked.every((wordIdx, slot) => wordIdx === slot);

  function tapWord(wordIdx: number) {
    if (checked || picked.includes(wordIdx)) return;
    const next = [...picked, wordIdx];
    setPicked(next);
    if (next.length === words.length) {
      finish(next);
    }
  }

  function undoSlot(slot: number) {
    if (checked) return;
    setPicked(picked.slice(0, slot));
  }

  async function finish(finalPicked: number[]) {
    setChecked(true);
    const correct = finalPicked.every((wordIdx, slot) => wordIdx === slot);
    const species = phrase.creature?.species;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setResultCopy(correctCopy(species));
      if (phrase.audio_path) playAudio(audioUrl(phrase.audio_path));
    } else {
      setResultCopy(buildItTryAgainCopy(species));
    }
    await logAttempt({
      profile_id: profile.id,
      phrase_id: phrase.id,
      tier: "build-it",
      correct,
    });
    await bumpProgress({ profile_id: profile.id, phrase_id: phrase.id, correct });
  }

  function next() {
    setPicked([]);
    setChecked(false);
    setResultCopy("");
    if (index + 1 < phrases.length) {
      setIndex(index + 1);
    } else {
      onDone(correctCount);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <button
        onClick={onExit}
        className="absolute left-4 top-4 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Exit
      </button>

      <QuestProgress label="Put the words in order!" current={index + 1} total={phrases.length} />

      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-marigold-100 shadow">
        <Creature slug={phrase.slug} hueBase={hueBase} size={64} />
      </div>

      <p className="font-display text-2xl text-teal-700">
        Put the words in order for: "{phrase.english}"
      </p>

      {/* Answer slots */}
      <div className="flex gap-3">
        {words.map((_, slot) => {
          const wordIdx = picked[slot];
          const filled = wordIdx !== undefined;
          const slotCorrect = checked && wordIdx === slot;
          const slotWrong = checked && filled && wordIdx !== slot;
          return (
            <button
              key={slot}
              onClick={() => undoSlot(slot)}
              disabled={!filled || checked}
              className={`flex h-14 min-w-[5rem] items-center justify-center rounded-xl border-2 px-3 font-display text-lg ${
                slotCorrect
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : slotWrong
                  ? "border-red-400 bg-red-50 text-red-600"
                  : filled
                  ? "border-marigold-300 bg-marigold-50 text-gray-800"
                  : "border-dashed border-gray-300 bg-white text-gray-300"
              }`}
            >
              {filled ? words[wordIdx].english : "?"}
            </button>
          );
        })}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap justify-center gap-3">
        {order.map((wordIdx) => {
          const used = picked.includes(wordIdx);
          return (
            <button
              key={wordIdx}
              onClick={() => tapWord(wordIdx)}
              disabled={used || checked}
              className={`rounded-full px-5 py-2.5 font-display text-lg shadow transition ${
                used
                  ? "invisible"
                  : "bg-white text-gray-700 hover:bg-gray-100 hover:scale-105"
              }`}
            >
              {words[wordIdx].english}
            </button>
          );
        })}
      </div>

      {checked && (
        <div className="flex flex-col items-center gap-3">
          {isCorrect ? (
            <p className="font-body text-gray-600">{resultCopy} (hear it above)</p>
          ) : (
            <>
              <p className="font-body text-gray-600">{resultCopy} Here's the right order:</p>
              <div className="flex gap-3">
                {words.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-xl border-2 border-teal-500 bg-teal-50 px-3 py-2 font-display text-teal-700"
                  >
                    {w.english}
                  </span>
                ))}
              </div>
            </>
          )}
          <button
            onClick={next}
            className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
          >
            {index + 1 < phrases.length ? "Next →" : "Finish →"}
          </button>
        </div>
      )}
    </div>
  );
}
