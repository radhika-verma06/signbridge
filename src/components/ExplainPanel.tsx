import { forwardRef, useState } from 'react';
import { ForceMassDiagram } from './ForceMassDiagram';
import { learningAI } from '../services/learningAIProvider';
import type { ConceptId } from '../types';

interface ExplainPanelProps {
  concept: ConceptId;
  onSeeVisually: () => void;
  onGotIt: () => void;
}

export const ExplainPanel = forwardRef<HTMLDivElement, ExplainPanelProps>(function ExplainPanel(
  { concept, onSeeVisually, onGotIt },
  ref,
) {
  const [variantIndex, setVariantIndex] = useState(0);
  const variant = learningAI.explain(concept, variantIndex);
  const count = learningAI.explanationCount(concept);

  if (!variant) {
    return (
      <div
        ref={ref}
        tabIndex={-1}
        role="region"
        aria-label="Simplified explanation"
        className="animate-slide-down rounded-xl border-2 border-gold-500 bg-white shadow-raised overflow-hidden"
      >
        <div className="px-5 py-4 sm:px-7 sm:py-6">
          <p className="text-sm text-ink-soft">
            There isn’t a prepared explanation for this concept yet. Try Ask SignBridge instead.
          </p>
          <button
            type="button"
            onClick={onGotIt}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label="Simplified explanation"
      className="animate-slide-down rounded-xl border-2 border-gold-500 bg-white shadow-raised overflow-hidden"
    >
      <div className="px-5 py-4 sm:px-7 sm:py-6">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-navy-900">{variant.heading}</h2>

        <div className="mt-4 space-y-2 text-ink-soft leading-relaxed max-w-2xl">
          {variant.body.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 items-center">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-line bg-paper p-3">
              <ForceMassDiagram
                massLevel={2}
                forceLevel={5}
                acceleration={4.2}
                caption="Empty trolley: same force produces more acceleration"
              />
              <p className="mt-1 text-center text-xs font-medium text-ink-faint">Empty &mdash; more acceleration</p>
            </div>
            <div className="rounded-lg border border-line bg-paper p-3">
              <ForceMassDiagram
                massLevel={9}
                forceLevel={5}
                acceleration={0.9}
                caption="Full trolley: same force produces less acceleration"
              />
              <p className="mt-1 text-center text-xs font-medium text-ink-faint">Full &mdash; less acceleration</p>
            </div>
          </div>

          <div className="rounded-lg bg-navy-900 px-5 py-5 text-center">
            <p className="font-mono text-3xl font-semibold text-paper">F = ma</p>
            <p className="mt-3 text-sm font-medium text-gold-400">{variant.emphasis}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {count > 1 && (
            <button
              type="button"
              onClick={() => setVariantIndex((i) => (i + 1) % count)}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy-700 transition-colors"
            >
              Explain another way
            </button>
          )}
          <button
            type="button"
            onClick={onSeeVisually}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy-700 transition-colors"
          >
            See it visually
          </button>
          <button
            type="button"
            onClick={onGotIt}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy-700 transition-colors ml-auto"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
});
