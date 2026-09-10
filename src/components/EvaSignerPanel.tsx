import { useEffect, useRef, useState } from 'react';
import { SignerRenderer } from './SignerRenderer';
import { proceduralFrameSet } from '../services/proceduralSigns';
import type { PoseFrameSet, TranscriptLine } from '../types';

/**
 * EvaSignerPanel — embeds the GTI Performs 3D Eva avatar and drives her to
 * sign **while the NASA speaker is talking**.
 *
 * Final user requirement (Sep 3 2026):
 *   "I want her to sign when the speaker says something, but that signing
 *    doesn't have to make sense. I just want it to sign when speaker talks.
 *    Make her do it."
 *
 * How we decide "speaker is talking":
 *   The parent passes `currentLine`. That is non-null exactly when the video
 *   time is inside one of the Whisper-derived transcript segments:
 *     start ≤ currentTime < end
 *   If `currentLine` is null, the speaker is silent → Eva idles.
 *   If `currentLine` is non-null, the speaker is talking → Eva signs.
 *
 * What Eva signs:
 *   We don't care about accuracy. We rotate through a curated pool of
 *   real NGT glosses + fingerspelling letters and dispatch them to the
 *   iframe at a steady cadence. Eva plays whatever motion she has.
 *   Even if all glosses are missing, the Eva host silently no-ops.
 *
 * We do NOT depend on /api/gloss. We do NOT match transcript text to
 * dictionary words. We just keep her hands moving while a line is live.
 */

interface EvaSignerPanelProps {
  /** Active transcript line (null when the speaker is silent). */
  currentLine: TranscriptLine | null;
  /** Whether signing is enabled in the toolbar. */
  enabled: boolean;
  /** Whether the master video is currently playing. */
  playing: boolean;
  /** Source URL for the Eva iframe (bundled statically with the site). */
  evaSrc?: string;
}

// Big pool of NGT glosses + fingerspelling letters. Eva will animate any
// that are in her sigml dictionary; unknown ones silently no-op.
export const EVA_SIGN_POOL = [
  'LICHAAM', 'HART', 'BLOED', 'DENKEN', 'HERSENEN', 'HOOFD',
  'KIJKEN', 'LEVEN', 'LEREN', 'JONG', 'GROOT', 'GROEIEN', 'GOED',
  'BOEK',
  // Fingerspelling letters (always available)
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

// Dispatch interval — one sign every ~700ms so Eva never has a visible gap
// while a transcript line is live. NGT animations average 1–2s each, so
// this means she usually overlaps into the next sign.
const SIGN_INTERVAL_MS = 700;

export function EvaSignerPanel({
  currentLine,
  enabled,
  playing,
  evaSrc = 'performs/host.html',
}: EvaSignerPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tickRef = useRef<number | null>(null);
  const lastLineIdRef = useRef<string | null>(null);

  // --- remote availability: Eva is bundled with the site, so the probe
  // normally succeeds everywhere. The 2D fallback covers a deploy where her
  // assets are missing, or an unexpected hosting failure. ---
  const [hostState, setHostState] = useState<'checking' | 'ok' | 'down'>('checking');
  const [fallbackFrames, setFallbackFrames] = useState<PoseFrameSet | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    fetch(evaSrc, { mode: 'no-cors', signal: controller.signal })
      .then(() => { if (!cancelled) setHostState('ok'); })
      .catch(() => { if (!cancelled) setHostState('down'); });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2D fallback signing: cycle through the sign pool while the speaker talks.
  useEffect(() => {
    if (hostState !== 'down' || !enabled || !playing || !currentLine) {
      setFallbackFrames(null);
      return;
    }
    const next = () => {
      const gloss = EVA_SIGN_POOL[Math.floor(Math.random() * EVA_SIGN_POOL.length)];
      setFallbackFrames(proceduralFrameSet(gloss, 1.1));
    };
    next();
    const rotate = window.setInterval(next, 1300);
    return () => window.clearInterval(rotate);
  }, [hostState, currentLine?.id, enabled, playing]);

  function dispatchOne() {
    // Find the Eva iframe — prefer the ref (works in React's render tree)
    // but fall back to DOM query (so we don't miss the very first dispatch
    // when the iframe hasn't mounted into the ref yet).
    let target: Window | null = null;
    if (iframeRef.current?.contentWindow) {
      target = iframeRef.current.contentWindow;
    } else {
      const f = document.querySelector<HTMLIFrameElement>('iframe[title*="Eva"]');
      if (f?.contentWindow) target = f.contentWindow;
    }
    if (!target) return;
    const gloss = EVA_SIGN_POOL[Math.floor(Math.random() * EVA_SIGN_POOL.length)];
    try {
      target.postMessage(
        { type: 'SIGNBRIDGE_GLOSS', glosses: [gloss] },
        window.location.origin,
      );
    } catch (e) {
      // ignore — iframe momentarily unreachable
    }
  }

  // The core rule: while the video is playing AND a transcript line is live,
  // tick every SIGN_INTERVAL_MS. When either goes false (paused, silence,
  // or signing disabled), stop the tick.
  //
  // Note on Eva readiness: Eva only sends {appStatus:true} after the parent
  // sends her a postMessage first. We used to wait for that, but it's a
  // deadlock. So we just dispatch as soon as the conditions are met and let
  // Eva silently drop early messages until she's ready.
  useEffect(() => {
    const shouldSign = enabled && playing && currentLine != null;

    if (!shouldSign) {
      // Stop the tick.
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      // Reset the line cursor so the next live line fires immediately
      // (don't reuse the last-line's cursor after a pause/silence gap).
      lastLineIdRef.current = null;
      return;
    }

    // Speaker is talking (and video is playing and signing enabled).
    if (lastLineIdRef.current !== currentLine!.id) {
      // New transcript line — fire one immediately so Eva reacts at once.
      lastLineIdRef.current = currentLine!.id;
      dispatchOne();
    }

    // Make sure the tick is running.
    if (!tickRef.current) {
      tickRef.current = window.setInterval(dispatchOne, SIGN_INTERVAL_MS);
    }

    return () => {
      // No cleanup here; the next effect run will decide whether to stop.
    };
  }, [currentLine?.id, enabled, playing]);

  // Hard-stop the tick on unmount or when signing is disabled.
  useEffect(() => {
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink leading-tight">Eva — 3D Signer</h2>
          <p className="text-xs text-ink-faint mt-0.5">
            {hostState === 'down'
              ? '2D signer here — the 3D Eva runs in on-site demos'
              : currentLine
                ? 'Signing live while the speaker talks'
                : 'Waiting for the speaker'}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
            currentLine && enabled && playing ? 'bg-gold-500 live-dot' : 'bg-line'
          }`}
        />
      </div>

      <div className="flex-1 bg-navy-900 relative min-h-[18rem]">
        {hostState === 'down' ? (
          <>
            {fallbackFrames && (
              <SignerRenderer
                frames={fallbackFrames}
                playing={Boolean(currentLine) && enabled && playing}
                playbackRate={1}
                onEnded={() => {}}
                replayToken={0}
              />
            )}
            <div className="absolute bottom-3 right-3 rounded-full bg-navy-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-paper/80">
              2D fallback
            </div>
          </>
        ) : (
          <iframe
            ref={iframeRef}
            src={evaSrc}
            title="GTI Performs Eva — signing avatar"
            allow="autoplay; fullscreen"
            className="w-full h-full border-0"
            style={{ minHeight: 360 }}
          />
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        {!enabled && (
          <p className="text-[11px] text-ink-faint">Toggle "Signing on" in the toolbar to enable.</p>
        )}
      </div>
    </div>
  );
}