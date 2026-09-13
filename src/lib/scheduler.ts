/** Builds a short, mixed "encounter run" instead of the old block-by-tier
 * flow (all Learn, then all Recognize, then all Say-it...) that made a
 * 19-phrase unit ~60 screens in one sitting. Pure function -- no Supabase
 * calls in here, so it's cheap to unit test. The caller (queries.ts's
 * getSchedulingInfo) does the DB reads and hands this a plain info array. */

// The 2-distinct-modality mastery gate only counts these three -- "cluster"
// is a separate, additional requirement (see PhraseSchedulingInfo below and
// recomputeMasteryState in queries.ts), not a 4th interchangeable modality.
export type GradableTier = "recognize" | "reverse-recognize" | "build-it";
export type EncounterType = GradableTier | "learn" | "say-it" | "cluster";

export type Encounter = {
  type: EncounterType;
  phraseId: string;
  /** Only set for type "cluster" -- which situational_prompts row to use. */
  promptId?: string;
  /** Optional vetted child-facing bridge selected by the tutor planner. */
  coachLine?: string;
};

export type PhraseSchedulingInfo = {
  phraseId: string;
  /** Has at least one `learn` attempt logged. Encounters below never fire
   * for a phrase until this is true -- the one hard ordering rule (learn
   * before any graded encounter for that same phrase). Since every other
   * bucket already requires `hasLearned`, this is enforced by construction,
   * not by post-hoc sorting. */
  hasLearned: boolean;
  /** Which gradable modalities already have a correct attempt. */
  gradedModalitiesCorrect: Set<GradableTier>;
  mastered: boolean;
  /** progress.next_review_at <= now (false if no progress row yet). */
  dueForReview: boolean;
  buildItEligible: boolean;
  hasAudio: boolean;
  /** Most recent `say-it` attempt timestamp, for recency-based picking. */
  lastSayItAt: string | null;
  /** Set only if this phrase belongs to a Nests cluster with a
   * situational_prompts row it hasn't answered correctly yet. null for
   * every phrase until Nests content is authored and seeded -- the
   * "cluster" encounter bucket below is simply empty until then, no
   * special-casing needed elsewhere. */
  clusterPromptId: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Whichever gradable modality this phrase hasn't passed yet, preferring
 * Build-it when eligible (it's the richest signal) then the two Recognize
 * directions. Returns null if every available modality is already correct
 * (shouldn't happen for a non-mastered phrase, but stay defensive). */
function missingModality(info: PhraseSchedulingInfo): GradableTier | null {
  const order: GradableTier[] = info.buildItEligible
    ? ["build-it", "recognize", "reverse-recognize"]
    : ["recognize", "reverse-recognize"];
  return order.find((t) => !info.gradedModalitiesCorrect.has(t)) ?? null;
}

export function buildEncounterQueue(
  infos: PhraseSchedulingInfo[],
  opts: { targetSize?: number; sayItSlots?: number; shuffleFn?: typeof shuffle } = {}
): Encounter[] {
  const targetSize = opts.targetSize ?? 7;
  const sayItSlots = opts.sayItSlots ?? 2;
  const doShuffle = opts.shuffleFn ?? shuffle;

  const withAudio = infos.filter((i) => i.hasAudio);

  // -- Buckets, in priority order. Each is disjoint from the others by
  // construction (hasLearned / gradedModalitiesCorrect.size / mastered are
  // mutually exclusive conditions), so no phrase can be double-scheduled
  // into two different-typed slots in the same run.
  const never = withAudio.filter((i) => !i.hasLearned);
  const learnedNotGraded = withAudio.filter(
    (i) => i.hasLearned && i.gradedModalitiesCorrect.size === 0 && !i.mastered
  );
  const oneModality = withAudio.filter(
    (i) => i.hasLearned && i.gradedModalitiesCorrect.size >= 1 && !i.mastered
  );
  // Has an unanswered Nests prompt -- empty until Nests content is seeded.
  const clusterEligible = withAudio.filter(
    (i) => i.hasLearned && i.clusterPromptId !== null && !i.mastered
  );
  // Mastered phrases due for review -- this is where a lapse gets caught:
  // if the kid's actually forgotten it, recomputeMasteryState demotes it
  // to "review" (following) after this attempt comes back wrong.
  const dueReview = withAudio.filter((i) => i.mastered && i.dueForReview);

  const remainingSlots = Math.max(0, targetSize - sayItSlots);

  const otherPool: Encounter[] = [];
  for (const info of doShuffle(learnedNotGraded)) {
    // Alternate direction so both Recognize modalities get seeded early
    // rather than always starting with the same one.
    const type: GradableTier = otherPool.length % 2 === 0 ? "recognize" : "reverse-recognize";
    otherPool.push({ type, phraseId: info.phraseId });
  }
  for (const info of doShuffle(oneModality)) {
    const type = missingModality(info);
    if (type) otherPool.push({ type, phraseId: info.phraseId });
  }
  for (const info of doShuffle(clusterEligible)) {
    otherPool.push({ type: "cluster", phraseId: info.phraseId, promptId: info.clusterPromptId! });
  }
  for (const info of doShuffle(dueReview)) {
    const type = missingModality(info) ?? "recognize";
    otherPool.push({ type, phraseId: info.phraseId });
  }

  // Adaptive, not a flat cap: a brand-new unit has nothing in any other
  // bucket yet (nothing's been learned to grade), so capping "never" at a
  // small fixed number left most of the run empty -- a fresh unit's first
  // session was 3 Learn taps and "Quest complete! +0 XP" instead of
  // anything close to 6-8 encounters (caught live, 2026-08-10). Still
  // don't let a big backlog of untouched phrases crowd out a run that
  // already has plenty to review -- floor of 3, but grows to fill
  // whatever the other buckets don't cover.
  const neverCount = Math.min(never.length, Math.max(3, remainingSlots - otherPool.length));
  const learnPool: Encounter[] = doShuffle(never)
    .slice(0, neverCount)
    .map((info) => ({ type: "learn" as const, phraseId: info.phraseId }));

  const nonSayIt = [...learnPool, ...otherPool];
  const picked = doShuffle(nonSayIt).slice(0, remainingSlots);

  // -- Say-it: independent of every bucket above (no gradable state, not
  // part of SRS). Least-recently-attempted among learned phrases, capped.
  const sayItCandidates = doShuffle(
    withAudio
      .filter((i) => i.hasLearned)
      .sort((a, b) => (a.lastSayItAt ?? "").localeCompare(b.lastSayItAt ?? ""))
      .slice(0, 6) // a little randomness among the least-recent few, not just the single oldest every time
  ).slice(0, sayItSlots);

  // Spread Say-it through the run instead of clustering it (e.g. all at
  // the end), so the "slow" encounter type doesn't become a predictable
  // finish-line grind.
  const merged = [...picked];
  sayItCandidates.forEach((info, i) => {
    const insertAt = Math.floor(((i + 1) * merged.length) / (sayItCandidates.length + 1));
    merged.splice(insertAt, 0, { type: "say-it", phraseId: info.phraseId });
  });

  return merged;
}
