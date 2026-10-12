// Bengali digit mapping
const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts English number to Bengali digits string
 */
export function toBengaliNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '০';
  const str = String(val);
  return str.replace(/[0-9]/g, (w) => bengaliDigits[parseInt(w, 10)]);
}

/**
 * Converts or formats number string based on language
 */
export function formatNumber(val: number | string | undefined | null, lang: 'bn' | 'en' = 'bn'): string {
  if (val === undefined || val === null || val === '') return lang === 'bn' ? '০' : '0';
  if (lang === 'en') return String(val);
  return toBengaliNumber(val);
}

/**
 * Format currency with ৳ and standard South Asian / Bengali formatting
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  useBengaliOrLang: boolean | 'bn' | 'en' = 'bn'
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return useBengaliOrLang === 'en' ? '৳ 0' : '৳ ০';

  const useBengaliDigits = useBengaliOrLang === 'bn' || useBengaliOrLang === true;

  // Format with standard commas
  const parts = Math.round(num).toString().split('.');
  const intPart = parts[0];

  // Indian/Bengali grouping: last 3 digits, then groups of 2 digits
  let formatted = '';
  if (intPart.length > 3) {
    const last3 = intPart.substring(intPart.length - 3);
    const rest = intPart.substring(0, intPart.length - 3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = restGrouped + ',' + last3;
  } else {
    formatted = intPart;
  }

  if (useBengaliDigits) {
    formatted = formatted.replace(/[0-9]/g, (w) => bengaliDigits[parseInt(w, 10)]);
  }

  return `৳ ${formatted}`;
}

/**
 * Translates unit name based on language
 */
export function formatUnit(unit?: string, lang: 'bn' | 'en' = 'bn'): string {
  if (!unit) return '';
  if (lang === 'bn') return unit;

  const unitMap: Record<string, string> = {
    'পিস': 'pcs',
    'কেজি': 'kg',
    'লিটার': 'ltr',
    'ডজন': 'dozen',
    'বক্স': 'box',
    'কার্টন': 'carton',
    'ব্যাগ': 'bag',
    'মিটার': 'meter',
    'গ্রাম': 'gm',
    'প্যাকেট': 'packet',
  };

  return unitMap[unit] || unit;
}

/**
 * Format standard quantity with digits and unit
 */
export function formatQty(qty: number | string, unit?: string, lang: 'bn' | 'en' = 'bn'): string {
  const num = typeof qty === 'number' ? qty : parseFloat(String(qty || 0));
  const val = num % 1 === 0 ? num : num.toFixed(1);
  const formattedVal = lang === 'en' ? String(val) : toBengaliNumber(val);
  const displayUnit = formatUnit(unit, lang);
  return displayUnit ? `${formattedVal} ${displayUnit}` : formattedVal;
}

/**
 * Format date YYYY-MM-DD to Bengali or English friendly format
 */
const bengaliMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const englishMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatBengaliDate(dateStr: string, lang: 'bn' | 'en' = 'bn'): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const mIndex = parseInt(month, 10) - 1;

    if (lang === 'en') {
      const mName = englishMonths[mIndex] || month;
      return `${parseInt(day, 10)} ${mName} ${year}`;
    }

    const dBengali = toBengaliNumber(parseInt(day, 10));
    const yBengali = toBengaliNumber(year);
    const mName = bengaliMonths[mIndex] || month;
    return `${dBengali} ${mName} ${yBengali}`;
  } catch {
    return dateStr;
  }
}

/**
 * Translates payment method name based on language
 */
export function formatPaymentMethod(method?: string, lang: 'bn' | 'en' = 'bn'): string {
  if (!method) return '';
  const map: Record<string, { bn: string; en: string }> = {
    'নগদ': { bn: 'নগদ', en: 'Cash' },
    'বিকাশ': { bn: 'বিকাশ', en: 'bKash' },
    'নগদ পে': { bn: 'নগদ পে', en: 'Nagad' },
    'রকেট': { bn: 'রকেট', en: 'Rocket' },
    'কার্ড': { bn: 'কার্ড', en: 'Card' },
    'ব্যাংক': { bn: 'ব্যাংক', en: 'Bank Transfer' },
    'অন্যান্য': { bn: 'অন্যান্য', en: 'Other' },
    'Cash': { bn: 'নগদ', en: 'Cash' },
    'bKash': { bn: 'বিকাশ', en: 'bKash' },
    'Nagad': { bn: 'নগদ পে', en: 'Nagad' },
    'Rocket': { bn: 'রকেট', en: 'Rocket' },
    'Card': { bn: 'কার্ড', en: 'Card' },
    'Bank': { bn: 'ব্যাংক', en: 'Bank' },
    'Bank Transfer': { bn: 'ব্যাংক', en: 'Bank Transfer' },
    'Other': { bn: 'অন্যান্য', en: 'Other' },
  };
  if (map[method]) {
    return lang === 'en' ? map[method].en : map[method].bn;
  }
  return method;
}

/**
 * Translates payment status type based on language
 */
export function formatPaymentType(type?: string, lang: 'bn' | 'en' = 'bn'): string {
  if (!type) return '';
  if (type === 'নগদ' || type === 'Cash' || type === 'paid') {
    return lang === 'en' ? 'Cash' : 'নগদ';
  }
  if (type === 'বাকি' || type === 'Due' || type === 'due') {
    return lang === 'en' ? 'Due' : 'বাকি';
  }
  if (type === 'আংশিক' || type === 'Partial' || type === 'partial') {
    return lang === 'en' ? 'Partial' : 'আংশিক';
  }
  return type;
}

/**
 * Today's date in YYYY-MM-DD
 */
export function getTodayString(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
