import { useState } from "react";
import { audioUrl, logAttempt } from "../lib/queries";
import { playAudio } from "../lib/playAudio";
import { startRecording, uploadRecording, type Recorder } from "../lib/recording";
import { creatureEmoji, type PhraseWithCreature, type Profile } from "../lib/types";

type Stage = "idle" | "recording" | "recorded" | "graded";

export default function SayIt({
  phrases,
  profile,
  onDone,
  onExit,
}: {
  phrases: PhraseWithCreature[];
  profile: Profile;
  onDone: (attemptedCount: number) => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [recorder, setRecorder] = useState<Recorder | null>(null);
  const [ownBlob, setOwnBlob] = useState<Blob | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [attempted, setAttempted] = useState(0);
  const [busy, setBusy] = useState(false);

  const phrase = phrases[index];

  function playNative() {
    if (phrase.audio_path) playAudio(audioUrl(phrase.audio_path));
  }

  function playOwn() {
    if (ownBlob) playAudio(URL.createObjectURL(ownBlob));
  }

  async function beginRecording() {
    try {
      const r = await startRecording();
      setRecorder(r);
      setStage("recording");
    } catch {
      // Mic denied/unavailable -- fall back to the honor system for the rest
      // of this session rather than showing a broken mic button repeatedly.
      setMicBlocked(true);
    }
  }

  async function stopRecording() {
    if (!recorder) return;
    const blob = await recorder.stop();
    setOwnBlob(blob);
    setStage("recorded");
  }

  function recordAgain() {
    setOwnBlob(null);
    setRecorder(null);
    setStage("idle");
  }

  async function grade(same: boolean, honorSystem = false) {
    setBusy(true);
    let recording_path: string | null = null;
    try {
      if (!honorSystem && ownBlob) {
        recording_path = await uploadRecording({
          profile_id: profile.id,
          phrase_id: phrase.id,
          blob: ownBlob,
        });
      }
      await logAttempt({
        profile_id: profile.id,
        phrase_id: phrase.id,
        tier: "say-it",
        self_grade: same,
        recording_path,
      });
    } finally {
      setBusy(false);
      setAttempted((c) => c + 1);
      setStage("graded");
    }
  }

  function next() {
    setOwnBlob(null);
    setRecorder(null);
    if (index + 1 < phrases.length) {
      setIndex(index + 1);
      setStage("idle");
    } else {
      onDone(attempted + (stage === "graded" ? 0 : 1));
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
        Say-it {index + 1} / {phrases.length}
      </p>

      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-marigold-100 text-6xl shadow">
        {creatureEmoji(phrase.creature?.species)}
      </div>

      <p className="font-display text-2xl text-teal-700">
        Say "{phrase.english}" in Tamil!
      </p>

      {micBlocked ? (
        // Honor-system fallback: no mic access, so no recording -- just
        // listen and self-report. He still hears and says it out loud.
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={playNative}
            className="rounded-full bg-teal-500 px-6 py-2 font-display text-white shadow hover:bg-teal-700"
          >
            🔊 Hear it
          </button>
          {stage !== "graded" ? (
            <button
              onClick={() => grade(true, true)}
              disabled={busy}
              className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow disabled:opacity-40 hover:bg-marigold-700"
            >
              I said it! ✅
            </button>
          ) : (
            <button
              onClick={next}
              className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
            >
              {index + 1 < phrases.length ? "Next →" : "Finish →"}
            </button>
          )}
        </div>
      ) : (
        <>
          {stage === "idle" && (
            <button
              onClick={beginRecording}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-red-400 text-4xl text-white shadow-lg hover:scale-105 active:scale-95"
              aria-label="Start recording"
            >
              🎤
            </button>
          )}

          {stage === "recording" && (
            <button
              onClick={stopRecording}
              className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-red-500 text-4xl text-white shadow-lg"
              aria-label="Stop recording"
            >
              ⏹
            </button>
          )}

          {(stage === "recorded" || stage === "graded") && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-3">
                <button
                  onClick={playOwn}
                  className="rounded-full bg-teal-500 px-5 py-2 font-display text-white shadow hover:bg-teal-700"
                >
                  🔊 Hear you
                </button>
                <button
                  onClick={playNative}
                  className="rounded-full bg-marigold-500 px-5 py-2 font-display text-white shadow hover:bg-marigold-700"
                >
                  🔊 Hear it in Tamil
                </button>
              </div>

              {stage === "recorded" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => grade(true)}
                      disabled={busy}
                      className="rounded-full bg-teal-500 px-6 py-2 font-display text-white shadow disabled:opacity-40 hover:bg-teal-700"
                    >
                      Same! 🎉
                    </button>
                    <button
                      onClick={() => grade(false)}
                      disabled={busy}
                      className="rounded-full bg-white px-6 py-2 font-display text-gray-700 shadow disabled:opacity-40 hover:bg-gray-100"
                    >
                      Not quite
                    </button>
                  </div>
                  <button
                    onClick={recordAgain}
                    disabled={busy}
                    className="text-sm text-gray-500 underline hover:text-gray-700 disabled:opacity-40"
                  >
                    🎤 Record again
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-body text-gray-600">Nice -- I heard you! 👂</p>
                  <button
                    onClick={next}
                    className="rounded-full bg-marigold-500 px-8 py-3 font-display text-white shadow hover:bg-marigold-700"
                  >
                    {index + 1 < phrases.length ? "Next →" : "Finish →"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
