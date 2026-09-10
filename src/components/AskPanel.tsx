import { useRef, useState, type FormEvent } from 'react';
import { QUICK_QUESTIONS } from '../data/concepts';
import type { ChatMessage } from '../types';

interface AskPanelProps {
  messages: ChatMessage[];
  onAsk: (question: string) => void;
}

export function AskPanel({ messages, onAsk }: AskPanelProps) {
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    onAsk(trimmed);
    setDraft('');
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(draft);
  }

  return (
    <section
      aria-labelledby="ask-signbridge-heading"
      className="rounded-xl border border-line bg-white shadow-card p-5 sm:p-6"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Step 3 · Ask</p>
      <h2 id="ask-signbridge-heading" className="mt-1 font-display text-xl font-semibold text-navy-900">
        Still confused? Ask SignBridge.
      </h2>
      <p className="mt-1 text-sm text-ink-faint">
        Deterministic local logic scoped to this lesson &mdash; works fully offline, no API key needed.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => submit(q.question)}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-soft hover:border-navy-700 hover:text-navy-900 transition-colors"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div
        ref={logRef}
        className="thin-scroll mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-line bg-paper p-4"
        aria-live="polite"
        aria-label="Conversation with SignBridge"
      >
        {messages.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-center">
            <p className="text-sm font-semibold text-ink-soft">No questions yet</p>
            <p className="max-w-xs text-xs leading-relaxed text-ink-faint">
              Pick a suggestion above, or type your own below — answers come with a “Sign” button when a concept can be signed.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'learner' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'learner' ? 'bg-navy-900 text-paper' : 'bg-white border border-line text-ink'
                }`}
              >
                {m.role === 'signbridge' && (
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                    SignBridge
                  </p>
                )}
                <p>{m.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about this lesson
        </label>
        <input
          id="ask-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Why does increasing mass reduce acceleration?"
          className="flex-1 rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus-visible:border-navy-700"
        />
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-navy-800 transition-colors"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
