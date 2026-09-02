import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { formatTime } from '../utils';
import type { TranscriptLine } from '../types';

export interface VideoLessonHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

interface VideoLessonProps {
  src: string;
  captionsOn: boolean;
  currentLine: TranscriptLine | null;
  currentTime: number;
  duration: number;
  playing: boolean;
  playbackRate: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSetPlaybackRate: (rate: number) => void;
}

const RATES = [0.75, 1, 1.25];

/**
 * The real <video> element -- this IS the master clock. Every other panel
 * (captions, transcript highlight, signed learning, guided demo) derives its
 * state from currentTime reported here, not the other way around.
 */
export const VideoLesson = forwardRef<VideoLessonHandle, VideoLessonProps>(function VideoLesson(
  { src, captionsOn, currentLine, currentTime, duration, playing, playbackRate, onTimeUpdate, onDurationChange, onPlayingChange, onSetPlaybackRate },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    setPlaybackRate: (rate: number) => {
      if (videoRef.current) videoRef.current.playbackRate = rate;
    },
  }));

  return (
    <div className="rounded-xl border border-line bg-navy-900 overflow-hidden shadow-card">
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={src}
          className="w-full aspect-video bg-black"
          onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
          onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
          onPlay={() => onPlayingChange(true)}
          onPause={() => onPlayingChange(false)}
          onEnded={() => onPlayingChange(false)}
        />
      </div>

      <div className="bg-navy-950 min-h-[3.25rem] flex items-center justify-center px-4 py-3 text-center" aria-live="polite">
        {captionsOn ? (
          <p className="font-body text-base sm:text-lg leading-snug text-paper">
            {currentLine ? currentLine.text : ''}
          </p>
        ) : (
          <p className="text-sm text-paper/50">Captions are turned off.</p>
        )}
      </div>

      <div className="bg-navy-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (playing ? videoRef.current?.pause() : videoRef.current?.play())}
            className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold-500 text-navy-900 hover:bg-gold-400 focus-visible:bg-gold-400 transition-colors"
            aria-label={playing ? 'Pause lecture' : 'Play lecture'}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {playing ? '❚❚' : '▶'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-paper/25 text-paper hover:border-gold-500 hover:text-gold-400 focus-visible:border-gold-500 focus-visible:text-gold-400 transition-colors"
            aria-label="Replay lecture from the start"
          >
            <span aria-hidden="true" className="text-base leading-none">↺</span>
          </button>

          <label className="sr-only" htmlFor="video-seek">
            Seek lecture position
          </label>
          <input
            id="video-seek"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime || 0}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
            className="flex-1"
          />

          <span className="font-mono text-xs sm:text-sm text-paper/80 tabular-nums whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2" role="group" aria-label="Playback speed">
          {RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => onSetPlaybackRate(rate)}
              aria-pressed={playbackRate === rate}
              className={`rounded-md px-2.5 py-1 text-xs font-mono font-semibold transition-colors ${
                playbackRate === rate
                  ? 'bg-gold-500 text-navy-900'
                  : 'bg-navy-950 text-paper/70 hover:text-paper'
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
