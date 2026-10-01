const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Validate before trimming so MIME header injection is rejected, not normalized.
export function parseEmailRecipients(value: string): string[] | null {
  if (/[\r\n]/.test(value)) return null;
  const addresses = value.split(/[;,]/).map((address) => address.trim());
  return addresses.every((address) => EMAIL_PATTERN.test(address)) ? addresses : null;
}
