import { supabase } from "./supabase";
import { isBuildItEligible } from "./types";
import type { Creature, Phrase, PhraseWithCreature, Tip, Unit } from "./types";
import type { Encounter, GradableTier, PhraseSchedulingInfo } from "./scheduler";

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
  tier: "learn" | "recognize" | "reverse-recognize" | "say-it" | "build-it";
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

const GRADED_TIERS = ["recognize", "reverse-recognize", "build-it", "cluster"] as const;

/** Re-derives mastery_state from the full attempt history each call (cheap
 * at this scale, avoids incremental-tally bugs). Replaces the old
 * bumpProgress(), which only ever wrote 'learning'/'review' and never
 * 'mastered' -- three creature states (wild/following/tamed) need a gate
 * that actually reaches 'mastered'.
 *
 * Gate: >=2 correct graded attempts on >=2 distinct calendar days, in >=2
 * distinct modalities (recognize / reverse-recognize / build-it / cluster),
 * AND the most recent graded attempt was correct. (Cluster ["adjacent
 * word"] attempts don't exist until the Nests phase ships -- until then
 * this clause is naturally harder to hit with only 2 modalities available,
 * not specially cased.)
 *
 * Lapse: a phrase that was 'mastered' and then fails the gate again (i.e.
 * a fresh wrong answer) drops to 'review', not 'learning' -- "restless,"
 * not back to square one. A phrase that was never mastered just tracks
 * last-attempt correctness as before. */
export async function recomputeMasteryState(params: {
  profile_id: string;
  phrase_id: string;
}) {
  const { data, error } = await supabase
    .from("attempts")
    .select("tier, correct, created_at")
    .eq("profile_id", params.profile_id)
    .eq("phrase_id", params.phrase_id)
    .in("tier", GRADED_TIERS)
    .not("correct", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const graded = data as { tier: string; correct: boolean; created_at: string }[];
  if (graded.length === 0) return; // nothing graded yet

  const correctAttempts = graded.filter((a) => a.correct);
  const distinctDays = new Set(correctAttempts.map((a) => new Date(a.created_at).toDateString()));
  const distinctModalities = new Set(correctAttempts.map((a) => a.tier));
  const lastCorrect = graded[graded.length - 1].correct === true;
  const mastered = distinctDays.size >= 2 && distinctModalities.size >= 2 && lastCorrect;

  const { data: existing, error: selErr } = await supabase
    .from("progress")
    .select("id, mastery_state")
    .eq("profile_id", params.profile_id)
    .eq("phrase_id", params.phrase_id)
    .maybeSingle();
  if (selErr) throw selErr;

  const wasMastered = existing?.mastery_state === "mastered";
  const mastery_state = mastered
    ? "mastered"
    : wasMastered
    ? "review" // lapse, not a fresh start
    : lastCorrect
    ? "review"
    : "learning";

  const correct_count = correctAttempts.length;
  const incorrect_count = graded.length - correctAttempts.length;
  const daysAhead = mastery_state === "mastered" ? 3 : mastery_state === "review" ? 1 : 0;
  const next_review_at = new Date(Date.now() + daysAhead * 86400000).toISOString();

  if (!existing) {
    const { error: insErr } = await supabase.from("progress").insert({
      profile_id: params.profile_id,
      phrase_id: params.phrase_id,
      mastery_state,
      correct_count,
      incorrect_count,
      next_review_at,
    });
    if (insErr) throw insErr;
    return;
  }

  const { error: updErr } = await supabase
    .from("progress")
    .update({
      mastery_state,
      correct_count,
      incorrect_count,
      next_review_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);
  if (updErr) throw updErr;
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

/** wild = never engaged (no `progress` row). following = engaged, not yet
 * mastered (mastery_state 'learning'/'review'). tamed = mastery_state
 * 'mastered' -- the real gate, see recomputeMasteryState(). Replaces the
 * old binary tamed/wild that just checked row-existence. */
export type CreatureState = "wild" | "following" | "tamed";

export type SanctuaryPhrase = {
  id: string;
  slug: string;
  english: string;
  audio_path: string | null;
  unitSlug: string;
  state: CreatureState;
};

/** Every phrase across every unit, with its wild/following/tamed state for
 * the Sanctuary screen. */
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
    .select("phrase_id, mastery_state")
    .eq("profile_id", profileId);
  if (prErr) throw prErr;

  const stateByPhraseId = new Map<string, CreatureState>(
    (progress as { phrase_id: string; mastery_state: string }[]).map((r) => [
      r.phrase_id,
      r.mastery_state === "mastered" ? "tamed" : "following",
    ])
  );
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
      state: stateByPhraseId.get(p.id) ?? "wild",
    };
  });

  return {
    units: (units as { slug: string; title: string }[]).map((u) => ({ slug: u.slug, title: u.title })),
    phrases: mapped,
  };
}

const GRADABLE_TIERS: GradableTier[] = ["recognize", "reverse-recognize", "build-it"];

