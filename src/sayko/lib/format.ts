// @ts-nocheck
/**
 * Persian number parsing and 3-digit comma currency formatting utility.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Converts any Persian, Arabic, or ASCII string to a pure JavaScript integer.
 */
export function parsePersianNumber(str: string | number): number {
  if (typeof str === 'number') return isNaN(str) ? 0 : Math.floor(str);
  if (!str) return 0;
  let clean = String(str);
  for (let i = 0; i < 10; i++) {
    clean = clean.replaceAll(PERSIAN_DIGITS[i], String(i)).replaceAll(ARABIC_DIGITS[i], String(i));
  }
  clean = clean.replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}

/**
 * Formats a number with 3-digit comma separators in Persian numerals.
 * Example: 20000 -> "۲۰,۰۰۰"
 * Example: 1000000 -> "۱,۰۰۰,۰۰۰"
 */
export function formatCurrencyFa(amount: number | string): string {
  const num = parsePersianNumber(amount);
  if (num === 0) return '۰';
  return num.toLocaleString('fa-IR');
}

/**
 * Formats while typing in an input field (empty string stays empty).
 */
export function formatInputAmount(rawInput: string): { raw: number; formatted: string } {
  if (!rawInput || !rawInput.trim()) {
    return { raw: 0, formatted: '' };
  }
  const raw = parsePersianNumber(rawInput);
  if (raw === 0) {
    return { raw: 0, formatted: '' };
  }
  return {
    raw,
    formatted: raw.toLocaleString('fa-IR'),
  };
}

/**
 * Normalizes and formats a 16-digit bank card number with 4-digit dash grouping.
 * Example: "6037991234567890" -> "6037-9912-3456-7890"
 */
export function formatCardNumber(str: string): string {
  if (!str) return '';
  let clean = String(str);
  for (let i = 0; i < 10; i++) {
    clean = clean.replaceAll(PERSIAN_DIGITS[i], String(i)).replaceAll(ARABIC_DIGITS[i], String(i));
  }
  clean = clean.replace(/[^0-9]/g, '').slice(0, 16);
  const parts = clean.match(/.{1,4}/g);
  return parts ? parts.join('-') : clean;
}

/**
 * SMART AMOUNT FORMATTING
 * - Thousand-level amounts: uses the label "هزار" (e.g. "200,000 هزار" or "۲۰۰,۰۰۰ هزار")
 * - Million-level amounts: uses the label "میلیون" (e.g. "1,000,000 میلیون" or "۱,۰۰۰,۰۰۰ میلیون")
 * Avoids displaying generic "تومان" in place of the requested units.
 */
export function formatSmartAmountFa(amount: number | string, useEnglishDigits: boolean = false): string {
  const num = parsePersianNumber(amount);
  if (num === 0) return '۰';

  const formattedNum = useEnglishDigits
    ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : num.toLocaleString('fa-IR');

  if (num >= 1000000) {
    return `${formattedNum} میلیون`;
  } else if (num >= 1000) {
    return `${formattedNum} هزار`;
  }
  return formattedNum;
}

/**
 * Converts a number to fluent Persian words representation without generic 'تومان'.
 * Example: 200000 -> "دویست هزار"
 * Example: 1500000 -> "یک میلیون و پانصد هزار"
 */
export function numberToWordsFa(amount: number | string): string {
  const num = parsePersianNumber(amount);
  if (num === 0) return 'صفر';

  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد'];

  function convertGroup(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) parts.push(hundreds[h]);
    if (rem >= 10 && rem < 20) {
      parts.push(teens[rem - 10]);
    } else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (t > 0) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }
    return parts.join(' و ');
  }

  const chunks: string[] = [];
  let temp = num;
  let scaleIdx = 0;

  while (temp > 0 && scaleIdx < scales.length) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkStr = convertGroup(chunk);
      const scaleStr = scales[scaleIdx];
      chunks.unshift(scaleStr ? `${chunkStr} ${scaleStr}` : chunkStr);
    }
    temp = Math.floor(temp / 1000);
    scaleIdx++;
  }

  return chunks.join(' و ');
}

export function formatHorseNameDisplay(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length > 22) {
    return trimmed.slice(0, 20) + "...";
  }
  return trimmed;
}
