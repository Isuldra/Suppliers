import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DAYS,
  LANGUAGES,
  validRecipients,
  formatDate,
  type Supplier,
  type ContactEdit,
  type HistoryEntry,
} from './model';
import { History } from './Primitives';

function ContactForm({
  supplier,
  onSave,
  onRemind,
  onClose,
  history,
}: {
  supplier: Supplier;
  onSave: (name: string, edit: ContactEdit) => void;
  onRemind: (name: string) => void;
  onClose: () => void;
  history: HistoryEntry[];
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ContactEdit>({
    email: supplier.email,
    language: supplier.language,
    days: supplier.days,
  });
  const [error, setError] = useState('');
  return (
    <aside className="pulse-register-detail">
      <div className="pulse-flex">
        <div className="pulse-grow">
          <h2>{supplier.name}</h2>
          <p>
            {supplier.number &&
              `${t('workspace.detail.supplierNo', { number: supplier.number })} · `}
            {t('workspace.register.openLines', { count: supplier.lines.length })}
          </p>
        </div>
        <button
          className="pulse-icon-button"
          aria-label={t('workspace.register.close')}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {!supplier.email && <p className="pulse-notice">{t('workspace.register.addEmail')}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.email && !validRecipients(draft.email)) {
            setError(t('workspace.register.invalidEmail'));
            return;
          }
          setError('');
          onSave(supplier.name, { ...draft, email: draft.email.trim() });
          if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'remind') {
            onRemind(supplier.name);
          }
        }}
      >
        <label className="pulse-field">
          {t('workspace.register.email')}
          <input
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            placeholder={t('workspace.register.emailPlaceholder')}
          />
        </label>
        <fieldset>
          <legend>{t('workspace.register.emailLanguage')}</legend>
          <div className="pulse-chips">
            {Object.entries(LANGUAGES).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={draft.language === value}
                onClick={() => setDraft({ ...draft, language: value as ContactEdit['language'] })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('workspace.register.remindDay')}</legend>
          <div className="pulse-chips">
            {DAYS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={draft.days.includes(value)}
                onClick={() =>
                  setDraft({
                    ...draft,
                    days: draft.days.includes(value)
                      ? draft.days.filter((day) => day !== value)
                      : [...draft.days, value],
                  })
                }
              >
                {t(`workspace.daysShort.${value}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="pulse-muted">{t('workspace.register.savedLocally')}</p>
        {error && (
          <p role="alert" className="pulse-danger">
            {error}
          </p>
        )}
        <div className="pulse-flex">
          <button className="pulse-primary" type="submit">
            {t('workspace.register.save')}
          </button>
          <button type="submit" value="remind" disabled={!supplier.lines.length}>
            {t('workspace.register.remindNow')}
          </button>
        </div>
      </form>
      <div className="pulse-register-history">
        <h3>{t('workspace.register.status')}</h3>
        <History name={supplier.name} entries={history} labels />
        <p className="pulse-muted">{t('workspace.register.historyNote')}</p>
        {history
          .filter((entry) => entry.supplier === supplier.name)
          .slice(0, 10)
          .map((entry, index) => (
            <p key={index}>
              {formatDate(new Date(entry.at))} ·{' '}
              {entry.status === 'sent'
                ? t('workspace.register.historySent', { count: entry.count })
                : t('workspace.register.historyDeferred')}
            </p>
          ))}
      </div>
    </aside>
  );
}
export default function SupplierRegister({
  initialFocus = '',
  suppliers,
  history,
  onSave,
  onRemind,
}: {
  initialFocus?: string;
  suppliers: Supplier[];
  history: HistoryEntry[];
  onSave: (name: string, edit: ContactEdit) => void;
  onRemind: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [day, setDay] = useState('Alle');
  const [focus, setFocus] = useState(initialFocus);
  const visible = suppliers.filter(
    (supplier) =>
      `${supplier.name} ${supplier.number} ${supplier.email}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (day === 'Alle' || (day === 'Ingen' ? !supplier.days.length : supplier.days.includes(day)))
  );
  const supplier = suppliers.find((item) => item.name === focus);
  return (
    <>
      <div className="pulse-register-tools">
        <input
          aria-label={t('workspace.register.search')}
          placeholder={t('workspace.register.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="pulse-tabs">
          {['Alle', ...DAYS, 'Ingen'].map((value) => (
            <button key={value} aria-pressed={day === value} onClick={() => setDay(value)}>
              {value === 'Ingen'
                ? t('workspace.register.noDay')
                : value === 'Alle'
                  ? t('workspace.filters.all')
                  : t(`workspace.daysShort.${value}`)}
            </button>
          ))}
        </div>
        <span className="pulse-muted">
          {t('workspace.register.count', { count: visible.length })}
        </span>
      </div>
      <div className={`pulse-register ${supplier ? 'has-detail' : ''}`}>
        <div className="pulse-register-list">
          <div className="pulse-table-scroll">
            <table className="pulse-table">
              <thead>
                <tr>
                  <th>{t('workspace.register.colSupplier')}</th>
                  <th>{t('workspace.register.colNumber')}</th>
                  <th>{t('workspace.register.colEmail')}</th>
                  <th>{t('workspace.register.colLanguage')}</th>
                  <th>{t('workspace.register.colDay')}</th>
                  <th className="number">{t('workspace.register.colOpenLines')}</th>
                  <th>{t('workspace.register.colRecentWeeks')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.name} className={item.name === focus ? 'active' : ''}>
                    <td>
                      <button className="pulse-text-button" onClick={() => setFocus(item.name)}>
                        {item.name}
                      </button>
                    </td>
                    <td>{item.number || '—'}</td>
                    <td className={!item.email ? 'pulse-danger' : ''}>
                      {item.email || t('workspace.register.missingEmail')}
                    </td>
                    <td>{LANGUAGES[item.language]}</td>
                    <td>
                      {item.days.map((value) => t(`workspace.days.${value}`)).join(', ') ||
                        t('workspace.register.notSet')}
                    </td>
                    <td className="number">{item.lines.length}</td>
                    <td>
                      <History name={item.name} entries={history} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && <p className="pulse-empty">{t('workspace.register.noMatch')}</p>}
        </div>
        {supplier && (
          <ContactForm
            key={supplier.name}
            supplier={supplier}
            history={history}
            onSave={onSave}
            onRemind={onRemind}
            onClose={() => setFocus('')}
          />
        )}
      </div>
    </>
  );
}
