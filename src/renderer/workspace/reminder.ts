import type { ExcelRow } from '../types/ExcelData';
import { eta, formatDate, outstanding, validRecipients, type Language } from './model';

export const MAIL_TEXT = {
  no: {
    subject: 'Purring på manglende leveranser',
    greeting: 'Hei,',
    intro: 'Dette er en påminnelse om følgende ordrelinjer som ikke er levert:',
    outro: 'Vennligst bekreft ny leveringsdato for linjene over.',
    sign: 'Med vennlig hilsen',
    team: 'Innkjøp, OneMed',
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
export function reminderHtml(reminder: Reminder) {
  const text = MAIL_TEXT[reminder.language];
  const cell =
    'padding:9px 10px;border-bottom:1px solid #e6e0d9;text-align:left;vertical-align:top';
  return `<!doctype html><html lang="${reminder.language}"><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;color:#00375b;background:#fff;font:14px/1.6 Arial,sans-serif">
    <p>${text.greeting}</p><p>${text.intro}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>${text.headers.map((header) => `<th style="${cell};border-bottom:2px solid #00375b">${header}</th>`).join('')}</tr></thead><tbody>
    ${reminder.lines.map((line) => `<tr>${[line.poNumber, line.orderRowNumber, line.supplierArticleNo || line.producerItemNo, [...new Set([line.description, line.productSpecification, line.specification].filter(Boolean))].join(' · '), outstanding(line).toLocaleString('nb-NO'), formatDate(eta(line)), ''].map((value) => `<td style="${cell}">${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}
    </tbody></table><p>${text.outro}</p><p>${text.sign}<br><strong>${text.team}</strong></p></body></html>`;
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
