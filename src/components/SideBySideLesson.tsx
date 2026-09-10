/**
 * SideBySideLesson — a 1-minute "side-by-side" lesson video that plays
 * educational content on the left half and real human ASL signing on the
 * right half. Built from real clips pulled from the WLASL_v0.3 word index
 * (SignAvatars repo) using the build_sidebyside.py pipeline.
 *
 * Supports a lesson playlist: pass `lessons` (Lesson[]) and the user can
 * switch between them via the "Next lesson" button below the video.
 *
 * Layout: 1280x720 with 640px left = educational slide and 640px right = signer.
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  videoSrc: string;
  duration: number;
  tagline: string;
}

interface SideBySideLessonProps {
  src: string;
  lessons?: Lesson[];
  onLessonChange?: (lesson: Lesson) => void;
  /** Reports whether the lesson video is currently playing (drives the Eva signer). */
  onPlayingChange?: (playing: boolean) => void;
}

export interface SideBySideLessonHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export const SideBySideLesson = forwardRef<SideBySideLessonHandle, SideBySideLessonProps>(
  function SideBySideLesson({ src, lessons = [], onLessonChange, onPlayingChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentIdx, setCurrentIdx] = useState(
      Math.max(0, lessons.findIndex((l) => l.videoSrc === src))
    );

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; },
      setPlaybackRate: (r: number) => { if (videoRef.current) videoRef.current.playbackRate = r; },
    }));

    const current = lessons[currentIdx];

    function nextLesson() {
      if (!lessons.length) return;
      const next = (currentIdx + 1) % lessons.length;
      setCurrentIdx(next);
      onLessonChange?.(lessons[next]);
    }

    return (
      <div className="rounded-xl border border-line bg-navy-900 overflow-hidden shadow-card">
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            key={current?.videoSrc || src}
            src={current?.videoSrc || src}
            className="w-full h-full bg-black"
            controls
            playsInline
            preload="metadata"
            onPlay={() => onPlayingChange?.(true)}
            onPause={() => onPlayingChange?.(false)}
            onEnded={() => onPlayingChange?.(false)}
          />
        </div>
        <div className="bg-navy-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-paper/80 min-w-0">
            {current ? (
              <>
                <strong className="text-paper">{current.title}</strong>
                <span className="mx-2 text-paper/40">·</span>
                <span className="text-paper/60">{current.subtitle}</span>
                <p className="text-paper/50 mt-1 italic">{current.tagline}</p>
              </>
            ) : (
              <>
                <strong className="text-paper">Side-by-Side Mode</strong>
                <span className="mx-2 text-paper/40">·</span>
                <span className="text-paper/60">Left half = spoken lesson · Right half = real human ASL signing</span>
              </>
            )}
          </div>
          {lessons.length > 1 && (
            <button
              type="button"
              onClick={nextLesson}
              className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-gold-400 focus-visible:bg-gold-400 transition-colors"
            >
              <span>Next lesson</span>
              <span className="text-[10px] opacity-70">
                {currentIdx + 1}/{lessons.length}
              </span>
            </button>
          )}
        </div>
        <div className="bg-navy-950 px-4 py-1.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-paper/40">
            Built from WLASL_v0.3 · CC sources · real human signers
          </p>
        </div>
      </div>
    );
  }
);