/** Derives each phrase's scheduling state from attempts/progress history --
 * the DB-reading half of the encounter scheduler. buildEncounterQueue()
 * (src/lib/scheduler.ts) is the pure half that turns this into a queue. */
export async function getSchedulingInfo(
  profileId: string,
  phrases: PhraseWithCreature[]
): Promise<PhraseSchedulingInfo[]> {
  const phraseIds = phrases.map((p) => p.id);

  const { data: attempts, error: aErr } = await supabase
    .from("attempts")
    .select("phrase_id, tier, correct, created_at")
    .eq("profile_id", profileId)
    .in("phrase_id", phraseIds);
  if (aErr) throw aErr;

  const { data: progressRows, error: pErr } = await supabase
    .from("progress")
    .select("phrase_id, mastery_state, next_review_at")
    .eq("profile_id", profileId)
    .in("phrase_id", phraseIds);
  if (pErr) throw pErr;

  type AttemptRow = { phrase_id: string; tier: string; correct: boolean | null; created_at: string };
  type ProgressRow = { phrase_id: string; mastery_state: string; next_review_at: string | null };

  const attemptsByPhrase = new Map<string, AttemptRow[]>();
  for (const a of attempts as AttemptRow[]) {
    const list = attemptsByPhrase.get(a.phrase_id) ?? [];
    list.push(a);
    attemptsByPhrase.set(a.phrase_id, list);
  }
  const progressByPhrase = new Map(
    (progressRows as ProgressRow[]).map((r) => [r.phrase_id, r])
  );

  const now = new Date();

  return phrases.map((p): PhraseSchedulingInfo => {
    const phraseAttempts = attemptsByPhrase.get(p.id) ?? [];
    const hasLearned = phraseAttempts.some((a) => a.tier === "learn");
    const gradedModalitiesCorrect = new Set(
      phraseAttempts
        .filter((a) => a.correct && (GRADABLE_TIERS as string[]).includes(a.tier))
        .map((a) => a.tier as GradableTier)
    );
    const prog = progressByPhrase.get(p.id);
    const mastered = prog?.mastery_state === "mastered";
    const dueForReview = !!prog?.next_review_at && new Date(prog.next_review_at) <= now;
    const sayItAttempts = phraseAttempts
      .filter((a) => a.tier === "say-it")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastSayItAt = sayItAttempts.length
      ? sayItAttempts[sayItAttempts.length - 1].created_at
      : null;

    return {
      phraseId: p.id,
      hasLearned,
      gradedModalitiesCorrect,
      mastered,
      dueForReview,
      buildItEligible: isBuildItEligible(p),
      hasAudio: !!p.audio_path,
      lastSayItAt,
    };
  });
}

export type SessionRun = {
  id: string;
  profile_id: string;
  unit_id: string;
  queue: Encounter[];
  current_index: number;
  completed_at: string | null;
};

/** The kid's in-progress run for this unit, if exiting mid-run left one
 * resumable. At most one active (completed_at is null) run per profile+unit
 * is ever created -- callers should check this before building a new queue. */
export async function getActiveRun(profileId: string, unitId: string): Promise<SessionRun | null> {
  // order+limit(1) instead of .maybeSingle() -- a DB-level unique index
  // (see 20260810130000_add_session_runs.sql) now prevents more than one
  // incomplete run per profile+unit going forward, but this stays
  // defensive rather than throwing if a stray duplicate ever exists
  // (.maybeSingle() errors outright on >1 row, which briefly broke
  // starting a quest after a StrictMode double-invoke raced two rows into
  // existence -- caught live, 2026-08-10).
  const { data, error } = await supabase
    .from("session_runs")
    .select("id, profile_id, unit_id, queue, current_index, completed_at")
    .eq("profile_id", profileId)
    .eq("unit_id", unitId)
    .is("completed_at", null)
    // updated_at, not started_at -- if a stray duplicate ever exists, the
    // one that's actually been played (advanceRun bumps updated_at) is the
    // one worth resuming, not just whichever row happened to be created
    // last (caught live: ordering by started_at picked the untouched
    // duplicate over the one at current_index 4, 2026-08-10).
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rows = data as SessionRun[];
  return rows[0] ?? null;
}

export async function createRun(
  profileId: string,
  unitId: string,
  queue: Encounter[]
): Promise<SessionRun> {
  const { data, error } = await supabase
    .from("session_runs")
    .insert({ profile_id: profileId, unit_id: unitId, queue, current_index: 0 })
    .select("id, profile_id, unit_id, queue, current_index, completed_at")
    .single();
  if (error) throw error;
  return data as SessionRun;
}

export async function advanceRun(runId: string, nextIndex: number) {
  const { error } = await supabase
    .from("session_runs")
    .update({ current_index: nextIndex, updated_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw error;
}

export async function completeRun(runId: string) {
  const { error } = await supabase
    .from("session_runs")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw error;
}
