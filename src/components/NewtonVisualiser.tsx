import { forwardRef } from 'react';
import { ForceMassDiagram } from './ForceMassDiagram';

interface NewtonVisualiserProps {
  force: number;
  mass: number;
  onForceChange: (value: number) => void;
  onMassChange: (value: number) => void;
}

export const NewtonVisualiser = forwardRef<HTMLDivElement, NewtonVisualiserProps>(function NewtonVisualiser(
  { force, mass, onForceChange, onMassChange },
  ref,
) {
  const acceleration = force / mass;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="visualise-heading"
      className="rounded-xl border border-line bg-white shadow-card p-5 sm:p-6"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Step 4 · Try it yourself</p>
      <h2 id="visualise-heading" className="mt-1 font-display text-xl font-semibold text-navy-900">
        Visualise it yourself
      </h2>
      <p className="mt-1 text-sm text-ink-faint max-w-2xl">
        Adjust force and mass to see how acceleration responds &mdash; the same relationship from the
        lesson, but in your own hands. a = F ÷ m.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="force-slider" className="text-sm font-semibold text-ink">
                Force
              </label>
              <span className="font-mono text-sm text-ink-soft">{force} N</span>
            </div>
            <input
              id="force-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={force}
              onChange={(e) => onForceChange(Number(e.target.value))}
              className="mt-2"
              aria-valuetext={`${force} newtons`}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="mass-slider" className="text-sm font-semibold text-ink">
                Mass
              </label>
              <span className="font-mono text-sm text-ink-soft">{mass} kg</span>
            </div>
            <input
              id="mass-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={mass}
              onChange={(e) => onMassChange(Number(e.target.value))}
              className="mt-2"
              aria-valuetext={`${mass} kilograms`}
            />
          </div>

          <div className="rounded-lg bg-navy-900 px-5 py-4 text-center" role="status" aria-live="polite">
            <p className="text-xs font-medium uppercase tracking-wide text-paper/60">Resulting acceleration</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-gold-400">
              {acceleration.toFixed(2)} m/s&sup2;
            </p>
            <p className="mt-1 font-mono text-xs text-paper/50">
              a = F ÷ m = {force} ÷ {mass}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-paper p-4">
          <ForceMassDiagram
            massLevel={mass}
            forceLevel={force}
            acceleration={acceleration}
            caption={`Force of ${force} newtons acting on a mass of ${mass} kilograms produces ${acceleration.toFixed(2)} metres per second squared of acceleration`}
          />
        </div>
      </div>
    </section>
  );
});
