/**
 * Lightweight client-side summarizer.
 * - If input has multiple sentences, return the first N sentences.
 * - Otherwise, return the first maxChars characters followed by ellipsis.
 */
export function summarizeText(text: string | null | undefined, maxSentences = 2, maxChars = 280) {
  if (!text) return "No summary available.";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No summary available.";

  // Split into sentences (simple splitter)
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (sentences && sentences.length > 0) {
    const take = sentences.slice(0, maxSentences).join(" ").trim();
    if (take.length <= maxChars) return take;
    // fallback to char-based trim
    return take.slice(0, maxChars).trim() + "...";
  }

  // If no sentence split, fallback to chars
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars).trim() + "...";
}

export default summarizeText;
