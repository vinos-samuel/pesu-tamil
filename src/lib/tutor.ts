import { supabase } from "./supabase";
import type { Encounter } from "./scheduler";

export type TutorContext = {
  previousCorrect: boolean | null;
  wrongStreak: number;
  candidates: Encounter[];
};

function sameEncounter(a: Encounter, b: Encounter): boolean {
  return a.type === b.type && a.phraseId === b.phraseId && a.promptId === b.promptId;
}

const COACH_LINES = {
  steady: "Your crew is ready. Try this one!",
  stretch: "Nice work! Your creature has a trickier challenge.",
  support: "Let's slow down and listen together.",
} as const;

type CoachTone = keyof typeof COACH_LINES;

/**
 * Lets the server-side tutor select only from scheduler-approved candidates.
 * Any unavailable, malformed, or invented response falls back to the first
 * deterministic candidate, so an AI outage never blocks a child's quest.
 */
export async function chooseNextEncounter(context: TutorContext): Promise<Encounter> {
  const fallback = context.candidates[0];
  if (!fallback) throw new Error("No safe tutor candidates are available");

  if (import.meta.env.VITE_TUTOR_AI_ENABLED !== "true") return fallback;

  try {
    const { data, error } = await supabase.functions.invoke("tutor-next", {
      body: {
        previousCorrect: context.previousCorrect,
        wrongStreak: context.wrongStreak,
        candidates: context.candidates,
      },
    });
    if (error) throw error;

    const selected = data?.encounter as Encounter | undefined;
    const approved = selected && context.candidates.find((candidate) => sameEncounter(candidate, selected));
    if (!approved) return fallback;

    return {
      ...approved,
      coachLine:
        typeof data?.coachTone === "string" && data.coachTone in COACH_LINES
          ? COACH_LINES[data.coachTone as CoachTone]
          : COACH_LINES.steady,
    };
  } catch (error) {
    console.warn("Tutor planner unavailable; using safe scheduler fallback", error);
    return fallback;
  }
}
