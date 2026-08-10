import { useState } from "react";
import { audioUrl, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import Creature, { UNIT_HUES } from "../components/Creature";
import QuestProgress from "../components/QuestProgress";
import type { PhraseWithCreature, Profile } from "../lib/types";

export default function Learn({
  phrases,
  profile,
  unitSlug,
  onDone,
  onExit,
  progressOverride,
}: {
  phrases: PhraseWithCreature[];
  profile: Profile;
  unitSlug: string;
  onDone: () => void;
  onExit: () => void;
  /** SessionRunner passes this when mounting a single-phrase encounter, so
   * the bar shows "3 of 7" (position in the run) instead of "1 of 1". */
  progressOverride?: { label: string; current: number; total: number };
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const phrase = phrases[index];
  const hueBase = UNIT_HUES[unitSlug] ?? 178;

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
      setShowTip(false);
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

      <QuestProgress
        label={progressOverride?.label ?? "Getting to know your creatures"}
        current={progressOverride?.current ?? index + 1}
        total={progressOverride?.total ?? phrases.length}
      />

      <button
        onClick={play}
        className="flex h-40 w-40 items-center justify-center rounded-full bg-marigold-100 shadow-lg transition hover:scale-105 active:scale-95"
        aria-label={revealed ? "Play sound again" : "Play sound"}
      >
        <Creature slug={phrase.slug} hueBase={hueBase} size={104} />
      </button>

      <p className="font-body text-sm text-gray-500">
        {revealed ? "🔊 Tap to hear again" : "🔊 Tap to listen"}
      </p>

      {playError && (
        <p className="text-sm text-red-500">
          Couldn't play that -- check your connection and try again.
        </p>
      )}

      <div className="flex min-h-[2rem] flex-col items-center gap-2">
        {revealed && (
          <p className="font-display text-2xl text-teal-700">
            {phrase.english}
          </p>
        )}
        {revealed && phrase.tip && !showTip && (
          <button
            onClick={() => setShowTip(true)}
            className="text-xs text-marigold-700 underline hover:text-marigold-900"
          >
            💡 {phrase.tip.title}
          </button>
        )}
        {revealed && phrase.tip && showTip && (
          <p className="max-w-xs font-body text-xs text-gray-500">
            💡 {phrase.tip.body}
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
