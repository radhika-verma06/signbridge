import { useReducedMotion } from '../hooks/useReducedMotion';

interface ForceMassDiagramProps {
  /** 1 (light) to 10 (heavy) — controls the size of the "cart". */
  massLevel: number;
  /** 1 (small) to 10 (large) — controls the length of the force arrow. */
  forceLevel: number;
  /** Resulting acceleration value, already computed by the caller. */
  acceleration: number;
  caption?: string;
}

/**
 * The core visual signature of SignBridge: a single cart being pushed by a
 * force arrow, where the cart's size encodes mass and the trailing motion
 * lines encode the resulting acceleration. Used in both the EXPLAIN panel
 * (fixed illustrative values) and the Visualise section (live values).
 */
export function ForceMassDiagram({ massLevel, forceLevel, acceleration, caption }: ForceMassDiagramProps) {
  const reducedMotion = useReducedMotion();

  const cartWidth = 46 + massLevel * 9; // 55–136
  const cartHeight = 34 + massLevel * 4; // 38–74
  const cartX = 210 - cartWidth / 2;
  const arrowLength = 30 + forceLevel * 11; // 41–140
  const arrowStartX = cartX - arrowLength - 14;

  // Motion lines get shorter and fewer as acceleration drops, longer as it climbs.
  const motionLineCount = 3;
  const motionLineLength = Math.min(34, Math.max(6, acceleration * 10));

  return (
    <figure className="w-full" aria-label={caption ?? 'Diagram of force acting on a mass'}>
      <svg
        viewBox="0 0 420 160"
        role="img"
        aria-hidden={caption ? undefined : true}
        className="w-full h-auto"
      >
        <title>{caption ?? 'Force and mass diagram'}</title>
        {/* ground line */}
        <line x1="20" y1="128" x2="400" y2="128" stroke="#E1DED4" strokeWidth="2" />

        {/* motion lines behind the cart, indicating current acceleration */}
        {Array.from({ length: motionLineCount }).map((_, i) => {
          const y = 96 + i * 10;
          const x2 = cartX - 12;
          const x1 = x2 - motionLineLength;
          return (
            <line
              key={i}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="#BE8B22"
              strokeWidth="3"
              strokeLinecap="round"
              opacity={0.55 - i * 0.12}
              className={reducedMotion ? undefined : 'transition-all duration-300 ease-out'}
            />
          );
        })}

        {/* force arrow */}
        <g className={reducedMotion ? undefined : 'transition-all duration-300 ease-out'}>
          <line
            x1={arrowStartX}
            y1="96"
            x2={cartX - 10}
            y2="96"
            stroke="#0E1B2E"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon points={`${cartX - 10},88 ${cartX + 4},96 ${cartX - 10},104`} fill="#0E1B2E" />
        </g>

        {/* cart body: size encodes mass */}
        <g
          transform={`translate(${cartX}, ${128 - cartHeight})`}
          className={reducedMotion ? undefined : 'transition-all duration-300 ease-out'}
        >
          <rect
            x="0"
            y="0"
            width={cartWidth}
            height={cartHeight}
            rx="8"
            fill="#F6F5F1"
            stroke="#0E1B2E"
            strokeWidth="3"
          />
          <circle cx={cartWidth * 0.24} cy={cartHeight} r="9" fill="#0E1B2E" />
          <circle cx={cartWidth * 0.76} cy={cartHeight} r="9" fill="#0E1B2E" />
        </g>

        {/* labels */}
        <text x={arrowStartX} y="78" fontFamily="IBM Plex Mono, monospace" fontSize="13" fill="#12192A">
          F
        </text>
        <text x={cartX + cartWidth / 2 - 6} y={128 - cartHeight - 10} fontFamily="IBM Plex Mono, monospace" fontSize="13" fill="#12192A">
          m
        </text>
      </svg>
      {caption && <figcaption className="sr-only">{caption}</figcaption>}
    </figure>
  );
}
