import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  RectangleStackIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import FileUpload from '../components/FileUpload';
import SettingsModal from '../components/SettingsModal';
import OrderTable from './OrderTable';
import SupplierRegister from './SupplierRegister';
import Review from './Review';
import { Check, History, Modal } from './Primitives';
import {
  DAYS,
  LANGUAGES,
  readMemory,
  saveMemory,
  buildSuppliers,
  onDay,
  currentStatus,
  excludedReason,
  lineId,
  fingerprint,
  waiting,
  lateDays,
  weekKey,
  type WorkspaceMemory,
  type Supplier,
  type ContactEdit,
} from './model';
import type { Reminder } from './reminder';
import type { ExcelRow, ExcelData, ValidationError } from '../types/ExcelData';
import type { SupplierContact } from '../../types/SupplierContact';
import { useWarehouseFilter } from '../context/WarehouseFilterContext';
import { useICTOrder } from '../context/ICTOrderContext';
import { getISOWeek } from '../../utils/dateUtils';
import logo from '../assets/onemed-logo.png';
import './workspace.css';

export default function Workspace() {
  const [memory, setMemory] = useState(readMemory);
  const memoryRef = useRef(memory);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [screen, setScreen] = useState<'work' | 'register'>('work');
  const [day, setDay] = useState(DAYS[new Date().getDay() - 1] || 'Alle');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState('');
  const [filter, setFilter] = useState('all');
  const [upload, setUpload] = useState(false);
  const [importing, setImporting] = useState(false);
  const [registerFocus, setRegisterFocus] = useState('');
  const [settings, setSettings] = useState(false);
  const [review, setReview] = useState<{ items: Reminder[]; quick: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { includeICTOrders, setIncludeICTOrders } = useICTOrder();
  const { warehouseFilter, setWarehouseFilter, showWarehouseFilter, refreshCountryDetection } =
    useWarehouseFilter();
  const request = useRef(0);
  const persist = useCallback((update: (prev: WorkspaceMemory) => WorkspaceMemory) => {
    const next = update(memoryRef.current);
    memoryRef.current = next;
    setMemory(next);
    try {
      saveMemory(next);
      return true;
    } catch {
      toast.error('Kunne ikke lagre valgene på denne PC-en. Behold Pulse åpen.', {
        id: 'workspace-storage',
      });
      return false;
    }
  }, []);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setLoadError('');
    try {
      const [orders, directory] = await Promise.all([
        window.electron.getAllOrders(includeICTOrders),
        window.electron.getSupplierContacts(),
      ]);
      if (id !== request.current) return;
      setRows(orders.map((order) => ({ ...order })));
      setContacts(directory);
      setSelected(new Set());
    } catch (error) {
      if (id === request.current)
        setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [includeICTOrders]);
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, [load]);
  useEffect(() => {
    const unsubscribe = window.electron.onUpdateError((error) =>
      toast.error(error.message || 'Oppdatering mislyktes.', { id: 'update' })
    );
    const downloaded = window.electron.onUpdateDownloaded((info) =>
      toast.success(`Pulse ${info.version} er klar for installasjon.`, { id: 'update' })
    );
    return () => {
      unsubscribe();
      downloaded();
    };
  }, []);
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          !showWarehouseFilter ||
          warehouseFilter === 'all' ||
          String(row.warehouse).replace(/^L\s*/i, '').trim() === warehouseFilter
      ),
    [rows, showWarehouseFilter, warehouseFilter]
  );
  const suppliers = useMemo(
    () => buildSuppliers(filteredRows, contacts, memory.contacts),
    [filteredRows, contacts, memory.contacts]
  );
  const daySuppliers = suppliers.filter(
    (supplier) => supplier.lines.length && onDay(supplier, day)
  );
  const visible = daySuppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase())
  );
  const active = visible.find((supplier) => supplier.name === focus) || visible[0];
  const included = (supplier: Supplier) =>
    supplier.lines.filter((line) => !excludedReason(line, memory.excluded));
  const ready = (supplier: Supplier) =>
    !currentStatus(supplier.name, memory.history) && included(supplier).length > 0;
  const selectedSuppliers = daySuppliers.filter(
    (supplier) => selected.has(supplier.name) && ready(supplier)
  );
  const eligible = visible.filter(ready);
  const allSelected =
    eligible.length > 0 && eligible.every((supplier) => selected.has(supplier.name));
  const selectedLines = selectedSuppliers.reduce(
    (count, supplier) => count + included(supplier).length,
    0
  );
  function selectDay(value: string) {
    setDay(value);
    setFocus('');
    setSelected(new Set());
    setFilter('all');
    setSearch('');
  }
  function toggleSupplier(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }
  function toggleLines(lines: ExcelRow[]) {
    const takeOut = lines.some((line) => !excludedReason(line, memory.excluded));
    persist((prev) => {
      const excluded = { ...prev.excluded };
      for (const line of lines) {
        if (takeOut)
          excluded[lineId(line)] = { fingerprint: fingerprint(line), reason: 'Avklart skriftlig' };
        else delete excluded[lineId(line)];
      }
      return { ...prev, excluded };
    });
  }
  function beginReview(quick = false) {
    if (!selectedSuppliers.length) return;
    setReview({
      quick,
      items: selectedSuppliers.map((supplier) => ({
        supplier: supplier.name,
        recipient: supplier.email,
        language: supplier.language,
        lines: included(supplier),
      })),
    });
  }
  function saveContact(name: string, edit: ContactEdit) {
    if (persist((prev) => ({ ...prev, contacts: { ...prev.contacts, [name]: edit } }))) {
      toast.success('Leverandøren er lagret.');
    }
  }
  async function imported(_data: ExcelData, fileName?: string) {
    persist((prev) => ({
      ...prev,
      contacts: {},
      fileName: fileName || 'Innkjøpsliste',
      importedAt: new Date().toISOString(),
    }));
    setUpload(false);
    setImporting(false);
    setReview(null);
    setValidationErrors([]);
    await refreshCountryDetection();
    await load();
  }
  function remindNow(name: string) {
    setScreen('work');
    setDay('Alle');
    setSearch('');
    setFocus(name);
    setSelected(new Set([name]));
  }
  function openRegister(name = '') {
    setRegisterFocus(name);
    setScreen('register');
    setReview(null);
  }
  function defer(supplier: Supplier) {
    persist((prev) => ({
      ...prev,
      history:
        currentStatus(supplier.name, prev.history) === 'deferred'
          ? prev.history.filter(
              (entry) =>
                !(
                  entry.supplier === supplier.name &&
                  entry.status === 'deferred' &&
                  weekKey(new Date(entry.at)) === weekKey()
                )
            )
          : [
              {
                supplier: supplier.name,
                at: new Date().toISOString(),
                status: 'deferred',
                count: 0,
              },
              ...prev.history,
            ],
    }));
  }
  return (
    <div className="pulse-shell">
      <nav className="pulse-rail" aria-label="Hovedmeny">
        <div className="pulse-wordmark">Pulse</div>
        <button
          disabled={sending}
          aria-current={screen === 'work' ? 'page' : undefined}
          onClick={() => {
            setScreen('work');
            setReview(null);
          }}
        >
          <PaperAirplaneIcon />
          <span>Purring</span>
        </button>
        <button
          disabled={sending}
          aria-current={screen === 'register' ? 'page' : undefined}
          onClick={() => {
            openRegister();
          }}
        >
          <RectangleStackIcon />
          <span>Leverandører</span>
        </button>
        <a
          href="#/dashboard"
          aria-label="Dashboard"
          onClick={(event) => {
            if (sending) event.preventDefault();
          }}
        >
          <ChartBarIcon />
          <span>Oversikt</span>
        </a>
        <div className="pulse-grow" />
        <button
          disabled={sending}
          title="Innstillinger"
          aria-label="Innstillinger"
          onClick={() => setSettings(true)}
        >
          <AdjustmentsHorizontalIcon />
        </button>
      </nav>
      <main className="pulse-main">
        <header className="pulse-header">
          <div className="pulse-title">
            <span>
              {screen === 'work' ? `PURRING · UKE ${getISOWeek(new Date())}` : 'REGISTER'}
            </span>
            <h1>
              {screen === 'register'
                ? 'Leverandører'
                : review
                  ? 'Send purringer'
                  : day === 'Alle'
                    ? 'Alle leverandører'
                    : day === 'Ingen'
                      ? 'Uten purredag'
                      : day}
            </h1>
          </div>
          {screen === 'work' && !review && (
            <div className="pulse-tabs pulse-days" aria-label="Purredag">
              {[...DAYS, 'Ingen', 'Alle'].map((value) => (
                <button aria-pressed={day === value} key={value} onClick={() => selectDay(value)}>
                  <span>{value === 'Alle' || value === 'Ingen' ? value : value.slice(0, 3)}</span>
                  <small>
                    {
                      suppliers.filter(
                        (supplier) => supplier.lines.length && onDay(supplier, value)
                      ).length
                    }
                  </small>
                </button>
              ))}
            </div>
          )}
          <div className="pulse-grow" />
          <button
            disabled={sending}
            className="pulse-file"
            title={memory.fileName || 'Importer innkjøpsliste'}
            onClick={() => setUpload(true)}
          >
            <i />
            <span>
              {memory.fileName || 'Innkjøpsliste'}
              <small>
                {memory.importedAt
                  ? `Importert ${new Date(memory.importedAt).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}`
                  : 'Lagrede data'}
              </small>
            </span>
            <strong>Bytt fil</strong>
          </button>
          <img className="pulse-logo" src={logo} alt="OneMed" />
        </header>
        {loading ? (
          <div className="pulse-empty" role="status">
            Leser innkjøpslisten …
          </div>
        ) : loadError ? (
          <div className="pulse-empty" role="alert">
            <h2>Kunne ikke laste inn data</h2>
            <p>{loadError}</p>
            <button onClick={() => void load()}>Prøv igjen</button>
          </div>
        ) : review ? (
          <Review
            initial={review.items}
            quickConfirm={review.quick}
            onBusy={setSending}
            onBack={() => {
              setReview(null);
              setSelected(new Set());
            }}
            onSent={(reminder, sentAt) =>
              persist((prev) => ({
                ...prev,
                // A save-only retry must keep the original send time and entry.
                history: prev.history.some(
                  (entry) =>
                    entry.supplier === reminder.supplier &&
                    entry.status === 'sent' &&
                    entry.at === sentAt
                )
                  ? prev.history
                  : [
                      {
                        supplier: reminder.supplier,
                        at: sentAt,
                        status: 'sent',
                        count: reminder.lines.length,
                      },
                      ...prev.history,
                    ],
              }))
            }
          />
        ) : screen === 'register' ? (
          <SupplierRegister
            initialFocus={registerFocus}
            suppliers={suppliers}
            history={memory.history}
            onSave={saveContact}
            onRemind={remindNow}
          />
        ) : (
          <>
            {showWarehouseFilter && (
              <div className="pulse-country-tools">
                <label>
                  Lagersted{' '}
                  <select
                    value={warehouseFilter}
                    onChange={(event) => {
                      setWarehouseFilter(event.target.value as '80' | '87' | 'all');
                      setSelected(new Set());
                    }}
                  >
                    <option value="80">L80</option>
                    <option value="87">L87</option>
                    <option value="all">Alle</option>
                  </select>
                </label>
                <label>
                  <Check
                    checked={includeICTOrders}
                    onChange={(event) => setIncludeICTOrders(event.target.checked)}
                  />{' '}
                  Ta med ICT-ordrer
                </label>
              </div>
            )}
            {day === 'Ingen' && (
              <div className="pulse-notice pulse-flex">
                <span className="pulse-grow">
                  Disse leverandørene mangler purredag. Legg til dag og e-post i
                  leverandørregisteret.
                </span>
                <button onClick={() => setScreen('register')}>Ordne i Leverandører</button>
              </div>
            )}
            {!suppliers.some((supplier) => supplier.lines.length) ? (
              <div className="pulse-empty">
                <h2>En god start på purredagen</h2>
                <p>Importer innkjøpslisten for å se åpne ordre og sende purringer.</p>
                <button className="pulse-primary" onClick={() => setUpload(true)}>
                  Importer innkjøpsliste
                </button>
              </div>
            ) : (
              <div className="pulse-work">
                <aside className="pulse-suppliers">
                  <div className="pulse-list-header">
                    <input
                      aria-label="Søk leverandør"
                      placeholder="Søk leverandør"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="pulse-flex">
                      <label>
                        <Check
                          checked={allSelected}
                          partial={
                            !allSelected && eligible.some((supplier) => selected.has(supplier.name))
                          }
                          disabled={!eligible.length}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              eligible.forEach((supplier) => {
                                if (allSelected) next.delete(supplier.name);
                                else next.add(supplier.name);
                              });
                              return next;
                            })
                          }
                        />{' '}
                        Velg alle
                      </label>
                      <small>{selectedSuppliers.length} valgt</small>
                    </div>
                  </div>
                  <div className="pulse-supplier-scroll">
                    {visible.map((supplier) => {
                      const status = currentStatus(supplier.name, memory.history);
                      const late = Math.max(0, ...supplier.lines.map((line) => lateDays(line)));
                      const wait = supplier.lines.filter(waiting).length;
                      return (
                        <div
                          key={supplier.name}
                          className={`pulse-supplier-row ${active?.name === supplier.name ? 'active' : ''}`}
                        >
                          <Check
                            aria-label={`Velg ${supplier.name}`}
                            checked={selected.has(supplier.name) && ready(supplier)}
                            disabled={!ready(supplier)}
                            onChange={() => toggleSupplier(supplier.name)}
                          />
                          <button
                            onClick={() => {
                              setFocus(supplier.name);
                              setFilter('all');
                            }}
                          >
                            <div className="pulse-supplier-name">
                              <strong>{supplier.name}</strong>
                              <History name={supplier.name} entries={memory.history} />
                            </div>
                            <span>
                              {supplier.lines.length} åpne linjer
                              {wait > 0 && <em>{wait} kunder venter</em>}
                            </span>
                            <small className={status === 'deferred' ? 'pulse-warning' : ''}>
                              {status === 'sent'
                                ? '✓ Purret denne uken'
                                : status === 'deferred'
                                  ? 'Avvent denne uken'
                                  : !supplier.email
                                    ? 'Mangler e-post'
                                    : late
                                      ? `Eldste linje ${late} dager forsinket`
                                      : 'Ingen forsinkede linjer'}
                            </small>
                          </button>
                        </div>
                      );
                    })}
                    {!visible.length && (
                      <p className="pulse-empty">Ingen leverandører i dette utvalget.</p>
                    )}
                  </div>
                </aside>
                <section className="pulse-detail">
                  {active ? (
                    <>
                      <div className="pulse-detail-header">
                        <div className="pulse-flex pulse-wrap">
                          <div className="pulse-grow">
                            <h2>{active.name}</h2>
                            <div className="pulse-supplier-meta">
                              {active.number && <span>Lev.nr {active.number}</span>}
                              <span className={!active.email ? 'pulse-danger' : ''}>
                                {active.email || 'Mangler e-post'}
                              </span>
                              <span>{LANGUAGES[active.language]}</span>
                              <button
                                className="pulse-text-button"
                                onClick={() => openRegister(active.name)}
                              >
                                Rediger leverandør
                              </button>
                            </div>
                          </div>
                          <History name={active.name} entries={memory.history} labels />
                          <button
                            disabled={currentStatus(active.name, memory.history) === 'sent'}
                            onClick={() => defer(active)}
                          >
                            {currentStatus(active.name, memory.history) === 'deferred'
                              ? 'Ta med igjen'
                              : 'Avvent denne uken'}
                          </button>
                        </div>
                        <div className="pulse-flex pulse-wrap">
                          <div className="pulse-tabs">
                            {[
                              ['all', 'Alle'],
                              ['waiting', 'Kunder venter'],
                              ['excluded', 'Tatt ut'],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                aria-pressed={filter === value}
                                onClick={() => setFilter(value)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <span className="pulse-muted">
                            Ta ut en linje eller en hel PO med avkrysningsboksen.
                          </span>
                        </div>
                      </div>
                      <div className="pulse-order-area">
                        <OrderTable
                          lines={active.lines}
                          excluded={memory.excluded}
                          filter={filter}
                          onToggle={toggleLines}
                          onReason={(line, reason) =>
                            persist((prev) => ({
                              ...prev,
                              excluded: {
                                ...prev.excluded,
                                [lineId(line)]: { fingerprint: fingerprint(line), reason },
                              },
                            }))
                          }
                        />
                        <p className="pulse-muted">
                          Uttak huskes med grunn til linjen endres i en ny import. Negativ
                          disponibel saldo betyr at kunder venter.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="pulse-empty">Velg en annen dag eller endre søket.</div>
                  )}
                </section>
              </div>
            )}
            <footer className="pulse-footer">
              <div>
                <strong>{selectedSuppliers.length} leverandører valgt</strong>
                <small>{selectedLines} ordrelinjer med i purringen</small>
              </div>
              <div className="pulse-grow" />
              <button disabled={!selectedSuppliers.length} onClick={() => beginReview()}>
                Se gjennom først
              </button>
              <button
                className="pulse-primary"
                disabled={!selectedSuppliers.length}
                onClick={() => beginReview(true)}
              >
                Send {selectedSuppliers.length} purringer →
              </button>
            </footer>
          </>
        )}
      </main>
      {upload && (
        <Modal title="Importer innkjøpsliste" busy={importing} onClose={() => setUpload(false)}>
          <FileUpload
            onDataParsed={imported}
            onValidationErrors={setValidationErrors}
            onBusyChange={setImporting}
          />
          {validationErrors.map((error, index) => (
            <p role="alert" key={index} className="pulse-danger">
              {error.message}
            </p>
          ))}
        </Modal>
      )}
      <SettingsModal isOpen={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
