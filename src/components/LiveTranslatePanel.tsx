import { useEffect, useMemo, useRef, useState } from 'react';
import { SignerRenderer } from './SignerRenderer';
import { EVA_SIGN_POOL } from './EvaSignerPanel';
import { signProvider } from '../services/signRendererProvider';
import {
  translateEnglish,
  friendlyGloss,
  type PlanToken,
} from '../services/glossEngine';
import { proceduralFrameSet, fingerspelledFrameSet } from '../services/proceduralSigns';
import { ENGLISH_TO_EVA_GLOSS } from '../services/evaDictionary';
import type { PoseFrameSet } from '../types';

/**
 * LiveTranslatePanel — type English, watch Eva sign it.
 *
 * Eva (GTI Performs 3D avatar, served from the local host on :5070) is the
 * signer here. Every token in the translation plan is dispatched to her,
 * paced to the token's duration; words outside her dictionary fingerspell
 * letter by letter, so she is always visibly signing.
 *
 * The 2D Auslan-derived canvas figure remains only as an automatic fallback
 * whenever the Eva host can't be reached, so the panel degrades gracefully
 * instead of showing an empty stage.
 *
 * Token tiers shown on the plan chips:
 *   1. Auslan (gold)     — real captured motion from the lesson lexicon (2D fallback plays it directly).
 *   2. Gloss sign (teal) — procedurally synthesised keyframes for the everyday lexicon.
 *   3. Fingerspelt (coral) — held letter handshapes for anything unknown.
 */

interface LiveTranslatePanelProps {
  /** Called whenever playback reaches a new token, so other signers can follow along. */
  onTokenDispatch?: (glosses: string[]) => void;
}

type StepSource =
  | { kind: 'auslan'; concept: string }
  | { kind: 'eva'; gloss: string }
  | { kind: 'gloss'; gloss: string; description: string }
  | { kind: 'spell'; letters: string[]; word: string };

interface Step {
  token: PlanToken;
  source: StepSource;
}

const EVA_HOST = 'http://127.0.0.1:5070';
const EVA_PAGE = `${EVA_HOST}/performs/host.html`;
const EVA_ORIGIN = EVA_HOST;

const PRESET_PHRASES = [
  'Hello, nice to meet you.',
  'Thank you for your help.',
  'I love science and math.',
  'I want to learn coding.',
  'What is your name?',
];

/** Everyday English words that map onto the real Auslan lesson lexicon. */
const WORD_TO_AUSLAN: Record<string, string> = {
  force: 'force', mass: 'mass', accelerate: 'acceleration', acceleration: 'acceleration',
  push: 'push', pushed: 'push', pushing: 'push', move: 'move', moved: 'move', moving: 'move',
  more: 'more', same: 'same', equal: 'equation', equals: 'equation', equation: 'equation',
  fast: 'fast', faster: 'fast', slow: 'slow', slower: 'slow', decelerate: 'decelerate',
  increase: 'increase', decrease: 'decrease', object: 'object',
};

function stepForToken(token: PlanToken): Step {
  const lowerWord = token.word.toLowerCase();
  const auslan = WORD_TO_AUSLAN[lowerWord];
  if (auslan) return { token, source: { kind: 'auslan', concept: auslan } };
  const evaGloss = ENGLISH_TO_EVA_GLOSS[lowerWord];
  if (evaGloss) return { token, source: { kind: 'eva', gloss: evaGloss } };
  if (token.kind === 'sign') {
    return { token, source: { kind: 'gloss', gloss: token.gloss, description: token.description } };
  }
  return { token, source: { kind: 'spell', letters: token.letters, word: token.word } };
}

function sourceLabel(step: Step): { text: string; tone: 'gold' | 'eva' | 'teal' | 'coral' } {
  if (step.source.kind === 'auslan') return { text: 'Auslan-derived', tone: 'gold' };
  if (step.source.kind === 'eva') return { text: `Eva sign · ${step.source.gloss}`, tone: 'eva' };
  if (step.source.kind === 'gloss') return { text: 'Gloss sign', tone: 'teal' };
  return { text: 'Fingerspelt', tone: 'coral' };
}

