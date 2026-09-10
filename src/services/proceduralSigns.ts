/**
 * Procedural sign poses for Live Translate.
 *
 * Synthesises signer motion for common glosses as normalised keyframe sets,
 * sampled over a gloss's duration and converted into SignBridge's PoseFrameSet
 * layout (the same structure MediaPipe extraction produces for the Auslan
 * lexicon), so the existing SignerRenderer can play both transparently.
 *
 * Ported from the genai-asl-avatar-generator demo engine (poseKeypoints.js)
 * and extended with additional everyday glosses. Landmark topology: 17-point
 * COCO body (mapped onto MediaPipe pose slots), 21-point MediaPipe hands,
 * sparse procedural face contour.
 *
 * Provenance: procedurally synthesised from sign descriptions — NOT captured
 * human motion, and ASL-derived rather than Auslan-validated. The UI labels
 * it accordingly.
 */
import type { PoseFrame, PoseFramePoint, PoseFrameSet } from '../types';

interface BodyPoint { x: number; y: number; score: number }
interface KeyPoint { x: number; y: number; score: number }

interface PoseSnapshot {
  body: BodyPoint[];
  face: KeyPoint[];
  leftHand: KeyPoint[];
  rightHand: KeyPoint[];
}

/** MediaPipe 21-point hand connectivity (indices within one hand block). */
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function generateFaceMesh(cx: number, cy: number, scale: number, expressionTilt = 0): KeyPoint[] {
  const points: KeyPoint[] = [];
  for (let i = 0; i < 17; i++) {
    const angle = Math.PI * 0.15 + (Math.PI * 0.7 * (i / 16));
    points.push({ x: cx + Math.cos(angle) * scale * 1.2, y: cy + Math.sin(angle) * scale * 1.4, score: 0.92 });
  }
  for (let i = 0; i < 5; i++) {
    points.push({ x: cx - scale * 0.7 + (i * scale * 0.12), y: cy - scale * 0.45 + expressionTilt, score: 0.95 });
  }
  for (let i = 0; i < 5; i++) {
    points.push({ x: cx + scale * 0.2 + (i * scale * 0.12), y: cy - scale * 0.45 + expressionTilt, score: 0.95 });
  }
  points.push({ x: cx, y: cy - scale * 0.2, score: 0.97 });
  points.push({ x: cx, y: cy, score: 0.97 });
  points.push({ x: cx - scale * 0.15, y: cy + scale * 0.1, score: 0.95 });
  points.push({ x: cx, y: cy + scale * 0.12, score: 0.95 });
  points.push({ x: cx + scale * 0.15, y: cy + scale * 0.1, score: 0.95 });
  points.push({ x: cx - scale * 0.4, y: cy - scale * 0.2, score: 0.98 });
  points.push({ x: cx - scale * 0.2, y: cy - scale * 0.2, score: 0.98 });
  points.push({ x: cx + scale * 0.2, y: cy - scale * 0.2, score: 0.98 });
  points.push({ x: cx + scale * 0.4, y: cy - scale * 0.2, score: 0.98 });
  points.push({ x: cx - scale * 0.3, y: cy + scale * 0.4, score: 0.96 });
  points.push({ x: cx, y: cy + scale * 0.35, score: 0.96 });
  points.push({ x: cx + scale * 0.3, y: cy + scale * 0.4, score: 0.96 });
  points.push({ x: cx, y: cy + scale * 0.48, score: 0.96 });
  return points;
}

