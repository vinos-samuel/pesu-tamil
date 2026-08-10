/** Real progress visualization for the four practice screens, replacing the
 * old dev-tier-name text ("Learn 1/10", "Recognize 3/10" -- violates the
 * app's own no-dev-vocabulary rule). Egg-hatching motif: 🥚 past the
 * halfway point becomes 🐣, riding along a filling bar. */
export default function QuestProgress({
  label,
  current,
  total,
}: {
  label: string;
  current: number; // 1-indexed
  total: number;
}) {
  const pct = Math.round((current / total) * 100);
  const hatched = current > total / 2;

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-1.5">
      <p className="font-body text-sm text-gray-500">{label}</p>
      <div className="flex w-full items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {hatched ? "🐣" : "🥚"}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-marigold-100">
          <div
            className="h-full rounded-full bg-marigold-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="whitespace-nowrap font-body text-xs text-gray-500">
          {current} of {total}
        </span>
      </div>
    </div>
  );
}
