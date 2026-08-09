export type Profile = {
  id: string;
  name: string;
  avatar_color: string | null;
  streak_count: number;
  total_xp: number;
};

export type Unit = {
  id: string;
  number: number;
  slug: string;
  title: string;
};

export type Phrase = {
  id: string;
  unit_id: string;
  seq: number;
  slug: string;
  english: string;
  tamil_romanized: string;
  audio_path: string | null;
  needs_audio: boolean;
  notes: string | null;
  word_gloss: string | null;
};

export type Creature = {
  id: string;
  phrase_id: string;
  species: string;
  color: string | null;
  level: number;
};

export type PhraseWithCreature = Phrase & { creature: Creature | null };

const SPECIES_EMOJI: Record<string, string> = {
  peacock: "🦚",
  jasmine: "🌸",
  flame: "🔥",
  horns: "🐐",
  otter: "🦦",
};

export function creatureEmoji(species: string | undefined): string {
  return (species && SPECIES_EMOJI[species]) || "🥚";
}

/** Parses "thanni = water, vaenum = want" into [{tamil:"thanni", english:"water"}, ...],
 * in the same order as the spoken phrase. Returns [] if not parseable. */
export function parseWordGloss(
  gloss: string | null
): { tamil: string; english: string }[] {
  if (!gloss) return [];
  return gloss
    .split(",")
    .map((part) => {
      const [tamil, english] = part.split("=").map((s) => s.trim());
      return tamil && english ? { tamil, english } : null;
    })
    .filter((x): x is { tamil: string; english: string } => x !== null);
}

/** Build-it eligibility: needs a real word-by-word breakdown, not just a
 * single confirmed root (e.g. pasikkudhu only has "pasi = hunger" -- one
 * entry, not eligible) and real audio to play as the reward/confirmation. */
export function isBuildItEligible(p: Phrase): boolean {
  return parseWordGloss(p.word_gloss).length >= 2 && !!p.audio_path;
}
