import { forwardRef } from 'react';
import { conceptLabel } from '../data/concepts';
import type { InterpretResult } from '../services/learningAIProvider';

interface InterpretPanelProps {
  result: InterpretResult;
  onShowSigned: () => void;
  onClose: () => void;
}

export const InterpretPanel = forwardRef<HTMLDivElement, InterpretPanelProps>(function InterpretPanel(
  { result, onShowSigned, onClose },
  ref,
) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label="Interpretation of the current moment"
      className="animate-slide-down rounded-xl border-2 border-navy-700 bg-white shadow-raised overflow-hidden"
    >
      <div className="px-5 py-4 sm:px-7 sm:py-6">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-navy-900">
          What the lecturer is communicating right now
        </h2>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Original</p>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed">{result.original}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Key concept</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">
              {result.keyConcept ? conceptLabel(result.keyConcept) : 'None detected'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Meaning</p>
            <p className="mt-1 text-sm text-ink-soft leading-relaxed">{result.meaning}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {result.keyConcept && (
            <button
              type="button"
              onClick={onShowSigned}
              className="inline-flex items-center gap-2 rounded-md border border-navy-900 bg-navy-900 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-navy-800 transition-colors"
            >
              Play signed support
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-navy-700 transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
