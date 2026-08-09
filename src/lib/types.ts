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
