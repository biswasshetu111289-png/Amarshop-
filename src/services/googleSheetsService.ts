import { doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Expense,
  FixedAsset,
  PartnerInvestor,
  Product,
  Sale,
  Shop,
  SupplierDue,
} from '../types';
import {
  getExpensesCollection,
  getFixedAssetsCollection,
  getPartnersCollection,
  getProductsCollection,
  getSalesCollection,
  getSupplierDuesCollection,
} from './storeService';

export interface ShopFullData {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  partners: PartnerInvestor[];
  supplierDues: SupplierDue[];
  fixedAssets: FixedAsset[];
}

export interface SheetSyncResult {
  shopId: string;
  shopName: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  syncedAt: string;
  counts: {
    products: number;
    sales: number;
    expenses: number;
    partners: number;
    supplierDues: number;
    fixedAssets: number;
  };
}

interface TabPayload {
  title: string;
  rows: (string | number)[][];
}

const SHEET_TABS = {
  SUMMARY: 'সারসংক্ষেপ (Summary)',
  PRODUCTS: 'পণ্য ও স্টক (Products)',
  SALES: 'বিক্রির খাতা (Sales)',
  CUSTOMER_DUES: 'কাস্টমার বাকি (Dues)',
  EXPENSES: 'দোকানের খরচ (Expenses)',
  SUPPLIERS: 'পাইকার দেনা (Suppliers)',
  PARTNERS: 'পার্টনার মূলধন (Partners)',
  ASSETS: 'স্থায়ী সম্পদ (Assets)',
} as const;

const LOCAL_SHEET_META_PREFIX = 'amar_business_sheet_meta_';

export function getSavedShopSheetMeta(
  shop: Shop
): { spreadsheetId?: string; spreadsheetUrl?: string; lastSyncedAt?: string } {
  if (shop.googleSheetId) {
    return {
      spreadsheetId: shop.googleSheetId,
      spreadsheetUrl:
        shop.googleSheetUrl ||
        `https://docs.google.com/spreadsheets/d/${shop.googleSheetId}`,
      lastSyncedAt: shop.lastSheetSyncAt,
    };
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_SHEET_META_PREFIX}${shop.id}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

function saveShopSheetMetaLocal(
  shopId: string,
  spreadsheetId: string,
  spreadsheetUrl: string,
  lastSyncedAt: string
) {
  try {
    localStorage.setItem(
      `${LOCAL_SHEET_META_PREFIX}${shopId}`,
      JSON.stringify({ spreadsheetId, spreadsheetUrl, lastSyncedAt })
    );
  } catch {
    // ignore
  }
}

/**
 * Fetch all data collections for any shop directly from Firestore
 */
export async function fetchShopFullData(shopId: string): Promise<ShopFullData> {
  const [prodSnap, saleSnap, expSnap, partSnap, supSnap, assetSnap] = await Promise.all([
    getDocs(getProductsCollection(shopId)),
    getDocs(getSalesCollection(shopId)),
    getDocs(getExpensesCollection(shopId)),
    getDocs(getPartnersCollection(shopId)),
    getDocs(getSupplierDuesCollection(shopId)),
    getDocs(getFixedAssetsCollection(shopId)),
  ]);

  const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
  const sales = saleSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];
  const expenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Expense[];
  const partners = partSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PartnerInvestor[];
  const supplierDues = supSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplierDue[];
  const fixedAssets = assetSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FixedAsset[];

  // Sort sales newest first
  sales.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  expenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return { products, sales, expenses, partners, supplierDues, fixedAssets };
}

/**
 * Build structured rows for all 8 tabs of a shop's spreadsheet
 */
