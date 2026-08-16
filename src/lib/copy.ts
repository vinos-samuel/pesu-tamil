/** Personality copy bank (Opus build-order item 3). Static, Claude-drafted,
 * Vinos culls/edits directly in this file -- never a runtime API call, same
 * "batch-author + review" pattern as everything else kid-facing. Varied per
 * creature species (set per-unit at seed time, see creatures table) so
 * feedback doesn't read as one unvarying "Correct!" bot after a few days.
 * Edit the arrays freely -- add, remove, or reword lines, nothing else in
 * the app depends on exact wording. */

export type Species = "peacock" | "jasmine" | "flame" | "horns" | "otter" | "default";

type SpeciesCopy = {
  correct: string[]; // Recognize / Build-it: got it right
  tryAgain: string[]; // Recognize wrong guess / Build-it wrong order lead-in
  heard: string[]; // Say-it: after self-grading, either answer
};

const COPY: Record<Species, SpeciesCopy> = {
  peacock: {
    correct: ["Gorgeous! 🎉", "You nailed it! ✨", "Peacock's showing off for you! 🦚", "Yes! Feathers up! 🎉"],
    tryAgain: ["So close! Peacock's still fanning out.", "Almost — one more look.", "Not that one, but you're getting warmer."],
    heard: ["Peacock heard every word! 👂", "That landed! Nice and clear.", "Loud enough to make the feathers shake! 🦚"],
  },
  jasmine: {
    correct: ["Sweet! Just like jasmine! 🌸", "Blooming brilliant! 🎉", "Yes! That one's a keeper.", "Petal-perfect! 🌸"],
    tryAgain: ["Not quite blooming yet — try again.", "So close, jasmine's still budding.", "Nearly! One more petal to go."],
    heard: ["Jasmine caught that! 🌸", "Nice and sweet-sounding!", "That one bloomed just right."],
  },
  flame: {
    correct: ["On fire! 🔥", "Yes! That's a hot streak!", "Blazing right through it! 🎉", "You lit that one up! 🔥"],
    tryAgain: ["Not quite — the flame flickered.", "Almost caught it! Try again.", "So close, keep that spark going."],
    heard: ["Flame felt the heat of that one! 🔥", "That one crackled just right.", "Warm and clear — nice!"],
  },
  horns: {
    correct: ["Butted that one right in! 🎉", "Yes! Solid as horns.", "Nailed it, no headbutting needed!", "That's a strong one! 💪"],
    tryAgain: ["Not quite — try charging at it again.", "So close, one more headbutt.", "Almost had it!"],
    heard: ["Horns heard you loud and clear!", "Nice and sturdy-sounding!", "That one landed solid."],
  },
  otter: {
    correct: ["Splashing good! 🎉", "Yes! Otter's doing a happy spin!", "You caught that one perfectly! 🦦", "Smooth as a river! 💧"],
    tryAgain: ["Not quite — otter slipped off that one.", "So close, try paddling again.", "Almost! One more try."],
    heard: ["Otter heard it splash right in! 🦦", "That one flowed nicely.", "Nice and clear — like water!"],
  },
  default: {
    correct: ["Correct! 🎉", "Yes! Nicely done.", "You got it!", "That's it!"],
    tryAgain: ["Not quite — try again.", "So close!", "Almost — one more look."],
    heard: ["Nice — I heard you! 👂", "That landed clearly!", "Good and clear!"],
  },
};

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function copyFor(species: string | null | undefined): SpeciesCopy {
  return species && species in COPY ? COPY[species as Species] : COPY.default;
}

export function correctCopy(species: string | null | undefined): string {
  return random(copyFor(species).correct);
}

/** Recognize wrong guess -- reveals the right answer, so the copy leads
 * into it rather than standing alone. */
export function recognizeIncorrectCopy(species: string | null | undefined, english: string): string {
  return `${random(copyFor(species).tryAgain)} That was "${english}."`;
}

/** Build-it wrong order -- the correct order is already shown right below,
 * so this is just the lead-in line. */
export function buildItTryAgainCopy(species: string | null | undefined): string {
  return random(copyFor(species).tryAgain);
}

export function heardCopy(species: string | null | undefined): string {
  return random(copyFor(species).heard);
}

/** Done-screen encouragement. Not species-specific -- a run mixes
 * creatures from across the whole unit, so there's no single species to
 * draw from the way the per-encounter copy above does. */
const SESSION_SUMMARY = {
  strong: ["You're on fire today! 🔥", "Sharp as ever! ✨", "That was a great round!"],
  solid: ["Nice work out there!", "Solid quest — keep it up!", "Good hustle today!"],
  learning: [
    "Every round teaches your crew something new!",
    "Nice and steady — that's how it's done.",
    "Good effort out there!",
  ],
  gettingStarted: ["Welcome to the crew! 🎉", "First steps, well taken!", "Great start!"],
};

export function sessionSummaryCopy(gradedCorrect: number, gradedTotal: number): string {
  if (gradedTotal === 0) return random(SESSION_SUMMARY.gettingStarted);
  const pct = gradedCorrect / gradedTotal;
  if (pct >= 0.8) return random(SESSION_SUMMARY.strong);
  if (pct >= 0.5) return random(SESSION_SUMMARY.solid);
  return random(SESSION_SUMMARY.learning);
}
