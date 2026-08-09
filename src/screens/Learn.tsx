import { useState } from "react";
import { audioUrl, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import { creatureEmoji, type PhraseWithCreature, type Profile } from "../lib/types";

export default function Learn({
  phrases,
  profile,
  onDone,
  onExit,
}: {
  phrases: PhraseWithCreature[];
  profile: Profile;
  onDone: () => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [playError, setPlayError] = useState(false);
  const phrase = phrases[index];

  function play() {
    if (!phrase.audio_path) return;
    setPlayError(false);
    playAudio(audioUrl(phrase.audio_path), () => setPlayError(true));
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
      setPlayError(false);
    } else {
      onDone();
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

      <p className="font-body text-gray-500">
        Learn {index + 1} / {phrases.length}
      </p>

      <button
        onClick={play}
        className="flex h-40 w-40 items-center justify-center rounded-full bg-marigold-100 text-7xl shadow-lg transition hover:scale-105 active:scale-95"
        aria-label={revealed ? "Play sound again" : "Play sound"}
      >
        {creatureEmoji(phrase.creature?.species)}
      </button>

      <p className="font-body text-sm text-gray-500">
        {revealed ? "🔊 Tap to hear again" : "🔊 Tap to listen"}
      </p>

      {playError && (
        <p className="text-sm text-red-500">
          Couldn't play that -- check your connection and try again.
        </p>
      )}

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
