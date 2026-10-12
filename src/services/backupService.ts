import { StoreBackupData, AutoBackupFrequency, AutoBackupSnapshot, Product, Sale } from '../types';
import { db } from '../firebase';
import { collection, doc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { getProductsCollection, getSalesCollection } from './storeService';

const AUTO_BACKUP_FREQ_KEY = 'amar_business_auto_backup_freq';
const AUTO_BACKUP_SNAPSHOTS_KEY = 'amar_business_auto_snapshots_v1';
const GOOGLE_DRIVE_TOKEN_KEY = 'amar_business_gdrive_token';

/**
 * Get current Auto Backup frequency setting ('off' | 'daily' | 'weekly')
 */
export function getAutoBackupFrequency(): AutoBackupFrequency {
  try {
    const val = localStorage.getItem(AUTO_BACKUP_FREQ_KEY);
    if (val === 'daily' || val === 'weekly') return val;
    return 'daily'; // Default to daily auto-backup for best safety!
  } catch {
    return 'daily';
  }
}

/**
 * Set Auto Backup frequency setting
 */
export function setAutoBackupFrequency(freq: AutoBackupFrequency): void {
  try {
    localStorage.setItem(AUTO_BACKUP_FREQ_KEY, freq);
  } catch (e) {
    console.warn('Failed to save auto backup freq', e);
  }
}

/**
 * Get stored auto-backup snapshots
 */
export function getAutoBackupSnapshots(shopId?: string): AutoBackupSnapshot[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_SNAPSHOTS_KEY);
    const list: AutoBackupSnapshot[] = raw ? JSON.parse(raw) : [];
    if (shopId) {
      return list.filter((s) => s.shopId === shopId);
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Save an auto-backup snapshot to local history
 */
export function saveAutoBackupSnapshot(snapshot: AutoBackupSnapshot): void {
  try {
    const existing = getAutoBackupSnapshots();
    // Keep max 15 snapshots overall, avoid duplicate timestamp
    const filtered = existing.filter((s) => s.id !== snapshot.id);
    const updated = [snapshot, ...filtered].slice(0, 15);
    localStorage.setItem(AUTO_BACKUP_SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save auto backup snapshot', e);
  }
}

/**
 * Build a complete StoreBackupData payload from current state
 */
export function buildStoreBackupData(
  shopId: string,
  shopName: string,
  userEmail: string | null | undefined,
  products: Product[],
  sales: Sale[],
  shopDetails?: {
    name?: string;
    address?: string;
    phone?: string;
    description?: string;
    logoUrl?: string;
  }
): StoreBackupData {
  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    shopId,
    shopName,
    userEmail: userEmail || null,
    totalProducts: products.length,
    totalSales: sales.length,
    products,
    sales,
    shopDetails,
  };
}

/**
 * Download StoreBackupData directly as a formatted JSON file
 */
export function downloadBackupFile(backupData: StoreBackupData): void {
  const safeName = (backupData.shopName || 'store').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${safeName}-backup-${dateStr}.json`;

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an uploaded JSON backup file
 */
export async function parseBackupFile(file: File): Promise<StoreBackupData> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ফাইলটি সঠিক JSON ফরম্যাটে নেই। দয়া করে সঠিক ব্যাকআপ ফাইল নির্বাচন করুন।');
  }

  // Verification checks
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('অবৈধ ব্যাকআপ ফাইল ফরম্যাট!');
  }

  if (!Array.isArray(parsed.products) && !Array.isArray(parsed.sales)) {
    throw new Error('ব্যাকআপ ফাইলে কোনো পণ্য (products) বা বিক্রির (sales) তালিকা পাওয়া যায়নি।');
  }

  const normalizedProducts: Product[] = Array.isArray(parsed.products)
    ? parsed.products.map((p: any, idx: number) => ({
        id: p.id || `restored_prod_${Date.now()}_${idx}`,
        name: String(p.name || 'নামহীন পণ্য').trim(),
        qty: Number(p.qty) || 0,
        unit: p.unit || 'পিস',
        buyPrice: Number(p.buyPrice) || 0,
        sellPrice: Number(p.sellPrice) || 0,
        category: p.category || '',
        packagingPrice: p.packagingPrice ? Number(p.packagingPrice) : 0,
        color: p.color || '',
        colors: p.colors || (p.color ? [p.color] : []),
      }))
    : [];

  const normalizedSales: Sale[] = Array.isArray(parsed.sales)
    ? parsed.sales.map((s: any, idx: number) => ({
        id: s.id || `restored_sale_${Date.now()}_${idx}`,
        productId: s.productId || '',
        productName: String(s.productName || 'পণ্য').trim(),
        qty: Number(s.qty) || 1,
        unit: s.unit || 'পিস',
        price: Number(s.price) || 0,
        total: Number(s.total) || 0,
        date: s.date || new Date().toISOString().slice(0, 10),
        payment: s.payment === 'বাকি' ? 'বাকি' : 'নগদ',
        customer: s.customer || '',
        packagingPrice: s.packagingPrice ? Number(s.packagingPrice) : 0,
        color: s.color || '',
        notes: s.notes || '',
      }))
    : [];

  return {
    version: parsed.version || '1.0.0',
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    shopId: parsed.shopId || '',
    shopName: parsed.shopName || parsed.storeName || 'রিস্টোর করা দোকান',
    userEmail: parsed.userEmail || null,
    totalProducts: normalizedProducts.length,
    totalSales: normalizedSales.length,
    products: normalizedProducts,
    sales: normalizedSales,
    shopDetails: parsed.shopDetails,
  };
}

/**
 * Restore products and sales from a StoreBackupData into the target shop
 */
export async function restoreBackupIntoShop(
  targetShopId: string,
  backupData: StoreBackupData,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ restoredProducts: number; restoredSales: number }> {
  const prodCollection = getProductsCollection(targetShopId);
  const salesCollection = getSalesCollection(targetShopId);

  // If replace mode, clear existing products and sales first
  if (mode === 'replace') {
    const existingProds = await getDocs(prodCollection);
    const existingSales = await getDocs(salesCollection);

    const deleteBatch = writeBatch(db);
    existingProds.docs.forEach((d) => deleteBatch.delete(d.ref));
    existingSales.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
  }

  // Restore Products in chunks of 450 (Firestore limit is 500 operations per batch)
  let restoredProducts = 0;
  const prodChunks = chunkArray(backupData.products, 400);

  for (const chunk of prodChunks) {
    const batch = writeBatch(db);
    for (const p of chunk) {
      const docRef = p.id ? doc(prodCollection, p.id) : doc(prodCollection);
      batch.set(
        docRef,
        {
          name: p.name,
          qty: Number(p.qty) || 0,
          unit: p.unit || 'পিস',
          buyPrice: Number(p.buyPrice) || 0,
          sellPrice: Number(p.sellPrice) || 0,
          category: p.category || '',
          packagingPrice: Number(p.packagingPrice) || 0,
          color: p.color || '',
          colors: p.colors || (p.color ? [p.color] : []),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      restoredProducts++;
    }
    await batch.commit();
  }

  // Restore Sales in chunks of 450
  let restoredSales = 0;
  const salesChunks = chunkArray(backupData.sales, 400);

  for (const chunk of salesChunks) {
    const batch = writeBatch(db);
    for (const s of chunk) {
      const docRef = s.id ? doc(salesCollection, s.id) : doc(salesCollection);
      batch.set(
        docRef,
        {
          productId: s.productId || '',
          productName: s.productName,
          qty: Number(s.qty) || 1,
          unit: s.unit || 'পিস',
          price: Number(s.price) || 0,
          total: Number(s.total) || 0,
          date: s.date || new Date().toISOString().slice(0, 10),
          payment: s.payment === 'বাকি' ? 'বাকি' : 'নগদ',
          customer: s.customer || '',
          packagingPrice: Number(s.packagingPrice) || 0,
          color: s.color || '',
          notes: s.notes || '',
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      restoredSales++;
    }
    await batch.commit();
  }

  return { restoredProducts, restoredSales };
}

/**
 * Auto-backup checker: Checks if auto backup is due and executes snapshot
 */
export function checkAndExecuteAutoBackup(
  shopId: string,
  shopName: string,
  userEmail: string | null | undefined,
  products: Product[],
  sales: Sale[],
  shopDetails?: { name?: string; address?: string; phone?: string; description?: string; logoUrl?: string }
): AutoBackupSnapshot | null {
  const freq = getAutoBackupFrequency();
  if (freq === 'off') return null;
  if (!shopId || (products.length === 0 && sales.length === 0)) return null;

  const existingSnapshots = getAutoBackupSnapshots(shopId);
  const latestSnapshot = existingSnapshots[0];

  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10);

  let isDue = false;

  if (!latestSnapshot) {
    isDue = true;
  } else {
    const lastDate = new Date(latestSnapshot.timestamp);
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

    if (freq === 'daily') {
      // Due if last snapshot was on a previous calendar day or >20 hours ago
      const lastDateStr = latestSnapshot.timestamp.slice(0, 10);
      if (lastDateStr !== todayDateStr && diffHours >= 18) {
        isDue = true;
      }
    } else if (freq === 'weekly') {
      // Due if >6 days (144 hours)
      if (diffHours >= 144) {
        isDue = true;
      }
    }
  }

  if (!isDue) return null;

  const backupData = buildStoreBackupData(
    shopId,
    shopName,
    userEmail,
    products,
    sales,
    shopDetails
  );

  const snapshot: AutoBackupSnapshot = {
    id: `snap_${shopId}_${Date.now()}`,
    timestamp: now.toISOString(),
    shopId,
    shopName,
    productsCount: products.length,
    salesCount: sales.length,
    data: backupData,
  };

  saveAutoBackupSnapshot(snapshot);
  return snapshot;
}

/**
 * Upload backup file directly to Google Drive via multipart REST API
 */
export async function uploadToGoogleDrive(
  accessToken: string,
  backupData: StoreBackupData
): Promise<{ fileId: string; name: string; webViewLink?: string }> {
  const safeName = (backupData.shopName || 'Store').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `AmarBusiness_${safeName}_Backup_${dateStr}.json`;
  const fileContent = JSON.stringify(backupData, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Amar Business Store Manager automatic backup for "${backupData.shopName}" (${backupData.totalProducts} products, ${backupData.totalSales} sales).`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Google Drive Upload error:', errText);
    throw new Error(`গুগল ড্রাইভে আপলোড ব্যর্থ হয়েছে (${response.status}): ${errText}`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    name: result.name || fileName,
    webViewLink: result.webViewLink,
  };
}

// Utility: chunk array
function chunkArray<T>(array: T[], size: number): T[][] {
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}
