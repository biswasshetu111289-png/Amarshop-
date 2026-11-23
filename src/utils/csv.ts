export interface ParsedProductRow {
  name: string;
  qty: number;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  category: string;
  color?: string;
  packagingPrice?: number;
  barcode?: string;
}

export interface ParsedSaleRow {
  productName: string;
  qty: number;
  unit: string;
  price: number;
  date: string;
  payment: 'নগদ' | 'বাকি';
  customer: string;
}

const BENGALI_TO_ENG_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function parseFlexibleNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const converted = raw.replace(/[০-৯]/g, (ch) => BENGALI_TO_ENG_DIGITS[ch] ?? ch);
  return parseFloat(converted.replace(/[^0-9.]/g, '')) || 0;
}

/**
 * Robust CSV Line Parser handling quotes and commas
 */
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function downloadProductCSVTemplate(): void {
  const headers = [
    'name',
    'qty',
    'unit',
    'buyPrice',
    'sellPrice',
    'category',
    'color',
    'packagingPrice',
    'barcode',
  ];
  const sampleRows = [
    ['মেনস লেদার ওয়ালেট', '20', 'পিস', '350', '650', 'Wallet', 'কালো, বাদামী', '20', '200100200301'],
    ['লেডিস শোল্ডার ব্যাগ', '15', 'পিস', '750', '1250', 'Bag', 'লাল', '30', '200100200302'],
  ];
  const csvLines = [headers.join(','), ...sampleRows.map((r) => r.map((v) => (v.includes(',') ? `"${v}"` : v)).join(','))];
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'amar_business_product_template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseProductCSV(csvContent: string): { rows: ParsedProductRow[]; errors: string[] } {
  const cleanedContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanedContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return { rows: [], errors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি বা শুধু হেডার রয়েছে।'] };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/gi, '')
  );

  // Find indices for headers (supports English & Bengali headers)
  const nameIdx = rawHeaders.findIndex((h) => h.includes('name') || h.includes('নাম') || h.includes('product') || h.includes('পণ্য'));
  const qtyIdx = rawHeaders.findIndex((h) => h.includes('qty') || h.includes('পরিমাণ') || h.includes('quantity') || h.includes('stock') || h.includes('মজুদ') || h.includes('সংখ্যা'));
  const unitIdx = rawHeaders.findIndex((h) => h.includes('unit') || h.includes('একক'));
  const buyPriceIdx = rawHeaders.findIndex((h) => h.includes('buy') || h.includes('cost') || h.includes('ক্রয়') || h.includes('ক্রয়') || h.includes('কেনা'));
  const sellPriceIdx = rawHeaders.findIndex((h) => h.includes('sell') || h.includes('বিক্রয়') || h.includes('বিক্রয়') || h.includes('price') || h.includes('দাম'));
  const catIdx = rawHeaders.findIndex((h) => h.includes('category') || h.includes('ক্যাটাগরি') || h.includes('টাইপ'));
  const colorIdx = rawHeaders.findIndex((h) => h.includes('color') || h.includes('কালার') || h.includes('রং') || h.includes('রঙ'));
  const packagingIdx = rawHeaders.findIndex((h) => h.includes('pack') || h.includes('প্যাকেজিং') || h.includes('প্যাক'));
  const barcodeIdx = rawHeaders.findIndex((h) => h.includes('barcode') || h.includes('sku') || h.includes('বারকোড') || h.includes('কোড'));

  if (nameIdx === -1 || qtyIdx === -1 || sellPriceIdx === -1) {
    return {
      rows: [],
      errors: ['হেডারে প্রয়োজনীয় কলাম পাওয়া যায়নি। আবশ্যিক হেডার: name, qty, sellPrice (সাথে unit, buyPrice, category, color, packagingPrice, barcode দিতে পারেন)'],
    };
  }

  const rows: ParsedProductRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const name = cols[nameIdx] || '';
    if (!name) {
      errors.push(`সারি ${i + 1}: প্রোডাক্টের নাম নেই।`);
      continue;
    }

    const qty = parseFlexibleNumber(cols[qtyIdx]);
    const unit = (unitIdx !== -1 && cols[unitIdx]) ? cols[unitIdx].trim() : 'পিস';
    const buyPrice = buyPriceIdx !== -1 ? parseFlexibleNumber(cols[buyPriceIdx]) : 0;
    const sellPrice = parseFlexibleNumber(cols[sellPriceIdx]);
    const category = catIdx !== -1 ? (cols[catIdx] || '').trim() : '';
    const color = colorIdx !== -1 ? (cols[colorIdx] || '').trim() : '';
    const packagingPrice = packagingIdx !== -1 ? parseFlexibleNumber(cols[packagingIdx]) : 0;
    const barcode = barcodeIdx !== -1 ? (cols[barcodeIdx] || '').trim() : '';

    rows.push({
      name,
      qty,
      unit,
      buyPrice,
      sellPrice,
      category,
      color,
      packagingPrice,
      barcode,
    });
  }

  return { rows, errors };
}

