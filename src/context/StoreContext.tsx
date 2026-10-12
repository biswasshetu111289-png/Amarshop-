import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  getProductsCollection,
  getSalesCollection,
  fetchUserShops,
  ensureUserDefaultShop,
  createShop as apiCreateShop,
  requestJoinShop as apiRequestJoinShop,
  updateShopDetails as apiUpdateShopDetails,
  isEmailMatch,
} from '../services/storeService';
import { Product, Sale, CustomerDueSummary, Shop, ShopRole, StoreBackupData } from '../types';
import { restoreBackupIntoShop, checkAndExecuteAutoBackup } from '../services/backupService';

interface StoreContextType {
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
  lowStockProducts: Product[];
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
  lowStockProducts: [],
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

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.qty <= 5);
  }, [products]);

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
    lowStockProducts,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => useContext(StoreContext);
