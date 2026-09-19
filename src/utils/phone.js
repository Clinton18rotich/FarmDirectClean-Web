/**
 * Kenya phone number normalization
 * Converts any format to standard: +254XXXXXXXXX
 */

export function normalizeKenyaPhone(input) {
  if (!input) return '';
  let digits = String(input).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);

  if (digits.startsWith('254')) {
    // Already has 254
  } else if (digits.startsWith('0')) {
    digits = '254' + digits.slice(1);
  } else if (digits.length === 9) {
    digits = '254' + digits;
  } else {
    return input;
  }

  if (digits.length !== 12) return input;
  return '+' + digits;
}

export function toDarajaFormat(phone) {
  return normalizeKenyaPhone(phone).replace(/^\+/, '');
}

export function isValidKenyaPhone(input) {
  const normalized = normalizeKenyaPhone(input);
  return /^\+254\d{9}$/.test(normalized);
}

export function formatKenyaPhone(input) {
  const normalized = normalizeKenyaPhone(input);
  if (!/^\+254\d{9}$/.test(normalized)) return input;
  return `+254 ${normalized.slice(4,7)} ${normalized.slice(7,10)} ${normalized.slice(10)}`;
}
