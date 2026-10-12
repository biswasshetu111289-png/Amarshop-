export interface ParsedProductRow {
  name: string;
  qty: number;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  category: string;
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

export function parseProductCSV(csvContent: string): { rows: ParsedProductRow[]; errors: string[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return { rows: [], errors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি বা শুধু হেডার রয়েছে।'] };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/gi, ''));
  
  // Find indices for headers
  const nameIdx = rawHeaders.findIndex((h) => h.includes('name') || h.includes('নাম') || h.includes('product'));
  const qtyIdx = rawHeaders.findIndex((h) => h.includes('qty') || h.includes('পরিমাণ') || h.includes('quantity') || h.includes('stock'));
  const unitIdx = rawHeaders.findIndex((h) => h.includes('unit') || h.includes('একক'));
  const buyPriceIdx = rawHeaders.findIndex((h) => h.includes('buy') || h.includes('cost') || h.includes('ক্রয়') || h.includes('কেনা'));
  const sellPriceIdx = rawHeaders.findIndex((h) => h.includes('sell') || h.includes('বিক্রয়') || h.includes('price') || h.includes('দাম'));
  const catIdx = rawHeaders.findIndex((h) => h.includes('category') || h.includes('ক্যাটাগরি') || h.includes('টাইপ'));

  if (nameIdx === -1 || qtyIdx === -1 || sellPriceIdx === -1) {
    return {
      rows: [],
      errors: ['হেডারে প্রয়োজনীয় কলাম পাওয়া যায়নি। প্রয়োজনীয় হেডার: name, qty, unit, buyPrice, sellPrice, category'],
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

    const qty = parseFloat(cols[qtyIdx]?.replace(/[^0-9.]/g, '') || '0') || 0;
    const unit = cols[unitIdx] || 'পিস';
    const buyPrice = parseFloat(cols[buyPriceIdx]?.replace(/[^0-9.]/g, '') || '0') || 0;
    const sellPrice = parseFloat(cols[sellPriceIdx]?.replace(/[^0-9.]/g, '') || '0') || 0;
    const category = catIdx !== -1 ? cols[catIdx] || '' : '';

    rows.push({
      name,
      qty,
      unit,
      buyPrice,
      sellPrice,
      category,
    });
  }

  return { rows, errors };
}

export function parseSaleCSV(csvContent: string): { rows: ParsedSaleRow[]; errors: string[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return { rows: [], errors: ['CSV ফাইলে কোনো ডেটা পাওয়া যায়নি বা শুধু হেডার রয়েছে।'] };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/gi, ''));

  const nameIdx = rawHeaders.findIndex((h) => h.includes('product') || h.includes('name') || h.includes('নাম'));
  const qtyIdx = rawHeaders.findIndex((h) => h.includes('qty') || h.includes('পরিমাণ') || h.includes('quantity'));
  const unitIdx = rawHeaders.findIndex((h) => h.includes('unit') || h.includes('একক'));
  const priceIdx = rawHeaders.findIndex((h) => h.includes('price') || h.includes('দাম') || h.includes('বিক্রয়') || h.includes('sell'));
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
