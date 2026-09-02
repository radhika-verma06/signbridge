export interface TranscriptLine {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/** Controlled vocabulary of Newton's-Second-Law concepts the lesson engine understands. */
export type ConceptId =
  | 'force'
  | 'mass'
  | 'acceleration'
  | 'equation'
  | 'push'
  | 'move'
  | 'increase'
  | 'decrease'
  | 'more'
  | 'same'
  | 'fast'
  | 'slow'
  | 'decelerate'
  | 'object';

export interface LessonConcept {
  id: ConceptId;
  label: string;
  /** Patterns matched against transcript text to detect this concept being discussed. */
  matchers: RegExp[];
}

export interface ConceptMatch {
  concept: LessonConcept;
  /** The transcript line text that triggered this match. */
  sourceText: string;
}

export type ChatRole = 'learner' | 'signbridge';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  concepts?: ConceptId[];
}

export interface QuickQuestion {
  id: string;
  label: string;
  question: string;
}

export interface ExplanationVariant {
  heading: string;
  body: string[];
  emphasis: string;
  concepts: ConceptId[];
}

/** One frame of a Holistic pose: flat [x, y, confidence] triples per landmark point. */
export type PoseFramePoint = [number, number, number];
export type PoseFrame = PoseFramePoint[];

export interface PoseComponentRange {
  name: string;
  start: number;
  count: number;
}

export interface PoseFrameSet {
  fps: number;
  width: number;
  height: number;
  components: PoseComponentRange[];
  bodyLimbs: [number, number][];
  handLimbs: [number, number][];
  frames: PoseFrame[];
}

/** Attribution + provenance metadata for one Auslan sign asset -- kept separate from UI logic. */
export interface AuslanSignAsset {
  concept: ConceptId;
  gloss: string;
  keywords: string[];
  sourceDataset: string;
  sourceOrg: string;
  sourcePage: string;
  sourcePaper: string;
  clipId: string;
  licence: string;
  usageConstraint: string;
  poseFile: string;
  extractionMethod: string;
  linguisticCaveat?: string;
  validationStatus: 'AUSLAN-DERIVED - NOT YET HUMAN VALIDATED' | 'HUMAN VALIDATED';
}

export interface AuslanLexicon {
  lexicon: string;
  note: string;
  entries: AuslanSignAsset[];
}