function generateHandKeypoints(wristX: number, wristY: number, angleRad = 0, handShape = 'open'): KeyPoint[] {
  const points: KeyPoint[] = [];
  points.push({ x: wristX, y: wristY, score: 0.99 });

  const baseScale = 0.035;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const rotate = (dx: number, dy: number): KeyPoint => ({
    x: wristX + (dx * cos - dy * sin) * baseScale,
    y: wristY + (dx * sin + dy * cos) * baseScale,
    score: 0.95,
  });

  let thumbExt = 1.0, indexExt = 1.0, middleExt = 1.0, ringExt = 1.0, pinkyExt = 1.0;
  let thumbSpread = 0.8;

  if (handShape === 'fist' || handShape === 'A' || handShape === 'S' || handShape === 'T' || handShape === 'M' || handShape === 'N') {
    thumbExt = 0.4; indexExt = 0.3; middleExt = 0.3; ringExt = 0.3; pinkyExt = 0.3;
  } else if (handShape === '1' || handShape === 'index' || handShape === 'D' || handShape === 'G' || handShape === 'P' || handShape === 'Q') {
    thumbExt = 0.3; indexExt = 1.2; middleExt = 0.3; ringExt = 0.3; pinkyExt = 0.3;
  } else if (handShape === 'V' || handShape === '2' || handShape === 'U' || handShape === 'H' || handShape === 'K' || handShape === 'R') {
    thumbExt = 0.3; indexExt = 1.1; middleExt = 1.1; ringExt = 0.3; pinkyExt = 0.3;
  } else if (handShape === 'B' || handShape === 'flat' || handShape === 'E' || handShape === '4') {
    thumbExt = 0.2; indexExt = 1.0; middleExt = 1.0; ringExt = 1.0; pinkyExt = 1.0;
  } else if (handShape === 'L') {
    thumbExt = 1.0; indexExt = 1.1; middleExt = 0.3; ringExt = 0.3; pinkyExt = 0.3;
    thumbSpread = 1.4;
  } else if (handShape === 'Y' || handShape === 'J' || handShape === 'Z') {
    thumbExt = 1.1; indexExt = 0.3; middleExt = 0.3; ringExt = 0.3; pinkyExt = 1.1;
  } else if (handShape === 'I' || handShape === 'J2') {
    thumbExt = 0.3; indexExt = 0.3; middleExt = 0.3; ringExt = 0.3; pinkyExt = 1.1;
  } else if (handShape === 'C' || handShape === 'O2' || handShape === 'X' || handShape === 'W2') {
    thumbExt = 0.7; indexExt = 0.7; middleExt = 0.7; ringExt = 0.7; pinkyExt = 0.7;
  } else if (handShape === 'O' || handShape === '6' || handShape === '9' || handShape === 'Z') {
    thumbExt = 0.5; indexExt = 0.5; middleExt = 0.5; ringExt = 0.5; pinkyExt = 0.5;
  } else if (handShape === 'F' || handShape === '9' || handShape === 'W3') {
    thumbExt = 0.4; indexExt = 0.4; middleExt = 1.0; ringExt = 1.0; pinkyExt = 1.0;
  } else if (handShape === 'W' || handShape === '3' || handShape === '6b' || handShape === 'K2') {
    thumbExt = 0.3; indexExt = 1.0; middleExt = 1.0; ringExt = 1.0; pinkyExt = 0.3;
  }

  points.push(rotate(-0.3 * thumbSpread, -0.4 * thumbExt));
  points.push(rotate(-0.6 * thumbSpread, -0.7 * thumbExt));
  points.push(rotate(-0.8 * thumbSpread, -1.0 * thumbExt));
  points.push(rotate(-1.0 * thumbSpread, -1.2 * thumbExt));
  points.push(rotate(-0.3, -0.8));
  points.push(rotate(-0.35, -0.8 - (0.4 * indexExt)));
  points.push(rotate(-0.38, -0.8 - (0.8 * indexExt)));
  points.push(rotate(-0.40, -0.8 - (1.2 * indexExt)));
  points.push(rotate(0.0, -0.85));
  points.push(rotate(0.0, -0.85 - (0.45 * middleExt)));
  points.push(rotate(0.0, -0.85 - (0.9 * middleExt)));
  points.push(rotate(0.0, -0.85 - (1.35 * middleExt)));
  points.push(rotate(0.3, -0.8));
  points.push(rotate(0.33, -0.8 - (0.4 * ringExt)));
  points.push(rotate(0.35, -0.8 - (0.8 * ringExt)));
  points.push(rotate(0.38, -0.8 - (1.2 * ringExt)));
  points.push(rotate(0.55, -0.7));
  points.push(rotate(0.60, -0.7 - (0.35 * pinkyExt)));
  points.push(rotate(0.65, -0.7 - (0.7 * pinkyExt)));
  points.push(rotate(0.70, -0.7 - (1.05 * pinkyExt)));
  return points;
}

/** Full-body neutral pose in COCO-17 order, plus hands and face. */
function getNeutralPose(): PoseSnapshot {
  const body: BodyPoint[] = [
    { x: 0.50, y: 0.20, score: 0.98 }, // nose
    { x: 0.48, y: 0.18, score: 0.96 }, // left eye
    { x: 0.52, y: 0.18, score: 0.96 }, // right eye
    { x: 0.45, y: 0.19, score: 0.94 }, // left ear
    { x: 0.55, y: 0.19, score: 0.94 }, // right ear
    { x: 0.42, y: 0.30, score: 0.99 }, // left shoulder
    { x: 0.58, y: 0.30, score: 0.99 }, // right shoulder
    { x: 0.38, y: 0.45, score: 0.95 }, // left elbow
    { x: 0.62, y: 0.45, score: 0.95 }, // right elbow
    { x: 0.40, y: 0.58, score: 0.97 }, // left wrist
    { x: 0.60, y: 0.58, score: 0.97 }, // right wrist
    { x: 0.45, y: 0.68, score: 0.99 }, // left hip
    { x: 0.55, y: 0.68, score: 0.99 }, // right hip
  ];
  return {
    body,
    face: generateFaceMesh(0.50, 0.20, 0.05, 0),
    leftHand: generateHandKeypoints(0.40, 0.58, 0.2, 'open'),
    rightHand: generateHandKeypoints(0.60, 0.58, -0.2, 'open'),
  };
}

interface PoseSnapshot {
  body: BodyPoint[];
  face: KeyPoint[];
  leftHand: KeyPoint[];
  rightHand: KeyPoint[];
}

/**
 * Pose for one gloss at normalised time t (0..1). Covers the everyday lexicon;
 * single letters fingerspell; anything else falls back to a gentle conversational
 * beat so playback never looks broken.
 */