export function buildShopSpreadsheetTabs(shop: Shop, data: ShopFullData): TabPayload[] {
  const { products, sales, expenses, partners, supplierDues, fixedAssets } = data;

  // Build product cost map for COGS & profit
  const productCostMap = new Map<string, number>();
  for (const p of products) {
    const unitCost = (Number(p.buyPrice) || 0) + (Number(p.packagingPrice) || 0);
    productCostMap.set(p.id, unitCost);
    productCostMap.set(p.name.trim().toLowerCase(), unitCost);
  }

  let availableStockUnits = 0;
  let inStockBuyValue = 0;
  let inStockSellValue = 0;
  for (const p of products) {
    if (Number(p.qty) > 0) {
      const q = Number(p.qty);
      availableStockUnits += q;
      inStockBuyValue += q * ((Number(p.buyPrice) || 0) + (Number(p.packagingPrice) || 0));
      inStockSellValue += q * (Number(p.sellPrice) || 0);
    }
  }

  let totalSalesAmount = 0;
  let totalCashCollectedFromSales = 0;
  let totalCustomerDue = 0;
  let totalCOGS = 0;
  let totalSoldUnits = 0;

  // Customer dues summary aggregation
  const customerDueMap = new Map<
    string,
    { customer: string; phone: string; due: number; count: number; lastDate: string }
  >();

  for (const s of sales) {
    const qty = Number(s.qty) || 0;
    const total = Number(s.total) || 0;
    const due =
      s.dueAmount !== undefined ? Number(s.dueAmount) : s.payment === 'বাকি' ? total : 0;
    const paid =
      s.paidAmount !== undefined ? Number(s.paidAmount) : s.payment === 'নগদ' ? total : Math.max(0, total - due);

    totalSalesAmount += total;
    totalCashCollectedFromSales += paid;
    totalCustomerDue += due;
    totalSoldUnits += qty;

    const unitCost =
      (s.productId && productCostMap.get(s.productId)) ||
      (s.productName && productCostMap.get(s.productName.trim().toLowerCase())) ||
      0;
    totalCOGS += unitCost * qty;

    if (due > 0) {
      const cname = s.customer?.trim() || 'নামহীন ক্রেতা';
      const existing = customerDueMap.get(cname);
      if (existing) {
        existing.due += due;
        existing.count += 1;
        if (!existing.phone && s.customerPhone) existing.phone = s.customerPhone;
        if (s.date > existing.lastDate) existing.lastDate = s.date;
      } else {
        customerDueMap.set(cname, {
          customer: cname,
          phone: s.customerPhone || '',
          due,
          count: 1,
          lastDate: s.date || '',
        });
      }
    }
  }

  const grossProfit = totalSalesAmount - totalCOGS;
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = grossProfit - totalExpenses;
  const allTimePurchaseCost = inStockBuyValue + totalCOGS;
  const totalSupplierDue = supplierDues.reduce((sum, d) => sum + (Number(d.dueAmount) || 0), 0);
  const totalPartnerPaid = partners.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

  const nowStr = new Date().toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 1. Summary Tab
  const summaryRows: (string | number)[][] = [
    ['বিবরণ (Metric)', 'মান (Value)', 'অতিরিক্ত তথ্য (Notes)'],
    ['দোকানের নাম (Shop Name)', shop.name || '', shop.id],
    ['দোকানের ঠিকানা (Address)', shop.address || '-', ''],
    ['ফোন নম্বর (Phone)', shop.phone || '-', ''],
    ['সর্বশেষ সিঙ্ক সময় (Last Sync)', nowStr, new Date().toISOString()],
    ['মোট পণ্যের ধরন (Product Types)', products.length, `বর্তমান মজুদ: ${availableStockUnits} পিস/একক`],
    ['বর্তমান অবিক্রীত মজুদের ক্রয়মূল্য', Math.round(inStockBuyValue), 'In-Stock Inventory Cost (৳)'],
    ['বর্তমান অবিক্রীত মজুদের বিক্রয়মূল্য', Math.round(inStockSellValue), 'In-Stock Retail Value (৳)'],
    ['শুরু হতে সর্বমোট পণ্য ক্রয়মূল্য', Math.round(allTimePurchaseCost), `মোট ক্রয়কৃত ইউনিট: ${availableStockUnits + totalSoldUnits}`],
    ['সর্বমোট বিক্রি (All-Time Sales)', Math.round(totalSalesAmount), `মোট লেনদেন: ${sales.length}টি`],
    ['বিক্রি হতে নগদ আদায় (Collected)', Math.round(totalCashCollectedFromSales), ''],
    ['কাস্টমার বাকি পাওনা (Customer Due)', Math.round(totalCustomerDue), `${customerDueMap.size} জন কাস্টমার`],
    ['বিক্রিত পণ্যের মূল খরচ (COGS)', Math.round(totalCOGS), ''],
    ['গ্রস মুনাফা (Gross Profit)', Math.round(grossProfit), ''],
    ['মোট দোকান খরচ (Total Expenses)', Math.round(totalExpenses), `${expenses.length}টি এন্ট্রি`],
    ['একচুয়াল নিট লাভ (Actual Net Profit)', Math.round(netProfit), 'গ্রস লাভ - মোট খরচ'],
    ['পাইকার/সাপ্লায়ার দেনা (Supplier Due)', Math.round(totalSupplierDue), `${supplierDues.length}টি রেকর্ড`],
    ['পার্টনারদের মোট মূলধন (Partner Capital)', Math.round(totalPartnerPaid), `${partners.length} জন পার্টনার`],
    ['দোকানের স্থায়ী সম্পদ (Fixed Assets)', Math.round(totalFixedAssets), `${fixedAssets.length}টি সম্পদ`],
  ];

  // 2. Products Tab
  const productRows: (string | number)[][] = [
    [
      'পণ্য আইডি (ID)',
      'পণ্যের নাম (Name)',
      'ক্যাটাগরি (Category)',
      'মজুদ (Stock Qty)',
      'একক (Unit)',
      'ক্রয়মূল্য (Buy Price)',
      'প্যাকেজিং খরচ (Packaging)',
      'বিক্রয়মূল্য (Sell Price)',
      'প্রতি ইউনিট লাভ (Unit Profit)',
      'কালার (Colors)',
      'বারকোড (Barcode)',
    ],
    ...products.map((p) => {
      const buy = Number(p.buyPrice) || 0;
      const pkg = Number(p.packagingPrice) || 0;
      const sell = Number(p.sellPrice) || 0;
      const colors = p.colors?.length ? p.colors.join(', ') : p.color || '';
      return [
        p.id,
        p.name || '',
        p.category || '',
        Number(p.qty) || 0,
        p.unit || 'পিস',
        buy,
        pkg,
        sell,
        sell - (buy + pkg),
        colors,
        p.barcode || '',
      ];
    }),
  ];

  // 3. Sales Tab
  const saleRows: (string | number)[][] = [
    [
      'বিক্রি আইডি (Sale ID)',
      'ইনভয়েস গ্রুপ (Receipt Group)',
      'তারিখ (Date)',
      'পণ্যের নাম (Product)',
      'পরিমাণ (Qty)',
      'একক (Unit)',
      'দর (Rate)',
      'সাবটোটাল (Subtotal)',
      'ডিসকাউন্ট (Discount)',
      'মোট বিল (Total)',
      'পেমেন্ট ধরন (Status)',
      'পরিশোধিত (Paid)',
      'বাকি (Due)',
      'মাধ্যম (Method)',
      'ক্রেতার নাম (Customer)',
      'ফোন (Phone)',
      'কালার (Color)',
      'বাকি আদায়ের তারিখ (Collection Date)',
      'নোট (Notes)',
    ],
    ...sales.map((s) => {
      const total = Number(s.total) || 0;
      const discount = Number(s.discount) || 0;
      const subtotal =
        s.subtotal !== undefined
          ? Number(s.subtotal)
          : (Number(s.price) || 0) * (Number(s.qty) || 0);
      const due =
        s.dueAmount !== undefined ? Number(s.dueAmount) : s.payment === 'বাকি' ? total : 0;
      const paid =
        s.paidAmount !== undefined ? Number(s.paidAmount) : s.payment === 'নগদ' ? total : Math.max(0, total - due);
      return [
        s.id,
        s.invoiceGroupId || '',
        s.date || '',
        s.productName || '',
        Number(s.qty) || 0,
        s.unit || 'পিস',
        Number(s.price) || 0,
        subtotal,
        discount,
        total,
        s.payment || 'নগদ',
        paid,
        due,
        s.payment === 'বাকি' ? 'বাকি' : s.paymentMethod || 'নগদ',
        s.customer || '',
        s.customerPhone || '',
        s.color || '',
        s.collectionDate || '',
        s.collectionNotes || s.notes || '',
      ];
    }),
  ];

  // 4. Customer Dues Tab
  const dueSummaries = Array.from(customerDueMap.values()).sort((a, b) => b.due - a.due);
  const dueRows: (string | number)[][] = [
    ['ক্রেতার নাম (Customer)', 'ফোন নম্বর (Phone)', 'মোট বাকি (Total Due)', 'বকেয়া চালান (Count)', 'সর্বশেষ তারিখ (Last Date)'],
    ...dueSummaries.map((d) => [d.customer, d.phone, d.due, d.count, d.lastDate]),
  ];

  // 5. Expenses Tab
  const expenseRows: (string | number)[][] = [
    ['খরচ আইডি (ID)', 'তারিখ (Date)', 'খরচের বিবরণ (Title)', 'ক্যাটাগরি (Category)', 'পরিমাণ (Amount)', 'পরিশোধকারী (Paid By)', 'নোট (Notes)'],
    ...expenses.map((e) => [
      e.id,
      e.date || '',
      e.title || '',
      e.category || '',
      Number(e.amount) || 0,
      e.paidBy || 'ক্যাশ কাউন্টার',
      e.notes || '',
    ]),
  ];

  // 6. Supplier Dues Tab
  const supplierRows: (string | number)[][] = [
    [
      'আইডি (ID)',
      'পাইকার/কোম্পানি (Supplier)',
      'ফোন (Phone)',
      'পণ্য/চালান (Product/Invoice)',
      'মোট বিল (Total)',
      'পরিশোধিত (Paid)',
      'অবশিষ্ট বাকি (Due)',
      'ক্রয়ের তারিখ (Purchase Date)',
      'নোট (Notes)',
    ],
    ...supplierDues.map((d) => [
      d.id,
      d.supplierName || '',
      d.phone || '',
      [d.invoiceNo, d.description].filter(Boolean).join(' — '),
      Number(d.totalAmount) || 0,
      Number(d.paidAmount) || 0,
      Number(d.dueAmount) || 0,
      d.purchaseDate || '',
      d.notes || '',
    ]),
  ];

  // 7. Partners Tab
  const partnerRows: (string | number)[][] = [
    [
      'পার্টনারের নাম (Name)',
      'ফোন (Phone)',
      'শেয়ার % (Share %)',
      'প্রতিশ্রুত মূলধন (Committed)',
      'জমাকৃত মূলধন (Paid)',
      'বকেয়া মূলধন (Due)',
      'নোট (Notes)',
    ],
    ...partners.map((p) => [
      p.name || '',
      p.phone || '',
      Number(p.profitShareRatio) || 0,
      Number(p.committedAmount) || 0,
      Number(p.paidAmount) || 0,
      Number(p.dueAmount) || 0,
      p.notes || '',
    ]),
  ];

  // 8. Fixed Assets Tab
  const assetRows: (string | number)[][] = [
    ['সম্পদ আইডি (ID)', 'সম্পদের নাম (Asset Name)', 'ক্যাটাগরি (Category)', 'ক্রয়ের তারিখ (Date)', 'মূল্য (Cost)', 'নোট (Notes)'],
    ...fixedAssets.map((a) => [
      a.id,
      a.name || '',
      a.category || '',
      a.purchaseDate || '',
      Number(a.cost) || 0,
      a.notes || '',
    ]),
  ];

  return [
    { title: SHEET_TABS.SUMMARY, rows: summaryRows },
    { title: SHEET_TABS.PRODUCTS, rows: productRows },
    { title: SHEET_TABS.SALES, rows: saleRows },
    { title: SHEET_TABS.CUSTOMER_DUES, rows: dueRows },
    { title: SHEET_TABS.EXPENSES, rows: expenseRows },
    { title: SHEET_TABS.SUPPLIERS, rows: supplierRows },
    { title: SHEET_TABS.PARTNERS, rows: partnerRows },
    { title: SHEET_TABS.ASSETS, rows: assetRows },
  ];
}

