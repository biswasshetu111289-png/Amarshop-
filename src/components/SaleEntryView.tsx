import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { createSale, batchImportSales } from '../services/storeService';
import { formatCurrency, formatQty, getTodayString, toBengaliNumber, formatNumber, formatUnit } from '../utils/formatters';
import { parseSaleCSV, ParsedSaleRow } from '../utils/csv';
import { PaymentType, PAYMENT_METHODS } from '../types';
import confetti from 'canvas-confetti';
import {
  ShoppingCart,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  User,
  Calendar,
  X,
  PlusCircle,
  Package,
  Palette,
  ShieldAlert,
  CreditCard,
  Banknote,
  Coins,
  Phone,
} from 'lucide-react';

export const SaleEntryView: React.FC<{ onSuccessNavigate?: () => void }> = ({
  onSuccessNavigate,
}) => {
  const { user } = useAuth();
  const { products, currentShop, canManage, isViewer } = useStore();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [payment, setPayment] = useState<PaymentType>('নগদ');
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CSV Import State
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<ParsedSaleRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = currentShop?.id || user?.uid || '';

  // Only products with stock > 0
  const availableProducts = products.filter((p) => p.qty > 0);

  // Current selected product object
  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Auto-fill price and default values when product changes
  useEffect(() => {
    if (currentProduct) {
      setPrice(String(currentProduct.sellPrice));
    }
  }, [selectedProductId, currentProduct]);

  // Live total calculation
  const totalAmount = (parseFloat(qty) || 0) * (parseFloat(price) || 0);

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetId) return;

    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র এডমিন বা ম্যানেজার বিক্রি এন্ট্রি করতে পারেন'
          : 'Only Admin or Manager can record sales',
        'warning'
      );
      return;
    }

    if (!selectedProductId || !currentProduct) {
      showToast(
        language === 'bn' ? 'অনুগ্রহ করে একটি প্রোডাক্ট সিলেক্ট করুন' : 'Please select a product',
        'warning'
      );
      return;
    }

    const saleQty = parseFloat(qty);
    const salePrice = parseFloat(price);

    if (isNaN(saleQty) || saleQty <= 0) {
      showToast(language === 'bn' ? 'সঠিক পরিমাণ দিন' : 'Enter a valid quantity', 'warning');
      return;
    }

    // Edge case: Selling more than available stock
    if (saleQty > currentProduct.qty) {
      showToast(
        language === 'bn'
          ? `পর্যাপ্ত স্টক নেই! বর্তমান স্টক মাত্র ${formatQty(currentProduct.qty, currentProduct.unit, language)}`
          : `Insufficient stock! Current stock is only ${formatQty(currentProduct.qty, currentProduct.unit, language)}`,
        'error'
      );
      return;
    }

    if (isNaN(salePrice) || salePrice < 0) {
      showToast(
        language === 'bn' ? 'সঠিক বিক্রয় মূল্য দিন' : 'Enter a valid selling price',
        'warning'
      );
      return;
    }

    if (payment === 'বাকি' && !customer.trim()) {
      showToast(
        language === 'bn'
          ? 'বাকিতে বিক্রির ক্ষেত্রে কাস্টমারের নাম বাধ্যতামূলক'
          : 'Customer name is required for credit/due sales',
        'warning'
      );
      return;
    }

    if (payment === 'আংশিক') {
      const parsedPaid = parseFloat(paidAmount);
      if (isNaN(parsedPaid) || parsedPaid < 0) {
        showToast(
          language === 'bn' ? 'সঠিক পরিশোধিত টাকার পরিমাণ দিন' : 'Enter valid paid amount',
          'warning'
        );
        return;
      }
      if (parsedPaid >= totalAmount) {
        showToast(
          language === 'bn'
            ? 'পরিশোধিত টাকা মোট বিক্রির সমান বা বেশি হলে "নগদ" নির্বাচন করুন'
            : 'Paid amount equals total. Please choose Full Paid',
          'warning'
        );
        return;
      }
      if (!customer.trim()) {
        showToast(
          language === 'bn'
            ? 'আংশিক পেমেন্টের ক্ষেত্রে বাকি টাকা কাস্টমারের নামে যুক্ত হবে, তাই নাম লিখুন'
            : 'Customer name is required to record remaining due',
          'warning'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const finalPaidAmount =
        payment === 'নগদ'
          ? totalAmount
          : payment === 'বাকি'
          ? 0
          : parseFloat(paidAmount) || 0;
      const finalDueAmount = Math.max(0, totalAmount - finalPaidAmount);

      await createSale(targetId, {
        productId: currentProduct.id,
        productName: currentProduct.name,
        qty: saleQty,
        unit: currentProduct.unit,
        price: salePrice,
        total: totalAmount,
        date,
        payment,
        paymentMethod: paymentMethod || 'নগদ',
        paidAmount: finalPaidAmount,
        dueAmount: finalDueAmount,
        customer: customer.trim(),
        customerPhone: customerPhone.trim(),
        packagingPrice: currentProduct.packagingPrice || 0,
        color: currentProduct.color || '',
      });

      // Joyful confetti for successful sale!
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });

      showToast(
        language === 'bn'
          ? `৳ ${totalAmount.toLocaleString('en-US')} এর বিক্রি সফলভাবে সংরক্ষিত হয়েছে!`
          : `Sale of ৳ ${totalAmount.toLocaleString('en-US')} saved successfully!`,
        'success'
      );

      // Reset form
      setSelectedProductId('');
      setQty('1');
      setPrice('');
      setCustomer('');
      setCustomerPhone('');
      setPayment('নগদ');
      setPaymentMethod('নগদ');
      setPaidAmount('');

      if (onSuccessNavigate) {
        onSuccessNavigate();
      }
    } catch (err) {
      console.error(err);
      showToast(
        language === 'bn' ? 'বিক্রি এন্ট্রি করতে সমস্যা হয়েছে' : 'Failed to record sale',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Sales Import
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const { rows, errors } = parseSaleCSV(content);
      setCsvPreview(rows);
      setCsvErrors(errors);
      if (rows.length === 0 && errors.length > 0) {
        showToast(errors[0], 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSVBatch = async () => {
    if (!user || !targetId || csvPreview.length === 0) return;
    setImportingCSV(true);
    try {
      const result = await batchImportSales(targetId, csvPreview, products);
      showToast(
        `সফলভাবে ${toBengaliNumber(result.imported)} টি বিক্রয় রেকর্ড ইমপোর্ট ও স্টক সমন্বয় করা হয়েছে`,
        'success'
      );
      setShowCSVModal(false);
      setCsvPreview([]);
      setCsvFileName('');
    } catch (err) {
      console.error(err);
      showToast('বিক্রি ইমপোর্টে সমস্যা হয়েছে', 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Viewer Notice */}
      {isViewer && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{language === 'bn' ? 'ভিউয়ার মোড:' : 'Viewer Mode:'}</strong>{' '}
            {language === 'bn'
              ? 'আপনি শুধুমাত্র বিক্রির হিসাব দেখতে পারবেন। নতুন বিক্রি এন্ট্রি করার জন্য ম্যানেজার বা এডমিন অনুমতি প্রয়োজন।'
              : 'You can only view sales records. Admin or Manager permission is required to record new sales.'}
          </span>
        </div>
      )}

      {/* Header with Title and CSV Import */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {language === 'bn' ? 'নতুন বিক্রি এন্ট্রি' : 'New Sale Entry'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'bn'
              ? `${currentShop?.name || 'দোকানে'} বিক্রির সাথে সাথে স্টক স্বয়ংক্রিয়ভাবে কমবে`
              : 'Stock will automatically deduct upon recording sale'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setShowCSVModal(true);
              setCsvPreview([]);
              setCsvErrors([]);
            }}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'CSV সেলস' : 'CSV Sales'}</span>
          </button>
        )}
      </div>

      {/* Main Sale Form Card */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm">
        <form onSubmit={handleSubmitSale} className="space-y-4">
          {/* Product Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'bn' ? 'প্রোডাক্ট নির্বাচন করুন' : 'Select Product'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <select
              required
              disabled={isViewer}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
            >
              <option value="">
                {language === 'bn' ? '-- প্রোডাক্ট বেছে নিন --' : '-- Select Product --'}
              </option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.color ? `(${p.color})` : ''} ({language === 'bn' ? 'মজুদ: ' : 'Stock: '}
                  {formatQty(p.qty, p.unit, language)}) — {formatCurrency(p.sellPrice, language)}
                </option>
              ))}
            </select>

            {/* Display Selected Product Stock & Details Info */}
            {currentProduct && (
              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-600">
                    {language === 'bn' ? 'বর্তমান স্টক: ' : 'Current Stock: '}
                  </span>
                  <span className="font-bold text-blue-700">
                    {formatQty(currentProduct.qty, currentProduct.unit, language)}
                  </span>
                </div>
                {currentProduct.color && (
                  <div className="flex items-center gap-1 text-purple-700 font-medium">
                    <Palette className="w-3 h-3" />
                    <span>{language === 'bn' ? 'কালার: ' : 'Color: '}{currentProduct.color}</span>
                  </div>
                )}
                {Boolean(currentProduct.packagingPrice && currentProduct.packagingPrice > 0) && (
                  <div className="flex items-center gap-1 text-amber-700 font-medium">
                    <Package className="w-3 h-3" />
                    <span>
                      {language === 'bn' ? 'প্যাক: ' : 'Pack: '}
                      {formatCurrency(currentProduct.packagingPrice!, language)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-600">
                    {language === 'bn' ? 'নির্ধারিত রেট: ' : 'Unit Price: '}
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(currentProduct.sellPrice, language)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'bn'
                  ? `পরিমাণ (${currentProduct ? currentProduct.unit : 'একক'})`
                  : `Quantity (${formatUnit(currentProduct?.unit, language) || 'unit'})`}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                disabled={isViewer}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'বিক্রয় মূল্য (৳)' : 'Selling Price (৳)'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0"
                disabled={isViewer}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={language === 'bn' ? 'রেট দিন' : 'Enter price'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
              />
            </div>
          </div>

          {/* Date & Payment Mode */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'বিক্রির তারিখ' : 'Sale Date'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isViewer}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'পরিশোধের অবস্থা' : 'Payment Status'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => {
                      setPayment('নগদ');
                      setPaidAmount('');
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      payment === 'নগদ'
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'নগদ' : 'Full Paid'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => {
                      setPayment('আংশিক');
                      if (!paidAmount && totalAmount > 0) {
                        setPaidAmount(String(Math.round(totalAmount / 2)));
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      payment === 'আংশিক'
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Coins className="w-3 h-3 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'আংশিক' : 'Partial'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => {
                      setPayment('বাকি');
                      setPaidAmount('');
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      payment === 'বাকি'
                        ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'বাকি' : 'Full Due'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Type of Payment (পেমেন্টের ধরন - ঐচ্ছিক) */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {language === 'bn'
                      ? 'পেমেন্টের ধরন (Type of Payment) - ঐচ্ছিক'
                      : 'Type of Payment (Method) - Optional'}
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {language === 'bn' ? 'পদ্ধতি বেছে নিন' : 'Select method'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      disabled={isViewer}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
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

            {/* Partial Payment Calculation Block */}
            {payment === 'আংশিক' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-blue-600" />
                    <span>{language === 'bn' ? 'পরিশোধিত টাকা (Paid Amount)' : 'Paid Amount (৳)'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-700">
                    {language === 'bn' ? 'মোট বিক্রয়:' : 'Total:'} {formatCurrency(totalAmount, language)}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={totalAmount > 0 ? totalAmount : undefined}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="পরিশোধিত পরিমাণ লিখুন"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Live breakdown of partial vs remaining due */}
                {(() => {
                  const currentPaid = parseFloat(paidAmount) || 0;
                  const remainingDue = Math.max(0, totalAmount - currentPaid);
                  return (
                    <div className="pt-1.5 border-t border-blue-200/80 flex items-center justify-between text-xs font-medium">
                      <div className="text-emerald-700">
                        <span>{language === 'bn' ? 'নগদ জমা: ' : 'Paid: '}</span>
                        <strong>{formatCurrency(currentPaid, language)}</strong>
                        <span className="text-[10px] text-slate-500 ml-1">({paymentMethod})</span>
                      </div>
                      <div className="text-rose-700 font-bold">
                        <span>{language === 'bn' ? 'বাকি থাকবে: ' : 'Remaining Due: '}</span>
                        <span>{formatCurrency(remainingDue, language)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Customer Name & Optional Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'কাস্টমারের নাম' : 'Customer Name'}{' '}
                {payment === 'বাকি' ? (
                  <span className="text-rose-500">
                    {language === 'bn' ? '* (বাকির জন্য আবশ্যক)' : '* (Required for Due)'}
                  </span>
                ) : payment === 'আংশিক' ? (
                  <span className="text-blue-600">
                    {language === 'bn' ? '* (বাকি রাখার জন্য আবশ্যক)' : '* (Required for Partial Due)'}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {language === 'bn' ? '(ঐচ্ছিক)' : '(Optional)'}
                  </span>
                )}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isViewer}
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder={
                    payment === 'বাকি' || payment === 'আংশিক'
                      ? (language === 'bn' ? 'কাস্টমারের নাম লিখুন (বাকি খাতায় যুক্ত হবে)' : 'Enter customer name (linked to due ledger)')
                      : (language === 'bn' ? 'সাধারণ ক্রেতা (ঐচ্ছিক)' : 'Walk-in customer (optional)')
                  }
                  className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-60 ${
                    (payment === 'বাকি' || payment === 'আংশিক') && !customer.trim()
                      ? 'border-amber-400 focus:ring-amber-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>{language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}</span>
                <span className="text-slate-400 font-normal">{language === 'bn' ? '(ঐচ্ছিক)' : '(Optional)'}</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  disabled={isViewer}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={language === 'bn' ? '০১৭xxxxxxxx (ঐচ্ছিক)' : '017xxxxxxxx (Optional)'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Live Total Calculation Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-200 block">
                {language === 'bn' ? 'মোট বিক্রয় মূল্য' : 'Total Sale Amount'}
              </span>
              <span className="text-xl font-black tracking-tight block mt-0.5">
                {formatCurrency(totalAmount, language)}
              </span>
            </div>

            <div className="text-right text-[11px] text-slate-300">
              <div>
                {language === 'bn' ? 'পরিমাণ: ' : 'Qty: '}
                {qty || 0} {formatUnit(currentProduct?.unit, language)}
              </div>
              <div>
                {language === 'bn' ? 'দর: ' : 'Rate: '}@{price || 0} ৳
              </div>
            </div>
          </div>

          {/* Submit Button */}
          {canManage ? (
            <button
              type="submit"
              disabled={submitting || availableProducts.length === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>{language === 'bn' ? 'বিক্রয় নিশ্চিত করুন' : 'Complete Sale'}</span>
                </>
              )}
            </button>
          ) : (
            <div className="p-3 text-center bg-slate-100 rounded-xl text-xs font-semibold text-slate-500">
              {language === 'bn'
                ? 'ভিউয়ার একাউন্টে বিক্রি এন্ট্রি করার অনুমতি নেই'
                : 'Viewer accounts cannot record new sales'}
            </div>
          )}
        </form>
      </div>

      {/* CSV Sales Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {language === 'bn' ? 'বিক্রয় CSV ইমপোর্ট' : 'Import Sales CSV'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn' ? 'পূর্বের বা দৈনিক বিক্রির তালিকা আপলোড' : 'Upload previous or daily sales records'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCSVModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl text-center cursor-pointer transition"
              >
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">
                  {language === 'bn' ? 'বিক্রয় CSV ফাইল নির্বাচন করুন' : 'Select Sales CSV File'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'কলাম হেডার: পণ্য, পরিমাণ, একক, মূল্য, তারিখ, পেমেন্ট, ক্রেতা'
                    : 'Headers: product, qty, unit, price, date, payment, customer'}
                </p>
                {csvFileName && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                    ✓ {csvFileName}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileChange}
                  className="hidden"
                />
              </div>

              {csvErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-700 text-xs">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />{' '}
                    {language === 'bn' ? 'ফাইলে ত্রুটি পাওয়া গেছে:' : 'Errors found in file:'}
                  </div>
                  {csvErrors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>
              )}

              {csvPreview.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">
                    {language === 'bn'
                      ? `প্রিভিউ (${toBengaliNumber(csvPreview.length)} টি বিক্রির রেকর্ড)`
                      : `Preview (${csvPreview.length} sales records)`}
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                          <th className="py-2 px-2 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                          <th className="py-2 px-2 text-right">{language === 'bn' ? 'মূল্য' : 'Price'}</th>
                          <th className="py-2 px-2 text-center">{language === 'bn' ? 'পেমেন্ট' : 'Payment'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreview.slice(0, 15).map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2.5 font-medium">{row.productName}</td>
                            <td className="py-1.5 px-2 text-center">{row.qty} {formatUnit(row.unit, language)}</td>
                            <td className="py-1.5 px-2 text-right">{formatCurrency(row.price, language)}</td>
                            <td className="py-1.5 px-2 text-center">{row.payment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCSVModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={csvPreview.length === 0 || importingCSV}
                onClick={handleImportCSVBatch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                {importingCSV
                  ? (language === 'bn' ? 'ইমপোর্ট হচ্ছে...' : 'Importing...')
                  : (language === 'bn' ? 'সব বিক্রি ইমপোর্ট করুন' : 'Import All Sales')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
