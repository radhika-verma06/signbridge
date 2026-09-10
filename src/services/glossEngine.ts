/**
 * English → sign-gloss translation engine for Live Translate.
 *
 * Ported and adapted from the ASL demo prototype's aslEngine (rule-based,
 * deterministic, offline). Translates everyday English into a gloss *plan*:
 * an ordered list of tokens, each either a known gloss (with a linguistic
 * description and duration) or a fingerspelling fallback.
 *
 * ASL grammar rules applied (kept explicit so the UI can show its work):
 *   - pronoun indexing (I/me → IX-1P, you → IX-2P, ...)
 *   - WH-question movement to sentence-final position
 *   - time-topic-comment (time words fronted)
 *   - copula/article omission ("is", "the", ...)
 *   - politeness and compound phrase mapping ("thank you" → THANK-YOU)
 */

export interface GlossInfo {
  category: string;
  description: string;
  duration: number;
}

export const GLOSS_LEXICON: Record<string, GlossInfo> = {
  HELLO: { category: 'greeting', description: 'Open hand salutes from temple outward', duration: 1.2 },
  HI: { category: 'greeting', description: 'Wave open hand near temple', duration: 1.0 },
  GOODBYE: { category: 'greeting', description: 'Open hand wave outward', duration: 1.2 },
  BYE: { category: 'greeting', description: 'Open hand wave outward', duration: 1.0 },
  'THANK-YOU': { category: 'courtesy', description: 'Flat hand touches chin and moves outward to person', duration: 1.2 },
  THANKS: { category: 'courtesy', description: 'Flat hand touches chin and moves outward', duration: 1.0 },
  PLEASE: { category: 'courtesy', description: 'Flat hand rubs chest in circular motion', duration: 1.3 },
  SORRY: { category: 'courtesy', description: 'Fist with thumb out rubs chest in circular motion', duration: 1.3 },
  WELCOME: { category: 'courtesy', description: 'Open hand sweeps towards body warmly', duration: 1.2 },
  YES: { category: 'response', description: 'Fist nods up and down like a head', duration: 1.0 },
  NO: { category: 'response', description: 'Index and middle finger snap down to thumb', duration: 1.0 },
  NAME: { category: 'noun', description: 'H-hands tap across each other at right angles', duration: 1.2 },
  NICE: { category: 'adjective', description: 'Flat hand slides across flat palm outward', duration: 1.1 },
  MEET: { category: 'verb', description: 'Index fingers point up and meet together', duration: 1.2 },
  LIKE: { category: 'verb', description: 'Thumb and middle finger pull from chest together', duration: 1.2 },
  LOVE: { category: 'verb', description: 'Crossed arms over chest hugging tight', duration: 1.4 },
  LEARN: { category: 'verb', description: 'Hand takes knowledge from palm to forehead', duration: 1.4 },
  TEACHER: { category: 'noun', description: 'Hands move outward from temples + agent marker', duration: 1.5 },
  STUDENT: { category: 'noun', description: 'LEARN sign followed by downward agent palms', duration: 1.5 },
  HELP: { category: 'verb', description: 'Fist resting on open palm pushes upward together', duration: 1.2 },
  SEE: { category: 'verb', description: 'V-hand points from eyes outward to object', duration: 1.1 },
  TALK: { category: 'verb', description: 'Fingers tap chin repeatedly', duration: 1.2 },
  WANT: { category: 'verb', description: 'Claw hands pull inward toward body', duration: 1.2 },
  EAT: { category: 'daily', description: 'Pinched hand taps mouth twice', duration: 1.1 },
  FOOD: { category: 'daily', description: 'Pinched hand taps mouth twice', duration: 1.1 },
  WATER: { category: 'daily', description: 'W-hand taps chin twice', duration: 1.1 },
  DRINK: { category: 'daily', description: 'C-hand simulates tipping cup to mouth', duration: 1.1 },
  FRIEND: { category: 'people', description: 'Hooked index fingers link together', duration: 1.3 },
  FAMILY: { category: 'people', description: 'F-hands circle out from touching thumbs', duration: 1.4 },
  HAPPY: { category: 'emotion', description: 'Flat hands brush up chest with upbeat energy', duration: 1.2 },
  SAD: { category: 'emotion', description: 'Open hands drop down in front of face', duration: 1.3 },
  GOOD: { category: 'adjective', description: 'Fingertips tap chin and drop into opposite palm', duration: 1.2 },
  BAD: { category: 'adjective', description: 'Fingertips tap chin and flip downward', duration: 1.2 },
  TODAY: { category: 'time', description: 'Hands drop down in space twice (NOW + DAY)', duration: 1.2 },
  NOW: { category: 'time', description: 'Bent hands drop downward firmly', duration: 1.0 },
  TOMORROW: { category: 'time', description: 'Thumb touches jaw and arcs forward', duration: 1.3 },
  YESTERDAY: { category: 'time', description: 'Thumb touches jaw and arcs backward', duration: 1.3 },
  TIME: { category: 'time', description: 'Index finger taps wrist where a watch sits', duration: 1.0 },
  DAY: { category: 'time', description: 'Arm arcs down across horizontal arm like the sun', duration: 1.3 },
  NIGHT: { category: 'time', description: 'Bent hand curves over wrist like a setting sun', duration: 1.2 },
  SCHOOL: { category: 'academic', description: 'Palm claps down on flat palm twice', duration: 1.2 },
  BOOK: { category: 'noun', description: 'Palms pressed together open like a book', duration: 1.2 },
  LANGUAGE: { category: 'noun', description: 'L-hands touch thumbs and undulate outward', duration: 1.4 },
  MOVIE: { category: 'noun', description: 'Open hand waves against opposite palm', duration: 1.3 },
  READ: { category: 'verb', description: 'Fingers scan up and down opposite palm', duration: 1.3 },
  WRITE: { category: 'verb', description: 'Pinch simulates writing across palm', duration: 1.3 },
  WORK: { category: 'verb', description: 'Fist taps wrist of opposite fist twice', duration: 1.2 },
  PLAY: { category: 'verb', description: 'Y-hands shake back and forth happily', duration: 1.2 },
  COMPUTER: { category: 'technology', description: 'C-hand arcs along opposite forearm', duration: 1.4 },
  SCIENCE: { category: 'academic', description: 'Alternating hands pour down in circular orbits', duration: 1.5 },
  MATH: { category: 'academic', description: 'Open hand slides in a structured pattern', duration: 1.2 },
  'IX-1P': { category: 'pronoun', description: 'Index finger points to own chest (I / me / my)', duration: 0.9 },
  'IX-2P': { category: 'pronoun', description: 'Index finger points to listener (you / your)', duration: 0.9 },
  'IX-3P': { category: 'pronoun', description: 'Index finger points aside (he / she / it / they)', duration: 0.9 },
  'IX-1P-PL': { category: 'pronoun', description: 'Index arcs across chest (we / us)', duration: 1.2 },
  'IX-2P-PL': { category: 'pronoun', description: 'Index sweeps across listeners (you all)', duration: 1.2 },
  'IX-3P-PL': { category: 'pronoun', description: 'Index sweeps aside (they / them)', duration: 1.2 },
  WHAT: { category: 'question', description: 'Open palms face up and shake gently', duration: 1.2 },
  WHERE: { category: 'question', description: 'Index finger wiggles side to side', duration: 1.2 },
  WHEN: { category: 'question', description: 'Index circles around opposite fingertip and lands', duration: 1.3 },
  WHY: { category: 'question', description: 'Hand leaves forehead and pulls into Y-shape', duration: 1.3 },
  WHO: { category: 'question', description: 'Index wiggles near chin', duration: 1.2 },
  HOW: { category: 'question', description: 'Curved finger backs twist upwards together', duration: 1.2 },
  WHICH: { category: 'question', description: 'Thumbs-up hands alternate up and down', duration: 1.2 },
  QUESTION: { category: 'question', description: 'Index crooks into a question mark in air', duration: 1.1 },
  NOT: { category: 'negation', description: 'Thumb flicks forward from under chin', duration: 1.1 },
  CAN: { category: 'modal', description: 'Fists drop downward together firmly', duration: 1.0 },
  WILL: { category: 'modal', description: 'Flat hand slices forward into future space', duration: 1.1 },
  FINISH: { category: 'aspect', description: 'Hands flip from palms-in to palms-out abruptly', duration: 1.1 },
  GO: { category: 'verb', description: 'Index fingers point and swing forward', duration: 1.1 },
  COME: { category: 'verb', description: 'Index fingers beckon inward', duration: 1.1 },
  WITH: { category: 'connector', description: 'Fists bring knuckles together in front', duration: 1.0 },
};

