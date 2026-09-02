interface HeaderProps {
  demoRunning: boolean;
  onStartDemo: () => void;
  onStopDemo: () => void;
  onShowAbout: () => void;
}

export function Header({ demoRunning, onStartDemo, onStopDemo, onShowAbout }: HeaderProps) {
  return (
    <header className="bg-navy-900 text-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-gold-500 text-navy-900 font-display font-bold text-lg"
            aria-hidden="true"
          >
            S
          </span>
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight">SignBridge</h1>
              <span className="inline-flex items-center rounded-full border border-gold-500/60 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-gold-400">
                Prototype
              </span>
            </div>
            <p className="mt-1 text-sm text-paper/80 max-w-md">
              Signed learning that helps students understand.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="text-sm text-paper/85 md:text-right">
            <p className="font-medium text-paper">Newton&rsquo;s Second Law of Motion</p>
            <p className="text-paper/70">NASA / ISS &middot; STEMonstrations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowAbout}
              className="inline-flex items-center gap-1.5 rounded-md border border-paper/25 px-3 py-2 text-sm font-medium text-paper/80 hover:border-paper/50 hover:text-paper transition-colors"
            >
              About
            </button>
            <button
              type="button"
              onClick={demoRunning ? onStopDemo : onStartDemo}
              className="inline-flex items-center gap-2 rounded-md border border-gold-500 px-3.5 py-2 text-sm font-semibold text-gold-400 hover:bg-gold-500 hover:text-navy-900 focus-visible:bg-gold-500 focus-visible:text-navy-900 transition-colors"
              aria-pressed={demoRunning}
            >
              <span aria-hidden="true">{demoRunning ? '■' : '▶'}</span>
              {demoRunning ? 'Stop guided demo' : 'Run guided demo'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
