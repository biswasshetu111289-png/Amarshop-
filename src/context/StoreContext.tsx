import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  getProductsCollection,
  getSalesCollection,
  getExpensesCollection,
  getPartnersCollection,
  getSupplierDuesCollection,
  fetchUserShops,
  ensureUserDefaultShop,
  createShop as apiCreateShop,
  requestJoinShop as apiRequestJoinShop,
  updateShopDetails as apiUpdateShopDetails,
  deleteShop as apiDeleteShop,
  addExpense as apiAddExpense,
  updateExpense as apiUpdateExpense,
  deleteExpense as apiDeleteExpense,
  addPartnerInvestor as apiAddPartnerInvestor,
  updatePartnerInvestor as apiUpdatePartnerInvestor,
  addCapitalPayment as apiAddCapitalPayment,
  deletePartnerInvestor as apiDeletePartnerInvestor,
  addSupplierDue as apiAddSupplierDue,
  updateSupplierDue as apiUpdateSupplierDue,
  paySupplierDue as apiPaySupplierDue,
  deleteSupplierDue as apiDeleteSupplierDue,
  isEmailMatch,
} from '../services/storeService';
import {
  Product,
  Sale,
  CustomerDueSummary,
  Shop,
  ShopRole,
  StoreBackupData,
  Expense,
  PartnerInvestor,
  SupplierDue,
} from '../types';
import { restoreBackupIntoShop, checkAndExecuteAutoBackup } from '../services/backupService';

export interface StoreContextType {
  // Active Shop & List
  currentShop: Shop | null;
  shops: Shop[];
  loadingShops: boolean;
  userRole: ShopRole;
  isAdmin: boolean;
  canManage: boolean; // Admin or Manager (can input, edit, delete)
  isViewer: boolean;
  setCurrentShop: (shop: Shop) => void;
  refreshShops: () => Promise<void>;
  createNewShop: (
    name: string,
    description?: string,
    address?: string,
    phone?: string,
    logoUrl?: string
  ) => Promise<Shop>;
  joinShop: (
    inviteCodeOrId: string
  ) => Promise<{ shopId: string; shopName: string; isDirectAdmin?: boolean }>;
  updateShop: (
    shopId: string,
    data: { name: string; description?: string; address?: string; phone?: string; logoUrl?: string }
  ) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  restoreBackup: (
    backupData: StoreBackupData,
    mode?: 'merge' | 'replace'
  ) => Promise<{ restoredProducts: number; restoredSales: number }>;

  // Inventory & Sales
  products: Product[];
  sales: Sale[];
  loadingProducts: boolean;
  loadingSales: boolean;
  customerDues: CustomerDueSummary[];
  totalDuesAmount: number;
  totalProductsCount: number;
  todaySalesAmount: number;
  totalProfitAmount: number;
  grossProfitAmount: number;
  lowStockProducts: Product[];