const TONE_CLASSES: Record<'gold' | 'eva' | 'teal' | 'coral', string> = {
  gold: 'bg-gold-500/15 text-gold-700',
  eva: 'bg-navy-900/10 text-navy-700',
  teal: 'bg-teal-500/10 text-teal-700',
  coral: 'bg-coral-500/10 text-coral-600',
};

/** Pacing for dispatched signs so Eva's motions don't overlap. */
const LETTER_MS = 430;
const SIGN_PAD_MS = 220;

export function LiveTranslatePanel({ onTokenDispatch }: LiveTranslatePanelProps) {
  const [text, setText] = useState('Hello, nice to meet you.');
  const [plan, setPlan] = useState(() => translateEnglish('Hello, nice to meet you.'));
  const [stepIndex, setStepIndex] = useState(0);
  const [frames, setFrames] = useState<PoseFrameSet | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [replayToken, setReplayToken] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [evaState, setEvaState] = useState<'checking' | 'ok' | 'down'>('checking');
  const [evaCheckToken, setEvaCheckToken] = useState(0);
  const tokenRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const evaFrameRef = useRef<HTMLIFrameElement>(null);

  const steps = useMemo<Step[]>(() => plan.tokens.map(stepForToken), [plan]);
  const currentStep = steps[stepIndex] ?? null;

  // --- Eva host availability probe (opaque fetch: resolves iff the host answers) ---
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    setEvaState('checking');
    fetch(EVA_PAGE, { mode: 'no-cors', signal: controller.signal })
      .then(() => { if (!cancelled) setEvaState('ok'); })
      .catch(() => { if (!cancelled) setEvaState('down'); });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [evaCheckToken]);

  // Greet on load: as soon as Eva's host answers, sign the default phrase once.
  useEffect(() => {
    if (evaState !== 'ok') return;
    setStepIndex(0);
    setReplayToken((t) => t + 1);
    setPlaying(true);
  }, [evaState]);

  // --- 2D fallback frames (also keeps real Auslan motion ready for auslan-tier tokens) ---
  useEffect(() => {
    if (!currentStep) { setFrames(null); return; }
    let cancelled = false;
    if (currentStep.source.kind === 'auslan') {
      signProvider.resolve(currentStep.source.concept as Parameters<typeof signProvider.resolve>[0])
        .then((result) => {
          if (cancelled) return;
          setFrames(result?.frames ?? null);
          setReplayToken((t) => t + 1);
        });
    } else if (currentStep.source.kind === 'gloss') {
      setFrames(proceduralFrameSet(currentStep.source.gloss, currentStep.token.duration));
      setReplayToken((t) => t + 1);
    } else if (currentStep.source.kind === 'eva') {
      // 2D fallback for an Eva-dictionary sign: fingerspell the English word.
      setFrames(fingerspelledFrameSet(currentStep.token.word.toUpperCase().replace(/[^A-Z0-9]/g, '').split('')));
      setReplayToken((t) => t + 1);
    } else {
      setFrames(fingerspelledFrameSet(currentStep.source.letters));
      setReplayToken((t) => t + 1);
    }
    return () => { cancelled = true; };
  }, [currentStep]);

  const evaDispatch = (glosses: string[]) => {
    if (onTokenDispatch) onTokenDispatch(glosses);
    const win = evaFrameRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage({ type: 'SIGNBRIDGE_GLOSS', glosses }, EVA_ORIGIN);
    } catch {
      // Eva iframe momentarily unreachable — ignore.
    }
  };

  const advance = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  };

  // Eva-driven playback: dispatch the current token, wait its duration, advance.
  // Letters dispatch one-by-one so fingerspelling reads clearly on the 3D avatar.
  useEffect(() => {
    if (evaState !== 'ok' || !playing || !currentStep) return;
    let interval: number | undefined;
    let done: number;

    if (currentStep.source.kind === 'spell') {
      const letters = currentStep.source.letters.length ? currentStep.source.letters : ['?'];
      let i = 0;
      evaDispatch([letters[0]]);
      interval = window.setInterval(() => {
        i += 1;
        if (i < letters.length) evaDispatch([letters[i]]);
      }, LETTER_MS);
      done = window.setTimeout(() => advance(), letters.length * LETTER_MS + SIGN_PAD_MS);
    } else if (currentStep.source.kind === 'eva') {
      // In Eva's own NGT dictionary — she performs her real recorded sign.
      evaDispatch([currentStep.source.gloss]);
      done = window.setTimeout(advance, Math.max(1.1, currentStep.token.duration) * 1000);
    } else {
      const gloss = currentStep.token.gloss;
      if (EVA_SIGN_POOL.includes(gloss)) {
        evaDispatch([gloss]);
      } else {
        // Not in Eva's dictionary — fingerspell the word so she still signs it.
        const letters = gloss.replace(/[^A-Z]/g, '').split('');
        evaDispatch(letters);
      }
      done = window.setTimeout(advance, (currentStep.token.duration * 1000) / Math.max(0.5, playbackRate));
    }

    return () => {
      if (interval) window.clearInterval(interval);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaState, playing, stepIndex, replayToken, playbackRate]);

  const translate = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setInputError('Type a word or phrase first.');
      return;
    }
    setInputError(null);
    const nextPlan = translateEnglish(trimmed);
    if (nextPlan.tokens.length === 0) {
      setInputError('Nothing to sign yet — try a full word.');
      return;
    }
    setPlan(nextPlan);
    setStepIndex(0);
    setPlaybackRate(1);
    setReplayToken((t) => t + 1);
    setPlaying(true);
  };

  const replay = (rate = 1) => {
    setPlaybackRate(rate);
    setStepIndex(0);
    setReplayToken((t) => t + 1);
    setPlaying(true);
  };

  const finished = steps.length > 0 && stepIndex >= steps.length - 1 && !playing;

  return (
    <section aria-labelledby="live-translate-heading" className="rounded-xl2 border border-line bg-white shadow-raised overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-teal-500/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-full ${playing ? 'bg-coral-500 live-dot' : 'bg-line'}`}
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Playground</p>
            <h2 id="live-translate-heading" className="font-display text-xl font-semibold text-ink leading-tight">
              Live Translate
            </h2>
          </div>
        </div>
        <p className="text-xs text-ink-faint max-w-md">
          Not part of the lesson — a free sandbox. Type any English and Eva signs it.
        </p>
        <span className="ml-auto rounded-full bg-navy-900 px-3 py-1 font-mono text-[11px] font-medium tracking-wide text-paper tabular-nums">
          {steps.length > 0 ? `${Math.min(stepIndex + 1, steps.length)} / ${steps.length}` : '—'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        {/* Signer stage — Eva first, 2D fallback if her host is down */}
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="relative bg-navy-900 aspect-square max-h-[26rem] w-full">
            {evaState === 'ok' ? (
              <iframe
                ref={evaFrameRef}
                src={EVA_PAGE}
                title="GTI Performs Eva — live translate"
                allow="autoplay; fullscreen"
                className="w-full h-full border-0"
              />
            ) : frames ? (
              <SignerRenderer
                frames={frames}
                playing={playing}
                playbackRate={playbackRate}
                onEnded={() => {
                  if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
                  else setPlaying(false);
                }}
                replayToken={replayToken}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <p className="text-sm text-paper/50">
                  {evaState === 'checking' ? 'Looking for Eva…' : 'Type a phrase and press Sign it.'}
                </p>
              </div>
            )}
            {playing && (
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-coral-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-card">
                <span aria-hidden="true" className="live-dot inline-block h-2 w-2 rounded-full bg-white" />
                Signing
              </div>
            )}
            <div className="absolute bottom-3 right-3 rounded-full bg-navy-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-paper/80">
              {evaState === 'ok' ? 'Eva · 3D signer' : evaState === 'checking' ? 'Eva…' : '2D fallback'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
            <button
              type="button"
              onClick={() => replay(playbackRate)}
              disabled={steps.length === 0}
              className="rounded-md bg-teal-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-40 press"
            >
              {finished ? 'Replay' : 'Restart'}
            </button>
            <button
              type="button"
              onClick={() => replay(0.75)}
              disabled={steps.length === 0}
              className="rounded-md border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-teal-600 disabled:opacity-40"
            >
              0.75×
            </button>
            <button
              type="button"
              onClick={() => replay(1)}
              disabled={steps.length === 0}
              className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                playbackRate === 1 ? 'border-teal-600 bg-teal-500/10 text-teal-700' : 'border-line bg-paper text-ink'
              }`}
            >
              1×
            </button>
            {evaState === 'down' && (
              <button
                type="button"
                onClick={() => setEvaCheckToken((t) => t + 1)}
                className="rounded-md border border-coral-500 bg-coral-500/10 px-3 py-2 text-xs font-semibold text-coral-600 hover:bg-coral-500/20"
              >
                Reconnect Eva
              </button>
            )}
            <span className="ml-auto min-w-0 truncate text-xs text-ink-faint" aria-live="polite">
              {steps[stepIndex]
                ? `${friendlyGloss(steps[stepIndex].token.gloss)} — ${steps[stepIndex].token.description}`
                : ''}
            </span>
          </div>
        </div>

        {/* Input + plan */}
        <div className="px-5 py-4 space-y-4">
          <form
            onSubmit={(e) => { e.preventDefault(); translate(text); }}
            className="space-y-2"
          >
            <label htmlFor="live-translate-input" className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              English text
            </label>
            <textarea
              id="live-translate-input"
              value={text}
              onChange={(e) => { setText(e.target.value); setInputError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  translate(text);
                }
              }}
              rows={2}
              placeholder="Hello, nice to meet you."
              className="w-full resize-none rounded-lg border border-line bg-paper px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint/70 focus:border-teal-500 focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:bg-teal-600 press"
              >
                Sign it
              </button>
              {inputError && <p className="text-xs text-coral-600">{inputError}</p>}
            </div>
          </form>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Preset phrases">
            {PRESET_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => { setText(phrase); translate(phrase); }}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft transition-all hover:-translate-y-0.5 hover:border-teal-600 hover:text-ink"
              >
                {phrase}
              </button>
            ))}
          </div>

          {steps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Sign plan</p>
              <ol className="flex flex-wrap gap-1.5" aria-label="Gloss sequence">
                {steps.map((step, i) => {
                  const label = sourceLabel(step);
                  const isDone = i < stepIndex || (i === stepIndex && finished);
                  const isCurrent = i === stepIndex;
                  return (
                    <li key={step.token.id}>
                      <button
                        ref={(el) => { tokenRefs.current[i] = el; }}
                        type="button"
                        onClick={() => { setStepIndex(i); setPlaying(true); }}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`pop-in rounded-md border px-2.5 py-1.5 text-left transition-all ${
                          isCurrent
                            ? 'border-teal-600 bg-teal-500/10 ring-2 ring-teal-500/40'
                            : isDone
                              ? 'border-teal-600/40 bg-teal-500/5'
                              : 'border-line bg-paper hover:border-navy-700'
                        }`}
                      >
                        <span className={`block font-mono text-[11px] font-semibold ${isCurrent ? 'text-teal-700' : 'text-ink'}`}>
                          {friendlyGloss(step.token.gloss)}
                        </span>
                        <span className={`mt-0.5 block text-[10px] leading-tight ${TONE_CLASSES[label.tone]}`}>
                          {label.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {plan.rulesApplied.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Grammar applied</p>
              <ul className="space-y-1">
                {plan.rulesApplied.slice(0, 4).map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-xs text-ink-soft">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-500" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
            Everyday words marked "Eva sign" drive her real NGT dictionary signs; everything else
            fingerspells letter by letter. Auslan-derived steps (gold) use real captured motion in
            the 2D fallback. Neither is human-validated sign language output.
          </p>
        </div>
      </div>
    </section>
  );
}
