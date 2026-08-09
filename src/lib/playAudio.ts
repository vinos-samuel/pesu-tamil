/** Plays a URL and surfaces failures instead of swallowing them silently.
 * `new Audio(url).play()` returns a promise that can reject (network error,
 * autoplay policy, etc.) -- every screen was calling this with no .catch(),
 * so a failed play was completely invisible: the button just did nothing. */
export function playAudio(url: string, onError?: (err: unknown) => void) {
  const audio = new Audio(url);
  audio.play().catch((err) => {
    console.error("Audio playback failed:", url, err);
    onError?.(err);
  });
  return audio;
}
