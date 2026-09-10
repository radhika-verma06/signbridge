import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { VideoLesson, type VideoLessonHandle } from './components/VideoLesson';
import { SideBySideLesson, type SideBySideLessonHandle } from './components/SideBySideLesson';
import { TranscriptPanel } from './components/TranscriptPanel';
import { EvaSignerPanel } from './components/EvaSignerPanel';
import { LearningToolbar } from './components/LearningToolbar';
import { InterpretPanel } from './components/InterpretPanel';
import { ExplainPanel } from './components/ExplainPanel';
import { AskPanel } from './components/AskPanel';
import { NewtonVisualiser } from './components/NewtonVisualiser';
import { AboutModal } from './components/AboutModal';
import { Footer } from './components/Footer';
import { allLines } from './services/transcriptionProvider';
import { buildLessonContext } from './services/lessonContext';
import { SignConceptResolver } from './services/signConceptResolver';
import { learningAI } from './services/learningAIProvider';
import { preload } from './services/auslanLexiconProvider';
import { useGuidedDemo } from './hooks/useGuidedDemo';
import type { InterpretResult } from './services/learningAIProvider';
import type { ChatMessage, ConceptId, TranscriptLine } from './types';
import type { Lesson } from './components/SideBySideLesson';

interface SideBySideManifest { lessons: Lesson[]; }

const TRANSCRIPT_LINES = allLines();
const PRELOAD_CONCEPTS: ConceptId[] = [
  'acceleration', 'force', 'mass', 'equation', 'push', 'move',
  'increase', 'decrease', 'more', 'same', 'fast', 'slow', 'decelerate', 'object',
];

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Sentinel transcript line for the side-by-side lessons: while their video
 * plays, Eva signs continuously (same behaviour as the main lecture mode),
 * even though those lessons have no concept transcript.
 */
const SIDE_BY_SIDE_SIGNING_LINE: TranscriptLine = {
  id: 'side-by-side-signing',
  start: 0,
  end: 0,
  text: '',
};

