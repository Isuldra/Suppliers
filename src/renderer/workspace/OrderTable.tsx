import React, { Fragment } from 'react';
import type { ExcelRow } from '../types/ExcelData';
import { Check } from './Primitives';
import {
  eta,
  formatDate,
  lateDays,
  lineId,
  outstanding,
  waiting,
  excludedReason,
  type WorkspaceMemory,
} from './model';

export const REASONS = [
  'Avklart skriftlig',
  'Leverandør har svart',
  'Krediteres / kanselleres',
  'Annet',
];
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
  const visible = lines.filter((line) =>
    filter === 'waiting'
      ? waiting(line)
      : filter === 'excluded'
        ? Boolean(excludedReason(line, excluded))
        : true
  );
  const groups = new Map<string, ExcelRow[]>();
  visible.forEach((line) =>
    groups.set(line.poNumber, [...(groups.get(line.poNumber) || []), line])
  );
  const included = (group: ExcelRow[]) =>
    group.filter((line) => !excludedReason(line, excluded)).length;
  if (!visible.length) return <div className="pulse-empty">Ingen linjer i dette utvalget.</div>;
  return (
    <div className="pulse-table-scroll">
      <table className="pulse-table pulse-orders">
        <thead>
          <tr>
            <th>
              <Check
                aria-label="Velg alle synlige ordrelinjer"
                checked={included(visible) === visible.length}
                partial={included(visible) > 0 && included(visible) < visible.length}
                onChange={() => onToggle(visible)}
              />
            </th>
            <th>Vare</th>
            <th>Rad</th>
            <th>ETA</th>
            <th>Status</th>
            <th>Lev. art.nr</th>
            <th>OneMed nr</th>
            <th>Kommentar</th>
            <th className="number">Rest</th>
            <th className="number" title="Disponibel saldo – negativ betyr at kunder venter">
              Disp.
            </th>
          </tr>
        </thead>
        <tbody>
          {[...groups].map(([po, group]) => (
            <Fragment key={po}>
              <tr className="pulse-po">
                <td>
                  <Check
                    aria-label={`Velg PO ${po}`}
                    checked={included(group) === group.length}
                    partial={included(group) > 0 && included(group) < group.length}
                    onChange={() => onToggle(group)}
                  />
                </td>
                <td colSpan={9}>
                  <strong>PO {po || 'uten nummer'}</strong>
                  <span>
                    {group.length} linjer · {included(group)} med i purringen
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
                        aria-label={`Ta med ${line.itemNo || line.description}, PO ${po}, rad ${line.orderRowNumber || ''}`}
                        checked={!reason}
                        onChange={() => onToggle([line])}
                      />
                    </td>
                    <td className="pulse-item">
                      <strong>{line.description || line.itemNo || 'Uten beskrivelse'}</strong>
                      <small>{line.productSpecification || line.specification}</small>
                    </td>
                    <td>{line.orderRowNumber || '—'}</td>
                    <td className="nowrap">
                      {formatDate(eta(line))}
                      {late > 0 && <small className="pulse-danger">{late} d forsinket</small>}
                    </td>
                    <td>{String(line.status || '—')}</td>
                    <td>{String(line.supplierArticleNo || line.producerItemNo || '—')}</td>
                    <td>{line.itemNo || '—'}</td>
                    <td>
                      {reason ? (
                        <select
                          aria-label={`Grunn for å ta ut ${line.itemNo}`}
                          value={reason}
                          onChange={(event) => onReason(line, event.target.value)}
                        >
                          {REASONS.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{String(line.note || '—')}</span>
                      )}
                    </td>
                    <td className="number">
                      <strong>{outstanding(line).toLocaleString('nb-NO')}</strong>
                    </td>
                    <td className={`number ${waiting(line) ? 'pulse-danger' : ''}`}>
                      {line.inventoryBalance == null
                        ? '—'
                        : Number(line.inventoryBalance).toLocaleString('nb-NO')}
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
