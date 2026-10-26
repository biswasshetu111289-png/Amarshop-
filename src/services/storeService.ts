import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Product,
  Sale,
  Shop,
  ShopRole,
  ShopMember,
  ShopJoinRequest,
  Expense,
  PartnerInvestor,
  SupplierDue,
  CapitalContribution,
  SupplierPayment,
} from '../types';

// Collection references
export const getShopsCollection = () => collection(db, 'shops');

export const getProductsCollection = (targetId: string) => {
  if (targetId.startsWith('usr_') || targetId === 'demo_store_owner') {
    return collection(db, 'users', targetId, 'products');
  }
  return collection(db, 'shops', targetId, 'products');
};

export const getSalesCollection = (targetId: string) => {
  if (targetId.startsWith('usr_') || targetId === 'demo_store_owner') {
    return collection(db, 'users', targetId, 'sales');
  }
  return collection(db, 'shops', targetId, 'sales');
};

export const getExpensesCollection = (targetId: string) => {
  if (targetId.startsWith('usr_') || targetId === 'demo_store_owner') {
    return collection(db, 'users', targetId, 'expenses');
  }
  return collection(db, 'shops', targetId, 'expenses');
};

export const getPartnersCollection = (targetId: string) => {
  if (targetId.startsWith('usr_') || targetId === 'demo_store_owner') {
    return collection(db, 'users', targetId, 'partners');
  }
  return collection(db, 'shops', targetId, 'partners');
};

export const getSupplierDuesCollection = (targetId: string) => {
  if (targetId.startsWith('usr_') || targetId === 'demo_store_owner') {
    return collection(db, 'users', targetId, 'supplier_dues');
  }
  return collection(db, 'shops', targetId, 'supplier_dues');
};

/**
 * Generate a 6-character clean alphanumeric invite code
 */
export function generateInviteCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Generate deterministic UID from email
function generateLegacyUid(email: string): string {
  const clean = email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
  return `usr_${clean.slice(0, 24)}`;
}

/**
 * Fuzzy email matcher for typo tolerance (e.g. recoveyunit vs recoveryunit)
 */
export function isEmailMatch(email1?: string | null, email2?: string | null): boolean {
  if (!email1 || !email2) return false;
  const e1 = email1.trim().toLowerCase();
  const e2 = email2.trim().toLowerCase();
  if (e1 === e2) return true;
  const norm1 = e1.replace('onebankplcrecoveyunit', 'onebankplcrecoveryunit');
  const norm2 = e2.replace('onebankplcrecoveyunit', 'onebankplcrecoveryunit');
  return norm1 === norm2;
}

export function getEmailVariations(email?: string | null): string[] {
  if (!email) return [];
  const clean = email.trim().toLowerCase();
  const set = new Set<string>([clean]);
  if (clean.includes('onebankplcrecoveyunit')) {
    set.add(clean.replace('onebankplcrecoveyunit', 'onebankplcrecoveryunit'));
  }
  if (clean.includes('onebankplcrecoveryunit')) {
    set.add(clean.replace('onebankplcrecoveryunit', 'onebankplcrecoveyunit'));
  }
  return Array.from(set);
}

/**
 * Create a new Shop
 */
export async function createShop(
  ownerUid: string,
  ownerEmail: string,
  shopInput: {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
  }
): Promise<Shop> {
  const shopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();

  const initialMember: ShopMember = {
    uid: ownerUid,
    email: ownerEmail,
    role: 'admin',
    joinedAt: now,
  };

  const newShop: Shop = {
    id: shopId,
    name: shopInput.name.trim(),
    description: shopInput.description?.trim() || '',
    address: shopInput.address?.trim() || '',
    phone: shopInput.phone?.trim() || '',
    logoUrl: shopInput.logoUrl || '',
    ownerId: ownerUid,
    ownerEmail: ownerEmail,
    inviteCode,
    createdAt: now,
    members: {
      [ownerUid]: initialMember,
    },
    joinRequests: {},
  };

  const shopDocRef = doc(db, 'shops', shopId);
  await setDoc(shopDocRef, newShop);

  // Store in user's shops registry in local storage
  saveUserShopLocal(ownerUid, shopId);

  return newShop;
}

/**
 * Ensure default shop exists for a user (Migration & Initialization)
 */
export async function ensureUserDefaultShop(
  uid: string,
  email: string,
  storeName?: string
): Promise<Shop> {
  const cleanEmail = email.trim().toLowerCase();
  const isOneBank = cleanEmail.includes('onebankplcreco');

  // First check if user has existing shops where they are owner or member
  const userShops = await fetchUserShops(uid, email);
  if (userShops.length > 0) {
    return userShops[0];
  }

  // If onebankplcrecoveryunit, connect to their RaSa (CQEEMJ) shop
  if (isOneBank) {
    const legacyShopId = 'shop_cqeemj_recovery';
    const legacyDocRef = doc(db, 'shops', legacyShopId);
    const snap = await getDoc(legacyDocRef);
    if (snap.exists()) {
      const data = snap.data() as Shop;
      saveUserShopLocal(uid, legacyShopId);
      return { ...data, id: snap.id };
    }
  }

  // For any other new user, create a brand new separate shop with a unique invite code
  const newShopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultName = isOneBank
    ? 'RaSa (CQEEMJ)'
    : (storeName || 'আমার প্রধান দোকান');
  const now = new Date().toISOString();
  const inviteCode = isOneBank ? 'CQEEMJ' : generateInviteCode();

  const defaultShop: Shop = {
    id: isOneBank ? 'shop_cqeemj_recovery' : newShopId,
    name: defaultName,
    description: 'প্রধান ব্যবসা প্রতিষ্ঠান',
    ownerId: uid,
    ownerEmail: cleanEmail,
    inviteCode,
    createdAt: now,
    logoUrl: '',
    members: {
      [uid]: {
        uid,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'admin',
        joinedAt: now,
      },
    },
    joinRequests: {},
  };

  const targetDocId = isOneBank ? 'shop_cqeemj_recovery' : newShopId;
  const existingDoc = await getDoc(doc(db, 'shops', targetDocId));
  if (existingDoc.exists()) {
    saveUserShopLocal(uid, targetDocId);
    return { ...(existingDoc.data() as Shop), id: existingDoc.id };
  }

  await setDoc(doc(db, 'shops', targetDocId), defaultShop);
  saveUserShopLocal(uid, targetDocId);

  return defaultShop;
}

