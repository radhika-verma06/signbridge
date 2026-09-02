import type { ConceptId, ExplanationVariant, LessonConcept, QuickQuestion } from '../types';

export const QUICK_QUESTIONS: QuickQuestion[] = [
  { id: 'q-fma', label: 'What is F = ma?', question: 'What is F = ma?' },
  { id: 'q-why-mass', label: 'Why does more mass reduce acceleration?', question: 'Why does increasing mass reduce acceleration?' },
  { id: 'q-force-double', label: 'What if force doubles?', question: 'What happens if force doubles?' },
  { id: 'q-mass-double', label: 'What if mass doubles?', question: 'What happens if mass doubles?' },
  { id: 'q-what-accel', label: 'What is acceleration?', question: 'What is acceleration?' },
  { id: 'q-example', label: 'Give me another example', question: 'Give me another example.' },
];

/**
 * Controlled concept vocabulary for the Newton's Second Law lesson, matched
 * against transcript text. This is concept-level (a handful of paraphrase
 * patterns per idea), not naive single-keyword substitution -- e.g. "mass"
 * resolves the same concept whether the lecturer says "mass", "massive", or
 * "how much stuff there is".
 */
export const CONCEPTS: LessonConcept[] = [
  {
    id: 'equation',
    label: 'F = ma',
    matchers: [/f\s*(equals|=)\s*m\s*a\b/i, /newton'?s second law/i],
  },
  {
    id: 'acceleration',
    label: 'Acceleration',
    matchers: [/accelerat\w*/i],
  },
  {
    id: 'force',
    label: 'Force',
    matchers: [/\bforce\b/i, /\bthrust\b/i, /\bpush(ed|ing)?\b/i, /\bpull(ed|ing)? (it |back)/i],
  },
  {
    id: 'mass',
    label: 'Mass',
    matchers: [/\bmass\b/i, /massive/i, /how much stuff/i],
  },
  {
    id: 'increase',
    label: 'Increase',
    matchers: [/\bbigger\b/i, /\bbiggest\b/i, /\bgreater\b/i, /\bincrease/i],
  },
  {
    id: 'decrease',
    label: 'Decrease',
    matchers: [/\bsmaller\b/i, /less massive/i, /\bsmall\b/i, /\bdecrease/i, /\breduc/i],
  },
  {
    id: 'more',
    label: 'More',
    matchers: [/\bmore\b/i, /\bextra\b/i],
  },
  {
    id: 'fast',
    label: 'Fast',
    matchers: [/\bfast(er)?\b/i, /\brapid/i],
  },
  {
    id: 'slow',
    label: 'Slow',
    matchers: [/\bslow(er|ly)?\b/i],
  },
  {
    id: 'decelerate',
    label: 'Decelerate',
    matchers: [/decelerat\w*/i, /slow(ing)? down/i],
  },
  {
    id: 'same',
    label: 'Same',
    matchers: [/\bsame\b/i, /\bequal amount/i],
  },
  {
    id: 'move',
    label: 'Move',
    matchers: [/\bmove(d|s|ment)?\b/i, /\bmoving\b/i, /\bflying\b/i],
  },
  {
    id: 'push',
    label: 'Push',
    matchers: [/\bpush(ed|ing)?\b/i, /\bbungee\b/i],
  },
  {
    id: 'object',
    label: 'Object',
    matchers: [/\bobject\b/i, /\bthing\b/i, /\bchapstick\b/i, /\bspaceship\b/i],
  },
];

const CONCEPT_PRIORITY: ConceptId[] = [
  'equation',
  'acceleration',
  'force',
  'mass',
  'increase',
  'decrease',
  'more',
  'decelerate',
  'fast',
  'slow',
  'push',
  'move',
  'same',
  'object',
];

const CONCEPT_BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

/** All concepts mentioned in a piece of text, in a fixed pedagogical priority order. */
export function resolveConcepts(text: string): ConceptId[] {
  const present = new Set<ConceptId>();
  for (const concept of CONCEPTS) {
    if (concept.matchers.some((re) => re.test(text))) present.add(concept.id);
  }
  return CONCEPT_PRIORITY.filter((id) => present.has(id));
}

/** The single most pedagogically important concept in a piece of text, if any. */
export function primaryConcept(text: string): ConceptId | null {
  const concepts = resolveConcepts(text);
  return concepts[0] ?? null;
}

export function conceptLabel(id: ConceptId): string {
  return CONCEPT_BY_ID.get(id)?.label ?? id;
}

/**
 * Short, faithful "what is being communicated right now" meanings, used by
 * Interpret. These summarise -- they do not simplify or add content beyond
 * what the lecturer said.
 */
export const INTERPRET_MEANINGS: Partial<Record<ConceptId, string>> = {
  equation: 'The lecturer is stating Newton’s Second Law itself: force equals mass times acceleration.',
  acceleration: 'The lecturer is describing how quickly the object’s speed is changing.',
  force: 'The lecturer is describing the push being applied to the object (here, the bungee launcher).',
  mass: 'The lecturer is describing how much matter the object has -- how heavy or light it is.',
  increase: 'The lecturer is describing the object getting bigger / more massive.',
  decrease: 'The lecturer is describing the object being smaller / less massive.',
  more: 'The lecturer is comparing this object to the previous one, which had less of this quantity.',
  fast: 'The lecturer is describing the object speeding up quickly.',
  slow: 'The lecturer is describing the object moving less quickly.',
  decelerate: 'The lecturer is describing the object slowing down.',
  same: 'The lecturer is emphasising that one quantity was kept unchanged between trials.',
  move: 'The lecturer is describing the object changing position.',
  push: 'The lecturer is describing the act of applying force with the bungee/hand.',
  object: 'The lecturer is referring to the item being launched (chapstick or toy spaceship).',
};

/**
 * At least two deterministic, high-quality explanation variants for the
 * major Newton's Second Law concepts, so "Explain" and "Explain another way"
 * work fully offline with no API key.
 */
export const EXPLANATIONS: Record<string, ExplanationVariant[]> = {
  acceleration: [
    {
      heading: "Let's explain that differently.",
      body: [
        'Imagine pushing two shopping trolleys with the same force.',
        'One trolley is empty. The other is full of groceries.',
        'The heavier trolley accelerates less, because the same force now has to move more mass.',
      ],
      emphasis: 'same force + more mass → less acceleration',
      concepts: ['acceleration', 'mass', 'force'],
    },
    {
      heading: "Here's another way to see it.",
      body: [
        'Think about pulling an empty suitcase versus a fully packed one across the same floor.',
        'You pull both with the same effort.',
        'The packed suitcase picks up speed more slowly — it has more mass for the same force to move.',
      ],
      emphasis: 'same force + more mass → less acceleration',
      concepts: ['acceleration', 'mass', 'force'],
    },
  ],
  force: [
    {
      heading: 'What "force" means here.',
      body: [
        'In this video, force is the push from the bungee launcher.',
        'Pulling it back the same amount each time applies roughly the same force.',
        'That lets the astronaut isolate mass as the only thing changing between trials.',
      ],
      emphasis: 'force = the push or pull acting on an object',
      concepts: ['force'],
    },
    {
      heading: 'Another angle on force.',
      body: [
        'Think of force like the strength of a shove.',
        'A rocket accelerates once its thrust (a force) is greater than its weight.',
        'More net force on the same object means more acceleration.',
      ],
      emphasis: 'more force + same mass → more acceleration',
      concepts: ['acceleration', 'force'],
    },
  ],
  mass: [
    {
      heading: 'What "mass" means here.',
      body: [
        'Mass is how much matter an object has — not its weight, which changes with gravity.',
        'The chapstick has very little mass; the big toy spaceship has a lot more.',
        'That is why the same bungee force sends them off at very different speeds.',
      ],
      emphasis: 'mass stays the same everywhere, even in microgravity',
      concepts: ['mass'],
    },
    {
      heading: 'Another way to think about mass.',
      body: [
        'Picture trying to push a bicycle versus pushing a car with the same effort.',
        'The car has far more mass, so it barely moves for that same push.',
        'More mass always means more resistance to being accelerated.',
      ],
      emphasis: 'more mass → harder to accelerate with the same force',
      concepts: ['acceleration', 'mass'],
    },
  ],
  equation: [
    {
      heading: 'What F = ma is really saying.',
      body: [
        'F is the net force on an object, in newtons.',
        'm is the object’s mass, in kilograms.',
        'a is the resulting acceleration, in metres per second squared.',
        'The equation just says: acceleration depends on how hard you push, and how much you’re pushing.',
      ],
      emphasis: 'a = F ÷ m',
      concepts: ['equation', 'force', 'mass', 'acceleration'],
    },
    {
      heading: 'A second way to read F = ma.',
      body: [
        'Rearranged, acceleration equals force divided by mass: a = F / m.',
        'Push harder (more F) and acceleration goes up.',
        'Push the same amount on something heavier (more m) and acceleration goes down.',
      ],
      emphasis: 'more force OR less mass → more acceleration',
      concepts: ['equation', 'force', 'mass', 'acceleration'],
    },
  ],
};

const OUT_OF_SCOPE_RESPONSE =
  'This prototype answers questions about this Newton’s Second Law lesson. A future version would use the full lecture context with a real language model.';

/**
 * Deterministic, local "tutoring" answers, scoped to this lesson, so Ask
 * SignBridge works fully offline. Kept behind LearningAIProvider so a real
 * LLM can replace this implementation later without touching the UI.
 */
export function answerQuestion(rawQuestion: string): { text: string; concepts: ConceptId[] } {
  const q = rawQuestion.toLowerCase();

  const mentionsMass = /mass/.test(q);
  const mentionsForce = /force/.test(q);
  const mentionsDouble = /double|twice|2x/.test(q);
  const mentionsFma = /f\s*=\s*m\s*\*?\s*a|what is f ?= ?ma|fma/.test(q);
  const wantsExample = /another example|different example|example/.test(q);
  const asksWhatIsAccel = /what is acceleration/.test(q);

  if (mentionsFma) {
    return {
      text:
        'F = m × a is Newton’s second law. F is the net force acting on an object, measured in newtons. ' +
        'm is the object’s mass, measured in kilograms. a is the resulting acceleration, in metres per second squared. ' +
        'In the video, the bungee provides F, the chapstick or spaceship is m, and how fast it flies off is a.',
      concepts: ['equation', 'force', 'mass', 'acceleration'],
    };
  }

  if (asksWhatIsAccel) {
    return {
      text:
        'Acceleration is how quickly an object’s velocity changes. In the video, it’s shown by how fast the ' +
        'chapstick or toy spaceship speeds up right after the bungee releases it.',
      concepts: ['acceleration'],
    };
  }

  if (wantsExample && !mentionsForce && !mentionsMass) {
    return {
      text:
        'Here’s another way to picture it: pulling an empty suitcase versus a fully packed one across the same floor. ' +
        'With the same effort, the packed suitcase speeds up more slowly, because there’s more mass for that force to move.',
      concepts: ['acceleration', 'mass', 'force'],
    };
  }

  if (mentionsForce && mentionsDouble) {
    return {
      text:
        'If you double the force and keep the mass the same, the acceleration also doubles. ' +
        'Force and acceleration move together — that’s the "directly proportional" part of F = ma.',
      concepts: ['acceleration', 'equation', 'force'],
    };
  }

  if (mentionsMass && mentionsDouble) {
    return {
      text:
        'If you double the mass and keep the force the same, the acceleration is cut in half. ' +
        'More mass means the same push produces less acceleration — that’s the "inversely proportional" part of F = ma.',
      concepts: ['acceleration', 'equation', 'mass'],
    };
  }

  if (mentionsMass && /why|reduce/.test(q)) {
    return {
      text:
        'Think of the bungee launcher in the video: it pulls back the same amount (the same force) for the chapstick ' +
        'and the toy spaceship. The spaceship has more mass, so that same force gives it less acceleration — same ' +
        'force, more mass, less acceleration.',
      concepts: ['acceleration', 'mass', 'force'],
    };
  }

  return { text: OUT_OF_SCOPE_RESPONSE, concepts: [] };
}