export interface SignPhrase {
  aliases: string[];
  glossTokens: string[];
}

export const SIGN_PHRASES: SignPhrase[] = [
  { aliases: ['hello nice to meet you', 'hello, nice to meet you', 'nice to meet you'], glossTokens: ['HELLO', 'NICE', 'MEET', 'IX-2P'] },
  { aliases: ['thank you for your help', 'thank you for helping', 'thank you'], glossTokens: ['THANK-YOU', 'HELP'] },
  { aliases: ['i love science and math', 'i love science', 'science and math'], glossTokens: ['IX-1P', 'LOVE', 'SCIENCE', 'MATH'] },
  { aliases: ['i want to learn coding', 'i want to learn code', 'learn coding'], glossTokens: ['IX-1P', 'WANT', 'LEARN', 'COMPUTER'] },
  { aliases: ['please help me with the project', 'please help me', 'help me'], glossTokens: ['PLEASE', 'HELP', 'IX-1P'] },
  { aliases: ['what is your name', "what's your name"], glossTokens: ['NAME', 'IX-2P', 'QUESTION'] },
];

export type TokenKind = 'sign' | 'fingerspelled';

export interface PlanToken {
  id: string;
  /** Display word as the user wrote it (or the mapped gloss for pronouns). */
  word: string;
  gloss: string;
  kind: TokenKind;
  category: string;
  description: string;
  duration: number;
  letters: string[];
}