export default function App() {
  // --- lesson mode: 'split' (NASA video + 2D signer) or 'sidebyside' (1-min composite) ---
  const [lessonMode, setLessonMode] = useState<'split' | 'sidebyside'>('split');
  // --- side-by-side lesson playlist (fetched from public/lessons.json) ---
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeSideBySide, setActiveSideBySide] = useState<Lesson | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('lessons.json')
      .then((r) => r.ok ? r.json() as Promise<SideBySideManifest> : Promise.resolve({ lessons: [] }))
      .then((m) => { if (!cancelled) { setLessons(m.lessons); if (m.lessons[0]) setActiveSideBySide(m.lessons[0]); } })
      .catch(() => { /* fall back to hard-coded single video if fetch fails */ });
    return () => { cancelled = true; };
  }, []);

  // --- lecture playback state (the video element is the master clock) ---
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sideBySidePlaying, setSideBySidePlaying] = useState(false);
  const videoRef = useRef<VideoLessonHandle>(null);
  const sideBySideRef = useRef<SideBySideLessonHandle>(null);

  // --- accessibility / layer toggles ---
  const [captionsOn, setCaptionsOn] = useState(true);
  const [signOn, setSignOn] = useState(true);

  // --- signed learning ---
  const [, setActiveConcept] = useState<ConceptId | null>(null);
  const [, setSignRequestToken] = useState(0);
  const [showTechnical, setShowTechnical] = useState(false);
  const resolverRef = useRef(new SignConceptResolver());

  // --- interpret / explain / ask ---
  const [interpretOpen, setInterpretOpen] = useState(false);
  const [interpretResult, setInterpretResult] = useState<InterpretResult | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainConcept, setExplainConcept] = useState<ConceptId>('acceleration');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // --- visualise ---
  const [force, setForce] = useState(5);
  const [mass, setMass] = useState(5);

  const [aboutOpen, setAboutOpen] = useState(false);

  const interpretPanelRef = useRef<HTMLDivElement>(null);
  const explainPanelRef = useRef<HTMLDivElement>(null);
  const askSectionRef = useRef<HTMLDivElement>(null);
  const visualiserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    preload(PRELOAD_CONCEPTS);
  }, []);

  const lessonContext = useMemo(() => buildLessonContext(currentTime, TRANSCRIPT_LINES), [currentTime]);

  const triggerSign = useCallback((concept: ConceptId) => {
    resolverRef.current.forceShow(concept, currentTime);
    setActiveConcept(concept);
    setSignRequestToken((t) => t + 1);
    // Also dispatch to Eva iframe so manual concept clicks drive the 3D avatar.
    const evaFrame = document.querySelector<HTMLIFrameElement>('iframe[title*="Eva"]');
    if (evaFrame?.contentWindow) {
      evaFrame.contentWindow.postMessage(
        { type: 'SIGNBRIDGE_BULK', glosses: [String(concept).toUpperCase()] },
        'http://127.0.0.1:5070',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);

  // Automatic sign triggering from lesson context, cooldown-gated.
  useEffect(() => {
    if (!signOn) return;
    const picked = resolverRef.current.pick(lessonContext.currentConcepts, currentTime);
    if (picked) {
      setActiveConcept(picked);
      setSignRequestToken((t) => t + 1);
      // Dispatch to Eva iframe so concept-driven signing also reaches the 3D avatar
      const evaFrame = document.querySelector<HTMLIFrameElement>('iframe[title*="Eva"]');
      if (evaFrame?.contentWindow) {
        evaFrame.contentWindow.postMessage(
          { type: 'SIGNBRIDGE_GLOSS', glosses: [String(picked).toUpperCase()] },
          'http://127.0.0.1:5070',
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonContext.currentConcepts.join(','), signOn]);

  const handleSeek = useCallback((time: number) => videoRef.current?.seek(time), []);

  const openInterpret = useCallback(() => {
    const result = learningAI.interpret(lessonContext.currentLine, lessonContext.primaryConcept);
    setInterpretResult(result);
    setInterpretOpen(true);
    setExplainOpen(false);
    requestAnimationFrame(() => interpretPanelRef.current?.focus());
  }, [lessonContext]);

  const openExplain = useCallback(() => {
    setExplainConcept(lessonContext.primaryConcept ?? 'acceleration');
    setExplainOpen(true);
    setInterpretOpen(false);
    requestAnimationFrame(() => explainPanelRef.current?.focus());
  }, [lessonContext.primaryConcept]);

  const askQuestion = useCallback((question: string) => {
    const learnerMessage: ChatMessage = { id: nextId('m'), role: 'learner', text: question };
    const answer = learningAI.answer(question);
    const responseMessage: ChatMessage = {
      id: nextId('m'),
      role: 'signbridge',
      text: answer.text,
      concepts: answer.concepts,
    };
    setMessages((prev) => [...prev, learnerMessage, responseMessage]);
    if (answer.concepts[0]) triggerSign(answer.concepts[0]);
  }, [triggerSign]);

  // --- Guided demo: drives the exact same actions a presenter would click ---
  const demoActions = useMemo(
    () => ({
      reset: () => {
        setInterpretOpen(false);
        setExplainOpen(false);
        setMessages([]);
        setForce(5);
        setMass(5);
        setCaptionsOn(true);
        setSignOn(true);
        setActiveConcept(null);
        resolverRef.current.reset();
        videoRef.current?.seek(0);
      },
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => videoRef.current?.seek(time),
      openInterpret,
      closeInterpret: () => setInterpretOpen(false),
      openExplain,
      closeExplain: () => setExplainOpen(false),
      openAsk: () => askSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      askQuestion,
      scrollToAsk: () => askSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      scrollToVisualiser: () => visualiserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      setForce,
      setMass,
      endCleanly: () => {
        setInterpretOpen(false);
      },
    }),
    [openInterpret, openExplain, askQuestion],
  );

  const { demoRunning, demoStepLabel, startDemo, stopDemo } = useGuidedDemo(demoActions);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Header
        demoRunning={demoRunning}
        onStartDemo={startDemo}
        onStopDemo={stopDemo}
        onShowAbout={() => setAboutOpen(true)}
      />

      {demoRunning && demoStepLabel && (
        <div className="bg-gold-500 text-navy-900 text-sm font-medium text-center py-2 px-4" role="status">
          {demoStepLabel}
        </div>
      )}

      <main id="main-content" className="flex-1">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-8">
          {/* Orientation — what this page is and how to use it */}
          <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
            A real NASA lesson aboard the ISS, made accessible end to end. Press play —
            captions and <span className="font-semibold text-ink">Eva signs along live</span>.
            Then read the transcript, ask questions, and try the physics yourself.
          </p>

          {/* Lesson mode switcher — small toggle above the lesson grid */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
              Step 1 · Watch &amp; sign
            </p>
            <div className="flex items-center justify-end gap-2">
            <span className="text-xs uppercase tracking-wider text-ink-faint mr-2">Lesson view</span>
            <button
              type="button"
              onClick={() => setLessonMode('split')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                lessonMode === 'split'
                  ? 'bg-navy-900 text-paper'
                  : 'bg-paper text-ink-soft border border-line hover:border-navy-700'
              }`}
            >
              NASA + Auslan signer
            </button>
            <button
              type="button"
              onClick={() => setLessonMode('sidebyside')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                lessonMode === 'sidebyside'
                  ? 'bg-navy-900 text-paper'
                  : 'bg-paper text-ink-soft border border-line hover:border-navy-700'
              }`}
            >
              Side-by-side real ASL
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch">
            {lessonMode === 'sidebyside' ? (
              <SideBySideLesson
                ref={sideBySideRef}
                src={activeSideBySide?.videoSrc || 'videos/inside_you.mp4'}
                lessons={lessons}
                onLessonChange={setActiveSideBySide}
                onPlayingChange={setSideBySidePlaying}
              />
            ) : (
              <VideoLesson
                ref={videoRef}
                src="videos/newtons-second-law.webm"
                captionsOn={captionsOn}
                currentLine={lessonContext.currentLine}
                currentTime={currentTime}
                duration={duration}
                playing={isPlaying}
                playbackRate={playbackRate}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onPlayingChange={setIsPlaying}
                onSetPlaybackRate={setPlaybackRate}
              />
            )}

            <EvaSignerPanel
              enabled={signOn}
              currentLine={
                lessonMode === 'split'
                  ? lessonContext.currentLine
                  : sideBySidePlaying
                    ? SIDE_BY_SIDE_SIGNING_LINE
                    : null
              }
              playing={lessonMode === 'split' ? isPlaying : sideBySidePlaying}
            />
            </div>
          </div>

          <LearningToolbar
            captionsOn={captionsOn}
            signOn={signOn}
            onToggleCaptions={() => setCaptionsOn((c) => !c)}
            onToggleSign={() => setSignOn((s) => !s)}
            onInterpret={openInterpret}
            onExplain={openExplain}
            onAsk={() => askSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            onVisualise={() => visualiserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          />

          {interpretOpen && interpretResult && (
            <InterpretPanel
              ref={interpretPanelRef}
              result={interpretResult}
              onShowSigned={() => interpretResult.keyConcept && triggerSign(interpretResult.keyConcept)}
              onClose={() => setInterpretOpen(false)}
            />
          )}

          {explainOpen && (
            <ExplainPanel
              ref={explainPanelRef}
              concept={explainConcept}
              onSeeVisually={() => visualiserRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              onGotIt={() => setExplainOpen(false)}
            />
          )}

          <TranscriptPanel
            lines={TRANSCRIPT_LINES}
            currentLineId={lessonContext.currentLine?.id ?? null}
            onSeek={handleSeek}
          />

          <div ref={askSectionRef}>
            <AskPanel messages={messages} onAsk={askQuestion} />
          </div>

          <NewtonVisualiser
            ref={visualiserRef}
            force={force}
            mass={mass}
            onForceChange={setForce}
            onMassChange={setMass}
          />

          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowTechnical((t) => !t)}
              className="text-xs text-ink-faint underline decoration-dotted hover:text-ink-soft"
            >
              {showTechnical ? 'Hide technical mode' : 'Technical mode'}
            </button>
          </div>
        </div>
      </main>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <Footer />
    </div>
  );
}
