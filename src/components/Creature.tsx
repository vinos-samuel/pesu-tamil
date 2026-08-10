import { useMemo } from "react";

/** Parametric creature generator, ported from the approved design pitch
 * (Opus's spec — see docs/PRD.md link to the design artifact). Body, crest,
 * eyes, mouth and a hue offset are all picked deterministically from the
 * phrase's own slug, so the same phrase always renders the same creature
 * and no art was hand-drawn. `wild` renders the grey "not tamed yet" state
 * (Sanctuary locked slots); tamed (default) renders full color. */

const BODIES = ["blob", "egg", "pear", "bean", "round", "square"] as const;
const CRESTS = [
  "feather",
  "petal",
  "flame",
  "horns",
  "ears",
  "spikes",
  "leaf",
  "pompom",
] as const;
const EYES = ["glossy", "halfmoon", "sparkle", "sleepy"] as const;
const MOUTHS = ["smile", "open", "smirk"] as const;

/** Per-unit hue family so every creature in a unit reads as one tribe. */
export const UNIT_HUES: Record<string, number> = {
  greetings: 178,
  family: 330,
  mealtime: 26,
  numbers: 265,
  actions: 148,
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let x = seed || 1;
  return function () {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return (x % 100000) / 100000;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)},${s}%,${l}%)`;
}

type Traits = {
  body: (typeof BODIES)[number];
  crest: (typeof CRESTS)[number];
  eyes: (typeof EYES)[number];
  mouth: (typeof MOUTHS)[number];
  hue: number;
  flip: boolean;
};

function traits(slug: string, hueBase: number): Traits {
  const rng = makeRng(hashStr(slug));
  return {
    body: pick(rng, BODIES),
    crest: pick(rng, CRESTS),
    eyes: pick(rng, EYES),
    mouth: pick(rng, MOUTHS),
    hue: hueBase + pick(rng, [-14, -7, 0, 7, 14]),
    flip: rng() > 0.5,
  };
}

/** Fixed, slug-independent -- deliberately NOT derived from any phrase.
 * Used by `mystery` so a not-yet-revealed option can't be shape-matched
 * against a creature the kid already saw elsewhere (see Recognize's
 * pre-commit options). Distinct from `wild`, which stays slug-shaped on
 * purpose (Sanctuary's silhouette-anticipation) -- these two "unknown"
 * looks must never be visually confused with each other. */
const MYSTERY_TRAITS: Traits = {
  body: "round",
  crest: "pompom",
  eyes: "sleepy",
  mouth: "smile",
  hue: 250, // soft indigo -- distinct from wild's warm grey-beige
  flip: false,
};

function bodyPath(kind: Traits["body"]): string {
  switch (kind) {
    case "blob":
      return "M50 8 C78 8 92 30 90 55 C88 80 68 92 48 92 C26 92 10 76 10 52 C10 28 24 8 50 8 Z";
    case "egg":
      return "M50 6 C72 6 86 34 86 58 C86 82 70 94 50 94 C30 94 14 82 14 58 C14 34 28 6 50 6 Z";
    case "pear":
      return "M50 10 C64 10 70 26 74 42 C80 62 84 78 60 90 C40 98 18 86 14 64 C10 44 20 10 50 10 Z";
    case "bean":
      return "M52 8 C76 6 92 26 88 48 C84 70 92 84 70 92 C46 100 18 88 12 64 C6 40 24 10 52 8 Z";
    case "square":
      return "M26 12 H74 C84 12 90 20 90 30 V70 C90 82 82 90 70 90 H30 C18 90 10 82 10 70 V30 C10 20 16 12 26 12 Z";
    case "round":
    default:
      return "M50 10 C74 10 90 28 90 50 C90 74 72 92 50 92 C28 92 10 74 10 50 C10 28 26 10 50 10 Z";
  }
}

function Crest({
  kind,
  hue,
  wild,
}: {
  kind: Traits["crest"];
  hue: number;
  wild: boolean;
}) {
  const accent = wild ? "#c9c0ac" : hsl(hue + 30, 68, 46);
  const op = wild ? 0.5 : 0.92;
  switch (kind) {
    case "feather":
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => {
            const x = 22 + i * 14;
            const h = 26 - Math.abs(i - 2) * 5;
            return (
              <ellipse
                key={i}
                cx={x}
                cy={4}
                rx={5}
                ry={h}
                fill={accent}
                transform={`rotate(${(i - 2) * 14} ${x} 20)`}
                opacity={op}
              />
            );
          })}
        </>
      );
    case "petal":
      return (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const ang = (i / 6) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={50 + Math.cos(ang) * 16}
                cy={6 + Math.sin(ang) * 10}
                r={8}
                fill={accent}
                opacity={wild ? 0.5 : 0.9}
              />
            );
          })}
        </>
      );
    case "flame":
      return (
        <>
          <path
            d="M50 -6 C60 4 62 18 50 24 C38 18 40 4 50 -6 Z"
            fill={accent}
            opacity={wild ? 0.5 : 0.95}
          />
          <path
            d="M50 0 C55 6 56 14 50 18 C44 14 45 6 50 0 Z"
            fill={wild ? "#ddd6c8" : hsl(hue + 10, 85, 62)}
          />
        </>
      );
    case "horns":
      return (
        <>
          <path
            d="M34 14 C30 2 26 -6 30 -10 C36 -8 38 6 38 16 Z"
            fill={accent}
            opacity={wild ? 0.5 : 0.95}
          />
          <path
            d="M66 14 C70 2 74 -6 70 -10 C64 -8 62 6 62 16 Z"
            fill={accent}
            opacity={wild ? 0.5 : 0.95}
          />
        </>
      );
    case "ears":
      return (
        <>
          <ellipse cx={22} cy={14} rx={10} ry={14} fill={accent} opacity={wild ? 0.5 : 0.95} />
          <ellipse cx={78} cy={14} rx={10} ry={14} fill={accent} opacity={wild ? 0.5 : 0.95} />
        </>
      );
    case "spikes":
      return (
        <>
          {[0, 1, 2, 3].map((i) => {
            const x = 30 + i * 14;
            return (
              <path
                key={i}
                d={`M${x - 6} 12 L${x} -8 L${x + 6} 12 Z`}
                fill={accent}
                opacity={wild ? 0.5 : 0.92}
              />
            );
          })}
        </>
      );
    case "leaf":
      return (
        <path
          d="M50 -8 C66 -4 70 14 50 22 C30 14 34 -4 50 -8 Z"
          fill={accent}
          opacity={wild ? 0.5 : 0.95}
        />
      );
    case "pompom":
      return <circle cx={50} cy={2} r={13} fill={accent} opacity={wild ? 0.5 : 0.95} />;
  }
}

function Eyes({ kind, wild }: { kind: Traits["eyes"]; wild: boolean }) {
  const white = "#fff";
  const iris = wild ? "#8a8071" : "#2b2420";
  const positions: [number, number][] = [
    [38, 46],
    [62, 46],
  ];
  return (
    <>
      {positions.map(([x, y], i) => {
        switch (kind) {
          case "glossy":
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={9} fill={white} />
                <circle cx={x} cy={y} r={5.4} fill={iris} />
                {!wild && <circle cx={x + 2} cy={y - 2} r={1.6} fill="#fff" />}
              </g>
            );
          case "halfmoon":
            return (
              <path
                key={i}
                d={`M${x - 8} ${y} Q${x} ${y - 9} ${x + 8} ${y}`}
                stroke={iris}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
              />
            );
          case "sparkle":
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={10} fill={white} />
                <circle cx={x} cy={y} r={6.4} fill={iris} />
                {!wild && (
                  <>
                    <circle cx={x - 2.4} cy={y - 2.6} r={2} fill="#fff" />
                    <circle cx={x + 2.6} cy={y + 2} r={1} fill="#fff" />
                  </>
                )}
              </g>
            );
          case "sleepy":
            return (
              <path
                key={i}
                d={`M${x - 7} ${y - 1} Q${x} ${y + 4} ${x + 7} ${y - 1}`}
                stroke={iris}
                strokeWidth={3.2}
                fill="none"
                strokeLinecap="round"
              />
            );
        }
      })}
    </>
  );
}

function Mouth({ kind, wild }: { kind: Traits["mouth"]; wild: boolean }) {
  const c = wild ? "#a89d89" : "#8a4a2e";
  switch (kind) {
    case "smile":
      return <path d="M42 62 Q50 70 58 62" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case "open":
      return <ellipse cx={50} cy={64} rx={6} ry={5} fill={c} opacity={wild ? 0.5 : 0.85} />;
    case "smirk":
      return <path d="M44 63 Q52 68 58 60" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" />;
  }
}

export default function Creature({
  slug,
  hueBase,
  wild = false,
  mystery = false,
  size = 96,
  className,
}: {
  /** Required unless `mystery` is true. */
  slug?: string;
  /** Required unless `mystery` is true. */
  hueBase?: number;
  wild?: boolean;
  /** Not-yet-revealed placeholder -- fixed look, ignores `slug` entirely
   * (skips the traits() derivation, doesn't just override its output).
   * Takes precedence over `wild` if both are somehow passed. */
  mystery?: boolean;
  size?: number;
  className?: string;
}) {
  const t = useMemo(
    () => (mystery ? MYSTERY_TRAITS : traits(slug ?? "", hueBase ?? 0)),
    [mystery, slug, hueBase]
  );
  const bodyFill = wild ? "#d8d0bd" : hsl(t.hue, 62, 58);
  const outline = wild ? "#c2b8a1" : hsl(t.hue, 55, 34);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <g transform={t.flip ? "translate(100,0) scale(-1,1)" : undefined}>
        <Crest kind={t.crest} hue={t.hue} wild={wild} />
        <path d={bodyPath(t.body)} fill={bodyFill} stroke={outline} strokeWidth={3} />
        {!wild && (
          <>
            <ellipse cx={30} cy={58} rx={6} ry={3.4} fill={hsl(t.hue - 20, 70, 70)} opacity={0.55} />
            <ellipse cx={70} cy={58} rx={6} ry={3.4} fill={hsl(t.hue - 20, 70, 70)} opacity={0.55} />
          </>
        )}
        <Eyes kind={t.eyes} wild={wild} />
        <Mouth kind={t.mouth} wild={wild} />
      </g>
      {wild && (
        <text
          x={50}
          y={30}
          textAnchor="middle"
          fontSize={22}
          fontWeight={700}
          fill="#a89d89"
          fontFamily="'Baloo 2', sans-serif"
        >
          ?
        </text>
      )}
    </svg>
  );
}
