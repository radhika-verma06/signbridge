import { useEffect, useRef } from 'react';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-heading"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-raised"
      >
        <div className="px-6 py-5 sm:px-8 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id="about-heading" className="font-display text-2xl font-semibold text-navy-900">
              About this prototype
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-faint hover:border-navy-700 hover:text-navy-900"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-soft">
            <p>
              SignBridge is a proof-of-concept accessibility/education companion for Deaf and
              Auslan-first learners. This build demonstrates one real, controlled lesson end to end.
            </p>

            <div>
              <h3 className="font-semibold text-ink">What&rsquo;s real</h3>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>A real recorded lesson: NASA/ISS &ldquo;STEMonstrations: Newton&rsquo;s Second Law of Motion.&rdquo;</li>
                <li>A real, timestamped transcript, generated locally with OpenAI Whisper against the video&rsquo;s own audio.</li>
                <li>A controlled concept-resolution engine mapping transcript language to Newton&rsquo;s Second Law concepts.</li>
                <li>
                  Real Auslan motion for a small vocabulary, sourced from MM-WLAuslan (CC BY-NC-SA 4.0),
                  pose-extracted locally with MediaPipe Holistic and driven directly by that landmark data
                  &mdash; nothing here is hand-animated or invented.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ink">What&rsquo;s intentionally limited</h3>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>The signed vocabulary is small (12 concepts). Unsupported concepts fall back to captions only &mdash; they never show an invented sign.</li>
                <li>Force and mass specifically have no signed support: no confident physics-register Auslan sign was found for either in the source dictionary.</li>
                <li>Multi-sign sequences (when shown) are experimental composed sequences of individual concept signs, not a claim of correct Auslan sentence grammar.</li>
                <li>No sign here has been checked by a fluent Auslan signer or linguist &mdash; that human validation is future work.</li>
                <li>Explain and Ask use deterministic local logic, not a live AI model, so the demo works offline with no API key.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ink">Future path</h3>
              <p className="mt-1">
                Every provider behind this UI (transcription, concept resolution, explanations, answers,
                and signing) is written behind a small interface. Signing today comes from a hand-built
                pose lexicon; a future version could swap in a generative sign-production model, a
                different dataset, or human-recorded validated clips without changing the interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