async function googleFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    const error = new Error(`Google API error (${res.status}): ${errText}`) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Find an existing non-trashed Google Spreadsheet for a specific shop in Drive
 */
async function findExistingShopSpreadsheet(
  accessToken: string,
  shop: Shop
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetMap: Map<string, number> } | null> {
  const saved = getSavedShopSheetMeta(shop);
  let candidateId = saved.spreadsheetId;

  // If no saved ID locally/Firestore, search Google Drive by appProperties
  if (!candidateId) {
    const query = `appProperties has { key='amarBusinessShopId' and value='${shop.id.replace(/'/g, "\\'")}' } and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,webViewLink)&pageSize=5`;

    try {
      const searchRes = await googleFetch(searchUrl, accessToken);
      if (Array.isArray(searchRes.files) && searchRes.files.length > 0) {
        candidateId = searchRes.files[0].id;
      }
    } catch (err) {
      console.warn('Drive search fallback failed:', err);
    }
  }

  if (!candidateId) return null;

  // Verify the candidate spreadsheet exists & inspect actual tab metadata (per Sheets best practices)
  try {
    const meta = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${candidateId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties`,
      accessToken
    );

    const sheetMap = new Map<string, number>();
    if (Array.isArray(meta.sheets)) {
      for (const s of meta.sheets) {
        if (s.properties?.title && typeof s.properties.sheetId === 'number') {
          sheetMap.set(s.properties.title, s.properties.sheetId);
        }
      }
    }

    return {
      spreadsheetId: meta.spreadsheetId,
      spreadsheetUrl:
        meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}`,
      sheetMap,
    };
  } catch (err: any) {
    if (err?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Create a brand-new Google Spreadsheet dedicated to a specific shop
 */
async function createShopSpreadsheet(
  accessToken: string,
  shop: Shop,
  tabs: TabPayload[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetMap: Map<string, number> }> {
  const title = `AmarBusiness - ${shop.name || 'Shop'}`;
  const body = {
    properties: {
      title,
      locale: 'en_US',
    },
    sheets: tabs.map((tab, index) => ({
      properties: {
        title: tab.title,
        index,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    })),
  };

  const created = await googleFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  const sheetMap = new Map<string, number>();
  if (Array.isArray(created.sheets)) {
    for (const s of created.sheets) {
      if (s.properties?.title && typeof s.properties.sheetId === 'number') {
        sheetMap.set(s.properties.title, s.properties.sheetId);
      }
    }
  }

  // Tag file in Google Drive with appProperties so it can always be rediscovered across devices
  try {
    await googleFetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}`,
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify({
          appProperties: {
            amarBusinessShopId: shop.id,
            app: 'AmarBusinessManager',
          },
        }),
      }
    );
  } catch (tagErr) {
    console.warn('Could not tag Drive appProperties:', tagErr);
  }

  return { spreadsheetId, spreadsheetUrl, sheetMap };
}

/**
 * Create or update a dedicated Google Spreadsheet for a single Shop
 */
export async function syncShopToGoogleSheet(
  accessToken: string,
  shop: Shop,
  preloadedData?: ShopFullData
): Promise<SheetSyncResult> {
  const fullData = preloadedData || (await fetchShopFullData(shop.id));
  const tabs = buildShopSpreadsheetTabs(shop, fullData);

  // 1. Find existing or create new spreadsheet for this shop
  let target = await findExistingShopSpreadsheet(accessToken, shop);
  let isNew = false;

  if (!target) {
    target = await createShopSpreadsheet(accessToken, shop, tabs);
    isNew = true;
  }

  const { spreadsheetId, spreadsheetUrl, sheetMap } = target;

  // 2. If existing spreadsheet, ensure all required tabs exist & update title if shop was renamed
  if (!isNew) {
    const requests: any[] = [
      {
        updateSpreadsheetProperties: {
          properties: { title: `AmarBusiness - ${shop.name || 'Shop'}` },
          fields: 'title',
        },
      },
    ];

    for (const tab of tabs) {
      if (!sheetMap.has(tab.title)) {
        requests.push({
          addSheet: {
            properties: {
              title: tab.title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        });
      }
    }

    const batchRes = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );

    if (Array.isArray(batchRes.replies)) {
      for (const reply of batchRes.replies) {
        if (reply.addSheet?.properties?.title && typeof reply.addSheet.properties.sheetId === 'number') {
          sheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
        }
      }
    }

    // Clear previous values on all target tabs before writing updated rows
    const rangesToClear = tabs.map((t) => `'${t.title.replace(/'/g, "''")}'!A:Z`);
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ ranges: rangesToClear }),
      }
    );
  }

  // 3. Batch update all tab values
  const valueData = tabs.map((tab) => ({
    range: `'${tab.title.replace(/'/g, "''")}'!A1`,
    majorDimension: 'ROWS',
    values: tab.rows,
  }));

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );

  // 4. Format header row (bold white text, dark slate/indigo header fill, freeze row 1, auto-resize columns)
  const formatRequests: any[] = [];
  for (const tab of tabs) {
    const sheetId = sheetMap.get(tab.title);
    if (sheetId === undefined) continue;
    const colCount = tab.rows[0]?.length || 10;

    formatRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    });

    formatRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.118, green: 0.161, blue: 0.231 }, // #1e293b
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    formatRequests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: colCount,
        },
      },
    });
  }

  if (formatRequests.length > 0) {
    try {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ requests: formatRequests }),
        }
      );
    } catch (fmtErr) {
      console.warn('Formatting warning (data was saved successfully):', fmtErr);
    }
  }

  const syncedAt = new Date().toISOString();
  saveShopSheetMetaLocal(shop.id, spreadsheetId, spreadsheetUrl, syncedAt);

  // Save Google Sheet link to Firestore shop doc if it's a standard shop doc
  if (!shop.id.startsWith('usr_') && shop.id !== 'demo_store_owner') {
    try {
      await updateDoc(doc(db, 'shops', shop.id), {
        googleSheetId: spreadsheetId,
        googleSheetUrl: spreadsheetUrl,
        lastSheetSyncAt: syncedAt,
      });
    } catch (fsErr) {
      console.warn('Could not persist sheet metadata to Firestore shop doc:', fsErr);
    }
  }

  return {
    shopId: shop.id,
    shopName: shop.name,
    spreadsheetId,
    spreadsheetUrl,
    syncedAt,
    counts: {
      products: fullData.products.length,
      sales: fullData.sales.length,
      expenses: fullData.expenses.length,
      partners: fullData.partners.length,
      supplierDues: fullData.supplierDues.length,
      fixedAssets: fullData.fixedAssets.length,
    },
  };
}

