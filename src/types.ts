import { Timestamp } from 'firebase/firestore';

export type ProductUnit = 'পিস' | 'কেজি' | 'লিটার' | 'ডজন' | 'বক্স' | 'কার্টন' | 'ব্যাগ' | 'মিটার';

export const PRODUCT_UNITS: ProductUnit[] = [
  'পিস',
  'কেজি',
  'লিটার',
  'ডজন',
  'বক্স',
  'কার্টন',
  'ব্যাগ',
  'মিটার',
];

export type ShopRole = 'admin' | 'manager' | 'viewer';

export interface ShopMember {
  uid: string;
  email: string;
  displayName?: string;
  role: ShopRole;
  joinedAt: string;
}

export interface ShopJoinRequest {
  uid: string;
  email: string;
  displayName?: string;
  requestedAt: string;
  status: 'pending';
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  ownerId: string;
  ownerEmail: string;
  inviteCode: string;
  createdAt: string;
  logoUrl?: string;
  members: Record<string, ShopMember>;
  joinRequests?: Record<string, ShopJoinRequest>;
}

export interface StoreBackupData {
  version: string;
  exportedAt: string;
  shopName: string;
  shopId: string;
  userEmail?: string | null;
  totalProducts: number;
  totalSales: number;
  products: Product[];
  sales: Sale[];
  shopDetails?: {
    name?: string;
    address?: string;
    phone?: string;
    description?: string;
    logoUrl?: string;
  };
}

export type AutoBackupFrequency = 'off' | 'daily' | 'weekly';

export interface AutoBackupSnapshot {
  id: string;
  timestamp: string;
  shopId: string;
  shopName: string;
  productsCount: number;
  salesCount: number;
  data: StoreBackupData;
}

export interface Product {
  id: string;
  name: string;
  qty: number;
  unit: ProductUnit | string;
  buyPrice: number;
  sellPrice: number;
  category?: string;
  packagingPrice?: number; // প্যাকেজিং খরচ (৳)
  color?: string; // কালার অপশন (e.g. লাল, নীল, কালো ইত্যাদি)
  colors?: string[];
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | string;
}

export type PaymentType = 'নগদ' | 'বাকি' | 'আংশিক';

export type PaymentMethod =
  | 'নগদ'
  | 'বিকাশ'
  | 'নগদ পে'
  | 'রকেট'
  | 'কার্ড'
  | 'ব্যাংক'
  | 'অন্যান্য'
  | 'Cash'
  | 'bKash'
  | 'Nagad'
  | 'Rocket'
  | 'Card'
  | 'Bank Transfer'
  | 'Other';

export const PAYMENT_METHODS: Array<{ id: string; nameBn: string; nameEn: string }> = [
  { id: 'নগদ', nameBn: 'নগদ (Cash)', nameEn: 'Cash' },
  { id: 'বিকাশ', nameBn: 'বিকাশ (bKash)', nameEn: 'bKash' },
  { id: 'নগদ পে', nameBn: 'নগদ পে (Nagad)', nameEn: 'Nagad' },
  { id: 'রকেট', nameBn: 'রকেট (Rocket)', nameEn: 'Rocket' },
  { id: 'কার্ড', nameBn: 'কার্ড (Card)', nameEn: 'Card' },
  { id: 'ব্যাংক', nameBn: 'ব্যাংক (Bank)', nameEn: 'Bank Transfer' },
  { id: 'অন্যান্য', nameBn: 'অন্যান্য (Other)', nameEn: 'Other' },
];

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unit: ProductUnit | string;
  price: number;
  total: number;
  date: string; // YYYY-MM-DD
  payment: PaymentType;
  paymentMethod?: string; // Type of Payment: নগদ, বিকাশ, কার্ড, ইত্যাদি
  paidAmount?: number; // আংশিক বা সম্পূর্ণ পরিশোধিত টাকা
  dueAmount?: number; // অবশিষ্ট বাকি টাকা
  customer?: string;
  customerPhone?: string; // ক্রেতার ফোন নম্বর (ঐচ্ছিক)
  packagingPrice?: number;
  color?: string;
  notes?: string;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | string;
}

export interface CustomerDueSummary {
  customer: string;
  phone?: string;
  totalDue: number;
  sales: Sale[];
  lastDate: string;
}

// ---------------------------------------------
// Expense & Cost Tracker Types (খরচের খাতা)
// ---------------------------------------------
export const EXPENSE_CATEGORIES = [
  'দোকান ভাড়া',
  'কর্মচারী বেতন',
  'বিদ্যুৎ ও ইউটিলিটি',
  'পণ্য ডেলিভারি/কুরিয়ার',
  'যাতায়াত ও ভাড়া',
  'নাস্তা ও আপ্যায়ন',
  'প্যাকেজিং সামগ্রী',
  'পাইকার বিল পরিশোধ',
  'মেরামত ও রক্ষণাবেক্ষণ',
  'অন্যান্য খরচ',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory | string;
  date: string; // YYYY-MM-DD
  paidBy?: string; // e.g. ক্যাশ কাউন্টার, পার্টনার ১, পার্টনার ২
  notes?: string;
  supplierDueId?: string; // Linked supplier due if this was a supplier payout
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | string;
}

// ---------------------------------------------
// Partnership & Investor Management Types (পার্টনারশিপ ও ইনভেস্টর হিসাব)
// ---------------------------------------------
export interface CapitalContribution {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface PartnerInvestor {
  id: string;
  name: string;
  phone?: string;
  role: 'partner' | 'investor'; // পার্টনার vs ইনভেস্টর
  committedAmount: number; // চুক্তিবদ্ধ বা প্রতিশ্রুত মূলধন (যেমন ৳১০,০০০)
  paidAmount: number; // এ পর্যন্ত জমা দেওয়া মূলধন (যেমন ৳৫,০০০)
  dueAmount: number; // বাকি ইনভেস্টমেন্ট মূলধন (যেমন ৳৫,০০০)
  profitShareRatio?: number; // প্রফিট শেয়ার অনুপাত % (যেমন ৫০%)
  contributions?: CapitalContribution[]; // আংশিক কিস্তি জমার হিস্ট্রি
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------
// Supplier / Wholesaler Accounts Payable (পাইকার / হোলসেলার দেনা খাতা)
// ---------------------------------------------
export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  expenseId?: string; // Linked expense ID if auto-logged
}

export interface SupplierDue {
  id: string;
  supplierName: string; // পাইকার / হোলসেলার / মহাজনের নাম
  phone?: string;
  invoiceNo?: string; // চালান বা মেমো নম্বর
  description?: string; // বাকিতে নেওয়া মালের বিবরণ (যেমন ৫০ পিস শার্ট)
  totalAmount: number; // মোট মালের দাম (৳)
  paidAmount: number; // পরিশোধিত টাকা (৳)
  dueAmount: number; // পাইকার পাবে / বকেয়া দেনা (৳)
  purchaseDate: string; // ক্রয়ের তারিখ (YYYY-MM-DD)
  dueDate?: string; // পরিশোধের প্রতিশ্রুত তারিখ (ঐচ্ছিক)
  status: 'due' | 'partial' | 'paid';
  payments?: SupplierPayment[];
  notes?: string;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | string;
}
