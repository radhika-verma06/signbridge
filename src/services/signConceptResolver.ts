import type { ConceptId } from '../types';

const SAME_CONCEPT_COOLDOWN_SECONDS = 8;
const ANY_TRIGGER_COOLDOWN_SECONDS = 3;

/**
 * Decides WHEN the signer should switch to a newly-mentioned concept, given
 * the lesson context ticking many times a second. Without this, the signer
 * would restart the same sign every video-clock tick. Kept separate from the
 * renderer/provider: this only ever answers "should we trigger, and what".
 */
export class SignConceptResolver {
  private lastShown: ConceptId | null = null;
  private lastShownAt = -Infinity;
  private lastTriggerAt = -Infinity;

  /** Call on every lesson-context update. Returns a concept to display, or null to leave as-is. */
  pick(candidates: ConceptId[], now: number): ConceptId | null {
    if (candidates.length === 0) return null;

    // Prefer continuing whatever's already showing if it's still relevant.
    if (this.lastShown && candidates.includes(this.lastShown)) return null;

    if (now - this.lastTriggerAt < ANY_TRIGGER_COOLDOWN_SECONDS) return null;

    const next = candidates[0];
    if (next === this.lastShown && now - this.lastShownAt < SAME_CONCEPT_COOLDOWN_SECONDS) {
      return null;
    }

    this.lastShown = next;
    this.lastShownAt = now;
    this.lastTriggerAt = now;
    return next;
  }

  /** Explicit user-driven request (e.g. from Explain/Ask) bypasses cooldown. */
  forceShow(concept: ConceptId, now: number): void {
    this.lastShown = concept;
    this.lastShownAt = now;
    this.lastTriggerAt = now;
  }

  reset(): void {
    this.lastShown = null;
    this.lastShownAt = -Infinity;
    this.lastTriggerAt = -Infinity;
  }
}
