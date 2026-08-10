import { supabase } from "./supabase";
import type { Creature, Phrase, PhraseWithCreature, Tip, Unit } from "./types";

export async function getUnitBySlug(slug: string): Promise<Unit> {
  const { data, error } = await supabase
    .from("units")
    .select("id, number, slug, title")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

export type UnitWithReadiness = Unit & { phraseCount: number; ready: boolean };

/** A unit is "ready" when every phrase that needs audio actually has it.
 * Units 2 & 4 currently aren't (recordings pending) -- this flips to true
 * automatically once audio_path gets filled in, no code change needed. */
export async function getUnitsWithReadiness(): Promise<UnitWithReadiness[]> {
  const { data: units, error: uErr } = await supabase
    .from("units")
    .select("id, number, slug, title")
    .order("number", { ascending: true });
  if (uErr) throw uErr;

  const { data: phrases, error: pErr } = await supabase
    .from("phrases")
    .select("unit_id, needs_audio, audio_path");
  if (pErr) throw pErr;

  return (units as Unit[]).map((u) => {
    const unitPhrases = (phrases as { unit_id: string; needs_audio: boolean; audio_path: string | null }[]).filter(
      (p) => p.unit_id === u.id
    );
    const missing = unitPhrases.filter((p) => p.needs_audio && !p.audio_path);
    return { ...u, phraseCount: unitPhrases.length, ready: missing.length === 0 };
  });
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

  const { data: tips, error: tErr } = await supabase
    .from("tips")
    .select("id, unit_id, phrase_id, title, body")
    .eq("unit_id", unitId);
  if (tErr) throw tErr;

  const creatureByPhraseId = new Map<string, Creature>(
    (creatures as Creature[]).map((c) => [c.phrase_id, c])
  );
  const tipByPhraseId = new Map<string, Tip>(
    (tips as Tip[]).filter((t) => t.phrase_id).map((t) => [t.phrase_id as string, t])
  );

  return (phrases as Phrase[]).map((p) => ({
    ...p,
    creature: creatureByPhraseId.get(p.id) ?? null,
    tip: tipByPhraseId.get(p.id) ?? null,
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
  self_grade?: boolean | null;
  recording_path?: string | null;
}) {
  const { error } = await supabase.from("attempts").insert({
    profile_id: params.profile_id,
    phrase_id: params.phrase_id,
    tier: params.tier,
    correct: params.correct ?? null,
    self_grade: params.self_grade ?? null,
    recording_path: params.recording_path ?? null,
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

export type RecordingRow = {
  id: string;
  created_at: string;
  self_grade: boolean | null;
  parent_grade: boolean | null;
  recording_path: string;
  phrases: {
    english: string;
    tamil_romanized: string;
    audio_path: string | null;
    slug: string;
    units: { slug: string } | null;
  } | null;
  profiles: { name: string } | null;
};

/** Say-it recordings, newest first, for the parent dashboard. */
export async function getRecentRecordings(limit = 50): Promise<RecordingRow[]> {
  const { data, error } = await supabase
    .from("attempts")
    .select(
      "id, created_at, self_grade, parent_grade, recording_path, phrases(english, tamil_romanized, audio_path, slug, units(slug)), profiles(name)"
    )
    .eq("tier", "say-it")
    .not("recording_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as RecordingRow[];
}

export async function setParentGrade(attemptId: string, grade: boolean | null) {
  const { error } = await supabase
    .from("attempts")
    .update({ parent_grade: grade })
    .eq("id", attemptId);
  if (error) throw error;
}

export type DashboardStats = {
  streak: number;
  totalXp: number;
  sessionsThisWeek: number;
  creaturesTamed: number;
};

/** Stats for the parent dashboard's stat row. Single-family v1 -- reads the
 * first-created profile (Savyr). Revisit if a sibling profile joins and the
 * dashboard needs a per-kid picker. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, streak_count, total_xp")
    .order("created_at", { ascending: true })
    .limit(1);
  if (pErr) throw pErr;
  const profile = profiles?.[0];
  if (!profile) return { streak: 0, totalXp: 0, sessionsThisWeek: 0, creaturesTamed: 0 };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: attempts, error: aErr } = await supabase
    .from("attempts")
    .select("created_at")
    .eq("profile_id", profile.id)
    .gte("created_at", sevenDaysAgo);
  if (aErr) throw aErr;
  const days = new Set(
    (attempts as { created_at: string }[]).map((a) => new Date(a.created_at).toDateString())
  );

  const { count, error: cErr } = await supabase
    .from("progress")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);
  if (cErr) throw cErr;

  return {
    streak: profile.streak_count,
    totalXp: profile.total_xp,
    sessionsThisWeek: days.size,
    creaturesTamed: count ?? 0,
  };
}

export type SanctuaryPhrase = {
  id: string;
  slug: string;
  english: string;
  audio_path: string | null;
  unitSlug: string;
  tamed: boolean;
};

/** Every phrase across every unit, flagged tamed/wild for the Sanctuary
 * screen. "Tamed" = has a `progress` row for this profile -- i.e. the kid
 * has genuinely used it (Recognize/Build-it), not just heard it once in
 * Learn. */
export async function getSanctuaryData(
  profileId: string
): Promise<{ units: { slug: string; title: string }[]; phrases: SanctuaryPhrase[] }> {
  const { data: units, error: uErr } = await supabase
    .from("units")
    .select("id, slug, title, number")
    .order("number", { ascending: true });
  if (uErr) throw uErr;

  const { data: phrases, error: pErr } = await supabase
    .from("phrases")
    .select("id, unit_id, slug, english, audio_path, seq")
    .order("seq", { ascending: true });
  if (pErr) throw pErr;

  const { data: progress, error: prErr } = await supabase
    .from("progress")
    .select("phrase_id")
    .eq("profile_id", profileId);
  if (prErr) throw prErr;

  const tamedSet = new Set((progress as { phrase_id: string }[]).map((r) => r.phrase_id));
  const unitById = new Map((units as { id: string; slug: string; title: string }[]).map((u) => [u.id, u]));

  const mapped = (
    phrases as { id: string; unit_id: string; slug: string; english: string; audio_path: string | null }[]
  ).map((p) => {
    const u = unitById.get(p.unit_id)!;
    return {
      id: p.id,
      slug: p.slug,
      english: p.english,
      audio_path: p.audio_path,
      unitSlug: u.slug,
      tamed: tamedSet.has(p.id),
    };
  });

  return {
    units: (units as { slug: string; title: string }[]).map((u) => ({ slug: u.slug, title: u.title })),
    phrases: mapped,
  };
}