export function parseSaleCSV(csvContent: string): { rows: ParsedSaleRow[]; errors: string[] } {
  const cleanedContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanedContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return { rows: [], errors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি বা শুধু হেডার রয়েছে।'] };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/gi, '')
  );

  const nameIdx = rawHeaders.findIndex((h) => h.includes('product') || h.includes('name') || h.includes('নাম'));
  const qtyIdx = rawHeaders.findIndex((h) => h.includes('qty') || h.includes('পরিমাণ') || h.includes('quantity'));
  const unitIdx = rawHeaders.findIndex((h) => h.includes('unit') || h.includes('একক'));
  const priceIdx = rawHeaders.findIndex((h) => h.includes('price') || h.includes('দাম') || h.includes('বিক্রয়') || h.includes('বিক্রয়') || h.includes('sell'));
  const dateIdx = rawHeaders.findIndex((h) => h.includes('date') || h.includes('তারিখ'));
  const payIdx = rawHeaders.findIndex((h) => h.includes('payment') || h.includes('পরিশোধ') || h.includes('পেমেন্ট') || h.includes('type'));
  const custIdx = rawHeaders.findIndex((h) => h.includes('customer') || h.includes('কাস্টমার') || h.includes('ক্রেতা') || h.includes('client'));

  if (nameIdx === -1 || qtyIdx === -1) {
    return {
      rows: [],
      errors: ['হেডারে প্রয়োজনীয় কলাম পাওয়া যায়নি। প্রয়োজনীয় হেডার: productName, qty, unit, price, date, payment, customer'],
    };
  }

  const rows: ParsedSaleRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const productName = cols[nameIdx] || '';
    if (!productName) {
      errors.push(`সারি ${i + 1}: প্রোডাক্টের নাম নেই।`);
      continue;
    }

    const qty = parseFloat(cols[qtyIdx]?.replace(/[^0-9.]/g, '') || '0') || 0;
    const unit = unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : 'পিস';
    const price = priceIdx !== -1 ? parseFloat(cols[priceIdx]?.replace(/[^0-9.]/g, '') || '0') || 0 : 0;
    
    let date = dateIdx !== -1 ? cols[dateIdx] : '';
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const today = new Date().toISOString().split('T')[0];
      date = today;
    }

    let paymentStr = payIdx !== -1 ? cols[payIdx]?.trim() : 'নগদ';
    const payment: 'নগদ' | 'বাকি' =
      paymentStr.toLowerCase().includes('বাকি') ||
      paymentStr.toLowerCase().includes('credit') ||
      paymentStr.toLowerCase().includes('due')
        ? 'বাকি'
        : 'নগদ';

    const customer = custIdx !== -1 ? cols[custIdx]?.trim() || '' : '';

    rows.push({
      productName,
      qty,
      unit,
      price,
      date,
      payment,
      customer,
    });
  }

  return { rows, errors };
}
