import { TRANSCRIPT } from '../data/transcript';
import type { TranscriptLine } from '../types';

/**
 * FUTURE ARCHITECTURE NOTE: this wraps a hand-generated (Whisper) transcript
 * array today. A real-time captioning provider (or a different STT engine)
 * can replace the body of these functions without the UI knowing.
 */

export function currentLine(time: number): TranscriptLine | null {
  return TRANSCRIPT.find((line) => time >= line.start && time < line.end) ?? null;
}

export function lineIndex(line: TranscriptLine | null): number {
  if (!line) return -1;
  return TRANSCRIPT.findIndex((l) => l.id === line.id);
}

export function nearbyContext(time: number, windowSeconds = 20): TranscriptLine[] {
  return TRANSCRIPT.filter((line) => line.start >= time - windowSeconds && line.start <= time + 1);
}

export function allLines(): TranscriptLine[] {
  return TRANSCRIPT;
}
