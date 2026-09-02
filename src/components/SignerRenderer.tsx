import { useEffect, useRef } from 'react';
import type { PoseFrame, PoseFrameSet } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface SignerRendererProps {
  frames: PoseFrameSet | null;
  playing: boolean;
  playbackRate: number;
  onEnded: () => void;
  /** Replay trigger: bump this number to restart playback from frame 0. */
  replayToken: number;
  showDebug?: boolean;
}

// Standard MediaPipe landmark indices (stable public spec -- not shipped in the
// pose JSON to keep it small, since they never change).
const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};
const HAND = {
  WRIST: 0,
  THUMB_MCP: 2,
  INDEX_MCP: 5,
  MIDDLE_MCP: 9,
  RING_MCP: 13,
  PINKY_MCP: 17,
};

const SKIN = '#E4BB5C';
const SKIN_DARK = '#BE8B22';
const GARMENT = '#284873';
const GARMENT_DARK = '#1C3654';

function lerpFrame(a: PoseFrame, b: PoseFrame, t: number): PoseFrame {
  const n = Math.min(a.length, b.length);
  const out: PoseFrame = new Array(n);
  for (let i = 0; i < n; i++) {
    const [ax, ay, ac] = a[i];
    const [bx, by, bc] = b[i];
    out[i] = [ax + (bx - ax) * t, ay + (by - ay) * t, Math.min(ac, bc)];
  }
  return out;
}

function drawCapsule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r1: number,
  r2: number,
  color: string,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * r1;
  const ny = (dx / len) * r1;
  const nx2 = (-dy / len) * r2;
  const ny2 = (dx / len) * r2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 + nx, y1 + ny);
  ctx.lineTo(x2 + nx2, y2 + ny2);
  ctx.arc(x2, y2, r2, Math.atan2(ny2, nx2), Math.atan2(-ny2, -nx2));
  ctx.lineTo(x1 - nx, y1 - ny);
  ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
  ctx.closePath();
  ctx.fill();
}

function pt(frame: PoseFrame, i: number, scale: number): { x: number; y: number; c: number } {
  const p = frame[i] ?? [0, 0, 0];
  return { x: p[0] * scale, y: p[1] * scale, c: p[2] };
}