function getPoseForSign(glossToken: string, t: number): PoseSnapshot {
  const base = getNeutralPose();
  const gloss = (glossToken || '').toUpperCase();
  const phase = Math.sin(t * Math.PI);
  const set = (i: number, x: number, y: number) => { base.body[i] = { x, y, score: 0.99 }; };

  switch (gloss) {
    case 'HELLO': case 'HI': {
      const rx = 0.58 + (0.10 * t);
      const ry = 0.22 + (0.04 * t);
      set(8, 0.65, 0.35); set(10, rx, ry);
      base.rightHand = generateHandKeypoints(rx, ry, -0.4, 'B');
      base.face = generateFaceMesh(0.50, 0.20, 0.05, -0.005 * phase);
      break;
    }
    case 'GOODBYE': case 'BYE': {
      const wave = 0.06 * Math.sin(t * Math.PI * 3);
      set(8, 0.64, 0.32); set(10, 0.68, 0.22 + wave);
      base.rightHand = generateHandKeypoints(0.68, 0.22 + wave, -0.4 + (0.3 * Math.sin(t * Math.PI * 3)), 'B');
      break;
    }
    case 'THANK-YOU': case 'THANKS': {
      const rx = 0.50 + (0.02 * t);
      const ry = 0.25 + (0.20 * t);
      set(8, 0.62, 0.42); set(10, rx, ry);
      base.rightHand = generateHandKeypoints(rx, ry, -0.1, 'flat');
      break;
    }
    case 'PLEASE': {
      const rub = 0.025 * Math.sin(t * Math.PI * 4);
      set(8, 0.60, 0.40); set(10, 0.55 + rub, 0.36);
      base.rightHand = generateHandKeypoints(0.55 + rub, 0.36, -0.2, 'B');
      break;
    }
    case 'SORRY': {
      const rub = 0.03 * Math.sin(t * Math.PI * 4);
      set(8, 0.63, 0.40); set(10, 0.54 + rub, 0.37);
      base.rightHand = generateHandKeypoints(0.54 + rub, 0.37, -0.2, 'A');
      break;
    }
    case 'WELCOME': {
      const sweep = 0.10 * (1 - t);
      set(8, 0.62, 0.40); set(10, 0.58 - sweep, 0.40);
      base.rightHand = generateHandKeypoints(0.58 - sweep, 0.40, -0.1, 'open');
      break;
    }
    case 'YES': {
      const nod = 0.03 * Math.sin(t * Math.PI * 4);
      set(8, 0.60, 0.42); set(10, 0.54, 0.30 + nod);
      base.rightHand = generateHandKeypoints(0.54, 0.30 + nod, -0.1, 'fist');
      break;
    }
    case 'NO': {
      const snap = 0.04 * t;
      set(8, 0.62, 0.40); set(10, 0.56, 0.28 + snap);
      base.rightHand = generateHandKeypoints(0.56, 0.28 + snap, -0.2, t > 0.5 ? 'flat' : 'V');
      break;
    }
    case 'NAME': {
      const tap = 0.02 * Math.abs(Math.sin(t * Math.PI * 3));
      set(7, 0.40, 0.42); set(9, 0.48, 0.45 - tap);
      set(8, 0.60, 0.42); set(10, 0.52, 0.45 + tap);
      base.leftHand = generateHandKeypoints(0.48, 0.45 - tap, 0.8, 'V');
      base.rightHand = generateHandKeypoints(0.52, 0.45 + tap, -0.8, 'V');
      break;
    }
    case 'NICE': {
      const slide = 0.08 * t;
      set(7, 0.40, 0.44); set(9, 0.50 - slide, 0.46);
      set(8, 0.60, 0.42); set(10, 0.46 + slide, 0.42);
      base.leftHand = generateHandKeypoints(0.50 - slide, 0.44, 0.1, 'flat');
      base.rightHand = generateHandKeypoints(0.46 + slide, 0.42, -0.1, 'B');
      break;
    }
    case 'MEET': {
      const gap = 0.08 * (1 - phase);
      set(7, 0.40, 0.42); set(9, 0.50 - gap, 0.36);
      set(8, 0.60, 0.42); set(10, 0.50 + gap, 0.36);
      base.leftHand = generateHandKeypoints(0.50 - gap, 0.36, 0.05, '1');
      base.rightHand = generateHandKeypoints(0.50 + gap, 0.36, -0.05, '1');
      break;
    }
    case 'IX-1P': case 'MY': {
      set(8, 0.60, 0.42); set(10, 0.50, 0.38 + (0.02 * phase));
      base.rightHand = generateHandKeypoints(0.50, 0.38 + (0.02 * phase), -0.3, '1');
      break;
    }
    case 'IX-2P': case 'YOUR': {
      set(8, 0.62, 0.42); set(10, 0.52, 0.42 - (0.05 * phase));
      base.rightHand = generateHandKeypoints(0.52, 0.42 - (0.05 * phase), 0.0, '1');
      break;
    }
    case 'IX-3P': {
      set(8, 0.66, 0.40); set(10, 0.70, 0.40);
      base.rightHand = generateHandKeypoints(0.70, 0.40, -0.4, '1');
      break;
    }
    case 'IX-1P-PL': case 'IX-2P-PL': case 'IX-3P-PL': {
      const arc = 0.12 * t;
      set(8, 0.62, 0.42); set(10, 0.50 + arc, 0.36);
      base.rightHand = generateHandKeypoints(0.50 + arc, 0.36, -0.2, '1');
      break;
    }
    case 'WHAT': {
      const sway = 0.03 * Math.sin(t * Math.PI * 4);
      set(7, 0.34, 0.46); set(9, 0.38 + sway, 0.48);
      set(8, 0.66, 0.46); set(10, 0.62 - sway, 0.48);
      base.leftHand = generateHandKeypoints(0.38 + sway, 0.48, 0.5, 'open');
      base.rightHand = generateHandKeypoints(0.62 - sway, 0.48, -0.5, 'open');
      base.face = generateFaceMesh(0.50, 0.20, 0.05, 0.012);
      break;
    }
    case 'WHERE': {
      const wag = 0.04 * Math.sin(t * Math.PI * 4);
      set(8, 0.62, 0.40); set(10, 0.56 + wag, 0.36);
      base.rightHand = generateHandKeypoints(0.56 + wag, 0.36, 0.1, '1');
      base.face = generateFaceMesh(0.50, 0.20, 0.05, 0.015);
      break;
    }
    case 'WHEN': {
      const circ = 0.03 * Math.sin(t * Math.PI * 2);
      set(7, 0.42, 0.40); set(9, 0.50, 0.38);
      set(8, 0.60, 0.40); set(10, 0.52 + circ, 0.32 - circ);
      base.leftHand = generateHandKeypoints(0.50, 0.38, 0.0, '1');
      base.rightHand = generateHandKeypoints(0.52 + circ, 0.32 - circ, -0.1, '1');
      break;
    }
    case 'WHY': {
      const pull = 0.08 * t;
      set(8, 0.62, 0.38); set(10, 0.54 + pull, 0.26 + pull);
      base.rightHand = generateHandKeypoints(0.54 + pull, 0.26 + pull, -0.3, t > 0.5 ? 'Y' : 'B');
      break;
    }
    case 'WHO': {
      const wig = 0.02 * Math.sin(t * Math.PI * 5);
      set(8, 0.60, 0.40); set(10, 0.51 + wig, 0.26);
      base.rightHand = generateHandKeypoints(0.51 + wig, 0.26, -0.05, '1');
      break;
    }
    case 'HOW': {
      const twist = 0.06 * (1 - phase);
      set(7, 0.44, 0.40); set(9, 0.49, 0.36);
      set(8, 0.56, 0.40); set(10, 0.53, 0.36 - twist);
      base.leftHand = generateHandKeypoints(0.49, 0.36, 0.3, 'flat');
      base.rightHand = generateHandKeypoints(0.53, 0.36 - twist, -0.3, 'flat');
      break;
    }
    case 'WHICH': {
      const alt = 0.04 * Math.sin(t * Math.PI * 4);
      set(7, 0.44, 0.40); set(9, 0.48, 0.38 - alt);
      set(8, 0.56, 0.40); set(10, 0.52, 0.38 + alt);
      base.leftHand = generateHandKeypoints(0.48, 0.38, 0.0, 'A');
      base.rightHand = generateHandKeypoints(0.52, 0.38 + alt, 0.0, 'A');
      break;
    }
    case 'QUESTION': {
      const crook = 0.03 * phase;
      set(8, 0.62, 0.40); set(10, 0.56, 0.30 - crook);
      base.rightHand = generateHandKeypoints(0.56, 0.30 - crook, -0.1, 'X');
      break;
    }
    case 'LEARN': {
      const rx = 0.48 + (0.04 * t);
      const ry = 0.48 - (0.26 * t);
      set(7, 0.38, 0.46); set(9, 0.46, 0.50);
      set(8, 0.62, 0.40); set(10, rx, ry);
      base.leftHand = generateHandKeypoints(0.46, 0.50, 0.4, 'flat');
      base.rightHand = generateHandKeypoints(rx, ry, -0.3, t > 0.6 ? 'O' : 'open');
      break;
    }
    case 'SIGN': {
      const c1 = Math.sin(t * Math.PI * 4) * 0.04;
      const c2 = Math.cos(t * Math.PI * 4) * 0.04;
      set(7, 0.38, 0.44); set(9, 0.42 + c1, 0.42 + c2);
      set(8, 0.62, 0.44); set(10, 0.58 - c1, 0.42 - c2);
      base.leftHand = generateHandKeypoints(0.42 + c1, 0.42 + c2, 0.3, '1');
      base.rightHand = generateHandKeypoints(0.58 - c1, 0.42 - c2, -0.3, '1');
      break;
    }
    case 'LANGUAGE': {
      const spread = 0.08 * t;
      const wiggle = 0.015 * Math.sin(t * Math.PI * 6);
      set(7, 0.36, 0.44); set(9, 0.46 - spread, 0.44 + wiggle);
      set(8, 0.64, 0.44); set(10, 0.54 + spread, 0.44 + wiggle);
      base.leftHand = generateHandKeypoints(0.46 - spread, 0.44 + wiggle, 0.2, 'L');
      base.rightHand = generateHandKeypoints(0.54 + spread, 0.44 + wiggle, -0.2, 'L');
      break;
    }
    case 'LOVE': {
      set(7, 0.38, 0.40); set(9, 0.55, 0.36);
      set(8, 0.62, 0.40); set(10, 0.45, 0.36);
      base.leftHand = generateHandKeypoints(0.55, 0.36, -0.6, 'fist');
      base.rightHand = generateHandKeypoints(0.45, 0.36, 0.6, 'fist');
      break;
    }
    case 'LIKE': {
      const pull = 0.08 * t;
      set(8, 0.62, 0.40); set(10, 0.52 + pull, 0.38);
      base.rightHand = generateHandKeypoints(0.52 + pull, 0.38, -0.2, t > 0.5 ? 'O' : 'open');
      break;
    }
    case 'HELP': {
      const lift = 0.06 * t;
      set(7, 0.40, 0.44 - lift); set(9, 0.48, 0.44 - lift);
      set(8, 0.60, 0.44 - lift); set(10, 0.52, 0.44 - lift);
      base.leftHand = generateHandKeypoints(0.48, 0.44 - lift, 0.1, 'B');
      base.rightHand = generateHandKeypoints(0.52, 0.44 - lift, -0.1, 'A');
      break;
    }
    case 'WANT': {
      const pull = 0.08 * (1 - t);
      set(7, 0.36 + pull, 0.46); set(9, 0.42 + pull, 0.44);
      set(8, 0.64 - pull, 0.46); set(10, 0.58 - pull, 0.44);
      base.leftHand = generateHandKeypoints(0.42 + pull, 0.44, 0.4, 'open');
      base.rightHand = generateHandKeypoints(0.58 - pull, 0.44, -0.4, 'open');
      break;
    }
    case 'EAT': case 'FOOD': {
      const tap = Math.abs(Math.sin(t * Math.PI * 2)) * 0.04;
      set(8, 0.58, 0.36); set(10, 0.52, 0.24 + tap);
      base.rightHand = generateHandKeypoints(0.52, 0.24 + tap, -0.2, 'O');
      break;
    }
    case 'DRINK': {
      const tip = 0.05 * phase;
      set(8, 0.60, 0.36); set(10, 0.53, 0.26 + tip);
      base.rightHand = generateHandKeypoints(0.53, 0.26 + tip, -0.9, 'C');
      break;
    }
    case 'WATER': {
      const tap = Math.abs(Math.sin(t * Math.PI * 2)) * 0.03;
      set(8, 0.58, 0.36); set(10, 0.52, 0.25 + tap);
      base.rightHand = generateHandKeypoints(0.52, 0.25 + tap, -0.1, 'W');
      break;
    }
    case 'HAPPY': {
      const up = 0.06 * t;
      set(7, 0.40, 0.46 - up); set(9, 0.44, 0.48 - up);
      set(8, 0.60, 0.46 - up); set(10, 0.56, 0.48 - up);
      base.leftHand = generateHandKeypoints(0.44, 0.48 - up, 0.1, 'B');
      base.rightHand = generateHandKeypoints(0.56, 0.48 - up, -0.1, 'B');
      base.face = generateFaceMesh(0.50, 0.20, 0.05, -0.006);
      break;
    }
    case 'SAD': {
      const drop = 0.06 * t;
      set(7, 0.42, 0.30 + drop); set(9, 0.46, 0.32 + drop);
      set(8, 0.58, 0.30 + drop); set(10, 0.54, 0.32 + drop);
      base.leftHand = generateHandKeypoints(0.46, 0.32 + drop, 0.2, 'open');
      base.rightHand = generateHandKeypoints(0.54, 0.32 + drop, -0.2, 'open');
      base.face = generateFaceMesh(0.50, 0.20, 0.05, 0.006);
      break;
    }
    case 'GOOD': {
      set(8, 0.60, 0.38); set(10, 0.51, 0.27);
      base.rightHand = generateHandKeypoints(0.51, 0.27, -0.2, 'B');
      break;
    }
    case 'BAD': {
      const drop = 0.06 * t;
      set(8, 0.60, 0.38); set(10, 0.51, 0.27 + drop);
      base.rightHand = generateHandKeypoints(0.51, 0.27 + drop, -0.5, 'B');
      break;
    }
    case 'TODAY': case 'NOW': {
      const drop = 0.06 * Math.abs(Math.sin(t * Math.PI * 2));
      set(7, 0.38, 0.44); set(9, 0.42, 0.46 + drop);
      set(8, 0.62, 0.44); set(10, 0.58, 0.46 + drop);
      base.leftHand = generateHandKeypoints(0.42, 0.46 + drop, 0.3, 'Y');
      base.rightHand = generateHandKeypoints(0.58, 0.46 + drop, -0.3, 'Y');
      break;
    }
    case 'TOMORROW': case 'WILL': {
      const arc = 0.08 * t;
      set(8, 0.58, 0.36); set(10, 0.52 + arc, 0.30);
      base.rightHand = generateHandKeypoints(0.52 + arc, 0.30, -0.4, 'A');
      break;
    }
    case 'YESTERDAY': {
      const arc = 0.08 * t;
      set(8, 0.58, 0.36); set(10, 0.52 - arc, 0.30);
      base.rightHand = generateHandKeypoints(0.52 - arc, 0.30, -0.6, 'A');
      break;
    }
    case 'TIME': {
      const tap = Math.abs(Math.sin(t * Math.PI * 2)) * 0.02;
      set(7, 0.42, 0.46); set(9, 0.50, 0.44);
      set(8, 0.58, 0.38); set(10, 0.52, 0.40 + tap);
      base.leftHand = generateHandKeypoints(0.50, 0.44, 0.0, 'fist');
      base.rightHand = generateHandKeypoints(0.52, 0.40 + tap, -0.1, '1');
      break;
    }
    case 'DAY': {
      const arc = 0.10 * t;
      set(7, 0.42, 0.46); set(9, 0.50, 0.44);
      set(8, 0.56, 0.30); set(10, 0.48 + arc, 0.34 + (0.04 * t));
      base.leftHand = generateHandKeypoints(0.50, 0.44, 0.0, 'B');
      base.rightHand = generateHandKeypoints(0.48 + arc, 0.34 + (0.04 * t), -0.2, '1');
      break;
    }
    case 'NIGHT': {
      const set2 = 0.04 * t;
      set(7, 0.42, 0.44); set(9, 0.50, 0.42);
      set(8, 0.58, 0.36); set(10, 0.52, 0.40 - set2);
      base.leftHand = generateHandKeypoints(0.50, 0.44, 0.0, 'flat');
      base.rightHand = generateHandKeypoints(0.52, 0.40 - set2, -0.3, 'B');
      break;
    }
    case 'SCHOOL': {
      const clap = Math.abs(Math.sin(t * Math.PI * 2)) * 0.04;
      set(7, 0.42, 0.44 + clap); set(9, 0.50, 0.44 + clap);
      set(8, 0.58, 0.42); set(10, 0.50, 0.42);
      base.leftHand = generateHandKeypoints(0.50, 0.44 + clap, 0.0, 'B');
      base.rightHand = generateHandKeypoints(0.50, 0.42, -0.3, 'B');
      break;
    }
    case 'BOOK': {
      const open = 0.06 * t;
      set(7, 0.40 - open, 0.42); set(9, 0.46 - open, 0.42);
      set(8, 0.60 + open, 0.42); set(10, 0.54 + open, 0.42);
      base.leftHand = generateHandKeypoints(0.46 - open, 0.42, 0.2, 'B');
      base.rightHand = generateHandKeypoints(0.54 + open, 0.42, -0.2, 'B');
      break;
    }
    case 'READ': {
      set(7, 0.42, 0.44); set(9, 0.48, 0.42);
      set(8, 0.58, 0.38); set(10, 0.50, 0.40 + 0.04 - (0.08 * phase));
      base.leftHand = generateHandKeypoints(0.48, 0.44, 0.0, 'B');
      base.rightHand = generateHandKeypoints(0.50, 0.44 - (0.08 * phase), -0.1, 'V');
      break;
    }
    case 'WRITE': {
      const scr = 0.03 * Math.sin(t * Math.PI * 6);
      set(7, 0.42, 0.44); set(9, 0.48, 0.44);
      set(8, 0.58, 0.40); set(10, 0.50 + scr, 0.42);
      base.leftHand = generateHandKeypoints(0.48, 0.44, 0.0, 'B');
      base.rightHand = generateHandKeypoints(0.50 + scr, 0.42, -0.1, 'O');
      break;
    }
    case 'WORK': {
      const tap = Math.abs(Math.sin(t * Math.PI * 2)) * 0.03;
      set(7, 0.42, 0.46); set(9, 0.48, 0.46);
      set(8, 0.56, 0.44); set(10, 0.52, 0.44 - tap);
      base.leftHand = generateHandKeypoints(0.48, 0.46, 0.0, 'A');
      base.rightHand = generateHandKeypoints(0.52, 0.44 - tap, 0.0, 'A');
      break;
    }
    case 'PLAY': {
      const shake = 0.04 * Math.sin(t * Math.PI * 5);
      set(7, 0.40, 0.46); set(9, 0.44 + shake, 0.44);
      set(8, 0.60, 0.46); set(10, 0.56 - shake, 0.46);
      base.leftHand = generateHandKeypoints(0.44 + shake, 0.46, 0.4, 'Y');
      base.rightHand = generateHandKeypoints(0.56 - shake, 0.46, -0.4, 'Y');
      break;
    }
    case 'COMPUTER': {
      const arc = 0.08 * t;
      set(7, 0.36, 0.46); set(9, 0.48, 0.46);
      set(8, 0.62, 0.42); set(10, 0.42 + arc, 0.42);
      base.leftHand = generateHandKeypoints(0.48, 0.46, 0.0, 'flat');
      base.rightHand = generateHandKeypoints(0.42 + arc, 0.42, -0.3, 'C');
      break;
    }
    case 'MATH': {
      const slide = 0.05 * t;
      set(7, 0.40, 0.44); set(9, 0.48, 0.44);
      set(8, 0.60, 0.42); set(10, 0.52 + slide, 0.42 - slide);
      base.leftHand = generateHandKeypoints(0.48, 0.44, 0.1, 'open');
      base.rightHand = generateHandKeypoints(0.52 + slide, 0.42 - slide, -0.2, 'open');
      break;
    }
    case 'PRESENTATION': case 'DEMO': {
      const sweep = 0.06 * phase;
      set(7, 0.36, 0.44); set(9, 0.36 - sweep, 0.42);
      set(8, 0.64, 0.44); set(10, 0.64 + sweep, 0.42);
      base.leftHand = generateHandKeypoints(0.36 - sweep, 0.42, 0.4, 'open');
      base.rightHand = generateHandKeypoints(0.64 + sweep, 0.42, -0.4, 'open');
      break;
    }
    case 'SEE': case 'WATCH': {
      const rx = 0.54 + (0.08 * t);
      const ry = 0.22 + (0.12 * t);
      set(8, 0.62, 0.38); set(10, rx, ry);
      base.rightHand = generateHandKeypoints(rx, ry, -0.2, 'V');
      break;
    }
    case 'NOT': {
      const flick = 0.06 * t;
      set(8, 0.58, 0.36); set(10, 0.52 + flick, 0.30);
      base.rightHand = generateHandKeypoints(0.52 + flick, 0.30, -0.5, 'A');
      break;
    }
    case 'CAN': {
      const drop = 0.05 * phase;
      set(7, 0.40, 0.42 + drop); set(9, 0.46, 0.42 + drop);
      set(8, 0.60, 0.42 + drop); set(10, 0.54, 0.42 + drop);
      base.leftHand = generateHandKeypoints(0.46, 0.42 + drop, 0.0, 'fist');
      base.rightHand = generateHandKeypoints(0.54, 0.42 + drop, 0.0, 'fist');
      break;
    }
    case 'FINISH': {
      const flip = 0.05 * phase;
      set(7, 0.40, 0.42); set(9, 0.46, 0.42);
      set(8, 0.60, 0.42); set(10, 0.54, 0.42);
      base.leftHand = generateHandKeypoints(0.46, 0.42, 0.1 + flip, 'B');
      base.rightHand = generateHandKeypoints(0.54, 0.42, -0.1, 'B');
      break;
    }
    case 'GO': {
      const swing = 0.08 * t;
      set(7, 0.40, 0.44); set(9, 0.46, 0.44);
      set(8, 0.58, 0.40); set(10, 0.50 + swing, 0.40 - (0.02 * t));
      base.leftHand = generateHandKeypoints(0.46, 0.44, 0.0, '1');
      base.rightHand = generateHandKeypoints(0.50 + swing, 0.40 - (0.02 * t), -0.3, '1');
      break;
    }
    case 'COME': {
      const pull = 0.08 * (1 - t);
      set(7, 0.40, 0.44); set(9, 0.46, 0.42);
      set(8, 0.60, 0.42); set(10, 0.56 - pull, 0.40);
      base.leftHand = generateHandKeypoints(0.46, 0.42, 0.0, '1');
      base.rightHand = generateHandKeypoints(0.56 - pull, 0.40, -0.2, '1');
      break;
    }
    case 'WITH': {
      const join = 0.05 * (1 - phase);
      set(7, 0.42, 0.44); set(9, 0.50 - join, 0.42);
      set(8, 0.58, 0.44); set(10, 0.50 + join, 0.42);
      base.leftHand = generateHandKeypoints(0.50 - join, 0.42, 0.2, 'A');
      base.rightHand = generateHandKeypoints(0.50 + join, 0.42, -0.2, 'A');
      break;
    }
    case 'AI': {
      const rx = 0.56; const ry = 0.38;
      set(8, 0.62, 0.42); set(10, rx, ry);
      base.rightHand = generateHandKeypoints(rx, ry, -0.1, t < 0.5 ? 'A' : 'I');
      break;
    }
    case 'SCIENCE': {
      const p1 = Math.sin(t * Math.PI * 4) * 0.04;
      const p2 = Math.cos(t * Math.PI * 4) * 0.04;
      set(7, 0.38, 0.44); set(9, 0.44 + p1, 0.44 + p2);
      set(8, 0.62, 0.44); set(10, 0.56 - p1, 0.44 - p2);
      base.leftHand = generateHandKeypoints(0.44 + p1, 0.44 + p2, 0.4, 'A');
      base.rightHand = generateHandKeypoints(0.56 - p1, 0.44 - p2, -0.4, 'A');
      break;
    }
    case 'FRIEND': {
      const flip = 0.03 * Math.sin(t * Math.PI * 2);
      set(7, 0.42, 0.42 + flip); set(9, 0.48, 0.42 + flip);
      set(8, 0.58, 0.42 - flip); set(10, 0.50, 0.42 - flip);
      base.leftHand = generateHandKeypoints(0.48, 0.42 + flip, 0.3, '1');
      base.rightHand = generateHandKeypoints(0.50, 0.42 - flip, -0.3, '1');
      break;
    }
    case 'FAMILY': {
      const arc = 0.06 * t;
      set(7, 0.42, 0.40); set(9, 0.46, 0.40);
      set(8, 0.58, 0.40); set(10, 0.54 + arc, 0.42);
      base.leftHand = generateHandKeypoints(0.46, 0.40, 0.1, 'O');
      base.rightHand = generateHandKeypoints(0.54 + arc, 0.40, -0.1, 'F');
      break;
    }
    case 'TEACHER': case 'STUDENT': {
      const pull = 0.05 * t;
      set(7, 0.42, 0.42 - pull); set(9, 0.47, 0.42 - pull);
      set(8, 0.58, 0.42 - pull); set(10, 0.53, 0.42 - pull);
      base.leftHand = generateHandKeypoints(0.47, 0.42 - pull, 0.2, 'O');
      base.rightHand = generateHandKeypoints(0.53, 0.42 - pull, -0.2, 'O');
      break;
    }
    default: {
      if (gloss.length === 1 && /[A-Z0-9]/.test(gloss)) {
        const rx = 0.56; const ry = 0.38;
        set(8, 0.62, 0.42); set(10, rx, ry);
        base.rightHand = generateHandKeypoints(rx, ry, -0.1, gloss);
      } else {
        const wave = 0.03 * Math.sin(t * Math.PI * 2);
        set(8, 0.62, 0.42); set(10, 0.56, 0.42 + wave);
        base.rightHand = generateHandKeypoints(0.56, 0.42 + wave, -0.2, 'open');
      }
      break;
    }
  }

  return base;
}

