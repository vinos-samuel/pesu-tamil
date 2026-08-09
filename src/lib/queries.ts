import { supabase } from "./supabase";
import type { Creature, Phrase, PhraseWithCreature, Unit } from "./types";

export async function getUnitBySlug(slug: string): Promise<Unit> {
  const { data, error } = await supabase
    .from("units")
    .select("id, number, slug, title")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getPhrasesWithCreatures(
  unitId: string
): Promise<PhraseWithCreature[]> {
  const { data: phrases, error: pErr } = await supabase
    .from("phrases")
    .select(
      "id, unit_id, seq, slug, english, tamil_romanized, audio_path, needs_audio, notes, word_gloss"
    )
    .eq("unit_id", unitId)
    .order("seq", { ascending: true });
  if (pErr) throw pErr;

  const { data: creatures, error: cErr } = await supabase
    .from("creatures")
    .select("id, phrase_id, species, color, level")
    .in("phrase_id", (phrases as Phrase[]).map((p) => p.id));
  if (cErr) throw cErr;

  const creatureByPhraseId = new Map<string, Creature>(
    (creatures as Creature[]).map((c) => [c.phrase_id, c])
  );

  return (phrases as Phrase[]).map((p) => ({
    ...p,
    creature: creatureByPhraseId.get(p.id) ?? null,
  }));
}

export function audioUrl(audio_path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/phrase-audio/${audio_path}`;
}

export async function logAttempt(params: {
  profile_id: string;
  phrase_id: string;
  tier: "learn" | "recognize" | "say-it" | "build-it";
  correct?: boolean | null;
}) {
  const { error } = await supabase.from("attempts").insert({
    profile_id: params.profile_id,
    phrase_id: params.phrase_id,
    tier: params.tier,
    correct: params.correct ?? null,
  });
  if (error) throw error;
}

/** Minimal progress upsert -- just tallies right/wrong so far. Full SRS
 * scheduling (next_review_at) is a later step, not needed to prove the loop. */
export async function bumpProgress(params: {
  profile_id: string;
  phrase_id: string;
  correct: boolean;
}) {
  const { data: existing, error: selErr } = await supabase
    .from("progress")
    .select("id, correct_count, incorrect_count")
    .eq("profile_id", params.profile_id)
    .eq("phrase_id", params.phrase_id)
    .maybeSingle();
  if (selErr) throw selErr;

  if (!existing) {
    const { error } = await supabase.from("progress").insert({
      profile_id: params.profile_id,
      phrase_id: params.phrase_id,
      correct_count: params.correct ? 1 : 0,
      incorrect_count: params.correct ? 0 : 1,
      mastery_state: "learning",
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("progress")
    .update({
      correct_count: existing.correct_count + (params.correct ? 1 : 0),
      incorrect_count: existing.incorrect_count + (params.correct ? 0 : 1),
      mastery_state: params.correct ? "review" : "learning",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (error) throw error;
}
