import { useState } from "react";
import { audioUrl, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import Creature, { UNIT_HUES } from "../components/Creature";
import QuestProgress from "../components/QuestProgress";
import { parseWordGloss, type PhraseWithCreature, type Profile } from "../lib/types";

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
  const [showWordMap, setShowWordMap] = useState(false);
  const [twistPick, setTwistPick] = useState<string | null>(null);
  const phrase = phrases[index];
  const hueBase = UNIT_HUES[unitSlug] ?? 178;
  const wordMap = parseWordGloss(phrase.word_gloss);
  const twistWord = wordMap[0];

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
      setShowWordMap(false);
      setTwistPick(null);
    } else {
      onDone();
    }
  }

  return (
    <div className="game-world min-h-screen px-5 py-8 text-center">
      <button
        onClick={onExit}
        className="game-icon-button absolute left-4 top-4 z-20"
      >
        ←
      </button>
      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center">
        <QuestProgress label={progressOverride?.label ?? "Getting to know your creatures"} current={progressOverride?.current ?? index + 1} total={progressOverride?.total ?? phrases.length} />

        <section className="mt-5 w-full rounded-[2rem] border-2 border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">A creature is calling</p>
          <button onClick={play} className="creature-float mx-auto mt-4 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-teal-100 shadow-inner transition hover:scale-105 active:scale-95" aria-label={revealed ? "Play sound again" : "Play sound"}>
            <Creature slug={phrase.slug} hueBase={hueBase} size={112} />
          </button>

          <button onClick={play} className="mt-3 rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-200">{revealed ? "🔊 Hear it again" : "▶ Tap to listen"}</button>

      {playError && (
        <p className="text-sm text-red-500">
          Couldn't play that -- check your connection and try again.
        </p>
      )}

      <div className="mt-4 flex min-h-[2rem] flex-col items-center gap-2">
        {revealed && (
          <><p className="font-display text-3xl text-slate-800">{phrase.tamil_romanized}</p><p className="text-sm font-semibold text-teal-700">{phrase.english}</p></>
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
          <div className="mt-2 max-w-sm rounded-2xl bg-amber-50 p-3 text-left"><p className="text-xs font-bold text-amber-700">💡 {phrase.tip.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{phrase.tip.body}</p></div>
        )}

        {revealed && wordMap.length >= 2 && !showWordMap && <button onClick={() => setShowWordMap(true)} className="mt-2 rounded-full bg-violet-100 px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-200">✨ Explore the words</button>}
        {revealed && showWordMap && <div className="mt-3 w-full rounded-2xl bg-violet-50 p-4 text-left"><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Word powers</p><div className="mt-2 flex flex-wrap gap-2">{wordMap.map((word) => <span key={word.tamil} className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm"><strong className="text-violet-800">{word.tamil}</strong> <span className="text-slate-400">=</span> {word.english}</span>)}</div>{twistWord && twistPick === null && <div className="mt-4"><p className="text-sm font-semibold text-slate-700">Quick twist: which word means “{twistWord.english}”?</p><div className="mt-2 flex flex-wrap gap-2">{wordMap.map((word) => <button key={word.tamil} onClick={() => setTwistPick(word.tamil)} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-100">{word.tamil}</button>)}</div></div>}{twistPick && <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${twistPick === twistWord?.tamil ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{twistPick === twistWord?.tamil ? "Yes! You found the word power. ✨" : `Good try. “${twistWord?.english}” is ${twistWord?.tamil}.`}</p>}</div>}
      </div>

      <button
        onClick={next}
        disabled={!revealed}
        className="game-primary mt-6 w-full bg-teal-700 py-4 text-white disabled:opacity-30 hover:bg-teal-800"
      >
        {/* SessionRunner always mounts one phrase at a time now -- this is
         * never actually the last screen of the run, just of this
         * encounter, so it always reads "Continue" rather than guessing
         * what's next. */}
        Continue →
      </button>
        </section>
      </div>
    </div>
  );
}
