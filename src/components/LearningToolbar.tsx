interface LearningToolbarProps {
  captionsOn: boolean;
  signOn: boolean;
  onToggleCaptions: () => void;
  onToggleSign: () => void;
  onInterpret: () => void;
  onExplain: () => void;
  onAsk: () => void;
  onVisualise: () => void;
}

const baseButton =
  'inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-offset-2';
const toolButton = `${baseButton} border-navy-700 bg-white text-navy-900 hover:bg-navy-900 hover:text-paper`;

export function LearningToolbar({
  captionsOn,
  signOn,
  onToggleCaptions,
  onToggleSign,
  onInterpret,
  onExplain,
  onAsk,
  onVisualise,
}: LearningToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Lesson controls">
      <button
        type="button"
        onClick={onToggleCaptions}
        aria-pressed={captionsOn}
        className={`${baseButton} ${
          captionsOn ? 'border-navy-900 bg-navy-900 text-paper' : 'border-line bg-white text-ink hover:border-navy-700'
        }`}
      >
        <span aria-hidden="true">{captionsOn ? '✓' : ''}</span>
        Captions {captionsOn ? 'on' : 'off'}
      </button>

      <button
        type="button"
        onClick={onToggleSign}
        aria-pressed={signOn}
        className={`${baseButton} ${
          signOn ? 'border-navy-900 bg-navy-900 text-paper' : 'border-line bg-white text-ink hover:border-navy-700'
        }`}
      >
        <span aria-hidden="true">{signOn ? '✓' : ''}</span>
        Sign {signOn ? 'on' : 'off'}
      </button>

      <span className="ml-auto flex flex-wrap items-center gap-3">
        <button type="button" onClick={onInterpret} className={toolButton}>
          Interpret
        </button>
        <button type="button" onClick={onExplain} className={toolButton}>
          Explain
        </button>
        <button type="button" onClick={onAsk} className={toolButton}>
          Ask
        </button>
        <button
          type="button"
          onClick={onVisualise}
          className="inline-flex items-center gap-2 rounded-md border border-gold-600 bg-gold-500 px-5 py-3 text-base font-semibold text-navy-900 hover:bg-gold-400 shadow-raised transition-colors"
        >
          Visualise
        </button>
      </span>
    </div>
  );
}