/**
 * Download a local multi-sheet Excel Workbook (.xls SpreadsheetML) for offline archive
 */
export function downloadShopAsExcelWorkbook(shop: Shop, data: ShopFullData): void {
  const tabs = buildShopSpreadsheetTabs(shop, data);
  const escapeXml = (val: string | number): string =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const worksheetsXml = tabs
    .map((tab) => {
      // Excel tab names max 31 chars
      const shortTitle = tab.title.slice(0, 31).replace(/[:\\/?*[\]]/g, '-');
      const rowsXml = tab.rows
        .map((row, rIdx) => {
          const cellsXml = row
            .map((cell) => {
              const isNum = typeof cell === 'number' && !isNaN(cell);
              const styleAttr = rIdx === 0 ? ' ss:StyleID="Header"' : '';
              return `<Cell${styleAttr}><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(
                cell
              )}</Data></Cell>`;
            })
            .join('');
          return `<Row>${cellsXml}</Row>`;
        })
        .join('\n');

      return `<Worksheet ss:Name="${escapeXml(shortTitle)}"><Table>${rowsXml}</Table></Worksheet>`;
    })
    .join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${worksheetsXml}
</Workbook>`;

  const safeName = (shop.name || 'Shop').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${safeName}_All_Data_${dateStr}.xls`;

  const blob = new Blob(['\ufeff' + xmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
