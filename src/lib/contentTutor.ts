import { supabase } from "./supabase";

export type WordMeaning = { tamil: string; english: string };
export type WordChallenge = {
  kind: "tamil-from-english" | "english-from-tamil" | "missing-word";
  targetIndex: number;
};

const fallbackChallenge: WordChallenge = { kind: "tamil-from-english", targetIndex: 0 };

/** The model chooses a challenge shape and target. The UI builds every
 * child-facing word and answer from reviewed phrase data. */
export async function chooseWordChallenge(params: {
  phraseEnglish: string;
  tamilRomanized: string;
  words: WordMeaning[];
}): Promise<WordChallenge> {
  if (params.words.length < 2 || import.meta.env.VITE_TUTOR_AI_ENABLED !== "true") {
    return fallbackChallenge;
  }

  try {
    const { data, error } = await supabase.functions.invoke("word-challenge", { body: params });
    if (error) throw error;
    const kind = data?.kind;
    const targetIndex = data?.targetIndex;
    if (
      !["tamil-from-english", "english-from-tamil", "missing-word"].includes(kind) ||
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= params.words.length
    ) {
      return fallbackChallenge;
    }
    return { kind, targetIndex };
  } catch (error) {
    console.warn("Word challenge planner unavailable; using safe fallback", error);
    return fallbackChallenge;
  }
}
