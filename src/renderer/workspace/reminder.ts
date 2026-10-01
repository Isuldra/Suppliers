import type { ExcelRow } from '../types/ExcelData';
import { eta, formatDate, lateDays, outstanding, validRecipients, type Language } from './model';

export const MAIL_TEXT = {
  no: {
    subject: 'Purring på manglende leveranser',
    greeting: 'Hei,',
    intro: 'Dette er en påminnelse om følgende ordrelinjer som ikke er levert:',
    outro: 'Vennligst bekreft ny leveringsdato for linjene over.',
    sign: 'Med vennlig hilsen',
    team: 'Innkjøp, OneMed',
    lineCount: (count: number) => (count === 1 ? '1 ordrelinje' : `${count} ordrelinjer`),
    late: (days: number) => (days === 1 ? '1 dag forsinket' : `${days} dager forsinket`),
    headers: [
      'PO-nummer',
      'Rad',
      'Deres art.nr.',
      'Beskrivelse / kommentar',
      'Utestående',
      'Bekreftet ETA',
      'Ny ETA',
    ],
  },
  en: {
    subject: 'Reminder: outstanding deliveries',
    greeting: 'Hello,',
    intro: 'This is a reminder about the following order lines that have not been delivered:',
    outro: 'Please confirm a new delivery date for the lines above.',
    sign: 'Kind regards',
    team: 'Purchasing, OneMed',
    lineCount: (count: number) => (count === 1 ? '1 order line' : `${count} order lines`),
    late: (days: number) => (days === 1 ? '1 day overdue' : `${days} days overdue`),
    headers: [
      'PO number',
      'Line',
      'Your art. no.',
      'Description / comment',
      'Outstanding',
      'Confirmed ETA',
      'New ETA',
    ],
  },
  se: {
    subject: 'Påminnelse om utestående leveranser',
    greeting: 'Hej,',
    intro: 'Detta är en påminnelse om följande orderrader som inte har levererats:',
    outro: 'Vänligen bekräfta nytt leveransdatum för raderna ovan.',
    sign: 'Med vänliga hälsningar',
    team: 'Inköp, OneMed',
    lineCount: (count: number) => (count === 1 ? '1 orderrad' : `${count} orderrader`),
    late: (days: number) => (days === 1 ? '1 dag försenad' : `${days} dagar försenad`),
    headers: [
      'PO-nummer',
      'Rad',
      'Ert art.nr',
      'Beskrivning / kommentar',
      'Utestående',
      'Bekräftat ETA',
      'Nytt ETA',
    ],
  },
  da: {
    subject: 'Påmindelse om udestående leveringer',
    greeting: 'Hej,',
    intro: 'Dette er en påmindelse om følgende ordrelinjer, som ikke er leveret:',
    outro: 'Bekræft venligst en ny leveringsdato for linjerne ovenfor.',
    sign: 'Med venlig hilsen',
    team: 'Indkøb, OneMed',
    lineCount: (count: number) => (count === 1 ? '1 ordrelinje' : `${count} ordrelinjer`),
    late: (days: number) => (days === 1 ? '1 dag forsinket' : `${days} dage forsinket`),
    headers: [
      'PO-nummer',
      'Linje',
      'Jeres varenr.',
      'Beskrivelse / kommentar',
      'Udestående',
      'Bekræftet ETA',
      'Ny ETA',
    ],
  },
  fi: {
    subject: 'Muistutus avoimista toimituksista',
    greeting: 'Hei,',
    intro: 'Tämä on muistutus seuraavista tilausriveistä, joita ei ole vielä toimitettu:',
    outro: 'Vahvistakaa uusi toimituspäivä yllä oleville riveille.',
    sign: 'Ystävällisin terveisin',
    team: 'Hankinta, OneMed',
    lineCount: (count: number) => (count === 1 ? '1 tilausrivi' : `${count} tilausriviä`),
    late: (days: number) => (days === 1 ? '1 päivän myöhässä' : `${days} päivää myöhässä`),
    headers: [
      'PO-numero',
      'Rivi',
      'Tuotenumeronne',
      'Kuvaus / kommentti',
      'Avoin määrä',
      'Vahvistettu ETA',
      'Uusi ETA',
    ],
  },
};
export type Reminder = {
  supplier: string;
  recipient: string;
  language: Language;
  lines: ExcelRow[];
};
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  );
}
export function reminderSubject(reminder: Reminder) {
  return `${MAIL_TEXT[reminder.language].subject} – ${reminder.supplier}`;
}
// Email clients (Outlook's Word engine in particular) need tables, inline styles and a
// font on every cell; the colours and type follow the Pulse workspace.
const FONT = "font-family:'Segoe UI',Arial,sans-serif";
const INK = 'color:#00375b';
function cell(extra: string, last: boolean) {
  return `padding:10px 12px;border-bottom:1px solid ${last ? '#e6e0d9' : '#f1ede8'};vertical-align:top;${INK};font-size:13px;line-height:1.45;${FONT};${extra}`;
}
export function reminderHtml(reminder: Reminder) {
  const text = MAIL_TEXT[reminder.language];
  const groups = new Map<string, ExcelRow[]>();
  for (const line of reminder.lines)
    groups.set(line.poNumber, [...(groups.get(line.poNumber) || []), line]);
  // One row per line; the PO number spans its lines so the table still pastes into a sheet.
  const rows = [...groups]
    .map(([po, lines]) =>
      lines
        .map((line, index) => {
          const last = index === lines.length - 1;
          const late = lateDays(line);
          const [title = '', ...details] = new Set(
            [line.description, line.productSpecification, line.specification].filter(Boolean)
          );
          return `<tr>${[
            index === 0
              ? `<td rowspan="${lines.length}" style="${cell('font-weight:700;white-space:nowrap', true)}">${escapeHtml(po)}</td>`
              : '',
            `<td style="${cell('white-space:nowrap', last)}">${escapeHtml(line.orderRowNumber)}</td>`,
            `<td style="${cell('white-space:nowrap', last)}">${escapeHtml(line.supplierArticleNo || line.producerItemNo)}</td>`,
            `<td style="${cell('', last)}"><strong style="font-weight:600">${escapeHtml(title)}</strong>${details.map((detail) => `<br><span style="color:#61615f;font-size:12px">${escapeHtml(detail)}</span>`).join('')}</td>`,
            `<td align="right" style="${cell('text-align:right;font-weight:700;white-space:nowrap', last)}">${escapeHtml(outstanding(line).toLocaleString('nb-NO'))}</td>`,
            `<td style="${cell('white-space:nowrap', last)}">${escapeHtml(formatDate(eta(line)))}${late > 0 ? `<br><span style="color:#9a3324;font-size:12px;font-weight:600">${escapeHtml(text.late(late))}</span>` : ''}</td>`,
            `<td style="${cell('background:#fbf9f7;min-width:64px', last)}">&nbsp;</td>`,
          ].join('')}</tr>`;
        })
        .join('')
    )
    .join('');
  const heading = text.headers
    .map(
      (header, index) =>
        `<th align="${index === 4 ? 'right' : 'left'}" style="padding:10px 12px;background:#fbf9f7;border-bottom:1px solid #e6e0d9;color:#61615f;font-size:12px;font-weight:600;white-space:nowrap;text-align:${index === 4 ? 'right' : 'left'};${FONT}">${header}</th>`
    )
    .join('');
  return `<!doctype html><html lang="${reminder.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f4f1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f4f1"><tr><td align="center" style="padding:28px 12px">
<!--[if mso]><table role="presentation" width="760" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px;background:#ffffff;border:1px solid #e6e0d9;border-top:4px solid #497886">
<tr><td style="padding:24px 28px 4px;${FONT}">
<div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#497886">${escapeHtml(text.subject)}</div>
<div style="font-size:21px;font-weight:700;${INK};margin-top:6px">${escapeHtml(reminder.supplier)}</div>
<div style="font-size:13px;color:#61615f;margin-top:2px">${escapeHtml(text.lineCount(reminder.lines.length))}</div>
</td></tr>
<tr><td style="padding:14px 28px 4px;${INK};font-size:14px;line-height:1.6;${FONT}"><p style="margin:0 0 10px">${text.greeting}</p><p style="margin:0">${text.intro}</p></td></tr>
<tr><td style="padding:14px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e6e0d9"><thead><tr>${heading}</tr></thead><tbody>${rows}</tbody></table></td></tr>
<tr><td style="padding:16px 28px 26px;${INK};font-size:14px;line-height:1.6;${FONT}"><p style="margin:0 0 14px">${text.outro}</p><p style="margin:0">${text.sign}<br><strong>${text.team}</strong></p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}
export async function sendReminder(reminder: Reminder) {
  if (!validRecipients(reminder.recipient))
    throw new Error('Kontroller e-postadressen før sending.');
  if (!reminder.lines.length) throw new Error('Ingen ordrelinjer er valgt.');
  const country = await window.electron.getSupplierCountry(reminder.supplier);
  // One explicit attempt. An ambiguous Outlook failure must never automatically send twice.
  const result = await window.electron.sendEmailViaEmlAndCOM({
    to: reminder.recipient
      .split(/[;,]/)
      .map((value) => value.trim())
      .join(';'),
    subject: reminderSubject(reminder),
    html: reminderHtml(reminder),
    country: country.data || undefined,
  });
  if (!result.success) throw new Error(result.error || 'Outlook kunne ikke sende e-posten.');
}
