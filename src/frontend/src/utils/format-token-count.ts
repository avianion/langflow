/**
 * Formats a token count to a human-readable string with K/M suffixes.
 *
 * @param count - The token count to format
 * @returns Formatted token count string
 *
 * @example
 * formatTokenCount(500) // "500"
 * formatTokenCount(1500) // "1.5K"
 * formatTokenCount(1500000) // "1.5M"
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1_000_000)
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
