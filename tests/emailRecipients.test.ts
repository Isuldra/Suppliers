import { describe, expect, it } from 'vitest';
import { parseEmailRecipients } from '../src/utils/emailRecipients';
import { validRecipients } from '../src/renderer/workspace/model';

describe('shared review and transport recipient validation', () => {
  it.each([
    [' buyer@example.com ', ['buyer@example.com']],
    ['buyer@example.com; second@example.com', ['buyer@example.com', 'second@example.com']],
    ['buyer@example.com, second@example.com', ['buyer@example.com', 'second@example.com']],
    [
      'a@example.com; b@example.com,c@example.com',
      ['a@example.com', 'b@example.com', 'c@example.com'],
    ],
  ])('accepts and normalizes %s', (value, addresses) => {
    expect(parseEmailRecipients(value)).toEqual(addresses);
    expect(validRecipients(value)).toBe(true);
  });
  it.each([
    '',
    'buyer@example.com;',
    ',buyer@example.com',
    'buyer@example.com;;second@example.com',
    'buyer@example.com,invalid',
    'Name <buyer@example.com>',
    'buyer@example.c',
    'buyer@example.com\r\nBcc: hidden@example.com',
    'buyer@example.com\n',
    '\r\nbuyer@example.com',
    'buyer@example.com;\nsecond@example.com',
  ])('rejects invalid recipients or MIME header injection: %j', (value) => {
    expect(parseEmailRecipients(value)).toBeNull();
    expect(validRecipients(value)).toBe(false);
  });
});
