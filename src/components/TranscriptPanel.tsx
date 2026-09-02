import { useEffect, useRef } from 'react';
import { formatTime } from '../utils';
import type { TranscriptLine } from '../types';

interface TranscriptPanelProps {
  lines: TranscriptLine[];
  currentLineId: string | null;
  onSeek: (time: number) => void;
}

export function TranscriptPanel({ lines, currentLineId, onSeek }: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentLineId]);

  return (
    <section aria-labelledby="transcript-heading" className="rounded-xl border border-line bg-white shadow-card p-5 sm:p-6">
      <h2 id="transcript-heading" className="font-display text-lg font-semibold text-navy-900">
        Transcript
      </h2>
      <p className="mt-1 text-sm text-ink-faint">
        Real, timestamped transcript of this video. Click a line to jump to that point.
      </p>
      <div ref={containerRef} className="thin-scroll mt-3 max-h-64 overflow-y-auto space-y-1 pr-1">
        {lines.map((line) => {
          const active = line.id === currentLineId;
          return (
            <button
              key={line.id}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onSeek(line.start)}
              aria-current={active ? 'true' : undefined}
              className={`w-full text-left rounded-md px-3 py-2 text-sm leading-snug transition-colors ${
                active ? 'bg-navy-900 text-paper' : 'bg-paper text-ink-soft hover:bg-paper-dim'
              }`}
            >
              <span className={`font-mono text-xs mr-2 ${active ? 'text-gold-400' : 'text-ink-faint'}`}>
                {formatTime(line.start)}
              </span>
              {line.text}
            </button>
          );
        })}
      </div>
    </section>
  );
}
