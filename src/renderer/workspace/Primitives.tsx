import React, { useEffect, useId, useRef } from 'react';
import { getISOWeek } from '../../utils/dateUtils';
import { type HistoryEntry, weekKey } from './model';

export function Check({
  checked,
  partial,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { checked: boolean; partial?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(partial);
  }, [partial]);
  return <input {...props} ref={ref} type="checkbox" checked={checked} className="pulse-check" />;
}
export function History({
  name,
  entries,
  labels = false,
}: {
  name: string;
  entries: HistoryEntry[];
  labels?: boolean;
}) {
  return (
    <div className="pulse-history" aria-label="Purrestatus siste fem uker">
      {[4, 3, 2, 1, 0].map((offset) => {
        const date = new Date();
        date.setDate(date.getDate() - offset * 7);
        const entry = entries.find(
          (item) => item.supplier === name && weekKey(new Date(item.at)) === weekKey(date)
        );
        const title = `Uke ${getISOWeek(date)}: ${entry?.status === 'sent' ? 'Purret' : entry?.status === 'deferred' ? 'Avvent' : 'Ingen registrering i Pulse'}`;
        return (
          <span key={offset} title={title} aria-label={title}>
            <i className={entry?.status || ''} />
            {labels && <small>{getISOWeek(date)}</small>}
          </span>
        );
      })}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="pulse-modal"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button className="pulse-icon-button" aria-label="Lukk" disabled={busy} onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
