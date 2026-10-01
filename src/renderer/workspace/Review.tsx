import React, { useMemo, useRef, useState } from 'react';
import { LANGUAGES, validRecipients, type Language } from './model';
import { reminderHtml, reminderSubject, sendReminder, type Reminder } from './reminder';
import { Modal } from './Primitives';

type Status = { state: 'sending' | 'sent' | 'error' | 'skipped'; message?: string };
export default function Review({
  initial,
  quickConfirm,
  onBack,
  onSent,
  onBusy,
}: {
  initial: Reminder[];
  quickConfirm: boolean;
  onBack: () => void;
  onSent: (reminder: Reminder) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [items, setItems] = useState(initial);
  const [focus, setFocus] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(quickConfirm);
  const lock = useRef(false);
  const current = items[focus];
  const html = useMemo(() => reminderHtml(current), [current]);
  const status = statuses[current.supplier];
  const pending = items.filter(
    (item) => !['sent', 'skipped'].includes(statuses[item.supplier]?.state)
  );
  const sentCount = Object.values(statuses).filter((item) => item.state === 'sent').length;
  const valid = pending.every((item) => validRecipients(item.recipient));
  const editable = !busy && status?.state !== 'sent';
  const update = (changes: Partial<Reminder>) =>
    setItems((prev) =>
      prev.map((item, index) => (index === focus ? { ...item, ...changes } : item))
    );
  async function send() {
    if (lock.current || !valid || !pending.length) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setConfirm(false);
    try {
      for (const item of pending) {
        setFocus(items.indexOf(item));
        setStatuses((prev) => ({ ...prev, [item.supplier]: { state: 'sending' } }));
        try {
          await sendReminder(item);
        } catch (error) {
          setStatuses((prev) => ({
            ...prev,
            [item.supplier]: {
              state: 'error',
              message: error instanceof Error ? error.message : String(error),
            },
          }));
          break;
        }
        setStatuses((prev) => ({ ...prev, [item.supplier]: { state: 'sent' } }));
        onSent(item);
      }
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <>
      <div className="pulse-review-heading">
        <button disabled={busy} onClick={onBack}>
          ← Tilbake til utvalget
        </button>
        <div>
          <h2>Se gjennom purringene</h2>
          <p>Én e-post per leverandør. Bare de valgte ordrelinjene tas med.</p>
        </div>
      </div>
      <div className="pulse-review">
        <aside className="pulse-suppliers">
          <div className="pulse-list-header">
            <strong>{items.length} leverandører</strong>
            <small>{sentCount} sendt</small>
          </div>
          <div className="pulse-supplier-scroll">
            {items.map((item, index) => (
              <button
                className={`pulse-review-supplier ${focus === index ? 'active' : ''}`}
                key={item.supplier}
                onClick={() => setFocus(index)}
              >
                <strong>{item.supplier}</strong>
                <span>{item.lines.length} ordrelinjer</span>
                <small className={statuses[item.supplier]?.state === 'error' ? 'pulse-danger' : ''}>
                  {{
                    sending: 'Sender …',
                    sent: '✓ Sendt',
                    error: 'Sending feilet',
                    skipped: 'Hoppet over',
                  }[statuses[item.supplier]?.state] ||
                    (validRecipients(item.recipient)
                      ? LANGUAGES[item.language]
                      : 'Mangler gyldig e-post')}
                </small>
              </button>
            ))}
          </div>
        </aside>
        <section className="pulse-mail-pane">
          <div className="pulse-mail-settings">
            <label className="pulse-field">
              Til
              <input
                aria-label="Mottaker"
                disabled={!editable}
                value={current.recipient}
                onChange={(event) => update({ recipient: event.target.value })}
              />
            </label>
            <label className="pulse-field">
              Språk
              <select
                aria-label="E-postspråk"
                disabled={!editable}
                value={current.language}
                onChange={(event) => update({ language: event.target.value as Language })}
              >
                {Object.entries(LANGUAGES).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!editable}
              onClick={() =>
                setStatuses((prev) => {
                  const next = { ...prev };
                  if (status?.state === 'skipped') delete next[current.supplier];
                  else next[current.supplier] = { state: 'skipped' };
                  return next;
                })
              }
            >
              {status?.state === 'skipped' ? 'Ta med igjen' : 'Hopp over'}
            </button>
          </div>
          {status?.state === 'error' && (
            <div role="alert" className="pulse-notice pulse-error">
              {status.message} Kontroller Sendt-mappen i Outlook før du prøver igjen.
            </div>
          )}
          {!validRecipients(current.recipient) && (
            <p role="alert" className="pulse-notice">
              Legg til en gyldig mottakeradresse. Flere adresser skilles med semikolon.
            </p>
          )}
          <div className="pulse-mail-subject">
            <span>Emne</span>
            <strong>{reminderSubject(current)}</strong>
          </div>
          <iframe
            className="pulse-mail-preview"
            title={`E-post til ${current.supplier}`}
            sandbox=""
            srcDoc={html}
          />
        </section>
      </div>
      <footer className="pulse-footer">
        <div>
          <strong aria-live="polite">
            {sentCount} av {items.length} purringer sendt
          </strong>
          <small>
            {busy
              ? 'Vent mens Outlook sender …'
              : !valid
                ? 'En eller flere mottakere må rettes før sending.'
                : 'Sendes fra Outlook-kontoen som er satt opp i Pulse.'}
          </small>
        </div>
        <div className="pulse-grow" />
        {pending.length ? (
          <button className="pulse-primary" disabled={busy || !valid} onClick={() => void send()}>
            {busy ? 'Sender …' : `Send ${pending.length} purringer`}
          </button>
        ) : (
          <button className="pulse-primary" onClick={onBack}>
            Tilbake til purring
          </button>
        )}
      </footer>
      {confirm && (
        <Modal title={`Send ${items.length} purringer?`} onClose={() => setConfirm(false)}>
          <p>
            Dette sender {items.reduce((count, item) => count + item.lines.length, 0)} ordrelinjer
            til {items.length} leverandører via Outlook.
          </p>
          <p>Leverandører du har satt på avvent, og linjer du har tatt ut, er ikke med.</p>
          <div className="pulse-flex">
            <button onClick={() => setConfirm(false)}>Se gjennom først</button>
            <button className="pulse-primary" disabled={!valid} onClick={() => void send()}>
              Bekreft sending
            </button>
          </div>
          {!valid && (
            <p className="pulse-danger">Rett mottakeradressene i forhåndsvisningen før sending.</p>
          )}
        </Modal>
      )}
    </>
  );
}
