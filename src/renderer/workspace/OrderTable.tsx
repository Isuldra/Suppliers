import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExcelRow } from '../types/ExcelData';
import { Check } from './Primitives';
import { dateLocale } from '../i18n/resources';
import {
  eta,
  formatDate,
  lateDays,
  lineId,
  outstanding,
  waiting,
  excludedReason,
  filterLines,
  type WorkspaceMemory,
} from './model';

// Saved exclusions store the Norwegian reason; only the label is translated.
export const REASONS = [
  'Avklart skriftlig',
  'Leverandør har svart',
  'Krediteres / kanselleres',
  'Annet',
];
const REASON_KEYS = ['clarified', 'replied', 'cancelled', 'other'];
export default function OrderTable({
  lines,
  excluded,
  filter,
  onToggle,
  onReason,
}: {
  lines: ExcelRow[];
  excluded: WorkspaceMemory['excluded'];
  filter: string;
  onToggle: (lines: ExcelRow[]) => void;
  onReason: (line: ExcelRow, reason: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.resolvedLanguage || i18n.language);
  const visible = filterLines(lines, filter, excluded);
  const groups = new Map<string, ExcelRow[]>();
  visible.forEach((line) =>
    groups.set(line.poNumber, [...(groups.get(line.poNumber) || []), line])
  );
  const included = (group: ExcelRow[]) =>
    group.filter((line) => !excludedReason(line, excluded)).length;
  if (!visible.length) return <div className="pulse-empty">{t('workspace.table.empty')}</div>;
  return (
    <div className="pulse-table-scroll">
      <table className="pulse-table pulse-orders">
        <thead>
          <tr>
            <th>
              <Check
                aria-label={t('workspace.table.selectVisible')}
                checked={included(visible) === visible.length}
                partial={included(visible) > 0 && included(visible) < visible.length}
                onChange={() => onToggle(visible)}
              />
            </th>
            <th>{t('workspace.table.item')}</th>
            <th>{t('workspace.table.row')}</th>
            <th>{t('workspace.table.eta')}</th>
            <th>{t('workspace.table.status')}</th>
            <th>{t('workspace.table.supplierArticle')}</th>
            <th>{t('workspace.table.onemedNumber')}</th>
            <th>{t('workspace.table.comment')}</th>
            <th className="number">{t('workspace.table.rest')}</th>
            <th className="number" title={t('workspace.table.availableTitle')}>
              {t('workspace.table.available')}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...groups].map(([po, group]) => (
            <Fragment key={po}>
              <tr className="pulse-po">
                <td>
                  <Check
                    aria-label={t('workspace.table.selectPo', { po })}
                    checked={included(group) === group.length}
                    partial={included(group) > 0 && included(group) < group.length}
                    onChange={() => onToggle(group)}
                  />
                </td>
                <td colSpan={9}>
                  <strong>
                    {t('workspace.table.po', { po: po || t('workspace.table.noPo') })}
                  </strong>
                  <span>
                    {t('workspace.table.poSummary', {
                      count: group.length,
                      included: included(group),
                    })}
                  </span>
                </td>
              </tr>
              {group.map((line) => {
                const reason = excludedReason(line, excluded);
                const late = lateDays(line);
                return (
                  <tr key={lineId(line)} className={reason ? 'pulse-excluded' : ''}>
                    <td>
                      <Check
                        aria-label={t('workspace.table.includeLine', {
                          item: line.itemNo || line.description,
                          po,
                          row: line.orderRowNumber || '',
                        })}
                        checked={!reason}
                        onChange={() => onToggle([line])}
                      />
                    </td>
                    <td className="pulse-item">
                      <strong>
                        {line.description || line.itemNo || t('workspace.table.noDescription')}
                      </strong>
                      <small>{line.productSpecification || line.specification}</small>
                    </td>
                    <td>{line.orderRowNumber || '—'}</td>
                    <td className="nowrap">
                      {formatDate(eta(line), locale)}
                      {late > 0 && (
                        <small className="pulse-danger">
                          {t('workspace.table.daysLate', { count: late })}
                        </small>
                      )}
                    </td>
                    <td>{String(line.status || '—')}</td>
                    <td>{String(line.supplierArticleNo || line.producerItemNo || '—')}</td>
                    <td>{line.itemNo || '—'}</td>
                    <td>
                      {reason ? (
                        <select
                          aria-label={t('workspace.table.reasonFor', { item: line.itemNo })}
                          value={reason}
                          onChange={(event) => onReason(line, event.target.value)}
                        >
                          {REASONS.map((value, index) => (
                            <option key={value} value={value}>
                              {t(`workspace.reasons.${REASON_KEYS[index]}`)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{String(line.note || '—')}</span>
                      )}
                    </td>
                    <td className="number">
                      <strong>{outstanding(line).toLocaleString(locale)}</strong>
                    </td>
                    <td className={`number ${waiting(line) ? 'pulse-danger' : ''}`}>
                      {line.inventoryBalance == null
                        ? '—'
                        : Number(line.inventoryBalance).toLocaleString(locale)}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
