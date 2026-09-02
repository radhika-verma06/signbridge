import { resolveConcepts } from '../data/concepts';
import type { ConceptId, TranscriptLine } from '../types';

export interface LessonContext {
  currentTime: number;
  currentLine: TranscriptLine | null;
  /** Concepts mentioned in the current line, in pedagogical priority order. */
  currentConcepts: ConceptId[];
  /** The single most important concept right now, if any. */
  primaryConcept: ConceptId | null;
  /** Every concept the lesson has touched on up to this point in the video. */
  introducedConcepts: ConceptId[];
}

/**
 * Builds a snapshot of "what does the lesson engine know right now" -- current
 * time, current transcript segment, the concept(s) it resolves to, and the
 * running set of concepts already introduced earlier in the video. This is
 * concept-level resolution (see data/concepts.ts matchers), not a naive
 * keyword swap: several paraphrases resolve to the same concept.
 */
export function buildLessonContext(currentTime: number, allLines: TranscriptLine[]): LessonContext {
  const line = allLines.find((l) => currentTime >= l.start && currentTime < l.end) ?? null;
  const currentConcepts = line ? resolveConcepts(line.text) : [];

  const introduced = new Set<ConceptId>();
  for (const l of allLines) {
    if (l.start > currentTime) break;
    for (const c of resolveConcepts(l.text)) introduced.add(c);
  }

  return {
    currentTime,
    currentLine: line,
    currentConcepts,
    primaryConcept: currentConcepts[0] ?? null,
    introducedConcepts: Array.from(introduced),
  };
}