const FPS = 24;

/** MediaPipe pose landmark slots the renderer reads, keyed by COCO body index. */
const COCO_TO_MEDIAPIPE: [number, number][] = [
  [0, 0], [1, 2], [2, 5], [3, 7], [4, 8], [5, 11], [6, 12], [7, 13],
  [8, 14], [9, 15], [10, 16], [11, 23], [12, 24],
];

const POSE_SLOTS = 33;
const HAND_SLOTS = 21;

/**
 * Fills the square canvas: the procedural figure spans roughly x 0.3–0.7,
 * y 0.16–0.7, so ease it outward toward the full 0–1 range.
 */
const zoomX = (x: number) => 0.5 + (x - 0.5) * 1.4;
const zoomY = (y: number) => (y - 0.10) * 1.35;

function poseToFrame(pose: PoseSnapshot): PoseFramePoint[] {
  const frame: PoseFramePoint[] = new Array(POSE_SLOTS).fill([0, 0, 0]);
  for (const [coco, mp] of COCO_TO_MEDIAPIPE) {
    const p = pose.body[coco];
    frame[mp] = [zoomX(p.x), zoomY(p.y), p.score];
  }
  const leftStart = POSE_SLOTS;
  pose.leftHand.forEach((pt, i) => { frame[leftStart + i] = [zoomX(pt.x), zoomY(pt.y), pt.score]; });
  const rightStart = leftStart + HAND_SLOTS;
  pose.rightHand.forEach((pt, i) => { frame[rightStart + i] = [zoomX(pt.x), zoomY(pt.y), pt.score]; });
  const faceStart = rightStart + HAND_SLOTS;
  pose.face.forEach((pt, i) => { frame[faceStart + i] = [zoomX(pt.x), zoomY(pt.y), pt.score]; });
  return frame;
}
export function proceduralFrameSet(gloss: string, durationSeconds: number): PoseFrameSet {
  const frameCount = Math.max(6, Math.round(Math.max(0.25, durationSeconds) * FPS));
  const frames: PoseFrame[] = [];

  for (let f = 0; f < frameCount; f++) {
    const t = frameCount === 1 ? 0 : f / (frameCount - 1);
    const pose = getPoseForSign(gloss, t);
    frames.push(poseToFrame(pose));
  }

  const leftStart = POSE_SLOTS;
  const rightStart = leftStart + HAND_SLOTS;
  const faceStart = rightStart + HAND_SLOTS;

  return {
    fps: FPS,
    width: 1,
    height: 1,
    components: [
      { name: 'POSE_LANDMARKS', start: 0, count: POSE_SLOTS },
      { name: 'LEFT_HAND_LANDMARKS', start: leftStart, count: HAND_SLOTS },
      { name: 'RIGHT_HAND_LANDMARKS', start: rightStart, count: HAND_SLOTS },
      { name: 'FACE_LANDMARKS', start: faceStart, count: 40 },
    ],
    bodyLimbs: [],
    handLimbs: HAND_CONNECTIONS,
    frames,
  };
}

/** One fingerspelled word as a single frameset: each letter held briefly. */
export function fingerspelledFrameSet(letters: string[]): PoseFrameSet {
  const framesPerLetter = Math.round(0.4 * FPS);
  const frames: PoseFrame[] = [];
  for (const letter of letters.length ? letters : ['?']) {
    for (let f = 0; f < framesPerLetter; f++) {
      const pose = getPoseForSign(letter, 0.5);
      // Fingerspelling reads best as crisp held handshapes, not eased motion.
      frames.push(poseToFrame(pose));
    }
  }
  if (frames.length === 0) frames.push(new Array(POSE_SLOTS).fill([0, 0, 0]));

  return {
    fps: FPS,
    width: 1,
    height: 1,
    components: [
      { name: 'POSE_LANDMARKS', start: 0, count: POSE_SLOTS },
      { name: 'LEFT_HAND_LANDMARKS', start: POSE_SLOTS, count: HAND_SLOTS },
      { name: 'RIGHT_HAND_LANDMARKS', start: POSE_SLOTS + HAND_SLOTS, count: HAND_SLOTS },
    ],
    bodyLimbs: [],
    handLimbs: HAND_CONNECTIONS,
    frames,
  };
}
