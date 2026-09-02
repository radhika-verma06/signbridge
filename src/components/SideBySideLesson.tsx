/**
 * SideBySideLesson — a 1-minute "side-by-side" lesson video that plays
 * educational content on the left half and real human ASL signing on the
 * right half. Built from real clips pulled from the WLASL_v0.3 word index
 * (SignAvatars repo) using the build_sidebyside.py pipeline.
 *
 * Layout: 1280x720 with 640px left = educational slide and 640px right = signer.
 * When paused, the clip holds its last frame so users can study a single sign.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';

interface SideBySideLessonProps {
  src: string;
}

export interface SideBySideLessonHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export const SideBySideLesson = forwardRef<SideBySideLessonHandle, SideBySideLessonProps>(
  function SideBySideLesson({ src }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; },
      setPlaybackRate: (r: number) => { if (videoRef.current) videoRef.current.playbackRate = r; },
    }));

    return (
      <div className="rounded-xl border border-line bg-navy-900 overflow-hidden shadow-card">
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full bg-black"
            controls
            playsInline
            preload="metadata"
          />
        </div>
        <div className="bg-navy-800 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-paper/70">
            <strong className="text-paper">Side-by-Side Mode</strong>
            <span className="mx-2 text-paper/40">·</span>
            Left half = spoken lesson · Right half = real human ASL signing
          </p>
          <p className="text-[10px] uppercase tracking-wider text-paper/50">
            Built from WLASL_v0.3 · CC sources · 60s
          </p>
        </div>
      </div>
    );
  }
);