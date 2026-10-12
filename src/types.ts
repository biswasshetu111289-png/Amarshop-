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
