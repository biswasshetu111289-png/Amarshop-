import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { deleteSale, editSale } from '../services/storeService';
import {
  formatCurrency,
  formatQty,
  formatBengaliDate,
  formatNumber,
  formatUnit,
  formatPaymentMethod,
  formatPaymentType,
  toBengaliNumber,
  getTodayString,
} from '../utils/formatters';
import { Sale, ProductUnit, PaymentType, PAYMENT_METHODS } from '../types';
import {
  Calendar,
  Filter,
  Trash2,
  TrendingUp,
  Receipt,
  RotateCcw,
  Search,
  Edit2,
  X,
  Check,
  Package,
  Palette,
  ShieldAlert,
  User,
  Phone,
} from 'lucide-react';

export const SalesHistoryView: React.FC = () => {
  const { user } = useAuth();
  const { sales, products, currentShop, canManage, isViewer } = useStore();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'নগদ' | 'বাকি' | 'আংশিক'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editProductName, setEditProductName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState<ProductUnit | string>('পিস');
  const [editPrice, setEditPrice] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPayment, setEditPayment] = useState<PaymentType>('নগদ');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('নগদ');
  const [editPaidAmount, setEditPaidAmount] = useState<string>('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editPackagingPrice, setEditPackagingPrice] = useState('');
  const [editColor, setEditColor] = useState('');
  const [updatingSale, setUpdatingSale] = useState(false);

  const targetId = currentShop?.id || user?.uid || '';

  // Product buy price map for calculating profit
  const productBuyPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const totalCost = p.buyPrice + (p.packagingPrice || 0);
      map.set(p.id, totalCost);
      map.set(p.name.trim().toLowerCase(), totalCost);
    });
    return map;
  }, [products]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (fromDate && s.date < fromDate) return false;
      if (toDate && s.date > toDate) return false;
      if (paymentFilter !== 'all' && s.payment !== paymentFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchProd = s.productName.toLowerCase().includes(query);
        const matchCust = (s.customer || '').toLowerCase().includes(query);
        if (!matchProd && !matchCust) return false;
      }
      return true;
    });
  }, [sales, fromDate, toDate, paymentFilter, searchQuery]);

  // Summary Metrics of filtered sales
  const { filteredTotalSales, filteredTotalProfit } = useMemo(() => {
    let totalSales = 0;
    let totalProfit = 0;

    for (const s of filteredSales) {
      totalSales += s.total;

      let itemCost = 0;
      if (s.productId && productBuyPriceMap.has(s.productId)) {
        itemCost = productBuyPriceMap.get(s.productId)!;
      } else if (s.productName && productBuyPriceMap.has(s.productName.trim().toLowerCase())) {
        itemCost = productBuyPriceMap.get(s.productName.trim().toLowerCase())!;
      }
      const itemProfit = (s.price - itemCost) * s.qty;
      totalProfit += itemProfit;
    }

    return { filteredTotalSales: totalSales, filteredTotalProfit: totalProfit };
  }, [filteredSales, productBuyPriceMap]);

  // Open Edit Sale Modal
  const openEditModal = (sale: Sale) => {
    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র এডমিন বা ম্যানেজার বিক্রির হিসাব এডিট করতে পারেন'
          : 'Only Admin or Manager can edit sales records',
        'warning'
      );
      return;
    }
    setEditingSale(sale);
    setEditProductId(sale.productId || '');
    setEditProductName(sale.productName || '');
    setEditQty(String(sale.qty));
    setEditUnit(sale.unit || 'পিস');
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

    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'আপনার বিক্রি পরিবর্তন করার অনুমতি নেই'
          : 'You do not have permission to edit sales',
        'error'
      );
      return;
    }

    const qtyNum = parseFloat(editQty);
    const priceNum = parseFloat(editPrice);
    const packPriceNum = editPackagingPrice ? parseFloat(editPackagingPrice) : 0;

    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast(
        language === 'bn' ? 'সঠিক বিক্রির পরিমাণ দিন' : 'Enter a valid sales quantity',
        'warning'
      );
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      showToast(
        language === 'bn' ? 'সঠিক একক মূল্য দিন' : 'Enter a valid unit price',
        'warning'
      );
      return;
    }
    if ((editPayment === 'বাকি' || editPayment === 'আংশিক') && !editCustomer.trim()) {
      showToast(
        language === 'bn'
          ? 'বাকিতে বা আংশিক বিক্রির ক্ষেত্রে কাস্টমারের নাম বাধ্যতামূলক'
          : 'Customer name is required for due or partial sales',
        'warning'
      );
      return;
    }

    setUpdatingSale(true);
    try {
      const totalAmount = qtyNum * priceNum;
      const finalPaid =
        editPayment === 'নগদ'
          ? totalAmount
          : editPayment === 'বাকি'
          ? 0
          : parseFloat(editPaidAmount) || 0;
      const finalDue = Math.max(0, totalAmount - finalPaid);

      await editSale(
        targetId,
        editingSale.id,
        {
          productId: editProductId,
          productName: editProductName.trim(),
          qty: qtyNum,
          unit: editUnit,
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
          ? 'বিক্রির তথ্য সফলভাবে পরিবর্তন ও স্টক সমন্বয় করা হয়েছে'
          : 'Sale updated and stock reconciled successfully',
        'success'
      );
      setEditingSale(null);
    } catch (err: any) {
      console.error(err);
      showToast(
        err.message || (language === 'bn' ? 'বিক্রির তথ্য পরিবর্তন করতে সমস্যা হয়েছে' : 'Failed to update sale'),
        'error'
      );
    } finally {
      setUpdatingSale(false);
    }
  };

  const handleDelete = async (sale: Sale) => {
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

    const confirmDelete = window.confirm(
      language === 'bn'
        ? `আপনি কি এই বিক্রির রেকর্ডটি মুছে ফেলতে চান? পণ্যটির স্টক (${formatQty(
            sale.qty,
            sale.unit,
            'bn'
          )}) স্বয়ংক্রিয়ভাবে বৃদ্ধি পাবে।`
        : `Are you sure you want to delete this sales record? The product stock (${formatQty(
            sale.qty,
            sale.unit,
            'en'
          )}) will automatically be restored.`
    );
    if (!confirmDelete) return;

    try {
      await deleteSale(targetId, sale.id, sale.productId, sale.qty);
      showToast(
        language === 'bn'
          ? 'বিক্রি মুছে ফেলা হয়েছে এবং স্টক ফেরত এসেছে'
          : 'Sale deleted and stock restored',
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast(
        language === 'bn' ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete sale',
        'error'
      );
    }
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setPaymentFilter('all');
    setSearchQuery('');
  };

  // Live total calculation for edit modal
  const editTotalAmount = (parseFloat(editQty) || 0) * (parseFloat(editPrice) || 0);

  return (
    <div className="space-y-4 pb-4">
      {/* Viewer Notice */}
      {isViewer && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{language === 'bn' ? 'ভিউয়ার মোড:' : 'Viewer Mode:'}</strong>{' '}
            {language === 'bn'
              ? 'আপনি বিক্রির হিসাব দেখতে পারবেন, তবে কোনো পরিবর্তন বা মুছে ফেলার অনুমতি নেই।'
              : 'You can view sales records, but editing or deleting is not permitted.'}
          </span>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {language === 'bn' ? 'বিক্রয় ইতিহাস' : 'Sales History'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'bn'
              ? `${currentShop?.name || 'দোকানের'} মোট বিক্রয়, লাভ ও সংশোধনের খাতা`
              : `Sales records, profit, and adjustments for ${currentShop?.name || 'Shop'}`}
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === 'bn' ? 'ফিল্টার করুন' : 'Filter Sales'}</span>
          </div>
          {(fromDate || toDate || paymentFilter !== 'all' || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:underline flex items-center gap-0.5 text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'bn' ? 'ফিল্টার রিসেট' : 'Reset Filters'}</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'প্রোডাক্ট বা কাস্টমারের নাম দিয়ে খুঁজুন...'
                : 'Search by product or customer name...'
            }
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">
              {language === 'bn' ? 'হতে তারিখ' : 'From Date'}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">
              {language === 'bn' ? 'পর্যন্ত তারিখ' : 'To Date'}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Payment Type Filters */}
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          <button
            onClick={() => setPaymentFilter('all')}
            className={`py-1.5 rounded-xl border text-center font-medium transition ${
              paymentFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {language === 'bn' ? 'সব' : 'All'} ({formatNumber(sales.length, language)})
          </button>
          <button
            onClick={() => setPaymentFilter('নগদ')}
            className={`py-1.5 rounded-xl border text-center font-medium transition ${
              paymentFilter === 'নগদ'
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
            }`}
          >
            {language === 'bn' ? 'নগদ' : 'Cash'}
          </button>
          <button
            onClick={() => setPaymentFilter('আংশিক')}
            className={`py-1.5 rounded-xl border text-center font-medium transition ${
              paymentFilter === 'আংশিক'
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'bg-blue-50/50 border-blue-200 text-blue-800'
            }`}
          >
            {language === 'bn' ? 'আংশিক' : 'Partial'}
          </button>
          <button
            onClick={() => setPaymentFilter('বাকি')}
            className={`py-1.5 rounded-xl border text-center font-medium transition ${
              paymentFilter === 'বাকি'
                ? 'bg-amber-600 text-white border-amber-600 font-bold'
                : 'bg-amber-50/50 border-amber-200 text-amber-800'
            }`}
          >
            {language === 'bn' ? 'বাকি' : 'Due'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block">
              {language === 'bn' ? 'ফিল্টারকৃত মোট বিক্রি' : 'Filtered Total Sales'}
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {formatCurrency(filteredTotalSales, language)}
            </span>
            <span className="text-[10px] text-slate-400">
              {formatNumber(filteredSales.length, language)} {language === 'bn' ? 'টি লেনদেন' : 'transactions'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block">
              {language === 'bn' ? 'ফিল্টারকৃত মোট লাভ' : 'Filtered Total Profit'}
            </span>
            <span
              className={`text-base font-bold mt-0.5 block ${
                filteredTotalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(filteredTotalProfit, language)}
            </span>
            <span className="text-[10px] text-slate-400">
              {language === 'bn' ? 'মোট লাভ হিসাব' : 'Total Profit Calculation'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
          <div className="text-2xl mb-2">📜</div>
          <p className="font-semibold text-slate-700 text-sm">
            {language === 'bn' ? 'কোনো বিক্রির রেকর্ড নেই' : 'No sales records found'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'bn'
              ? 'ফিল্টার পরিবর্তন করুন অথবা নতুন বিক্রি যোগ করুন'
              : 'Adjust filters or add a new sale'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="py-3 px-2">{language === 'bn' ? 'প্রোডাক্ট ও ক্রেতা' : 'Product & Customer'}</th>
                  <th className="py-3 px-2 text-center">{language === 'bn' ? 'পরিমাণ' : 'Quantity'}</th>
                  <th className="py-3 px-2 text-right">{language === 'bn' ? 'মূল্য' : 'Amount'}</th>
                  <th className="py-3 px-2 text-center">{language === 'bn' ? 'পেমেন্ট' : 'Payment'}</th>
                  {canManage && <th className="py-3 px-2 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                      {formatBengaliDate(sale.date, language)}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {sale.productName}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {sale.customer ? (
                          <span className="text-[11px] text-blue-600 font-medium">
                            {language === 'bn' ? 'ক্রেতা: ' : 'Customer: '}{sale.customer}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {language === 'bn' ? 'সাধারণ ক্রেতা' : 'Regular Customer'}
                          </span>
                        )}
                        {sale.color && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-1 rounded">
                            {sale.color}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap font-medium text-slate-700">
                      {formatQty(sale.qty, sale.unit, language)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      <div>{formatCurrency(sale.total, language)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        @{formatCurrency(sale.price, language)}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            sale.payment === 'বাকি'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : sale.payment === 'আংশিক'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {formatPaymentType(sale.payment, language)}
                        </span>
                        {sale.paymentMethod && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatPaymentMethod(sale.paymentMethod, language)}
                          </span>
                        )}
                        {sale.payment === 'আংশিক' && sale.paidAmount !== undefined && (
                          <span className="text-[9px] text-emerald-700 font-semibold">
                            {language === 'bn' ? 'জমা:' : 'Paid:'} {formatCurrency(sale.paidAmount, language)}
                          </span>
                        )}
                      </div>
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(sale)}
                            title={language === 'bn' ? 'বিক্রি এডিট / সংশোধন করুন' : 'Edit sale record'}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sale)}
                            title={language === 'bn' ? 'বিক্রি মুছুন ও স্টক ফেরত নিন' : 'Delete sale & restore stock'}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Sale Modal (Admin & Manager Feature) */}
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
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Product Selection / Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'প্রোডাক্ট' : 'Product'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editProductId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setEditProductId(pid);
                    const found = products.find((p) => p.id === pid);
                    if (found) {
                      setEditProductName(found.name);
                      setEditUnit(found.unit);
                      setEditPrice(String(found.sellPrice));
                      if (found.color) setEditColor(found.color);
                      if (found.packagingPrice) setEditPackagingPrice(String(found.packagingPrice));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={editingSale.productId}>
                    {editProductName} ({language === 'bn' ? 'বর্তমান' : 'Current'})
                  </option>
                  {products
                    .filter((p) => p.id !== editingSale.productId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({language === 'bn' ? 'মজুদ:' : 'Stock:'} {formatQty(p.qty, p.unit, language)})
                      </option>
                    ))}
                </select>
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'bn' ? 'বিক্রিত পরিমাণ' : 'Sold Quantity'} <span className="text-rose-500">*</span>
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
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {language === 'bn' ? 'আগের পরিমাণ:' : 'Original quantity:'}{' '}
                    {formatQty(editingSale.qty, editingSale.unit, language)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'bn' ? 'একক প্রতি বিক্রয় মূল্য (৳)' : 'Selling Price per Unit (৳)'}{' '}
                    <span className="text-rose-500">*</span>
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

              {/* Payment Type and Date */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {language === 'bn' ? 'পরিশোধের অবস্থা' : 'Payment Status'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditPayment('নগদ');
                          setEditPaidAmount(String(editTotalAmount));
                        }}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold transition ${
                          editPayment === 'নগদ'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {language === 'bn' ? 'নগদ' : 'Full Paid'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPayment('আংশিক');
                          if (!editPaidAmount || editPaidAmount === '0') {
                            setEditPaidAmount(String(Math.round(editTotalAmount / 2)));
                          }
                        }}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold transition ${
                          editPayment === 'আংশিক'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {language === 'bn' ? 'আংশিক' : 'Partial'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPayment('বাকি');
                          setEditPaidAmount('0');
                        }}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold transition ${
                          editPayment === 'বাকি'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {language === 'bn' ? 'বাকি' : 'Due'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {language === 'bn' ? 'বিক্রির তারিখ' : 'Sale Date'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Type of Payment (পেমেন্টের ধরন - ঐচ্ছিক) */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {language === 'bn'
                      ? 'পেমেন্টের ধরন (Type of Payment) - ঐচ্ছিক'
                      : 'Type of Payment (Method) - Optional'}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = editPaymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setEditPaymentMethod(method.id)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {language === 'en' ? method.nameEn : method.nameBn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Partial Payment Amount Input */}
                {editPayment === 'আংশিক' && (
                  <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-blue-900">
                        {language === 'bn' ? 'পরিশোধিত টাকা (Paid Amount ৳)' : 'Paid Amount (৳)'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-blue-700 font-semibold text-[11px]">
                        {language === 'bn' ? 'মোট:' : 'Total:'} {formatCurrency(editTotalAmount, language)}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={editTotalAmount}
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(e.target.value)}
                      placeholder={language === 'bn' ? 'পরিশোধিত পরিমাণ দিন' : 'Enter paid amount'}
                      className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {(() => {
                      const currentPaid = parseFloat(editPaidAmount) || 0;
                      const remainingDue = Math.max(0, editTotalAmount - currentPaid);
                      return (
                        <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-blue-200">
                          <span className="text-emerald-700">
                            {language === 'bn' ? 'পরিশোধ:' : 'Paid:'} {formatCurrency(currentPaid, language)}
                          </span>
                          <span className="text-rose-700">
                            {language === 'bn' ? 'বাকি থাকবে:' : 'Remaining Due:'} {formatCurrency(remainingDue, language)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'ক্রেতার নাম' : 'Customer Name'}{' '}
                  {editPayment === 'বাকি' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    (language === 'bn' ? '(ঐচ্ছিক)' : '(Optional)')
                  )}
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required={editPayment === 'বাকি'}
                    value={editCustomer}
                    onChange={(e) => setEditCustomer(e.target.value)}
                    placeholder={
                      editPayment === 'বাকি'
                        ? (language === 'bn' ? 'ক্রেতার নাম অবশ্যই দিন' : 'Customer name is required')
                        : (language === 'bn' ? 'সাধারণ ক্রেতা' : 'Regular Customer')
                    }
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Color and Packaging info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'bn' ? 'কালার (ঐচ্ছিক)' : 'Color (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder={language === 'bn' ? 'যেমন: লাল, নীল...' : 'e.g. Red, Blue...'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {language === 'bn' ? 'প্যাকেজিং খরচ (৳)' : 'Packaging Cost (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editPackagingPrice}
                    onChange={(e) => setEditPackagingPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Stock Reconciliation Note */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 leading-relaxed space-y-1">
                <span className="font-bold flex items-center gap-1 text-blue-950">
                  <Package className="w-3.5 h-3.5 text-blue-700" />
                  {language === 'bn' ? 'স্বয়ংক্রিয় স্টক সমন্বয়:' : 'Automatic Stock Reconciliation:'}
                </span>
                <p>
                  {language === 'bn'
                    ? 'পরিমাণ পরিবর্তন করলে ডাটাবেজে পণ্যের স্টকে স্বয়ংক্রিয়ভাবে যোগ-বিয়োগ হয়ে যাবে। যেমন ৫ পিস থেকে ৩ পিস করলে ২ পিস স্টকে ফেরত যাবে।'
                    : 'Updating quantity automatically adjusts the product inventory. For instance, decreasing from 5 to 3 returns 2 items back to stock.'}
                </p>
              </div>

              {/* Calculated Total Box */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {language === 'bn' ? 'সংশোধিত মোট মূল্য:' : 'Adjusted Total Amount:'}
                </span>
                <span className="font-black text-base text-slate-900">
                  {formatCurrency(editTotalAmount, language)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={updatingSale}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 disabled:opacity-50 transition"
                >
                  {updatingSale ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