export interface TranslationPlan {
  input: string;
  tokens: PlanToken[];
  rulesApplied: string[];
  totalDuration: number;
}

const PRONOUNS: Record<string, string> = {
  i: 'IX-1P', me: 'IX-1P', my: 'IX-1P', myself: 'IX-1P', mine: 'IX-1P',
  you: 'IX-2P', your: 'IX-2P', yours: 'IX-2P', yourself: 'IX-2P',
  he: 'IX-3P', him: 'IX-3P', his: 'IX-3P', she: 'IX-3P', her: 'IX-3P', hers: 'IX-3P', it: 'IX-3P', its: 'IX-3P',
  we: 'IX-1P-PL', us: 'IX-1P-PL', our: 'IX-1P-PL', ours: 'IX-1P-PL',
  they: 'IX-3P-PL', them: 'IX-3P-PL', their: 'IX-3P-PL', theirs: 'IX-3P-PL',
};

const WH_WORDS = ['what', 'where', 'when', 'why', 'who', 'how', 'which'];
const TIME_WORDS = ['today', 'tomorrow', 'yesterday', 'now', 'night', 'day'];
const DROPPED_WORDS = new Set([
  'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been',
  'the', 'a', 'an', 'of', 'to', 'in', 'at', 'and', 'do', 'does', 'did', 'for', 'this',
]);
const NEGATIONS = new Set(['not', 'dont', "don't", 'never']);

const WORD_MAP: Record<string, string> = {
  watching: 'SEE', watch: 'SEE', looks: 'SEE', look: 'SEE',
  movie: 'MOVIE', film: 'MOVIE',
  thanks: 'THANK-YOU', thank: 'THANK-YOU',
  learning: 'LEARN', learns: 'LEARN',
  teaching: 'TEACHER', teacher: 'TEACHER', instructor: 'TEACHER',
  loves: 'LOVE', loving: 'LOVE',
  likes: 'LIKE', liking: 'LIKE',
  wants: 'WANT', wanting: 'WANT',
  helps: 'HELP', helping: 'HELP',
  eating: 'EAT', eats: 'EAT', ate: 'EAT',
  reading: 'READ', reads: 'READ',
  writing: 'WRITE', writes: 'WRITE',
  working: 'WORK', works: 'WORK',
  playing: 'PLAY', plays: 'PLAY',
  comes: 'COME', coming: 'COME',
  goes: 'GO', going: 'GO', went: 'GO',
  schools: 'SCHOOL', books: 'BOOK',
  greeting: 'HELLO', hey: 'HELLO', hiya: 'HELLO',
  bye: 'GOODBYE', farewell: 'GOODBYE',
  cheers: 'THANK-YOU', please: 'PLEASE', sorry: 'SORRY', apologise: 'SORRY', apologize: 'SORRY',
  yes: 'YES', yeah: 'YES', no: 'NO', nope: 'NO',
  happy: 'HAPPY', sad: 'SAD', angry: 'SAD',
  good: 'GOOD', great: 'GOOD', bad: 'BAD',
  water: 'WATER', drink: 'DRINK', eat: 'EAT', food: 'FOOD',
  friend: 'FRIEND', friends: 'FRIEND', family: 'FAMILY',
  student: 'STUDENT', students: 'STUDENT', professor: 'TEACHER',
  computer: 'COMPUTER', computers: 'COMPUTER', coding: 'COMPUTER', code: 'COMPUTER',
  science: 'SCIENCE', maths: 'MATH', math: 'MATH',
  sign: 'SIGN', language: 'LANGUAGE', signing: 'SIGN',
};

