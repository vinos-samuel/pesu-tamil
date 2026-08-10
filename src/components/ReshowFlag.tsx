import { useState } from "react";
import { flagForReshow } from "../lib/queries";

/** Kid soft-flag ("I didn't get it") shared across every graded encounter
 * screen (Recognize, ReverseRecognize, BuildIt, Cluster). Low-emphasis by
 * design -- similar visual weight to the corner "Exit" link, never a
 * primary action. Never touches attempts/mastery_state, only pulls the
 * phrase's next_review_at forward -- can't be gamed for reward, disabled
 * after one tap so it can't be spammed either. */
export default function ReshowFlag({
  profileId,
  phraseId,
}: {
  profileId: string;
  phraseId: string;
}) {
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState(false);

  async function flag() {
    if (flagged || busy) return;
    setBusy(true);
    try {
      await flagForReshow(profileId, phraseId);
      setFlagged(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={flag}
      disabled={flagged || busy}
      className="text-xs text-gray-400 underline hover:text-gray-600 disabled:no-underline disabled:opacity-60"
    >
      {flagged ? "Okay, we'll come back to this one" : "🤔 I didn't get it"}
    </button>
  );
}
