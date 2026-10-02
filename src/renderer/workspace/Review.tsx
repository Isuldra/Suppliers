import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, numberMatches, validRecipients, type Language } from './model';
import { reminderHtml, reminderSubject, sendReminder, type Reminder } from './reminder';
import { Check, Modal } from './Primitives';

type Status = {
  state: 'sending' | 'sent' | 'sent-unsaved' | 'error' | 'skipped';
  message?: string;
  sentAt?: string;
};
const STATE_KEYS: Record<Status['state'], string> = {
  sending: 'workspace.review.stateSending',
  sent: 'workspace.review.stateSent',
  'sent-unsaved': 'workspace.review.stateSentUnsaved',
  error: 'workspace.review.stateError',
  skipped: 'workspace.review.stateSkipped',
};
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
  onSent: (reminder: Reminder, sentAt: string) => boolean | Promise<boolean>;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(initial);
  const [focus, setFocus] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(quickConfirm);
  // Suppliers whose recipient was confirmed for order lines joined by supplier number alone.
  const [matchConfirmed, setMatchConfirmed] = useState<Set<string>>(new Set());
  const lock = useRef(false);
  const current = items[focus];
  const html = useMemo(() => reminderHtml(current), [current]);
  const status = statuses[current.supplier];
  const currentMatches = numberMatches(current.supplier, current.lines);
  const pending = items.filter(
    (item) => !['sent', 'sent-unsaved', 'skipped'].includes(statuses[item.supplier]?.state)
  );
  const unsaved = items.find((item) => statuses[item.supplier]?.state === 'sent-unsaved');
  const sentCount = Object.values(statuses).filter((item) =>
    ['sent', 'sent-unsaved'].includes(item.state)
  ).length;
  const unconfirmed = (item: Reminder) =>
    numberMatches(item.supplier, item.lines).length > 0 && !matchConfirmed.has(item.supplier);
  const recipientsValid = pending.every((item) => validRecipients(item.recipient));
  const matchesConfirmed = !pending.some(unconfirmed);
  const valid = recipientsValid && matchesConfirmed;
  const editable = !busy && !['sent', 'sent-unsaved'].includes(status?.state || '');
  const update = (changes: Partial<Reminder>) =>
    setItems((prev) =>
      prev.map((item, index) => (index === focus ? { ...item, ...changes } : item))
    );
  async function saveSent(item: Reminder, sentAt: string) {
    let saved = false;
    try {
      saved = await onSent(item, sentAt);
    } catch {
      // Outlook already confirmed sending. A history failure must never resend it.
    }
    setStatuses((prev) => ({
      ...prev,
      [item.supplier]: { state: saved ? 'sent' : 'sent-unsaved', sentAt },
    }));
    return saved;
  }
  async function retrySave() {
    if (lock.current || !unsaved) return;
    lock.current = true;
    setBusy(true);
    try {
      onBusy(!(await saveSent(unsaved, statuses[unsaved.supplier].sentAt!)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function send() {
    if (lock.current || unsaved || !valid || !pending.length) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setConfirm(false);
    let historySaved = true;
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
        historySaved = await saveSent(item, new Date().toISOString());
        if (!historySaved) break;
      }
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(!historySaved);
    }
  }
  return (
    <>
      <div className="pulse-review-heading">
        <button disabled={busy || Boolean(unsaved)} onClick={onBack}>
          {t('workspace.review.back')}
        </button>
        <div>
          <h2>{t('workspace.review.title')}</h2>
          <p>{t('workspace.review.subtitle')}</p>
        </div>
      </div>
      <div className="pulse-review">
        <aside className="pulse-suppliers">
          <div className="pulse-list-header">
            <strong>{t('workspace.review.suppliers', { count: items.length })}</strong>
            <small>{t('workspace.review.sent', { count: sentCount })}</small>
          </div>
          <div className="pulse-supplier-scroll">
            {items.map((item, index) => (
              <button
                className={`pulse-review-supplier ${focus === index ? 'active' : ''}`}
                key={item.supplier}
                onClick={() => setFocus(index)}
              >
                <strong>{item.supplier}</strong>
                <span>{t('workspace.review.lines', { count: item.lines.length })}</span>
                <small className={statuses[item.supplier]?.state === 'error' ? 'pulse-danger' : ''}>
                  {statuses[item.supplier]
                    ? t(STATE_KEYS[statuses[item.supplier].state])
                    : !validRecipients(item.recipient)
                      ? t('workspace.review.invalidEmail')
                      : unconfirmed(item)
                        ? t('workspace.review.checkMatch')
                        : LANGUAGES[item.language]}
                </small>
              </button>
            ))}
          </div>
        </aside>
        <section className="pulse-mail-pane">
          <div className="pulse-mail-settings">
            <label className="pulse-field">
              {t('workspace.review.to')}
              <input
                aria-label={t('workspace.review.recipient')}
                disabled={!editable}
                value={current.recipient}
                onChange={(event) => update({ recipient: event.target.value })}
              />
            </label>
            <label className="pulse-field">
              {t('workspace.review.language')}
              <select
                aria-label={t('workspace.review.emailLanguage')}
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
              {status?.state === 'skipped'
                ? t('workspace.review.include')
                : t('workspace.review.skip')}
            </button>
          </div>
          {status?.state === 'error' && (
            <div role="alert" className="pulse-notice pulse-error">
              {status.message} {t('workspace.review.checkSent')}
            </div>
          )}
          {!validRecipients(current.recipient) && (
            <p role="alert" className="pulse-notice">
              {t('workspace.review.invalidRecipient')}
            </p>
          )}
          {currentMatches.length > 0 && (
            <div role="alert" className="pulse-notice">
              <p>
                {t('workspace.review.matchNotice', {
                  names: [...new Set(currentMatches.map((line) => line.supplier))].join(', '),
                  supplier: current.supplier,
                  number: currentMatches[0].internalSupplierNumber,
                })}
              </p>
              <label>
                <Check
                  disabled={!editable}
                  checked={matchConfirmed.has(current.supplier)}
                  onChange={() =>
                    setMatchConfirmed((prev) => {
                      const next = new Set(prev);
                      if (next.has(current.supplier)) next.delete(current.supplier);
                      else next.add(current.supplier);
                      return next;
                    })
                  }
                />{' '}
                {t('workspace.review.matchConfirm')}
              </label>
            </div>
          )}
          <div className="pulse-mail-subject">
            <span>{t('workspace.review.subject')}</span>
            <strong>{reminderSubject(current)}</strong>
          </div>
          <iframe
            className="pulse-mail-preview"
            title={t('workspace.review.previewTitle', { supplier: current.supplier })}
            sandbox=""
            srcDoc={html}
          />
        </section>
      </div>
      {unsaved && (
        <div role="alert" className="pulse-notice pulse-error">
          {t('workspace.review.unsaved', { supplier: unsaved.supplier })}
          <button disabled={busy} onClick={() => void retrySave()}>
            {t('workspace.review.retrySave')}
          </button>
        </div>
      )}
      <footer className="pulse-footer">
        <div>
          <strong aria-live="polite">
            {t('workspace.review.progress', { sent: sentCount, count: items.length })}
          </strong>
          <small>
            {busy
              ? t('workspace.review.waitOutlook')
              : !recipientsValid
                ? t('workspace.review.fixRecipients')
                : !matchesConfirmed
                  ? t('workspace.review.confirmMatches')
                  : t('workspace.review.sentFrom')}
          </small>
        </div>
        <div className="pulse-grow" />
        {pending.length ? (
          <button
            className="pulse-primary"
            disabled={busy || Boolean(unsaved) || !valid}
            onClick={() => void send()}
          >
            {busy
              ? t('workspace.review.sending')
              : t('workspace.review.send', { count: pending.length })}
          </button>
        ) : (
          <button className="pulse-primary" disabled={busy || Boolean(unsaved)} onClick={onBack}>
            {t('workspace.review.backToRemind')}
          </button>
        )}
      </footer>
      {confirm && (
        <Modal
          title={t('workspace.review.confirmTitle', { count: items.length })}
          onClose={() => setConfirm(false)}
        >
          <p>
            {t('workspace.review.confirmText', {
              lines: t('workspace.review.lines', {
                count: items.reduce((count, item) => count + item.lines.length, 0),
              }),
              suppliers: t('workspace.review.suppliers', { count: items.length }),
            })}
          </p>
          <p>{t('workspace.review.confirmNote')}</p>
          <div className="pulse-flex">
            <button onClick={() => setConfirm(false)}>{t('workspace.review.reviewFirst')}</button>
            <button className="pulse-primary" disabled={!valid} onClick={() => void send()}>
              {t('workspace.review.confirm')}
            </button>
          </div>
          {!recipientsValid ? (
            <p className="pulse-danger">{t('workspace.review.fixBeforeSend')}</p>
          ) : (
            !matchesConfirmed && (
              <p className="pulse-danger">{t('workspace.review.confirmMatches')}</p>
            )
          )}
        </Modal>
      )}
    </>
  );
}