export function normalizeText(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Translates everyday English into an ordered, timed gloss plan. */
export function translateEnglish(text: string): TranslationPlan {
  const input = (text ?? '').trim();
  const rulesApplied: string[] = [];
  if (!input) return { input, tokens: [], rulesApplied, totalDuration: 0 };

  const normalized = normalizeText(input);
  const phrase = SIGN_PHRASES.find((p) => p.aliases.some((a) => normalizeText(a) === normalized));
  const words = input.toLowerCase().replace(/['".,!?;:]/g, '').split(/\s+/).filter(Boolean);
  const isQuestion = /\?/.test(input) || /^(what|where|when|why|who|how|is|are|can|do|does|will|could|would)\b/.test(normalized);

  let glosses: string[] = [];
  const timeWords: string[] = [];
  const whWords: string[] = [];
  const negations: string[] = [];
  const sourceByGloss = new Map<string, string>();

  if (phrase) {
    glosses = phrase.glossTokens;
    rulesApplied.push(`Curated phrase: "${phrase.glossTokens.join(' ')}"`);
    for (const g of glosses) sourceByGloss.set(g, g);
  } else {
    const body: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const two = `${w} ${words[i + 1] ?? ''}`;
      if (two === 'thank you' || two === 'thanks you') {
        body.push('THANK-YOU'); i++; continue;
      }
      if (two === 'sign language') {
        body.push('SIGN', 'LANGUAGE'); i++; continue;
      }
      if (PRONOUNS[w]) { body.push(PRONOUNS[w]); continue; }
      if (WH_WORDS.includes(w)) { whWords.push(w.toUpperCase()); continue; }
      if (TIME_WORDS.includes(w)) { timeWords.push(w.toUpperCase()); continue; }
      if (NEGATIONS.has(w)) { negations.push('NOT'); continue; }
      if (w === 'no' && !isQuestion) { negations.push('NOT'); continue; }
      if (DROPPED_WORDS.has(w)) { continue; }
      body.push(WORD_MAP[w] ?? w.toUpperCase());
    }
    glosses = [...timeWords, ...body, ...negations, ...whWords];
    if (isQuestion && whWords.length === 0 && glosses.length > 0) glosses.push('QUESTION');
    if (timeWords.length) rulesApplied.push('Time-topic-comment: time words signed first');
    if (whWords.length) rulesApplied.push('WH-movement: question words signed last');
    if (negations.length) rulesApplied.push('Negation: NOT follows the verb');
    if (isQuestion && whWords.length === 0) rulesApplied.push('Yes/no question marker appended');
    if (DROPPED_WORDS.has(words[0] ?? '') || body.length < words.length) rulesApplied.push('Copulas and articles omitted');
    for (const g of glosses) sourceByGloss.set(g, g);
  }

  // Deduplicate consecutive repeats (from phrase merges above).
  glosses = glosses.filter((g, i) => i === 0 || g !== glosses[i - 1]);

  const tokens: PlanToken[] = [];
  let running = 0;
  glosses.forEach((gloss, index) => {
    const info = GLOSS_LEXICON[gloss];
    if (info) {
      tokens.push({
        id: `t${index}-${gloss}`,
        word: sourceByGloss.get(gloss) ?? gloss,
        gloss,
        kind: 'sign',
        category: info.category,
        description: info.description,
        duration: info.duration,
        letters: [],
      });
      running += info.duration;
    } else {
      const letters = gloss.replace(/[^A-Z0-9]/g, '').split('');
      const perLetter = 0.4;
      const duration = Math.max(0.8, letters.length * perLetter);
      tokens.push({
        id: `t${index}-${gloss}`,
        word: gloss.toLowerCase(),
        gloss,
        kind: 'fingerspelled',
        category: 'fingerspelling',
        description: `Fingerspelled: ${letters.join(' · ')}`,
        duration,
        letters,
      });
      running += duration;
    }
  });

  return { input, tokens, rulesApplied, totalDuration: running };
}

/** Short human label for a gloss (used by chips and the caption line). */
export function friendlyGloss(gloss: string): string {
  return gloss.replace('IX-1P-PL', 'WE').replace('IX-2P-PL', 'YOU-ALL').replace('IX-3P-PL', 'THEY')
    .replace('IX-1P', 'ME').replace('IX-2P', 'YOU').replace('IX-3P', 'THEM')
    .replace('THANK-YOU', 'THANK YOU').replace(/-/g, ' ');
}