  // Expenses & Actual Net Profit
  expenses: Expense[];
  loadingExpenses: boolean;
  totalExpensesAmount: number;
  netProfitAmount: number;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<string>;
  updateExpense: (expenseId: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;

  // Partnership & Investors
  partners: PartnerInvestor[];
  loadingPartners: boolean;
  totalCommittedCapital: number;
  totalPaidCapital: number;
  totalCapitalDue: number;
  addPartnerInvestor: (partner: Omit<PartnerInvestor, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePartnerInvestor: (partnerId: string, data: Partial<PartnerInvestor>) => Promise<void>;
  addCapitalPayment: (partnerId: string, amount: number, notes?: string, date?: string) => Promise<void>;
  deletePartnerInvestor: (partnerId: string) => Promise<void>;

  // Wholesaler / Supplier Dues (Accounts Payable)
  supplierDues: SupplierDue[];
  loadingSupplierDues: boolean;
  totalSupplierDuesAmount: number;
  addSupplierDue: (due: Omit<SupplierDue, 'id' | 'createdAt'>) => Promise<string>;
  updateSupplierDue: (dueId: string, data: Partial<SupplierDue>) => Promise<void>;
  paySupplierDue: (
    dueId: string,
    payAmount: number,
    options?: { date?: string; paymentMethod?: string; notes?: string; recordExpense?: boolean }
  ) => Promise<void>;
  deleteSupplierDue: (dueId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  currentShop: null,
  shops: [],
  loadingShops: true,
  userRole: 'admin',
  isAdmin: true,
  canManage: true,
  isViewer: false,
  setCurrentShop: () => {},
  refreshShops: async () => {},
  createNewShop: async () => ({} as Shop),
  joinShop: async () => ({ shopId: '', shopName: '' }),
  updateShop: async () => {},
  deleteShop: async () => {},
  restoreBackup: async () => ({ restoredProducts: 0, restoredSales: 0 }),

  products: [],
  sales: [],
  loadingProducts: true,
  loadingSales: true,
  customerDues: [],
  totalDuesAmount: 0,
  totalProductsCount: 0,
  todaySalesAmount: 0,
  totalProfitAmount: 0,
  grossProfitAmount: 0,
  lowStockProducts: [],

  expenses: [],
  loadingExpenses: true,
  totalExpensesAmount: 0,
  netProfitAmount: 0,
  addExpense: async () => '',
  updateExpense: async () => {},
  deleteExpense: async () => {},

  partners: [],
  loadingPartners: true,
  totalCommittedCapital: 0,
  totalPaidCapital: 0,
  totalCapitalDue: 0,
  addPartnerInvestor: async () => '',
  updatePartnerInvestor: async () => {},
  addCapitalPayment: async () => {},
  deletePartnerInvestor: async () => {},

  supplierDues: [],
  loadingSupplierDues: true,
  totalSupplierDuesAmount: 0,
  addSupplierDue: async () => '',
  updateSupplierDue: async () => {},
  paySupplierDue: async () => {},
  deleteSupplierDue: async () => {},
});

const getUserActiveShopKey = (uid: string) => `amar_business_active_shop_${uid}`;

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShopState] = useState<Shop | null>(null);
  const [loadingShops, setLoadingShops] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);

  // Accounting states: Expenses, Partners, Supplier Dues
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const [partners, setPartners] = useState<PartnerInvestor[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);

  const [supplierDues, setSupplierDues] = useState<SupplierDue[]>([]);
  const [loadingSupplierDues, setLoadingSupplierDues] = useState(true);

  // Switch shop helper - saves active shop ID uniquely per user
  const setCurrentShop = useCallback((shop: Shop) => {
    setCurrentShopState(shop);
    try {
      if (user?.uid) {
        localStorage.setItem(getUserActiveShopKey(user.uid), shop.id);
      }
    } catch {
      // ignore
    }
  }, [user?.uid]);

  // Fetch / initialize shops for the authenticated user
  const refreshShops = useCallback(async () => {
    if (!user) {
      setShops([]);
      setCurrentShopState(null);
      setLoadingShops(false);
      return;
    }

    try {
      setLoadingShops(true);
      const userShops = await fetchUserShops(user.uid, user.email || undefined);

      if (userShops.length === 0) {
        // Initialize default new shop for user as Admin
        const defaultShop = await ensureUserDefaultShop(
          user.uid,
          user.email || 'user@shop.com',
          user.displayName ? `${user.displayName}-এর দোকান` : 'আমার প্রধান দোকান'
        );
        setShops([defaultShop]);
        setCurrentShop(defaultShop);
      } else {
        setShops(userShops);

        // Restore previously selected shop if valid for this user
        const savedShopId = user?.uid
          ? localStorage.getItem(getUserActiveShopKey(user.uid))
          : null;
        const matched = userShops.find((s) => s.id === savedShopId);
        setCurrentShop(matched || userShops[0]);
      }
    } catch (err) {
      console.error('Error refreshing shops:', err);
    } finally {
      setLoadingShops(false);
    }
  }, [user, setCurrentShop]);

  useEffect(() => {
    refreshShops();
  }, [refreshShops]);

  // Create new shop handler
  const createNewShop = useCallback(
    async (
      name: string,
      description?: string,
      address?: string,
      phone?: string,
      logoUrl?: string
    ) => {
      if (!user) throw new Error('লগইন প্রয়োজন');
      const shop = await apiCreateShop(user.uid, user.email || '', {
        name,
        description,
        address,
        phone,
        logoUrl,
      });
      await refreshShops();
      setCurrentShop(shop);
      return shop;
    },
    [user, refreshShops, setCurrentShop]
  );

  // Request to join shop
  const joinShop = useCallback(
    async (inviteCodeOrId: string) => {
      if (!user) throw new Error('লগইন প্রয়োজন');
      const res = await apiRequestJoinShop(inviteCodeOrId, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'ইউজার',
      });
      // ONLY switch active shop immediately if user is direct admin/owner!
      // For pending member requests, user stays in their own active shop until admin approves.
      if (res.isDirectAdmin && res.shopId) {
        try {
          localStorage.setItem(getUserActiveShopKey(user.uid), res.shopId);
        } catch {
          // ignore
        }
      }
      await refreshShops();
      return res;
    },
    [user, refreshShops]
  );

  // Update shop details (Name, Address, Phone, Description, LogoUrl) - Admin only
  const updateShop = useCallback(
    async (
      shopId: string,
      data: { name: string; description?: string; address?: string; phone?: string; logoUrl?: string }
    ) => {
      if (!user) throw new Error('লগইন প্রয়োজন');
      if (!data.name.trim()) throw new Error('দোকানের নাম খালি রাখা যাবে না');

      // Check admin privileges for this shop
      const target = shops.find((s) => s.id === shopId) || (currentShop?.id === shopId ? currentShop : null);
      if (target) {
        const isShopAdmin =
          target.ownerId === user.uid ||
          target.members?.[user.uid]?.role === 'admin' ||
          (user.email &&
            Object.values(target.members || {}).some(
              (m) => m.email?.toLowerCase() === user.email?.toLowerCase() && m.role === 'admin'
            ));

        if (!isShopAdmin) {
          throw new Error('শুধুমাত্র এডমিন দোকানের নাম বা তথ্য পরিবর্তন করতে পারবেন');
        }
      }

      await apiUpdateShopDetails(shopId, data);

      // Instantly reflect in local state
      setShops((prev) =>
        prev.map((s) =>
          s.id === shopId
            ? {
                ...s,
                name: data.name.trim(),
                description: data.description?.trim() || '',
                address: data.address?.trim() || '',
                phone: data.phone?.trim() || '',
                logoUrl: data.logoUrl !== undefined ? data.logoUrl : s.logoUrl,
              }
            : s
        )
      );

      if (currentShop && currentShop.id === shopId) {
        setCurrentShopState((prev) =>
          prev
            ? {
                ...prev,
                name: data.name.trim(),
                description: data.description?.trim() || '',
                address: data.address?.trim() || '',
                phone: data.phone?.trim() || '',
                logoUrl: data.logoUrl !== undefined ? data.logoUrl : prev.logoUrl,
              }
            : null
        );
      }
    },
    [user, shops, currentShop]
  );

  // Delete shop - Admin/Owner only
  const deleteShop = useCallback(
    async (shopId: string) => {
      if (!user) throw new Error('লগইন প্রয়োজন');
      await apiDeleteShop(shopId, user.uid);

      try {
        const key = `user_shops_${user.uid}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          localStorage.setItem(key, JSON.stringify(ids.filter((id) => id !== shopId)));
        }
        const activeKey = getUserActiveShopKey(user.uid);
        if (localStorage.getItem(activeKey) === shopId) {
          localStorage.removeItem(activeKey);
        }
      } catch (e) {
        console.warn('Storage clean error:', e);
      }

      const remaining = shops.filter((s) => s.id !== shopId);
      setShops(remaining);
      if (currentShop?.id === shopId) {
        if (remaining.length > 0) {
          setCurrentShop(remaining[0]);
        } else {
          const defaultShop = await ensureUserDefaultShop(
            user.uid,
            user.email || 'user@shop.com',
            user.displayName ? `${user.displayName}-এর দোকান` : 'আমার প্রধান দোকান'
          );
          setShops([defaultShop]);
          setCurrentShop(defaultShop);
        }
      }
    },
    [user, shops, currentShop, setCurrentShop]
  );

  // Restore backup into current shop
  const restoreBackup = useCallback(
    async (backupData: StoreBackupData, mode: 'merge' | 'replace' = 'merge') => {
      if (!currentShop?.id) throw new Error('কোনো সক্রিয় দোকান নির্বাচন করা নেই');
      return await restoreBackupIntoShop(currentShop.id, backupData, mode);
    },
    [currentShop?.id]
  );

  // Automatic Background Backup Trigger (Daily / Weekly)
  useEffect(() => {
    if (!loadingProducts && !loadingSales && currentShop?.id) {
      if (products.length > 0 || sales.length > 0) {
        checkAndExecuteAutoBackup(
          currentShop.id,
          currentShop.name,
          user?.email,
          products,
          sales,
          {
            name: currentShop.name,
            address: currentShop.address,
            phone: currentShop.phone,
            description: currentShop.description,
            logoUrl: currentShop.logoUrl,
          }
        );
      }
    }
  }, [loadingProducts, loadingSales, currentShop, user?.email, products, sales]);

  // Real-time listener for currentShop doc (keeps members & join requests updated in real-time)
  useEffect(() => {
    if (!currentShop?.id) return;
    const shopDocRef = doc(db, 'shops', currentShop.id);
    const unsub = onSnapshot(shopDocRef, (snap) => {
      if (snap.exists()) {
        const updatedShop = { id: snap.id, ...(snap.data() as Omit<Shop, 'id'>) };
        setCurrentShopState(updatedShop);
        setShops((prev) => prev.map((s) => (s.id === updatedShop.id ? updatedShop : s)));
      }
    });
    return () => unsub();
  }, [currentShop?.id]);

  // Derive current user's role in active shop
  const userRole: ShopRole = useMemo(() => {
    if (!user || !currentShop) return 'viewer';
    if (currentShop.ownerId === user.uid) return 'admin';
    const member = currentShop.members?.[user.uid];
    if (member) return member.role;
    // Check by email in members
    if (user.email && currentShop.members) {
      const match = Object.values(currentShop.members).find((m) =>
        isEmailMatch(m.email, user.email)
      );
      if (match) return match.role;
    }
    // Check if user email matches shop ownerEmail
    if (isEmailMatch(currentShop.ownerEmail, user.email)) {
      return 'admin';
    }
    return 'viewer';
  }, [user, currentShop]);

  const isAdmin = userRole === 'admin';
  const canManage = userRole === 'admin' || userRole === 'manager';
  const isViewer = userRole === 'viewer';

  // Target collection ID for products & sales
  const targetStoreId = currentShop?.id || user?.uid || '';

  // Subscribe to products of current shop
  useEffect(() => {
    if (!targetStoreId) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    const q = query(getProductsCollection(targetStoreId), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || '',
            qty: Number(data.qty) || 0,
            unit: data.unit || 'পিস',
            buyPrice: Number(data.buyPrice) || 0,
            sellPrice: Number(data.sellPrice) || 0,
            category: data.category || '',
            packagingPrice: data.packagingPrice ? Number(data.packagingPrice) : 0,
            color: data.color || '',
            colors: data.colors || [],
            createdAt: data.createdAt,
          });
        });
        setProducts(items);
        setLoadingProducts(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, [targetStoreId]);

  // Subscribe to sales of current shop
  useEffect(() => {
    if (!targetStoreId) {
      setSales([]);
      setLoadingSales(false);
      return;
    }

    setLoadingSales(true);
    const q = query(getSalesCollection(targetStoreId), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Sale[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            productId: data.productId || '',
            productName: data.productName || '',
            qty: Number(data.qty) || 0,
            unit: data.unit || 'পিস',
            price: Number(data.price) || 0,
            total: Number(data.total) || 0,
            date: data.date || '',
            payment: data.payment === 'বাকি' ? 'বাকি' : data.payment === 'আংশিক' ? 'আংশিক' : 'নগদ',
            paymentMethod: data.paymentMethod || 'নগদ',
            paidAmount: Number(data.paidAmount ?? (data.payment === 'বাকি' ? 0 : data.total)),
            dueAmount: Number(data.dueAmount ?? (data.payment === 'বাকি' ? data.total : 0)),
            customer: data.customer || '',
            customerPhone: data.customerPhone || '',
            packagingPrice: data.packagingPrice ? Number(data.packagingPrice) : 0,
            color: data.color || '',
            notes: data.notes || '',
            collectionDate: data.collectionDate || '',
            collectionNotes: data.collectionNotes || '',
            createdAt: data.createdAt,
          });
        });
        setSales(items);
        setLoadingSales(false);
      },
      (error) => {
        console.error('Error fetching sales:', error);
        setLoadingSales(false);
      }
    );

    return () => unsubscribe();
  }, [targetStoreId]);

  // Subscribe to expenses of current shop
  useEffect(() => {
    if (!targetStoreId) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }

    setLoadingExpenses(true);
    const q = query(getExpensesCollection(targetStoreId), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Expense[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            title: data.title || '',
            amount: Number(data.amount) || 0,
            category: data.category || 'অন্যান্য খরচ',
            date: data.date || '',
            paidBy: data.paidBy || '',
            notes: data.notes || '',
            supplierDueId: data.supplierDueId || '',
            createdAt: data.createdAt,
          });
        });
        setExpenses(items);
        setLoadingExpenses(false);
      },
      (error) => {
        console.error('Error fetching expenses:', error);
        setLoadingExpenses(false);
      }
    );

    return () => unsubscribe();
  }, [targetStoreId]);

  // Subscribe to partners/investors of current shop
  useEffect(() => {
    if (!targetStoreId) {
      setPartners([]);
      setLoadingPartners(false);
      return;
    }

    setLoadingPartners(true);
    const q = query(getPartnersCollection(targetStoreId), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: PartnerInvestor[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data.name || '',
            phone: data.phone || '',
            role: data.role || 'partner',
            committedAmount: Number(data.committedAmount) || 0,
            paidAmount: Number(data.paidAmount) || 0,
            dueAmount: Number(data.dueAmount) || 0,
            profitShareRatio: Number(data.profitShareRatio) || 0,
            contributions: data.contributions || [],
            notes: data.notes || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setPartners(items);
        setLoadingPartners(false);
      },
      (error) => {
        console.error('Error fetching partners:', error);
        setLoadingPartners(false);
      }
    );

    return () => unsubscribe();
  }, [targetStoreId]);

  // Subscribe to supplier dues of current shop
  useEffect(() => {
    if (!targetStoreId) {
      setSupplierDues([]);
      setLoadingSupplierDues(false);
      return;
    }

    setLoadingSupplierDues(true);
    const q = query(getSupplierDuesCollection(targetStoreId), orderBy('purchaseDate', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SupplierDue[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            supplierName: data.supplierName || '',
            phone: data.phone || '',
            invoiceNo: data.invoiceNo || '',
            description: data.description || '',
            totalAmount: Number(data.totalAmount) || 0,
            paidAmount: Number(data.paidAmount) || 0,
            dueAmount: Number(data.dueAmount) || 0,
            purchaseDate: data.purchaseDate || '',
            dueDate: data.dueDate || '',
            status: data.status || 'due',
            payments: data.payments || [],
            notes: data.notes || '',
            createdAt: data.createdAt,
          });
        });
        setSupplierDues(items);
        setLoadingSupplierDues(false);
      },
      (error) => {
        console.error('Error fetching supplier dues:', error);
        setLoadingSupplierDues(false);
      }
    );

    return () => unsubscribe();
  }, [targetStoreId]);

  // Product buy price map for calculating profit
  const productBuyPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.id, p.buyPrice + (p.packagingPrice || 0));
      map.set(p.name.trim().toLowerCase(), p.buyPrice + (p.packagingPrice || 0));
    }
    return map;
  }, [products]);

  // Customer dues summary
  const { customerDues, totalDuesAmount } = useMemo(() => {
    const duesMap = new Map<string, Sale[]>();
    let totalDues = 0;

    for (const s of sales) {
      const remainingDue =
        s.dueAmount !== undefined ? Number(s.dueAmount) : s.payment === 'বাকি' ? Number(s.total) : 0;
      if (remainingDue > 0) {
        const cust = s.customer?.trim() || 'নামহীন ক্রেতা';
        if (!duesMap.has(cust)) {
          duesMap.set(cust, []);
        }
        duesMap.get(cust)!.push(s);
        totalDues += remainingDue;
      }
    }

    const summaries: CustomerDueSummary[] = [];
    duesMap.forEach((custSales, customer) => {
      const sum = custSales.reduce((acc, curr) => {
        const d =
          curr.dueAmount !== undefined
            ? Number(curr.dueAmount)
            : curr.payment === 'বাকি'
            ? Number(curr.total)
            : 0;
        return acc + d;
      }, 0);
      if (sum > 0) {
        summaries.push({
          customer,
          phone: custSales.find((s) => s.customerPhone)?.customerPhone || '',
          totalDue: sum,
          sales: custSales,
          lastDate: custSales[0]?.date || '',
        });
      }
    });

    summaries.sort((a, b) => b.totalDue - a.totalDue);
    return { customerDues: summaries, totalDuesAmount: totalDues };
  }, [sales]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todaySalesAmount = useMemo(() => {
    return sales
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales, todayStr]);

  // Gross profit from product sales
  const totalProfitAmount = useMemo(() => {
    let profit = 0;
    for (const s of sales) {
      let totalCostPerUnit = 0;
      if (s.productId && productBuyPriceMap.has(s.productId)) {
        totalCostPerUnit = productBuyPriceMap.get(s.productId)!;
      } else if (s.productName && productBuyPriceMap.has(s.productName.trim().toLowerCase())) {
        totalCostPerUnit = productBuyPriceMap.get(s.productName.trim().toLowerCase())!;
      }
      const itemProfit = (s.price - totalCostPerUnit) * s.qty;
      profit += itemProfit;
    }
    return profit;
  }, [sales, productBuyPriceMap]);

  // Expenses & Net profit calculations
  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const grossProfitAmount = totalProfitAmount;
  const netProfitAmount = useMemo(() => {
    return grossProfitAmount - totalExpensesAmount;
  }, [grossProfitAmount, totalExpensesAmount]);

  // Wholesaler / Supplier dues total
  const totalSupplierDuesAmount = useMemo(() => {
    return supplierDues.reduce((sum, d) => sum + (Number(d.dueAmount) || 0), 0);
  }, [supplierDues]);

  // Partner capital calculations
  const { totalCommittedCapital, totalPaidCapital, totalCapitalDue } = useMemo(() => {
    let comm = 0;
    let paid = 0;
    let due = 0;
    for (const p of partners) {
      comm += Number(p.committedAmount) || 0;
      paid += Number(p.paidAmount) || 0;
      due += Number(p.dueAmount) || 0;
    }
    return {
      totalCommittedCapital: comm,
      totalPaidCapital: paid,
      totalCapitalDue: due,
    };
  }, [partners]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.qty <= 5);
  }, [products]);

  // Accounting Action Callbacks
  const addExpense = useCallback(
    async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      return await apiAddExpense(targetStoreId, expense);
    },
    [targetStoreId]
  );

  const updateExpense = useCallback(
    async (expenseId: string, data: Partial<Expense>) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiUpdateExpense(targetStoreId, expenseId, data);
    },
    [targetStoreId]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiDeleteExpense(targetStoreId, expenseId);
    },
    [targetStoreId]
  );

  const addPartnerInvestor = useCallback(
    async (partner: Omit<PartnerInvestor, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      return await apiAddPartnerInvestor(targetStoreId, partner);
    },
    [targetStoreId]
  );

  const updatePartnerInvestor = useCallback(
    async (partnerId: string, data: Partial<PartnerInvestor>) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiUpdatePartnerInvestor(targetStoreId, partnerId, data);
    },
    [targetStoreId]
  );

  const addCapitalPayment = useCallback(
    async (partnerId: string, amount: number, notes?: string, date?: string) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiAddCapitalPayment(targetStoreId, partnerId, amount, notes, date);
    },
    [targetStoreId]
  );

  const deletePartnerInvestor = useCallback(
    async (partnerId: string) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiDeletePartnerInvestor(targetStoreId, partnerId);
    },
    [targetStoreId]
  );

  const addSupplierDue = useCallback(
    async (due: Omit<SupplierDue, 'id' | 'createdAt'>) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      return await apiAddSupplierDue(targetStoreId, due);
    },
    [targetStoreId]
  );

  const updateSupplierDue = useCallback(
    async (dueId: string, data: Partial<SupplierDue>) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiUpdateSupplierDue(targetStoreId, dueId, data);
    },
    [targetStoreId]
  );

  const paySupplierDue = useCallback(
    async (
      dueId: string,
      payAmount: number,
      options?: { date?: string; paymentMethod?: string; notes?: string; recordExpense?: boolean }
    ) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiPaySupplierDue(targetStoreId, dueId, payAmount, options);
    },
    [targetStoreId]
  );

  const deleteSupplierDue = useCallback(
    async (dueId: string) => {
      if (!targetStoreId) throw new Error('দোকান সিলেক্ট করা নেই');
      await apiDeleteSupplierDue(targetStoreId, dueId);
    },
    [targetStoreId]
  );

  const value: StoreContextType = {
    currentShop,
    shops,
    loadingShops,
    userRole,
    isAdmin,
    canManage,
    isViewer,
    setCurrentShop,
    refreshShops,
    createNewShop,
    joinShop,
    updateShop,
    deleteShop,
    restoreBackup,

    products,
    sales,
    loadingProducts,
    loadingSales,
    customerDues,
    totalDuesAmount,
    totalProductsCount: products.length,
    todaySalesAmount,
    totalProfitAmount,
    grossProfitAmount,
    lowStockProducts,

    // Expenses
    expenses,
    loadingExpenses,
    totalExpensesAmount,
    netProfitAmount,
    addExpense,
    updateExpense,
    deleteExpense,

    // Partners & Investors
    partners,
    loadingPartners,
    totalCommittedCapital,
    totalPaidCapital,
    totalCapitalDue,
    addPartnerInvestor,
    updatePartnerInvestor,
    addCapitalPayment,
    deletePartnerInvestor,

    // Supplier Dues
    supplierDues,
    loadingSupplierDues,
    totalSupplierDuesAmount,
    addSupplierDue,
    updateSupplierDue,
    paySupplierDue,
    deleteSupplierDue,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => useContext(StoreContext);