export function SignerRenderer({ frames, playing, playbackRate, onEnded, replayToken, showDebug }: SignerRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameFloatRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Restart from frame 0 whenever a replay is requested or new frames load.
  useEffect(() => {
    frameFloatRef.current = 0;
    lastTsRef.current = null;
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, replayToken]);

  useEffect(() => {
    if (!playing || !frames || frames.frames.length < 2) return;
    let raf = 0;

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const total = frames.frames.length;
      const speed = reducedMotion ? 0 : playbackRate;
      frameFloatRef.current += dt * speed * frames.fps;

      if (frameFloatRef.current >= total - 1) {
        frameFloatRef.current = total - 1;
        render();
        onEnded();
        return;
      }

      render();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, frames, playbackRate, reducedMotion]);

  function currentInterpolatedFrame(): PoseFrame | null {
    if (!frames) return null;
    const total = frames.frames.length;
    const f = frameFloatRef.current;
    const i0 = Math.max(0, Math.min(total - 1, Math.floor(f)));
    const i1 = Math.min(total - 1, i0 + 1);
    const t = f - i0;
    return lerpFrame(frames.frames[i0], frames.frames[i1], t);
  }

  function render() {
    const canvas = canvasRef.current;
    if (!canvas || !frames) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = canvas.width / frames.width;
    const frame = currentInterpolatedFrame();
    if (!frame) return;

    const comp: Record<string, { start: number; count: number }> = {};
    for (const c of frames.components) comp[c.name] = c;
    const bodyStart = comp['POSE_LANDMARKS']?.start ?? 0;
    const faceStart = comp['FACE_LANDMARKS']?.start ?? -1;
    const faceCount = comp['FACE_LANDMARKS']?.count ?? 0;
    const lhStart = comp['LEFT_HAND_LANDMARKS']?.start ?? -1;
    const rhStart = comp['RIGHT_HAND_LANDMARKS']?.start ?? -1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const p = (globalIndex: number) => pt(frame, globalIndex, scale);
    const lShoulder = p(bodyStart + POSE.LEFT_SHOULDER);
    const rShoulder = p(bodyStart + POSE.RIGHT_SHOULDER);
    const lElbow = p(bodyStart + POSE.LEFT_ELBOW);
    const rElbow = p(bodyStart + POSE.RIGHT_ELBOW);
    const lWrist = p(bodyStart + POSE.LEFT_WRIST);
    const rWrist = p(bodyStart + POSE.RIGHT_WRIST);
    const lHip = p(bodyStart + POSE.LEFT_HIP);
    const rHip = p(bodyStart + POSE.RIGHT_HIP);
    const nose = p(bodyStart + POSE.NOSE);

    const shoulderWidth = Math.hypot(rShoulder.x - lShoulder.x, rShoulder.y - lShoulder.y) || 40;
    const limbWidth = shoulderWidth * 0.16;

    // torso
    if (lShoulder.c > 0 && rShoulder.c > 0 && lHip.c > 0 && rHip.c > 0) {
      ctx.fillStyle = GARMENT;
      ctx.beginPath();
      ctx.moveTo(lShoulder.x, lShoulder.y);
      ctx.lineTo(rShoulder.x, rShoulder.y);
      ctx.lineTo(rHip.x, rHip.y);
      ctx.lineTo(lHip.x, lHip.y);
      ctx.closePath();
      ctx.fill();
    }

    // neck + head
    if (nose.c > 0 && lShoulder.c > 0 && rShoulder.c > 0) {
      const neckX = (lShoulder.x + rShoulder.x) / 2;
      const neckY = (lShoulder.y + rShoulder.y) / 2;
      drawCapsule(ctx, neckX, neckY, nose.x, nose.y + shoulderWidth * 0.15, limbWidth * 0.6, limbWidth * 0.6, SKIN_DARK);

      const headRadius = shoulderWidth * 0.42;
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(nose.x, nose.y - headRadius * 0.15, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // sparse face contour for a touch of expressiveness, no debug numbers
      if (faceStart >= 0) {
        ctx.fillStyle = 'rgba(14,27,46,0.35)';
        for (let i = 0; i < faceCount; i += 6) {
          const fp = p(faceStart + i);
          if (fp.c > 0) {
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // arms (shoulder -> elbow -> wrist), back arm first so front arm overlaps naturally
    const drawArm = (shoulder: typeof lShoulder, elbow: typeof lElbow, wrist: typeof lWrist) => {
      if (shoulder.c > 0 && elbow.c > 0) {
        drawCapsule(ctx, shoulder.x, shoulder.y, elbow.x, elbow.y, limbWidth * 0.55, limbWidth * 0.42, GARMENT_DARK);
      }
      if (elbow.c > 0 && wrist.c > 0) {
        drawCapsule(ctx, elbow.x, elbow.y, wrist.x, wrist.y, limbWidth * 0.42, limbWidth * 0.32, SKIN_DARK);
      }
    };
    drawArm(rShoulder, rElbow, rWrist);
    drawArm(lShoulder, lElbow, lWrist);

    // hands: palm + articulated fingers, driven directly by real landmark data
    const drawHand = (handStart: number) => {
      if (handStart < 0) return;
      const wrist = p(handStart + HAND.WRIST);
      const mcps = [HAND.THUMB_MCP, HAND.INDEX_MCP, HAND.MIDDLE_MCP, HAND.RING_MCP, HAND.PINKY_MCP].map((i) =>
        p(handStart + i),
      );
      if (wrist.c > 0 && mcps.every((m) => m.c > 0)) {
        ctx.fillStyle = SKIN;
        ctx.beginPath();
        ctx.moveTo(wrist.x, wrist.y);
        for (const m of mcps) ctx.lineTo(m.x, m.y);
        ctx.closePath();
        ctx.fill();
      }
      for (const [a, b] of frames!.handLimbs) {
        const pa = p(handStart + a);
        const pb = p(handStart + b);
        if (pa.c > 0 && pb.c > 0) {
          // Taper from a thicker knuckle to a finer fingertip so individual digits
          // read clearly rather than as a uniform mitten outline.
          const nearWrist = a === HAND.WRIST || b === HAND.WRIST;
          const r1 = nearWrist ? limbWidth * 0.15 : limbWidth * 0.115;
          const r2 = limbWidth * 0.085;
          drawCapsule(ctx, pa.x, pa.y, pb.x, pb.y, r1, r2, SKIN);
        }
      }
    };
    drawHand(rhStart);
    drawHand(lhStart);

    if (showDebug) {
      ctx.fillStyle = 'rgba(216,165,54,0.9)';
      for (let i = 0; i < frame.length; i++) {
        const dp = pt(frame, i, scale);
        if (dp.c > 0) {
          ctx.beginPath();
          ctx.arc(dp.x, dp.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDebug]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={640}
      role="img"
      aria-label="Animated Auslan-derived signer"
      className="w-full h-full"
    />
  );
}
