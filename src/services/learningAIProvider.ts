import { answerQuestion, EXPLANATIONS, INTERPRET_MEANINGS } from '../data/concepts';
import type { ConceptId, ExplanationVariant, TranscriptLine } from '../types';

export interface InterpretResult {
  original: string;
  keyConcept: ConceptId | null;
  meaning: string;
}

export interface AnswerResult {
  text: string;
  concepts: ConceptId[];
}

/**
 * FUTURE ARCHITECTURE NOTE: this is the seam where a real LLM call would go.
 * The shape (question/context in, grounded answer + concepts out) stays the
 * same -- only the implementation swaps from deterministic local logic to an
 * API call. No component imports data/concepts.ts directly; everything goes
 * through this provider so that swap is a one-file change.
 */
export interface LearningAIProvider {
  interpret(line: TranscriptLine | null, concept: ConceptId | null): InterpretResult;
  explain(concept: ConceptId, variantIndex: number): ExplanationVariant | null;
  explanationCount(concept: ConceptId): number;
  answer(question: string): AnswerResult;
}

class DeterministicLearningAIProvider implements LearningAIProvider {
  interpret(line: TranscriptLine | null, concept: ConceptId | null): InterpretResult {
    const original = line?.text ?? 'The lecture is not currently discussing a specific concept.';
    const meaning = concept
      ? (INTERPRET_MEANINGS[concept] ?? 'The lecturer is discussing this part of the lesson.')
      : 'Play the video to a point where a concept is being discussed, then try Interpret again.';
    return { original, keyConcept: concept, meaning };
  }

  explain(concept: ConceptId, variantIndex: number): ExplanationVariant | null {
    const variants = EXPLANATIONS[concept];
    if (!variants || variants.length === 0) return null;
    return variants[variantIndex % variants.length];
  }

  explanationCount(concept: ConceptId): number {
    return EXPLANATIONS[concept]?.length ?? 0;
  }

  answer(question: string): AnswerResult {
    const { text, concepts } = answerQuestion(question);
    return { text, concepts };
  }
}

export const learningAI: LearningAIProvider = new DeterministicLearningAIProvider();
