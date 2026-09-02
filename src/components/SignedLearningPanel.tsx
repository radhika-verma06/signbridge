import { useEffect, useState } from 'react';
import { SignerRenderer } from './SignerRenderer';
import { signProvider, type ResolvedSign } from '../services/signRendererProvider';
import { conceptLabel } from '../data/concepts';
import type { ConceptId } from '../types';

interface SignedLearningPanelProps {
  enabled: boolean;
  activeConcept: ConceptId | null;
  /** Bump to force a fresh sign lookup even if the concept id didn't change. */
  requestToken: number;
  showTechnical?: boolean;
}

export function SignedLearningPanel({ enabled, activeConcept, requestToken, showTechnical }: SignedLearningPanelProps) {
  const [resolved, setResolved] = useState<ResolvedSign | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [replayToken, setReplayToken] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!enabled || !activeConcept) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    signProvider.resolve(activeConcept).then((result) => {
      if (cancelled) return;
      setResolved(result);
      setLoading(false);
      setPlaybackRate(1);
      setReplayToken((t) => t + 1);
      setPlaying(true);
    });
    return () => {
      cancelled = true;
    };
    // requestToken intentionally re-triggers even for the same concept
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeConcept, requestToken]);

  const replay = () => {
    setPlaybackRate(1);
    setReplayToken((t) => t + 1);
    setPlaying(true);
  };
  const replaySlower = () => {
    setPlaybackRate(0.75);
    setReplayToken((t) => t + 1);
    setPlaying(true);
  };

  return (
    <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-ink">Signed Learning</h2>
        {!enabled && <span className="text-xs font-medium text-ink-faint">Off</span>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-navy-900 relative min-h-[18rem]">
        {enabled && resolved ? (
          <SignerRenderer
            frames={resolved.frames}
            playing={playing}
            playbackRate={playbackRate}
            onEnded={() => setPlaying(false)}
            replayToken={replayToken}
            showDebug={showTechnical && showDebug}
          />
        ) : enabled && activeConcept && loading ? (
          <p className="text-sm text-paper/60 px-6 text-center">Loading signed support…</p>
        ) : enabled && activeConcept ? (
          <p className="text-sm text-paper/70 px-6 text-center max-w-[16rem]">
            Signed support isn’t available for this concept yet.
          </p>
        ) : enabled ? (
          <p className="text-sm text-paper/50 px-6 text-center max-w-[16rem]">
            Waiting for a supported concept to appear.
          </p>
        ) : (
          <p className="text-sm text-paper/50 px-6 text-center max-w-[16rem]">
            The signed learning layer is turned off.
          </p>
        )}
      </div>

      <div className="border-t border-line px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">
            {resolved ? conceptLabel(resolved.asset.concept) : activeConcept ? conceptLabel(activeConcept) : '—'}
          </p>
          {resolved && (
            <span className="inline-flex items-center rounded-full bg-gold-500/15 px-2.5 py-0.5 text-[11px] font-medium text-gold-700">
              Auslan-derived • prototype
            </span>
          )}
        </div>

        {resolved && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={replay}
              className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-navy-700"
            >
              Replay sign
            </button>
            <button
              type="button"
              onClick={replaySlower}
              className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-navy-700"
            >
              0.75×
            </button>
            <button
              type="button"
              onClick={replay}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                playbackRate === 1 ? 'border-navy-900 bg-navy-900 text-paper' : 'border-line bg-paper text-ink'
              }`}
            >
              1×
            </button>
            {showTechnical && (
              <button
                type="button"
                onClick={() => setShowDebug((d) => !d)}
                className="ml-auto rounded-md border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-faint hover:border-navy-700"
              >
                {showDebug ? 'Hide motion data' : 'Show motion data'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
