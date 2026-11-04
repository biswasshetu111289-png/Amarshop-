import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { deleteSale, editSale } from '../services/storeService';
import { SaleDetailsModal } from './SaleDetailsModal';
import { InvoiceModal } from './InvoiceModal';
import { Sale, ProductUnit, PaymentType, PAYMENT_METHODS } from '../types';
import {
  formatCurrency,
  formatQty,
  formatBengaliDate,
  formatNumber,
  formatUnit,
  formatPaymentMethod,
  getTodayString,
} from '../utils/formatters';
import {
  Package,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
  Store,
  Receipt,
  Building2,
  Users,
  Coins,
  Edit2,
  Check,
  X,
  Palette,
  User,
  Phone,
  BarChart3,
  Scale,
} from 'lucide-react';
import { NavTab } from './BottomNav';
import { DuesSubTab } from './CreditDuesView';

interface DashboardViewProps {
  onNavigate: (
    tab: NavTab,
    subTab?: DuesSubTab,
    stockFilter?: 'available' | 'all' | 'zero'
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    currentShop,
    userRole,
    canManage,
    isViewer,
    products,
    totalProductsCount,
    todaySalesAmount,
    totalDuesAmount,
    totalProfitAmount,
    grossProfitAmount,
    netProfitAmount,
    totalInventoryBuyValue,
    totalExpensesAmount,
    totalSupplierDuesAmount,
    totalCommittedCapital,
    totalPaidCapital,
    totalCapitalDue,
    partners,
    supplierDues,
    lowStockProducts,
    sales,
  } = useStore();
  const { language, t } = useLanguage();
  const { activeTheme, themeId, customBg } = useTheme();

  const targetId = currentShop?.id || user?.uid || '';

