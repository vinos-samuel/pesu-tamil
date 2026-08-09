import { useState } from "react";
import { audioUrl, logAttempt } from "../lib/queries";
import { creatureEmoji, type PhraseWithCreature, type Profile } from "../lib/types";

export default function Learn({
  phrases,
  profile,
  onDone,
}: {
  phrases: PhraseWithCreature[];
  profile: Profile;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const phrase = phrases[index];

  function play() {
    if (!phrase.audio_path) return;
    new Audio(audioUrl(phrase.audio_path)).play();
    if (!revealed) setRevealed(true);
  }

  async function next() {
    await logAttempt({
      profile_id: profile.id,
      phrase_id: phrase.id,
      tier: "learn",
    });
    if (index + 1 < phrases.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      onDone();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-body text-gray-500">
        Learn {index + 1} / {phrases.length}
      </p>

      <button
        onClick={play}
        className="flex h-40 w-40 items-center justify-center rounded-full bg-marigold-100 text-7xl shadow-lg transition hover:scale-105 active:scale-95"
        aria-label="Play sound"
      >
        {creatureEmoji(phrase.creature?.species)}
      </button>

      <button
        onClick={play}
        className="rounded-full bg-teal-500 px-6 py-2 font-display text-white shadow hover:bg-teal-700"
      >
        🔊 Play again
      </button>

      <div className="h-8">
        {revealed && (
          <p className="font-display text-2xl text-teal-700">
            {phrase.english}
          </p>
        )}
      </div>

      <button
        onClick={next}
        disabled={!revealed}
        className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow disabled:opacity-30 hover:bg-marigold-700"
      >
        {index + 1 < phrases.length ? "Next →" : "Start the quiz →"}
      </button>
    </div>
  );
}