/**
 * Save shop ID to user's local list
 */
function saveUserShopLocal(uid: string, shopId: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = `user_shops_${uid}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(shopId)) {
      list.push(shopId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Failed local shop save:', e);
  }
}

/**
 * Fetch all shops a user belongs to (as owner, admin, manager, or viewer)
 */
export async function fetchUserShops(uid: string, email?: string): Promise<Shop[]> {
  const shopsMap = new Map<string, Shop>();
  const emailVariations = getEmailVariations(email);
  const isOneBank = emailVariations.some((ev) => ev.includes('onebankplcreco'));

  // 1. Query by ownerId
  try {
    const ownerQuery = query(getShopsCollection(), where('ownerId', '==', uid));
    const ownerSnap = await getDocs(ownerQuery);
    ownerSnap.forEach((d) => {
      shopsMap.set(d.id, { id: d.id, ...(d.data() as Omit<Shop, 'id'>) });
    });
  } catch (e) {
    console.warn('Owner query error:', e);
  }

  // 2. Query by ownerEmail (only this user's email variations)
  for (const eVar of emailVariations) {
    try {
      const emailQuery = query(getShopsCollection(), where('ownerEmail', '==', eVar));
      const emailSnap = await getDocs(emailQuery);
      emailSnap.forEach((d) => {
        shopsMap.set(d.id, { id: d.id, ...(d.data() as Omit<Shop, 'id'>) });
      });
    } catch (e) {
      console.warn('Owner email query error:', e);
    }
  }

  // 3. ONLY for onebankplcrecoveryunit, check shop_cqeemj_recovery
  if (isOneBank) {
    if (!shopsMap.has('shop_cqeemj_recovery')) {
      try {
        const dSnap = await getDoc(doc(db, 'shops', 'shop_cqeemj_recovery'));
        if (dSnap.exists()) {
          shopsMap.set('shop_cqeemj_recovery', {
            id: 'shop_cqeemj_recovery',
            ...(dSnap.data() as Omit<Shop, 'id'>),
          });
        }
      } catch (e) {
        console.warn('OneBank recovery check error:', e);
      }
    }
  }

  // 4. Query all shops and ONLY include if user is actual owner or an APPROVED member in members
  try {
    const allSnap = await getDocs(getShopsCollection());
    allSnap.forEach((d) => {
      const data = d.data() as Shop;
      const members = data.members || {};
      const isMember =
        Boolean(members[uid]) ||
        emailVariations.some((ev) =>
          Object.values(members).some((m) => isEmailMatch(m.email, ev))
        );
      const isOwner =
        data.ownerId === uid ||
        emailVariations.some((ev) => isEmailMatch(data.ownerEmail, ev));

      if (isMember || isOwner) {
        shopsMap.set(d.id, { id: d.id, ...(d.data() as Omit<Shop, 'id'>) });
      }
    });
  } catch (e) {
    console.warn('All shops scan error:', e);
  }

  // 5. Check locally saved shop IDs - ONLY if user is verified owner or member of that shop
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const key = `user_shops_${uid}`;
      const raw = localStorage.getItem(key);
      const localIds: string[] = raw ? JSON.parse(raw) : [];
      for (const sid of localIds) {
        if (!shopsMap.has(sid)) {
          const dSnap = await getDoc(doc(db, 'shops', sid));
          if (dSnap.exists()) {
            const data = dSnap.data() as Shop;
            const members = data.members || {};
            const isMember =
              Boolean(members[uid]) ||
              emailVariations.some((ev) =>
                Object.values(members).some((m) => isEmailMatch(m.email, ev))
              );
            const isOwner =
              data.ownerId === uid ||
              emailVariations.some((ev) => isEmailMatch(data.ownerEmail, ev));

            if (isMember || isOwner) {
              shopsMap.set(sid, { id: sid, ...(data as Omit<Shop, 'id'>) });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Local shop check error:', e);
  }

  return Array.from(shopsMap.values());
}

/**
 * Request to connect/join a shop using Shop Invite Code or Shop ID
 * If user is owner or enters their shop invite code, automatically link them as Admin!
 */
export async function requestJoinShop(
  identifier: string,
  user: { uid: string; email: string; displayName?: string }
): Promise<{ shopId: string; shopName: string; isDirectAdmin?: boolean }> {
  const cleanId = identifier.trim().toUpperCase();
  const cleanEmail = user.email.trim().toLowerCase();
  const shopsRef = getShopsCollection();

  // 1. Query by inviteCode
  let targetShopDoc: any = null;
  const codeQuery = query(shopsRef, where('inviteCode', '==', cleanId));
  const codeSnap = await getDocs(codeQuery);

  if (!codeSnap.empty) {
    targetShopDoc = codeSnap.docs[0];
  } else {
    // 2. Try by doc ID
    const docRef = doc(db, 'shops', identifier.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      targetShopDoc = docSnap;
    }
  }

  // 3. Fallback: If not found in Firestore yet, check if onebankplcrecoveryunit is asking for CQEEMJ
  if (!targetShopDoc) {
    if (cleanEmail.includes('onebankplcreco') && cleanId === 'CQEEMJ') {
      const docRef = doc(db, 'shops', 'shop_cqeemj_recovery');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        targetShopDoc = docSnap;
      }
    }
  }

  if (!targetShopDoc) {
    throw new Error('দোকানটি পাওয়া যায়নি! সঠিক শপ কোড লিখুন।');
  }

  const shopData = targetShopDoc.data() as Shop;
  const shopId = targetShopDoc.id;

  // Check if current user is the verified owner of this shop by UID or Owner Email
  const isActualOwner =
    shopData.ownerId === user.uid ||
    isEmailMatch(shopData.ownerEmail, cleanEmail);

  if (isActualOwner) {
    // Directly link verified owner as Admin to this shop
    const updatedMembers = {
      ...(shopData.members || {}),
      [user.uid]: {
        uid: user.uid,
        email: cleanEmail,
        displayName: user.displayName || cleanEmail.split('@')[0],
        role: 'admin' as ShopRole,
        joinedAt: new Date().toISOString(),
      },
    };

    await updateDoc(doc(db, 'shops', shopId), {
      ownerId: user.uid,
      ownerEmail: cleanEmail,
      members: updatedMembers,
    });

    saveUserShopLocal(user.uid, shopId);
    return { shopId, shopName: shopData.name, isDirectAdmin: true };
  }

  // Check if already an existing member
  if (shopData.members && shopData.members[user.uid]) {
    saveUserShopLocal(user.uid, shopId);
    return {
      shopId,
      shopName: shopData.name,
      isDirectAdmin: shopData.members[user.uid].role === 'admin',
    };
  }

  // Check if already requested
  if (shopData.joinRequests && shopData.joinRequests[user.uid]) {
    throw new Error('আপনার আবেদনটি ইতোমধ্যে পাঠানো হয়েছে। এডমিনের অনুমোদনের অপেক্ষায় রয়েছে।');
  }

  // Add join request
  const newRequest: ShopJoinRequest = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };

  const updatedRequests = {
    ...(shopData.joinRequests || {}),
    [user.uid]: newRequest,
  };

  await updateDoc(doc(db, 'shops', shopId), {
    joinRequests: updatedRequests,
  });

  return { shopId, shopName: shopData.name, isDirectAdmin: false };
}

/**
 * Admin: Approve join request and assign role ('manager', 'viewer', 'admin')
 */
export async function approveShopJoinRequest(
  shopId: string,
  targetUid: string,
  role: ShopRole
): Promise<void> {
  const shopRef = doc(db, 'shops', shopId);
  const shopSnap = await getDoc(shopRef);
  if (!shopSnap.exists()) throw new Error('দোকান পাওয়া যায়নি');

  const shopData = shopSnap.data() as Shop;
  const req = shopData.joinRequests?.[targetUid];
  if (!req) throw new Error('অনুরোধটি খুঁজে পাওয়া যায়নি');

  const newMember: ShopMember = {
    uid: targetUid,
    email: req.email,
    displayName: req.displayName,
    role: role,
    joinedAt: new Date().toISOString(),
  };

  const updatedMembers = {
    ...(shopData.members || {}),
    [targetUid]: newMember,
  };

  const updatedRequests = { ...(shopData.joinRequests || {}) };
  delete updatedRequests[targetUid];

  await updateDoc(shopRef, {
    members: updatedMembers,
    joinRequests: updatedRequests,
  });
}

/**
 * Admin: Reject join request
 */
export async function rejectShopJoinRequest(shopId: string, targetUid: string): Promise<void> {
  const shopRef = doc(db, 'shops', shopId);
  const shopSnap = await getDoc(shopRef);
  if (!shopSnap.exists()) return;

  const shopData = shopSnap.data() as Shop;
  const updatedRequests = { ...(shopData.joinRequests || {}) };
  delete updatedRequests[targetUid];

  await updateDoc(shopRef, {
    joinRequests: updatedRequests,
  });
}

/**
 * Admin: Update member role (admin <-> manager <-> viewer)
 */
export async function updateShopMemberRole(
  shopId: string,
  targetUid: string,
  newRole: ShopRole
): Promise<void> {
  const shopRef = doc(db, 'shops', shopId);
  const shopSnap = await getDoc(shopRef);
  if (!shopSnap.exists()) return;

  const shopData = shopSnap.data() as Shop;
  if (!shopData.members || !shopData.members[targetUid]) return;

  const updatedMember = {
    ...shopData.members[targetUid],
    role: newRole,
  };

  await updateDoc(shopRef, {
    [`members.${targetUid}`]: updatedMember,
  });
}

/**
 * Admin: Remove a member from shop
 */
export async function removeShopMember(shopId: string, targetUid: string): Promise<void> {
  const shopRef = doc(db, 'shops', shopId);
  const shopSnap = await getDoc(shopRef);
  if (!shopSnap.exists()) return;

  const shopData = shopSnap.data() as Shop;
  if (shopData.ownerId === targetUid) {
    throw new Error('দোকানের প্রধান মালিককে রিমুভ করা সম্ভব নয়!');
  }

  const updatedMembers = { ...(shopData.members || {}) };
  delete updatedMembers[targetUid];

  await updateDoc(shopRef, {
    members: updatedMembers,
  });
}

/**
 * Admin: Directly invite a member by email & assign role
 */
export async function inviteMemberDirect(
  shopId: string,
  email: string,
  role: ShopRole
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const dummyUid = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;
  const shopRef = doc(db, 'shops', shopId);
  const shopSnap = await getDoc(shopRef);
  if (!shopSnap.exists()) throw new Error('দোকান পাওয়া যায়নি');

  const shopData = shopSnap.data() as Shop;
  const newMember: ShopMember = {
    uid: dummyUid,
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0],
    role: role,
    joinedAt: new Date().toISOString(),
  };

  const updatedMembers = {
    ...(shopData.members || {}),
    [dummyUid]: newMember,
  };

  await updateDoc(shopRef, {
    members: updatedMembers,
  });
}

/**
 * Update shop metadata (Name, Address, Phone, Description, LogoUrl)
 */
export async function updateShopDetails(
  shopId: string,
  data: { name: string; address?: string; phone?: string; description?: string; logoUrl?: string }
): Promise<void> {
  const shopRef = doc(db, 'shops', shopId);
  const payload: any = {
    name: data.name.trim(),
    address: data.address?.trim() || '',
    phone: data.phone?.trim() || '',
    description: data.description?.trim() || '',
  };
  if (data.logoUrl !== undefined) {
    payload.logoUrl = data.logoUrl;
  }
  await updateDoc(shopRef, payload);
}

/**
 * Delete a shop (Only Owner can delete)
 */
export async function deleteShop(shopId: string, requesterUid: string): Promise<void> {
  const shopRef = doc(db, 'shops', shopId);
  const shopSnap = await getDoc(shopRef);
  if (!shopSnap.exists()) return;

  const shopData = shopSnap.data() as Shop;
  const isOwner = shopData.ownerId === requesterUid;
  const isAdminMember = shopData.members?.[requesterUid]?.role === 'admin';
  if (!isOwner && !isAdminMember) {
    throw new Error('শুধুমাত্র দোকানের প্রধান এডমিন/মালিক দোকান ডিলিট করতে পারেন।');
  }

  // Delete all products and sales in shop
  await clearAllProducts(shopId);
  await clearAllSales(shopId);

  // Delete shop doc
  await deleteDoc(shopRef);
}

// ================= PRODUCT & SALES OPERATIONS =================

/**
 * Add or update a product with Packaging Price & Color Options
 */
export async function saveProduct(
  targetId: string,
  productData: Omit<Product, 'id' | 'createdAt'> & { id?: string }
): Promise<string> {
  const productsRef = getProductsCollection(targetId);
  const dataToSave = {
    name: productData.name.trim(),
    qty: Number(productData.qty),
    unit: productData.unit,
    buyPrice: Number(productData.buyPrice),
    sellPrice: Number(productData.sellPrice),
    category: productData.category?.trim() || '',
    packagingPrice: productData.packagingPrice ? Number(productData.packagingPrice) : 0,
    color: productData.color?.trim() || '',
    colors: productData.colors || (productData.color ? [productData.color.trim()] : []),
  };

  if (productData.id) {
    const docRef = doc(productsRef, productData.id);
    await updateDoc(docRef, dataToSave);
    return productData.id;
  } else {
    const docRef = doc(productsRef);
    await setDoc(docRef, {
      ...dataToSave,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(targetId: string, productId: string): Promise<void> {
  const docRef = doc(getProductsCollection(targetId), productId);
  await deleteDoc(docRef);
}

/**
 * Record a new sale and decrement product stock
 */
export async function createSale(
  targetId: string,
  saleData: {
    productId: string;
    productName: string;
    qty: number;
    unit: string;
    price: number;
    total: number;
    date: string;
    payment: 'নগদ' | 'বাকি' | 'আংশিক';
    paymentMethod?: string;
    paidAmount?: number;
    dueAmount?: number;
    customer?: string;
    customerPhone?: string;
    packagingPrice?: number;
    color?: string;
    notes?: string;
  }
): Promise<void> {
  const batch = writeBatch(db);

  // 1. New sale doc
  const salesRef = getSalesCollection(targetId);
  const newSaleDoc = doc(salesRef);
  batch.set(newSaleDoc, {
    productId: saleData.productId,
    productName: saleData.productName,
    qty: Number(saleData.qty),
    unit: saleData.unit,
    price: Number(saleData.price),
    total: Number(saleData.total),
    date: saleData.date,
    payment: saleData.payment,
    paymentMethod: saleData.paymentMethod || 'নগদ',
    paidAmount: Number(saleData.paidAmount ?? (saleData.payment === 'নগদ' ? saleData.total : 0)),
    dueAmount: Number(saleData.dueAmount ?? (saleData.payment === 'বাকি' ? saleData.total : 0)),
    customer: saleData.customer?.trim() || '',
    customerPhone: saleData.customerPhone?.trim() || '',
    packagingPrice: Number(saleData.packagingPrice || 0),
    color: saleData.color || '',
    notes: saleData.notes || '',
    createdAt: serverTimestamp(),
  });

  // 2. Decrement stock if productId exists
  if (saleData.productId) {
    const prodRef = doc(getProductsCollection(targetId), saleData.productId);
    batch.update(prodRef, {
      qty: increment(-Number(saleData.qty)),
    });
  }

  await batch.commit();
}

/**
 * Edit an existing sale with automatic stock reconciliation!
 * (Admin or Manager feature)
 */
export async function editSale(
  targetId: string,
  saleId: string,
  updatedData: {
    productId: string;
    productName: string;
    qty: number;
    unit: string;
    price: number;
    total: number;
    date: string;
    payment: 'নগদ' | 'বাকি' | 'আংশিক';
    paymentMethod?: string;
    paidAmount?: number;
    dueAmount?: number;
    customer?: string;
    customerPhone?: string;
    packagingPrice?: number;
    color?: string;
    notes?: string;
  },
  originalSale: Sale
): Promise<void> {
  const batch = writeBatch(db);
  const salesRef = getSalesCollection(targetId);
  const saleDocRef = doc(salesRef, saleId);

  // 1. Update the sale record
  batch.update(saleDocRef, {
    productId: updatedData.productId,
    productName: updatedData.productName,
    qty: Number(updatedData.qty),
    unit: updatedData.unit,
    price: Number(updatedData.price),
    total: Number(updatedData.total),
    date: updatedData.date,
    payment: updatedData.payment,
    paymentMethod: updatedData.paymentMethod || 'নগদ',
    paidAmount: Number(updatedData.paidAmount ?? (updatedData.payment === 'নগদ' ? updatedData.total : 0)),
    dueAmount: Number(updatedData.dueAmount ?? (updatedData.payment === 'বাকি' ? updatedData.total : 0)),
    customer: updatedData.customer?.trim() || '',
    customerPhone: updatedData.customerPhone?.trim() || '',
    packagingPrice: Number(updatedData.packagingPrice || 0),
    color: updatedData.color || '',
    notes: updatedData.notes || '',
  });

  // 2. Reconcile stock
  const originalQty = Number(originalSale.qty);
  const newQty = Number(updatedData.qty);

  if (originalSale.productId && updatedData.productId && originalSale.productId === updatedData.productId) {
    // Same product: adjust difference
    const diff = originalQty - newQty; // If sold less, restore difference to stock; if sold more, reduce stock
    if (diff !== 0) {
      const prodRef = doc(getProductsCollection(targetId), originalSale.productId);
      batch.update(prodRef, {
        qty: increment(diff),
      });
    }
  } else {
    // Product changed: restore original, deduct new
    if (originalSale.productId) {
      const oldProdRef = doc(getProductsCollection(targetId), originalSale.productId);
      batch.update(oldProdRef, {
        qty: increment(originalQty),
      });
    }
    if (updatedData.productId) {
      const newProdRef = doc(getProductsCollection(targetId), updatedData.productId);
      batch.update(newProdRef, {
        qty: increment(-newQty),
      });
    }
  }

  await batch.commit();
}

/**
 * Delete a sale and restore the product quantity
 */
export async function deleteSale(
  targetId: string,
  saleId: string,
  productId: string,
  qty: number
): Promise<void> {
  const batch = writeBatch(db);

  const saleRef = doc(getSalesCollection(targetId), saleId);
  batch.delete(saleRef);

  if (productId) {
    const prodRef = doc(getProductsCollection(targetId), productId);
    batch.update(prodRef, {
      qty: increment(Number(qty)),
    });
  }

  await batch.commit();
}

/**
 * Mark all due sales for a specific customer as paid ("নগদ") with payment method tracking
 */
export async function markCustomerDuesAsPaid(
  targetId: string,
  customerSales: Sale[],
  paymentMethod: string = 'নগদ',
  collectionDate?: string
): Promise<void> {
  if (customerSales.length === 0) return;
  const batch = writeBatch(db);
  const salesRef = getSalesCollection(targetId);
  const effectiveDate = collectionDate || new Date().toISOString().split('T')[0];

  for (const s of customerSales) {
    const saleRef = doc(salesRef, s.id);
    batch.update(saleRef, {
      payment: 'নগদ',
      paymentMethod: paymentMethod,
      paidAmount: Number(s.total),
      dueAmount: 0,
      collectionDate: effectiveDate,
    });
  }

  await batch.commit();
}

/**
 * Receive full or partial due payment from a customer with payment method tracking and collection date
 */
export async function collectCustomerDuePayment(
  targetId: string,
  customerSales: Sale[],
  amountPaid: number,
  paymentMethod: string = 'নগদ',
  notes?: string,
  collectionDate?: string
): Promise<{ paidTotal: number; remainingDue: number }> {
  if (customerSales.length === 0 || amountPaid <= 0) {
    return { paidTotal: 0, remainingDue: 0 };
  }

  const batch = writeBatch(db);
  const salesRef = getSalesCollection(targetId);
  const effectiveDate = collectionDate || new Date().toISOString().split('T')[0];

  // Sort sales oldest first (ascending date) to clear older debts first
  const sortedSales = [...customerSales].sort((a, b) => a.date.localeCompare(b.date));

  let remainingToApply = amountPaid;

  for (const s of sortedSales) {
    if (remainingToApply <= 0) break;

    const currentDue =
      s.dueAmount !== undefined ? Number(s.dueAmount) : (s.payment === 'বাকি' ? Number(s.total) : 0);
    if (currentDue <= 0) continue;

    const saleRef = doc(salesRef, s.id);

    if (remainingToApply >= currentDue) {
      // Fully clear this invoice's due
      remainingToApply -= currentDue;
      batch.update(saleRef, {
        payment: 'নগদ',
        paymentMethod: paymentMethod,
        paidAmount: Number(s.total),
        dueAmount: 0,
        collectionDate: effectiveDate,
        ...(notes ? { notes: s.notes ? `${s.notes} | ${notes}` : notes, collectionNotes: notes } : { collectionNotes: '' }),
      });
    } else {
      // Partially clear this invoice
      const newDue = currentDue - remainingToApply;
      const newPaid = Number(s.paidAmount || 0) + remainingToApply;
      remainingToApply = 0;
      batch.update(saleRef, {
        payment: 'আংশিক',
        paymentMethod: paymentMethod,
        paidAmount: newPaid,
        dueAmount: newDue,
        collectionDate: effectiveDate,
        ...(notes ? { notes: s.notes ? `${s.notes} | ${notes}` : notes, collectionNotes: notes } : { collectionNotes: '' }),
      });
      break;
    }
  }

  await batch.commit();
  return { paidTotal: amountPaid - remainingToApply, remainingDue: remainingToApply };
}

/**
 * Batch import products: If product with same name exists, update stock/prices; otherwise insert
 */
export async function batchImportProducts(
  targetId: string,
  items: Array<{
    name: string;
    qty: number;
    unit: string;
    buyPrice: number;
    sellPrice: number;
    category?: string;
    packagingPrice?: number;
    color?: string;
  }>,
  existingProducts: Product[]
): Promise<{ added: number; updated: number }> {
  const batch = writeBatch(db);
  let added = 0;
  let updated = 0;

  const existingMap = new Map<string, Product>();
  for (const p of existingProducts) {
    existingMap.set(p.name.trim().toLowerCase(), p);
  }

  const productsRef = getProductsCollection(targetId);

  for (const item of items) {
    const normalizedName = item.name.trim().toLowerCase();
    const existing = existingMap.get(normalizedName);

    if (existing) {
      const docRef = doc(productsRef, existing.id);
      batch.update(docRef, {
        qty: Number(item.qty),
        unit: item.unit || existing.unit,
        buyPrice: Number(item.buyPrice),
        sellPrice: Number(item.sellPrice),
        category: item.category || existing.category || '',
        packagingPrice: Number(item.packagingPrice || existing.packagingPrice || 0),
        color: item.color || existing.color || '',
      });
      updated++;
    } else {
      const docRef = doc(productsRef);
      batch.set(docRef, {
        name: item.name.trim(),
        qty: Number(item.qty),
        unit: item.unit || 'পিস',
        buyPrice: Number(item.buyPrice),
        sellPrice: Number(item.sellPrice),
        category: item.category || '',
        packagingPrice: Number(item.packagingPrice || 0),
        color: item.color || '',
        createdAt: serverTimestamp(),
      });
      added++;
    }
  }

  await batch.commit();
  return { added, updated };
}

/**
 * Batch import sales and decrement product stocks
 */
export async function batchImportSales(
  targetId: string,
  salesItems: Array<{
    productName: string;
    qty: number;
    unit: string;
    price: number;
    date: string;
    payment: 'নগদ' | 'বাকি';
    customer?: string;
    packagingPrice?: number;
    color?: string;
  }>,
  existingProducts: Product[]
): Promise<{ imported: number; unmatchedStock: number }> {
  const batch = writeBatch(db);
  let imported = 0;
  let unmatchedStock = 0;

  const existingMap = new Map<string, Product>();
  for (const p of existingProducts) {
    existingMap.set(p.name.trim().toLowerCase(), p);
  }

  const salesRef = getSalesCollection(targetId);

  for (const item of salesItems) {
    const newSaleDoc = doc(salesRef);
    const normalizedName = item.productName.trim().toLowerCase();
    const matchedProduct = existingMap.get(normalizedName);

    const price = Number(item.price) || (matchedProduct ? matchedProduct.sellPrice : 0);
    const total = price * Number(item.qty);

    batch.set(newSaleDoc, {
      productId: matchedProduct ? matchedProduct.id : '',
      productName: item.productName.trim(),
      qty: Number(item.qty),
      unit: item.unit || (matchedProduct ? matchedProduct.unit : 'পিস'),
      price: price,
      total: total,
      date: item.date,
      payment: item.payment,
      customer: item.customer?.trim() || '',
      packagingPrice: Number(item.packagingPrice || 0),
      color: item.color || '',
      createdAt: serverTimestamp(),
    });

    if (matchedProduct) {
      const prodRef = doc(getProductsCollection(targetId), matchedProduct.id);
      batch.update(prodRef, {
        qty: increment(-Number(item.qty)),
      });
    } else {
      unmatchedStock++;
    }

    imported++;
  }

  await batch.commit();
  return { imported, unmatchedStock };
}

/**
 * Seed initial sample products for a brand new shop (only if empty)
 */
export async function seedSampleProducts(targetId: string): Promise<void> {
  const productsRef = getProductsCollection(targetId);
  try {
    const existing = await getDocs(productsRef);
    if (!existing.empty) {
      return; // Already has products, never overwrite user data
    }
  } catch (checkErr) {
    console.warn('Check existing products warning:', checkErr);
  }

  const sampleProducts = [
    {
      name: 'বাসমতি চাল ৫ কেজি',
      qty: 25,
      unit: 'ব্যাগ',
      buyPrice: 480,
      sellPrice: 550,
      category: 'চাল',
      packagingPrice: 15,
      color: 'সাদা',
    },
    {
      name: 'মিনিকেট চাল ২৫ কেজি',
      qty: 15,
      unit: 'ব্যাগ',
      buyPrice: 1650,
      sellPrice: 1800,
      category: 'চাল',
      packagingPrice: 25,
      color: 'সাদা',
    },
    {
      name: 'তীর সয়াবিন তেল ৫ লিটার',
      qty: 12,
      unit: 'বক্স',
      buyPrice: 820,
      sellPrice: 910,
      category: 'তেল ও ঘি',
      packagingPrice: 10,
      color: 'স্বচ্ছ',
    },
    {
      name: 'রূপচাঁদা সরিষার তেল ১ লিটার',
      qty: 4,
      unit: 'পিস',
      buyPrice: 280,
      sellPrice: 320,
      category: 'তেল ও ঘি',
      packagingPrice: 5,
      color: 'সোনালী',
    },
    {
      name: 'মসুর ডাল (চিকন)',
      qty: 35,
      unit: 'কেজি',
      buyPrice: 120,
      sellPrice: 140,
      category: 'ডাল',
      packagingPrice: 5,
      color: 'লাল',
    },
    {
      name: 'প্রাণ প্রিমিয়াম ঘি ৫০০ গ্রাম',
      qty: 3,
      unit: 'পিস',
      buyPrice: 520,
      sellPrice: 600,
      category: 'দুগ্ধজাত',
      packagingPrice: 12,
      color: 'হলুদ',
    },
  ];

  const batch = writeBatch(db);

  for (const item of sampleProducts) {
    const docRef = doc(productsRef);
    batch.set(docRef, {
      ...item,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Clear all sales records for target shop
 */
export async function clearAllSales(targetId: string): Promise<number> {
  const salesRef = getSalesCollection(targetId);
  const snap = await getDocs(salesRef);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
  return snap.size;
}

/**
 * Clear all product records for target shop
 */
export async function clearAllProducts(targetId: string): Promise<number> {
  const prodRef = getProductsCollection(targetId);
  const snap = await getDocs(prodRef);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
  return snap.size;
}

// ============================================================================
// EXPENSES (দৈনন্দিন খরচ খাতা)
// ============================================================================

/**
 * Add a new business expense
 */
export async function addExpense(
  targetId: string,
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const colRef = getExpensesCollection(targetId);
  const docRef = doc(colRef);
  await setDoc(docRef, {
    ...expense,
    amount: Number(expense.amount) || 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  targetId: string,
  expenseId: string,
  data: Partial<Expense>
): Promise<void> {
  const colRef = getExpensesCollection(targetId);
  const docRef = doc(colRef, expenseId);
  const updatePayload: Record<string, any> = { ...data };
  if (data.amount !== undefined) {
    updatePayload.amount = Number(data.amount) || 0;
  }
  await updateDoc(docRef, updatePayload);
}

/**
 * Delete an expense
 */
export async function deleteExpense(targetId: string, expenseId: string): Promise<void> {
  const colRef = getExpensesCollection(targetId);
  await deleteDoc(doc(colRef, expenseId));
}

// ============================================================================
// PARTNERS & INVESTORS (অংশীদার ও ইনভেস্টর হিসাব)
// ============================================================================

/**
 * Add a new partner or investor
 */
export async function addPartnerInvestor(
  targetId: string,
  partner: Omit<PartnerInvestor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const colRef = getPartnersCollection(targetId);
  const docRef = doc(colRef);
  const committed = Number(partner.committedAmount) || 0;
  const paid = Number(partner.paidAmount) || 0;
  const due = Math.max(0, committed - paid);

  const initialContributions: CapitalContribution[] =
    partner.contributions && partner.contributions.length > 0
      ? partner.contributions
      : paid > 0
      ? [
          {
            id: `contrib_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: paid,
            notes: 'প্রারম্ভিক মূলধন জমা',
          },
        ]
      : [];

  await setDoc(docRef, {
    name: partner.name,
    phone: partner.phone || '',
    role: partner.role || 'partner',
    committedAmount: committed,
    paidAmount: paid,
    dueAmount: due,
    profitShareRatio: Number(partner.profitShareRatio) || 0,
    contributions: initialContributions,
    notes: partner.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Update a partner or investor details
 */
export async function updatePartnerInvestor(
  targetId: string,
  partnerId: string,
  data: Partial<PartnerInvestor>
): Promise<void> {
  const colRef = getPartnersCollection(targetId);
  const docRef = doc(colRef, partnerId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('পার্টনার তথ্য পাওয়া যায়নি');

  const existing = docSnap.data() as PartnerInvestor;
  const committed = data.committedAmount !== undefined ? Number(data.committedAmount) : existing.committedAmount;
  const paid = data.paidAmount !== undefined ? Number(data.paidAmount) : existing.paidAmount;
  const due = Math.max(0, committed - paid);

  const updatePayload: Record<string, any> = {
    ...data,
    committedAmount: committed,
    paidAmount: paid,
    dueAmount: due,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(docRef, updatePayload);
}

/**
 * Record a capital installment payment for a partner (আংশিক বা বকেয়া মূলধন জমা)
 */
export async function addCapitalPayment(
  targetId: string,
  partnerId: string,
  amount: number,
  notes?: string,
  date?: string
): Promise<void> {
  const colRef = getPartnersCollection(targetId);
  const docRef = doc(colRef, partnerId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('পার্টনার তথ্য পাওয়া যায়নি');

  const existing = docSnap.data() as PartnerInvestor;
  const paymentAmount = Number(amount) || 0;
  if (paymentAmount <= 0) throw new Error('বৈধ জমার পরিমাণ দিন');

  const newPaidAmount = (Number(existing.paidAmount) || 0) + paymentAmount;
  const committedAmount = Number(existing.committedAmount) || 0;
  const newDueAmount = Math.max(0, committedAmount - newPaidAmount);

  const newContribution: CapitalContribution = {
    id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: date || new Date().toISOString().split('T')[0],
    amount: paymentAmount,
    notes: notes || 'বকেয়া মূলধন কিস্তি জমা',
  };

  const existingContributions = existing.contributions || [];

  await updateDoc(docRef, {
    paidAmount: newPaidAmount,
    dueAmount: newDueAmount,
    contributions: [...existingContributions, newContribution],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a partner or investor record
 */
export async function deletePartnerInvestor(targetId: string, partnerId: string): Promise<void> {
  const colRef = getPartnersCollection(targetId);
  await deleteDoc(doc(colRef, partnerId));
}

// ============================================================================
// SUPPLIER / WHOLESALER ACCOUNTS PAYABLE (পাইকার / হোলসেলার দেনা খাতা)
// ============================================================================

/**
 * Add a new supplier due record (বাকিতে মাল ক্রয়)
 */
export async function addSupplierDue(
  targetId: string,
  due: Omit<SupplierDue, 'id' | 'createdAt'>
): Promise<string> {
  const colRef = getSupplierDuesCollection(targetId);
  const docRef = doc(colRef);
  const total = Number(due.totalAmount) || 0;
  const paid = Number(due.paidAmount) || 0;
  const remainingDue = Math.max(0, total - paid);
  const status = remainingDue <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due';

  const initialPayments: SupplierPayment[] =
    due.payments && due.payments.length > 0
      ? due.payments
      : paid > 0
      ? [
          {
            id: `pay_${Date.now()}`,
            date: due.purchaseDate || new Date().toISOString().split('T')[0],
            amount: paid,
            paymentMethod: 'নগদ',
            notes: 'অগ্রিম/নগদ পরিশোধিত',
          },
        ]
      : [];

  await setDoc(docRef, {
    ...due,
    totalAmount: total,
    paidAmount: paid,
    dueAmount: remainingDue,
    status,
    payments: initialPayments,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update supplier due details
 */
export async function updateSupplierDue(
  targetId: string,
  dueId: string,
  data: Partial<SupplierDue>
): Promise<void> {
  const colRef = getSupplierDuesCollection(targetId);
  const docRef = doc(colRef, dueId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('পাইকার দেনা রেকর্ড পাওয়া যায়নি');

  const existing = snap.data() as SupplierDue;
  const total = data.totalAmount !== undefined ? Number(data.totalAmount) : existing.totalAmount;
  const paid = data.paidAmount !== undefined ? Number(data.paidAmount) : existing.paidAmount;
  const remainingDue = Math.max(0, total - paid);
  const status = remainingDue <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due';

  await updateDoc(docRef, {
    ...data,
    totalAmount: total,
    paidAmount: paid,
    dueAmount: remainingDue,
    status,
  });
}

/**
 * Record a payment to supplier (পাইকার দেনা পরিশোধ)
 * Optionally logs to expenses so cash flow / net profit tracks the payment.
 */
export async function paySupplierDue(
  targetId: string,
  dueId: string,
  payAmount: number,
  options?: {
    date?: string;
    paymentMethod?: string;
    notes?: string;
    recordExpense?: boolean;
  }
): Promise<void> {
  const colRef = getSupplierDuesCollection(targetId);
  const docRef = doc(colRef, dueId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('পাইকার দেনা রেকর্ড পাওয়া যায়নি');

  const existing = snap.data() as SupplierDue;
  const payment = Number(payAmount) || 0;
  if (payment <= 0) throw new Error('সঠিক পরিশোধের পরিমাণ দিন');

  const newPaidAmount = (Number(existing.paidAmount) || 0) + payment;
  const totalAmount = Number(existing.totalAmount) || 0;
  const newDueAmount = Math.max(0, totalAmount - newPaidAmount);
  const newStatus = newDueAmount <= 0 ? 'paid' : 'partial';

  const date = options?.date || new Date().toISOString().split('T')[0];
  const paymentMethod = options?.paymentMethod || 'নগদ';
  const notes = options?.notes || `পাইকার বকেয়া পরিশোধ (${existing.supplierName})`;

  let loggedExpenseId: string | undefined;

  // If recordExpense is true (default true), create an expense entry
  if (options?.recordExpense !== false) {
    try {
      loggedExpenseId = await addExpense(targetId, {
        title: `পাইকার দেনা পরিশোধ: ${existing.supplierName}`,
        amount: payment,
        category: 'পাইকার বিল পরিশোধ',
        date,
        paidBy: paymentMethod,
        supplierDueId: dueId,
        notes: notes + (existing.invoiceNo ? ` [চালান: ${existing.invoiceNo}]` : ''),
      });
    } catch (err) {
      console.warn('Could not auto-log supplier payment to expenses:', err);
    }
  }

  const newPaymentRecord: SupplierPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date,
    amount: payment,
    paymentMethod,
    notes,
    expenseId: loggedExpenseId,
  };

  const existingPayments = existing.payments || [];

  await updateDoc(docRef, {
    paidAmount: newPaidAmount,
    dueAmount: newDueAmount,
    status: newStatus,
    payments: [...existingPayments, newPaymentRecord],
  });
}

/**
 * Delete a supplier due record
 */
export async function deleteSupplierDue(targetId: string, dueId: string): Promise<void> {
  const colRef = getSupplierDuesCollection(targetId);
  await deleteDoc(doc(colRef, dueId));
}