  // Sale Modals State
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Edit Sale Form State
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPayment, setEditPayment] = useState<PaymentType>('নগদ');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('নগদ');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editPackagingPrice, setEditPackagingPrice] = useState('');
  const [editColor, setEditColor] = useState('');
  const [updatingSale, setUpdatingSale] = useState(false);

  // Calculations for Stock & Today's Cash/Due Breakdown
  const availableStockQty = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.qty > 0 ? Number(p.qty) : 0), 0);
  }, [products]);

  const inStockProductsCount = useMemo(() => {
    return products.filter((p) => p.qty > 0).length;
  }, [products]);

  const zeroStockProductsCount = useMemo(() => {
    return products.filter((p) => p.qty <= 0).length;
  }, [products]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todayCashSales = useMemo(() => {
    return sales
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + (s.payment === 'নগদ' ? s.total : Number(s.paidAmount || 0)), 0);
  }, [sales, todayStr]);

  const todayDueSales = useMemo(() => {
    return sales
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + (s.payment === 'বাকি' ? s.total : Number(s.dueAmount || 0)), 0);
  }, [sales, todayStr]);

  const recentSales = sales.slice(0, 5);

  // Dashboard Partner Equalization Balances (যৌথ মূলধন ও ক্যাপিটাল ব্যালেন্স)
  const dashboardPartnerBalances = useMemo(() => {
    const totalJoint = partners.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    return partners.map((p) => {
      const share = p.profitShareRatio || (partners.length > 0 ? 100 / partners.length : 50);
      const equalizedTarget = Math.round((totalJoint * share) / 100);
      const balance = (Number(p.paidAmount) || 0) - equalizedTarget;
      return {
        id: p.id,
        name: p.name,
        share,
        paid: Number(p.paidAmount) || 0,
        equalizedTarget,
        balance,
      };
    });
  }, [partners]);

  const openEditModal = (sale: Sale) => {
    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র এডমিন বা ম্যানেজার বিক্রির রেকর্ড সংশোধন করতে পারেন'
          : 'Only Admin or Manager can edit sales records',
        'warning'
      );
      return;
    }
    setDetailSale(null);
    setEditingSale(sale);
    setEditQty(String(sale.qty));
    setEditPrice(String(sale.price));
    setEditDate(sale.date || getTodayString());
    setEditPayment(sale.payment || 'নগদ');
    setEditPaymentMethod(sale.paymentMethod || 'নগদ');
    setEditPaidAmount(
      sale.paidAmount !== undefined
        ? String(sale.paidAmount)
        : String(sale.payment === 'নগদ' ? sale.total : 0)
    );
    setEditCustomer(sale.customer || '');
    setEditCustomerPhone(sale.customerPhone || '');
    setEditPackagingPrice(sale.packagingPrice ? String(sale.packagingPrice) : '');
    setEditColor(sale.color || '');
  };

  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetId || !editingSale) return;

    const qtyNum = parseFloat(editQty);
    const priceNum = parseFloat(editPrice);
    const packPriceNum = editPackagingPrice ? parseFloat(editPackagingPrice) : 0;

    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast(language === 'bn' ? 'সঠিক বিক্রির পরিমাণ দিন' : 'Enter valid quantity', 'warning');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      showToast(language === 'bn' ? 'সঠিক একক মূল্য দিন' : 'Enter valid unit price', 'warning');
      return;
    }

    const totalAmount = qtyNum * priceNum;
    let finalPaid = 0;
    let finalDue = 0;

    if (editPayment === 'নগদ') {
      finalPaid = totalAmount;
      finalDue = 0;
    } else if (editPayment === 'বাকি') {
      finalPaid = 0;
      finalDue = totalAmount;
    } else {
      const parsedPaid = parseFloat(editPaidAmount) || 0;
      finalPaid = parsedPaid;
      finalDue = Math.max(0, totalAmount - parsedPaid);
    }

    setUpdatingSale(true);
    try {
      await editSale(
        targetId,
        editingSale.id,
        {
          productId: editingSale.productId,
          productName: editingSale.productName,
          qty: qtyNum,
          unit: editingSale.unit,
          price: priceNum,
          total: totalAmount,
          date: editDate,
          payment: editPayment,
          paymentMethod: editPaymentMethod || 'নগদ',
          paidAmount: finalPaid,
          dueAmount: finalDue,
          customer: editCustomer.trim(),
          customerPhone: editCustomerPhone.trim(),
          packagingPrice: packPriceNum,
          color: editColor.trim(),
        },
        editingSale
      );

      showToast(
        language === 'bn'
          ? 'বিক্রির রেকর্ড ও স্টক সফলভাবে আপডেট হয়েছে'
          : 'Sale updated and stock adjusted successfully',
        'success'
      );
      setEditingSale(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'বিক্রি আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setUpdatingSale(false);
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!user || !targetId) return;
    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র এডমিন বা ম্যানেজার বিক্রির রেকর্ড মুছতে পারেন'
          : 'Only Admin or Manager can delete sales records',
        'warning'
      );
      return;
    }

    const confirmed = window.confirm(
      language === 'bn'
        ? `আপনি কি এই বিক্রির রেকর্ডটি মুছে ফেলতে চান? পণ্যটির স্টক (${sale.qty} ${sale.unit}) পুনরায় ফেরত যোগ করা হবে।`
        : `Delete this sale record? Product stock will be replenished.`
    );
    if (!confirmed) return;

    try {
      await deleteSale(targetId, sale.id, sale.productId, sale.qty);
      showToast(
        language === 'bn'
          ? 'বিক্রির রেকর্ড মুছে স্টক পুনরায় ফেরত দেওয়া হয়েছে'
          : 'Sale deleted and stock restored',
        'info'
      );
      setDetailSale(null);
    } catch (err: any) {
      console.error(err);
      showToast('মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  const roleText =
    userRole === 'admin'
      ? (language === 'bn' ? 'এডমিন' : 'Admin')
      : userRole === 'manager'
      ? (language === 'bn' ? 'ম্যানেজার' : 'Manager')
      : (language === 'bn' ? 'ভিউয়ার' : 'Viewer');

  const bannerBgClass = themeId === 'custom' ? 'text-white' : activeTheme.headerBgClass;
  const bannerStyle = themeId === 'custom' ? { backgroundColor: customBg } : {};

  return (
    <div className="space-y-4 pb-4">
      {/* Welcome Banner / Today Overview with Current Shop Name */}
      <div className={`${bannerBgClass} rounded-2xl p-4 text-white shadow-md flex items-center justify-between transition-colors duration-300`} style={bannerStyle}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
            <img
              src={currentShop?.logoUrl || '/assets/aistudio/file_00000000312481fabfb649d53c7c85c6_7cd0cbb9.png'}
              alt={currentShop?.name || 'My Business'}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium">
              <span>{currentShop?.name || (language === 'bn' ? 'আমার দোকান' : 'My Shop')}</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-bold">
                {roleText}
              </span>
            </div>
            <h2 className="text-xl font-bold mt-0.5">
              {language === 'bn' ? 'ব্যবসায়িক পরিস্থিতি' : 'Business Overview'}
            </h2>
            <p className="text-xs text-blue-100/90 mt-0.5">
              {language === 'bn'
                ? 'আজকের বিক্রি, লাভ ও মজুদের লাইভ আপডেট'
                : "Today's sales, profit & inventory live update"}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('sale')}
          className="px-3.5 py-2 bg-white text-blue-800 hover:bg-blue-50 active:scale-95 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
        >
          <span>{language === 'bn' ? 'নতুন বিক্রি' : 'New Sale'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Stat Cards in 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Total Products */}
        {/* Card 1: Available Product Stock (বর্তমান এভেইলেবল স্টক) */}
        <div
          onClick={() => onNavigate('stock', undefined, 'available')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{language === 'bn' ? 'এভেইলেবল স্টক' : 'Active Stock'}</span>
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-slate-900 flex items-baseline gap-1.5">
                <span>{formatNumber(inStockProductsCount, language)}</span>
                <span className="text-xs font-medium text-slate-500">
                  {language === 'bn' ? 'ধরনের পণ্য হাতে আছে' : 'products available'}
                </span>
              </div>

              <div className="mt-1.5 flex flex-col gap-1">
                {/* Total available units */}
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center justify-between">
                  <span>{language === 'bn' ? 'মোট মজুদ পরিমাণ:' : 'Total Units:'}</span>
                  <span className="font-bold">
                    {formatNumber(availableStockQty, language)} {language === 'bn' ? 'পিস/একক' : 'units'}
                  </span>
                </span>

                {/* Total Buy Value for Admin/Manager */}
                {!isViewer && (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center justify-between">
                    <span>{language === 'bn' ? 'মজুদ ক্রয়মূল্য:' : 'Buy Value:'}</span>
                    <span className="font-bold">{formatCurrency(totalInventoryBuyValue, language)}</span>
                  </span>
                )}

                {/* Out of stock alert badge if zeroStockProductsCount > 0 */}
                {zeroStockProductsCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('stock', undefined, 'zero');
                    }}
                    className="mt-0.5 flex items-center justify-between bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-2 py-1 rounded-md text-[10px] font-bold transition text-left cursor-pointer"
                    title={language === 'bn' ? 'শূন্য স্টক পণ্যসমূহ দেখুন ও রিস্টক করুন' : 'View out-of-stock products & restock'}
                  >
                    <span className="flex items-center gap-1 truncate">
                      <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>{formatNumber(zeroStockProductsCount, language)}টি পণ্য স্টক আউট</span>
                    </span>
                    <span className="text-rose-800 underline font-semibold flex items-center gap-0.5 shrink-0 ml-1">
                      <span>{language === 'bn' ? 'রিস্টক করুন' : 'Restock'}</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-blue-600 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/60">
            <span className="font-medium">{language === 'bn' ? 'স্টক খাতা ও রিস্টক' : 'Manage Stock'}</span>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-slate-400 font-normal">
                {language === 'bn' ? `মোট ${formatNumber(totalProductsCount, language)}টি আইটেম` : `Total ${totalProductsCount}`}
              </span>
              <ArrowUpRight className="w-3 h-3 text-blue-600 ml-1" />
            </div>
          </div>
        </div>

        {/* Card 2: Today's Sales */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {language === 'bn' ? 'আজকের সেল' : "Today's Sales"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-emerald-600">
                {formatCurrency(todaySalesAmount, language)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  {language === 'bn' ? 'নগদ:' : 'Cash:'} {formatCurrency(todayCashSales, language)}
                </span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                  {language === 'bn' ? 'বাকি সেল:' : 'Credit:'} {formatCurrency(todayDueSales, language)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-2 pt-1 border-t border-slate-100/60">
            <span>{language === 'bn' ? 'বিক্রির খাতা দেখুন' : 'View Sales'}</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Card 3: Total Due/Credit */}
        <div
          onClick={() => onNavigate('dues')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-amber-200 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট বাকি' : 'Total Dues'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600">
              {formatCurrency(totalDuesAmount, language)}
            </div>
            <div className="text-[11px] text-amber-600 flex items-center gap-0.5 mt-0.5">
              <span>{language === 'bn' ? 'বাকি খাতা দেখুন' : 'View Due Khata'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Card 4: Actual Net Profit (for Admin/Manager) or Today's Sales History (for Viewer) */}
        {!isViewer ? (
          <div
            onClick={() => onNavigate('dues', 'monthly_report')}
            className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {language === 'bn' ? 'একচুয়াল নিট লাভ' : 'Actual Net Profit'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div
                className={`text-xl font-bold ${
                  netProfitAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netProfitAmount, language)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {totalExpensesAmount > 0
                  ? language === 'bn'
                    ? `খরচ বাদ দিয়ে আসল লাভ`
                    : `After costs`
                  : language === 'bn'
                  ? 'বিক্রি ও খরচ সমন্বিত লাভ'
                  : 'Revenue minus costs'}
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('history')}
            className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {language === 'bn' ? 'মোট লেনদেন' : 'Total Transactions'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-slate-800">
                {formatNumber(sales.length, language)} {language === 'bn' ? 'টি' : 'records'}
              </div>
              <div className="text-[11px] text-blue-600 flex items-center gap-0.5 mt-0.5">
                <span>{language === 'bn' ? 'বিক্রির খাতা দেখুন' : 'View sales history'}</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accounting & Financial Health Hub (শুধুমাত্র এডমিন ও ম্যানেজারের জন্য) */}
      {!isViewer && (
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'bn' ? 'হিসাব খাতা ও আর্থিক স্বাস্থ্য' : 'Accounts & Financial Hub'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'দৈনন্দিন খরচ, পাইকার দেনা ও পার্টনারদের মূলধন'
                  : 'Daily costs, wholesaler debt & partner capital'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('dues', 'customer')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <span>{language === 'bn' ? 'সব খাতা' : 'All Accounts'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Hub Item 1: Expenses */}
          <div
            onClick={() => onNavigate('dues', 'expenses')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200/60 hover:border-rose-200 transition cursor-pointer text-center group"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mx-auto group-hover:scale-105 transition">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div className="text-[10px] font-medium text-slate-500 mt-1.5">
              {language === 'bn' ? 'দোকানের খরচ' : 'Expenses'}
            </div>
            <div className="text-xs font-bold text-rose-600 mt-0.5">
              {formatCurrency(totalExpensesAmount, language)}
            </div>
          </div>

          {/* Hub Item 2: Supplier Dues (পাইকার পাবে) */}
          <div
            onClick={() => onNavigate('dues', 'supplier')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200/60 hover:border-amber-200 transition cursor-pointer text-center group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mx-auto group-hover:scale-105 transition">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-[10px] font-medium text-slate-500 mt-1.5">
              {language === 'bn' ? 'পাইকার পাবে' : 'Supplier Due'}
            </div>
            <div className="text-xs font-bold text-amber-700 mt-0.5">
              {formatCurrency(totalSupplierDuesAmount, language)}
            </div>
          </div>

          {/* Hub Item 3: Partnership & Capital */}
          <div
            onClick={() => onNavigate('dues', 'partnership')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-200 transition cursor-pointer text-center group"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto group-hover:scale-105 transition">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="text-[10px] font-medium text-slate-500 mt-1.5">
              {language === 'bn' ? 'পার্টনারশিপ' : 'Partners'}
            </div>
            <div className="text-xs font-bold text-indigo-700 mt-0.5">
              {totalCapitalDue > 0 ? (
                <span className="text-rose-600">বাকি ৳{formatNumber(totalCapitalDue, language)}</span>
              ) : (
                <span>{formatCurrency(totalPaidCapital, language)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Joint Capital & Partner Equalization Hub Card (যৌথ মূলধন ও ক্যাপিটাল গ্যাপ) */}
        {partners.length >= 2 && (
          <div
            onClick={() => onNavigate('dues', 'partnership')}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/90 border border-indigo-200/90 hover:border-indigo-300 transition cursor-pointer space-y-2.5 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{language === 'bn' ? 'যৌথ মূলধন ও ব্যালেন্স সমন্বয়' : 'Joint Capital & Equalization'}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                      {language === 'bn' ? 'ক্যাপিটাল গ্যাপ' : 'Capital Gap'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {language === 'bn' ? 'মোট যৌথ মূলধন:' : 'Total Joint Capital:'}{' '}
                    <strong className="text-indigo-700 font-bold">{formatCurrency(totalPaidCapital, language)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-indigo-600 font-bold group-hover:translate-x-0.5 transition">
                <span>{language === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Equalization Status for Partners */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {dashboardPartnerBalances.map((item) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-xl border text-xs flex flex-col justify-between ${
                    item.balance > 0
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : item.balance < 0
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                      : 'bg-white/80 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="truncate max-w-[85px]">{item.name}</span>
                    <span className="text-[10px] opacity-75">{item.share}% শেয়ার</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-500">জমা: ৳{formatNumber(item.paid, language)}</span>
                    <span
                      className={`text-[11px] font-black px-1.5 py-0.2 rounded ${
                        item.balance > 0
                          ? 'bg-emerald-200 text-emerald-900'
                          : item.balance < 0
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.balance > 0
                        ? `+৳${formatNumber(item.balance, language)} পাওনা`
                        : item.balance < 0
                        ? `-৳${formatNumber(Math.abs(item.balance), language)} ঘাটতি`
                        : '৳০ সমতায়'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-indigo-900/80 flex items-center justify-between pt-0.5">
              <span>💡 ক্যাশ বা লাভ উত্তোলনের সময় এই হিসাব সমন্বয়যোগ্য</span>
              <span className="font-semibold text-indigo-700">৫০%-৫০% শেয়ার অক্ষুণ্ণ থাকবে</span>
            </div>
          </div>
        )}

        {/* Hub Action: Monthly & Business Report */}
        <div
          onClick={() => onNavigate('dues', 'monthly_report')}
          className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 hover:border-blue-300 transition cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>{language === 'bn' ? 'মাসিক ও সামগ্রিক ব্যবসায়িক রিপোর্ট' : 'Monthly & Business Report'}</span>
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                  {language === 'bn' ? 'চার্টসহ' : 'With Chart'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {language === 'bn' ? 'বিক্রি, খরচ ও নিট লাভের বার চার্ট ও আর্থিক পরিস্থিতি' : 'Sales, costs & net profit bar chart analysis'}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition" />
        </div>
      </div>
      )}

      {/* Low Stock Alert Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'bn' ? 'কম স্টক সতর্কতা' : 'Low Stock Alert'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? '৫ টি বা তার কম মজুদ পণ্য' : 'Items with 5 or fewer in stock'}
              </p>
            </div>
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              lowStockProducts.length > 0
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {formatNumber(lowStockProducts.length, language)} {language === 'bn' ? 'টি পণ্য' : 'items'}
          </span>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {language === 'bn'
              ? '✓ সকল প্রোডাক্টের পর্যাপ্ত স্টক মজুদ রয়েছে!'
              : '✓ All products have sufficient stock!'}
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockProducts.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate('stock')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 hover:bg-rose-50 transition border border-rose-100 cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {language === 'bn' ? 'মূল্য:' : 'Price:'} {formatCurrency(p.sellPrice, language)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[11px] font-bold rounded-lg shadow-xs">
                    {language === 'bn' ? 'মজুদ: ' : 'Stock: '}
                    {formatQty(p.qty, p.unit, language)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                </div>
              </div>
            ))}
            {lowStockProducts.length > 4 && (
              <button
                onClick={() => onNavigate('stock')}
                className="w-full text-center text-xs text-blue-600 font-medium py-1 hover:underline"
              >
                {language === 'bn'
                  ? `আরও ${formatNumber(lowStockProducts.length - 4, language)}টি কম স্টক পণ্য দেখুন →`
                  : `View ${formatNumber(lowStockProducts.length - 4, language)} more low stock items →`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Sales Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {language === 'bn' ? 'সাম্প্রতিক বিক্রি' : 'Recent Sales'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {language === 'bn' ? 'সর্বশেষ বিক্রির তালিকা' : 'Latest sales transactions'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5"
          >
            <span>{language === 'bn' ? 'সব দেখুন' : 'See All'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {language === 'bn'
              ? 'কোনো বিক্রির রেকর্ড নেই। নতুন বিক্রি এন্ট্রি করুন।'
              : 'No sales records yet. Create a new sale.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentSales.map((s) => (
              <div
                key={s.id}
                onClick={() => setDetailSale(s)}
                className="py-2.5 px-2 -mx-2 rounded-xl flex items-center justify-between text-xs hover:bg-blue-50/70 active:scale-[0.99] cursor-pointer transition group"
                title={language === 'bn' ? 'বিস্তারিত ও এডিট করতে ক্লিক করুন' : 'Click to view details & edit'}
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                    <span>{s.productName}</span>
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">🔍</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{formatBengaliDate(s.date, language)}</span>
                    <span>•</span>
                    <span>{formatQty(s.qty, s.unit, language)}</span>
                    {s.customer && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">{s.customer}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatCurrency(s.total, language)}</div>
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                      s.payment === 'বাকি'
                        ? 'bg-amber-100 text-amber-800'
                        : s.payment === 'আংশিক'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {s.payment === 'আংশিক'
                      ? (language === 'bn' ? 'আংশিক' : 'Partial')
                      : s.payment === 'বাকি'
                      ? (language === 'bn' ? 'বাকি' : 'Due')
                      : (language === 'bn' ? 'নগদ' : 'Cash')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {detailSale && (
        <SaleDetailsModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          onOpenInvoice={(s) => {
            setDetailSale(null);
            setInvoiceSale(s);
          }}
          onEdit={(s) => openEditModal(s)}
          onDelete={(s) => handleDeleteSale(s)}
          canManage={canManage}
        />
      )}

      {/* Invoice Modal */}
      {invoiceSale && (
        <InvoiceModal
          sale={invoiceSale}
          shopName={currentShop?.name}
          shopPhone={currentShop?.phone}
          shopAddress={currentShop?.address}
          logoUrl={currentShop?.logoUrl}
          onClose={() => setInvoiceSale(null)}
        />
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-200" />
                <h3 className="font-bold text-base">
                  {language === 'bn' ? 'বিক্রির রেকর্ড সংশোধন' : 'Edit Sale Record'}
                </h3>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">{language === 'bn' ? 'প্রোডাক্ট:' : 'Product:'}</span>
                  <span className="font-bold text-slate-800 text-sm">{editingSale.productName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">{language === 'bn' ? 'একক:' : 'Unit:'}</span>
                  <span className="font-bold text-slate-800">{formatUnit(editingSale.unit, language)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'পরিমাণ' : 'Quantity'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'একক মূল্য (৳)' : 'Unit Price (৳)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['নগদ', 'বাকি', 'আংশিক'] as PaymentType[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPayment(p)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        editPayment === p
                          ? p === 'নগদ'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : p === 'বাকি'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {p === 'নগদ'
                        ? (language === 'bn' ? 'নগদ' : 'Cash')
                        : p === 'বাকি'
                        ? (language === 'bn' ? 'বাকি' : 'Due')
                        : (language === 'bn' ? 'আংশিক' : 'Partial')}
                    </button>
                  ))}
                </div>
              </div>

              {editPayment === 'আংশিক' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <label className="text-xs font-bold text-blue-900">
                    {language === 'bn' ? 'পরিশোধিত টাকা (Paid Amount ৳)' : 'Paid Amount (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্রেতার নাম' : 'Customer Name'}
                  </label>
                  <input
                    type="text"
                    value={editCustomer}
                    onChange={(e) => setEditCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    placeholder="ক্রেতার নাম"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="017xxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'বিক্রির তারিখ' : 'Sale Date'}
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updatingSale}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {updatingSale ? 'সংরক্ষণ হচ্ছে...' : (language === 'bn' ? 'আপডেট করুন' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
