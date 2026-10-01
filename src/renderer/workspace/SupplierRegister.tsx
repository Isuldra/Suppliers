import React, { useState } from 'react';
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
            {supplier.number && `Lev.nr ${supplier.number} · `}
            {supplier.lines.length} åpne ordrelinjer
          </p>
        </div>
        <button className="pulse-icon-button" aria-label="Lukk leverandør" onClick={onClose}>
          ×
        </button>
      </div>
      {!supplier.email && (
        <p className="pulse-notice">
          Legg til e-post og purredag for å ta leverandøren med i ukeplanen.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.email && !validRecipients(draft.email)) {
            setError('Skriv en gyldig e-postadresse. Flere adresser skilles med semikolon.');
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
          E-postadresse
          <input
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            placeholder="ordre@leverandor.no"
          />
        </label>
        <fieldset>
          <legend>Språk i e-post</legend>
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
          <legend>Purredag</legend>
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
                {value.slice(0, 3)}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="pulse-muted">
          Lagres på denne PC-en og overstyrer leverandørarket til neste import i Pulse.
        </p>
        {error && (
          <p role="alert" className="pulse-danger">
            {error}
          </p>
        )}
        <div className="pulse-flex">
          <button className="pulse-primary" type="submit">
            Lagre
          </button>
          <button type="submit" value="remind" disabled={!supplier.lines.length}>
            Purre nå
          </button>
        </div>
      </form>
      <div className="pulse-register-history">
        <h3>Purrestatus</h3>
        <History name={supplier.name} entries={history} labels />
        <p className="pulse-muted">Handlinger registrert i Pulse på denne PC-en.</p>
        {history
          .filter((entry) => entry.supplier === supplier.name)
          .slice(0, 10)
          .map((entry, index) => (
            <p key={index}>
              {formatDate(new Date(entry.at))} ·{' '}
              {entry.status === 'sent' ? `Purret · ${entry.count} linjer` : 'Avvent'}
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
          aria-label="Søk i leverandørregister"
          placeholder="Navn, lev.nr eller e-post"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="pulse-tabs">
          {['Alle', ...DAYS, 'Ingen'].map((value) => (
            <button key={value} aria-pressed={day === value} onClick={() => setDay(value)}>
              {value === 'Ingen' ? 'Uten dag' : value === 'Alle' ? value : value.slice(0, 3)}
            </button>
          ))}
        </div>
        <span className="pulse-muted">{visible.length} leverandører</span>
      </div>
      <div className={`pulse-register ${supplier ? 'has-detail' : ''}`}>
        <div className="pulse-register-list">
          <div className="pulse-table-scroll">
            <table className="pulse-table">
              <thead>
                <tr>
                  <th>Leverandør</th>
                  <th>Lev.nr</th>
                  <th>E-post</th>
                  <th>Språk</th>
                  <th>Purredag</th>
                  <th className="number">Åpne linjer</th>
                  <th>Siste uker</th>
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
                      {item.email || 'Mangler e-post'}
                    </td>
                    <td>{LANGUAGES[item.language]}</td>
                    <td>{item.days.join(', ') || 'Ikke satt'}</td>
                    <td className="number">{item.lines.length}</td>
                    <td>
                      <History name={item.name} entries={history} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && <p className="pulse-empty">Ingen leverandører passer søket.</p>}
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
