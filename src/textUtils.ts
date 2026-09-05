/**
 * Splits text into chunks of at most maxLen characters, breaking on word
 * boundaries so words aren't cut mid-way (falls back to a hard split only
 * for a single word longer than maxLen).
 */
export function chunkText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen) {
      if (current) chunks.push(current);
      current = word;
      while (current.length > maxLen) {
        chunks.push(current.slice(0, maxLen));
        current = current.slice(maxLen);
      }
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}
