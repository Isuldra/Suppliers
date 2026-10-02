import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../i18n/resources';
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
  historyOf,
  onDay,
  currentStatus,
  excludedReason,
  filterLines,
  lineId,
  fingerprint,
  waiting,
  lateDays,
  weekKey,
  type WorkspaceMemory,
  type Supplier,
  type ContactEdit,
  type Language,
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
  const { t, i18n } = useTranslation();
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
  const persist = useCallback(
    (update: (prev: WorkspaceMemory) => WorkspaceMemory) => {
      const next = update(memoryRef.current);
      memoryRef.current = next;
      setMemory(next);
      try {
        saveMemory(next);
        return true;
      } catch {
        toast.error(t('workspace.toast.storageFailed'), { id: 'workspace-storage' });
        return false;
      }
    },
    [t]
  );
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
      toast.error(error.message || t('workspace.toast.updateFailed'), { id: 'update' })
    );
    const downloaded = window.electron.onUpdateDownloaded((info) =>
      toast.success(t('workspace.toast.updateReady', { version: info.version }), { id: 'update' })
    );
    return () => {
      unsubscribe();
      downloaded();
    };
  }, [t]);
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
  const history = useMemo(() => historyOf(memory.history, suppliers), [memory.history, suppliers]);
  const daySuppliers = suppliers.filter(
    (supplier) => supplier.lines.length && onDay(supplier, day)
  );
  const visible = daySuppliers.filter((supplier) =>
    [supplier.name, ...supplier.aliases].some((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    )
  );
  const active = visible.find((supplier) => supplier.name === focus) || visible[0];
  const shown = active ? filterLines(active.lines, filter, memory.excluded) : [];
  const included = (supplier: Supplier) =>
    supplier.lines.filter((line) => !excludedReason(line, memory.excluded));
  const ready = (supplier: Supplier) =>
    !currentStatus(supplier.name, history) && included(supplier).length > 0;
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
  // Lines already taken out keep the reason chosen for them.
  function setIncluded(lines: ExcelRow[], include: boolean) {
    persist((prev) => {
      const excluded = { ...prev.excluded };
      for (const line of lines) {
        if (include) delete excluded[lineId(line)];
        else if (!excludedReason(line, prev.excluded))
          excluded[lineId(line)] = { fingerprint: fingerprint(line), reason: 'Avklart skriftlig' };
      }
      return { ...prev, excluded };
    });
  }
  function toggleLines(lines: ExcelRow[]) {
    setIncluded(lines, !lines.some((line) => !excludedReason(line, memory.excluded)));
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
      toast.success(t('workspace.toast.supplierSaved'));
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
    persist((prev) => {
      const history = historyOf(prev.history, suppliers);
      return {
        ...prev,
        history:
          currentStatus(supplier.name, history) === 'deferred'
            ? history.filter(
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
                ...history,
              ],
      };
    });
  }
  return (
    <div className="pulse-shell">
      <nav className="pulse-rail" aria-label={t('workspace.nav.mainMenu')}>
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
          <span>{t('workspace.nav.remind')}</span>
        </button>
        <button
          disabled={sending}
          aria-current={screen === 'register' ? 'page' : undefined}
          onClick={() => {
            openRegister();
          }}
        >
          <RectangleStackIcon />
          <span>{t('workspace.nav.suppliers')}</span>
        </button>
        <a
          href="#/dashboard"
          onClick={(event) => {
            if (sending) event.preventDefault();
          }}
        >
          <ChartBarIcon />
          <span>{t('workspace.nav.overview')}</span>
        </a>
        <div className="pulse-grow" />
        <button
          disabled={sending}
          title={t('workspace.nav.settings')}
          aria-label={t('workspace.nav.settings')}
          onClick={() => setSettings(true)}
        >
          <AdjustmentsHorizontalIcon />
        </button>
      </nav>
      <main className="pulse-main">
        <header className="pulse-header">
          <div className="pulse-title">
            <span>
              {screen === 'work'
                ? t('workspace.header.remindWeek', { week: getISOWeek(new Date()) })
                : t('workspace.header.register')}
            </span>
            <h1>
              {screen === 'register'
                ? t('workspace.nav.suppliers')
                : review
                  ? t('workspace.header.sendReminders')
                  : day === 'Alle'
                    ? t('workspace.header.allSuppliers')
                    : day === 'Ingen'
                      ? t('workspace.header.noDay')
                      : t(`workspace.days.${day}`)}
            </h1>
          </div>
          {screen === 'work' && !review && (
            <div className="pulse-tabs pulse-days" aria-label={t('workspace.header.dayTabs')}>
              {[...DAYS, 'Ingen', 'Alle'].map((value) => (
                <button aria-pressed={day === value} key={value} onClick={() => selectDay(value)}>
                  <span>
                    {value === 'Alle'
                      ? t('workspace.filters.all')
                      : value === 'Ingen'
                        ? t('workspace.filters.none')
                        : t(`workspace.daysShort.${value}`)}
                  </span>
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
          <select
            className="pulse-ui-language"
            aria-label={t('workspace.header.uiLanguage')}
            title={t('workspace.header.uiLanguage')}
            disabled={sending}
            value={i18n.resolvedLanguage || i18n.language}
            onChange={(event) => {
              void i18n.changeLanguage(event.target.value);
              // Keeps the choice instead of the system language on the next start.
              localStorage.setItem('userSelectedLanguage', 'true');
            }}
          >
            {Object.entries(LANGUAGES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            disabled={sending}
            className="pulse-file"
            title={memory.fileName || t('workspace.state.importList')}
            onClick={() => setUpload(true)}
          >
            <i />
            <span>
              {memory.fileName || t('workspace.header.purchaseList')}
              <small>
                {memory.importedAt
                  ? t('workspace.header.imported', {
                      date: new Date(memory.importedAt).toLocaleString(
                        dateLocale(i18n.resolvedLanguage || i18n.language),
                        { dateStyle: 'short', timeStyle: 'short' }
                      ),
                    })
                  : t('workspace.header.savedData')}
              </small>
            </span>
            <strong>{t('workspace.header.changeFile')}</strong>
          </button>
          <img className="pulse-logo" src={logo} alt="OneMed" />
        </header>
        {loading ? (
          <div className="pulse-empty" role="status">
            {t('workspace.state.loading')}
          </div>
        ) : loadError ? (
          <div className="pulse-empty" role="alert">
            <h2>{t('workspace.state.loadError')}</h2>
            <p>{loadError}</p>
            <button onClick={() => void load()}>{t('workspace.state.retry')}</button>
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
            history={history}
            onSave={saveContact}
            onRemind={remindNow}
          />
        ) : (
          <>
            {showWarehouseFilter && (
              <div className="pulse-country-tools">
                <label>
                  {t('workspace.country.warehouse')}{' '}
                  <select
                    value={warehouseFilter}
                    onChange={(event) => {
                      setWarehouseFilter(event.target.value as '80' | '87' | 'all');
                      setSelected(new Set());
                    }}
                  >
                    <option value="80">L80</option>
                    <option value="87">L87</option>
                    <option value="all">{t('workspace.country.all')}</option>
                  </select>
                </label>
                <label>
                  <Check
                    checked={includeICTOrders}
                    onChange={(event) => setIncludeICTOrders(event.target.checked)}
                  />{' '}
                  {t('workspace.country.includeICT')}
                </label>
              </div>
            )}
            {day === 'Ingen' && (
              <div className="pulse-notice pulse-flex">
                <span className="pulse-grow">{t('workspace.notice.noDay')}</span>
                <button onClick={() => setScreen('register')}>
                  {t('workspace.notice.fixInRegister')}
                </button>
              </div>
            )}
            {!suppliers.some((supplier) => supplier.lines.length) ? (
              <div className="pulse-empty">
                <h2>{t('workspace.state.emptyTitle')}</h2>
                <p>{t('workspace.state.emptyText')}</p>
                <button className="pulse-primary" onClick={() => setUpload(true)}>
                  {t('workspace.state.importList')}
                </button>
              </div>
            ) : (
              <div className="pulse-work">
                <aside className="pulse-suppliers">
                  <div className="pulse-list-header">
                    <input
                      aria-label={t('workspace.list.search')}
                      placeholder={t('workspace.list.search')}
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
                        {t('workspace.list.selectAll')}
                      </label>
                      <small>
                        {t('workspace.list.selected', { count: selectedSuppliers.length })}
                      </small>
                    </div>
                  </div>
                  <div className="pulse-supplier-scroll">
                    {visible.map((supplier) => {
                      const status = currentStatus(supplier.name, history);
                      const late = Math.max(0, ...supplier.lines.map((line) => lateDays(line)));
                      const wait = supplier.lines.filter(waiting).length;
                      return (
                        <div
                          key={supplier.name}
                          className={`pulse-supplier-row ${active?.name === supplier.name ? 'active' : ''}`}
                        >
                          <Check
                            aria-label={t('workspace.list.selectSupplier', {
                              name: supplier.name,
                            })}
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
                              <History name={supplier.name} entries={history} />
                            </div>
                            <span>
                              {t('workspace.list.openLines', { count: supplier.lines.length })}
                              {wait > 0 && <em>{t('workspace.list.waiting', { count: wait })}</em>}
                            </span>
                            <small className={status === 'deferred' ? 'pulse-warning' : ''}>
                              {status === 'sent'
                                ? t('workspace.list.sentThisWeek')
                                : status === 'deferred'
                                  ? t('workspace.list.deferredThisWeek')
                                  : !supplier.email
                                    ? t('workspace.list.missingEmail')
                                    : late
                                      ? t('workspace.list.oldestLate', { count: late })
                                      : t('workspace.list.noneLate')}
                            </small>
                          </button>
                        </div>
                      );
                    })}
                    {!visible.length && (
                      <p className="pulse-empty">{t('workspace.state.noSuppliers')}</p>
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
                              {active.number && (
                                <span>
                                  {t('workspace.detail.supplierNo', { number: active.number })}
                                </span>
                              )}
                              <span className={!active.email ? 'pulse-danger' : ''}>
                                {active.email || t('workspace.list.missingEmail')}
                              </span>
                              <select
                                className="pulse-inline-select"
                                aria-label={t('workspace.detail.emailLanguage')}
                                title={t('workspace.detail.emailLanguage')}
                                value={active.language}
                                onChange={(event) =>
                                  saveContact(active.name, {
                                    email: active.email,
                                    language: event.target.value as Language,
                                    days: active.days,
                                  })
                                }
                              >
                                {Object.entries(LANGUAGES).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="pulse-text-button"
                                onClick={() => openRegister(active.name)}
                              >
                                {t('workspace.detail.editSupplier')}
                              </button>
                            </div>
                          </div>
                          <History name={active.name} entries={history} labels />
                          <button
                            disabled={currentStatus(active.name, history) === 'sent'}
                            onClick={() => defer(active)}
                          >
                            {currentStatus(active.name, history) === 'deferred'
                              ? t('workspace.detail.undefer')
                              : t('workspace.detail.defer')}
                          </button>
                        </div>
                        <div className="pulse-flex pulse-wrap">
                          <div className="pulse-tabs">
                            {['all', 'waiting', 'excluded'].map((value) => (
                              <button
                                key={value}
                                aria-pressed={filter === value}
                                onClick={() => setFilter(value)}
                              >
                                {t(`workspace.filters.${value}`)}
                              </button>
                            ))}
                          </div>
                          <button
                            disabled={!shown.some((line) => excludedReason(line, memory.excluded))}
                            onClick={() => setIncluded(shown, true)}
                          >
                            {t('workspace.detail.selectAll')}
                          </button>
                          <button
                            disabled={!shown.some((line) => !excludedReason(line, memory.excluded))}
                            onClick={() => setIncluded(shown, false)}
                          >
                            {t('workspace.detail.clearAll')}
                          </button>
                          <span className="pulse-muted">{t('workspace.detail.hint')}</span>
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
                        <p className="pulse-muted">{t('workspace.detail.footnote')}</p>
                      </div>
                    </>
                  ) : (
                    <div className="pulse-empty">{t('workspace.state.pickAnother')}</div>
                  )}
                </section>
              </div>
            )}
            <footer className="pulse-footer">
              <div>
                <strong>
                  {t('workspace.footer.suppliersSelected', { count: selectedSuppliers.length })}
                </strong>
                <small>{t('workspace.footer.linesIncluded', { count: selectedLines })}</small>
              </div>
              <div className="pulse-grow" />
              <button disabled={!selectedSuppliers.length} onClick={() => beginReview()}>
                {t('workspace.footer.reviewFirst')}
              </button>
              <button
                className="pulse-primary"
                disabled={!selectedSuppliers.length}
                onClick={() => beginReview(true)}
              >
                {t('workspace.footer.send', { count: selectedSuppliers.length })}
              </button>
            </footer>
          </>
        )}
      </main>
      {upload && (
        <Modal
          title={t('workspace.state.importList')}
          busy={importing}
          onClose={() => setUpload(false)}
        >
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
