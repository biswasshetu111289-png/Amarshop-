import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { markCustomerDuesAsPaid, collectCustomerDuePayment } from '../services/storeService';
import {
  formatCurrency,
  formatQty,
  formatBengaliDate,
  formatNumber,
  formatUnit,
  formatPaymentMethod,
  toBengaliNumber,
} from '../utils/formatters';
import { CustomerDueSummary, PAYMENT_METHODS } from '../types';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  ShieldAlert,
  Coins,
  Banknote,
  FileText,
  Building2,
  Receipt,
  Users,
} from 'lucide-react';
import { SupplierDuesTab } from './accounting/SupplierDuesTab';
import { ExpensesTab } from './accounting/ExpensesTab';
import { PartnershipTab } from './accounting/PartnershipTab';

export type DuesSubTab = 'customer' | 'supplier' | 'expenses' | 'partnership';

interface CreditDuesViewProps {
  initialSubTab?: DuesSubTab;
}

export const CreditDuesView: React.FC<CreditDuesViewProps> = ({ initialSubTab = 'customer' }) => {
  const { user } = useAuth();
  const {
    customerDues,
    totalDuesAmount,
    supplierDues,
    totalSupplierDuesAmount,
    partners,
    totalCapitalDue,
    currentShop,
    canManage,
    isViewer,
  } = useStore();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState<DuesSubTab>(initialSubTab);

  // Sync if initialSubTab changes
  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Payment Collection Modal State
  const [collectingCustomer, setCollectingCustomer] = useState<CustomerDueSummary | null>(null);
  const [collectMode, setCollectMode] = useState<'full' | 'partial'>('full');
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectPaymentMethod, setCollectPaymentMethod] = useState<string>('নগদ');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [submittingCollection, setSubmittingCollection] = useState(false);

  const targetId = currentShop?.id || user?.uid || '';

  // Filter dues by customer name
  const filteredCustomerDues = useMemo(() => {
    return customerDues.filter((cd) =>
      cd.customer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customerDues, searchQuery]);

  const openCollectionModal = (dueSummary: CustomerDueSummary) => {
    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র এডমিন বা ম্যানেজার বাকি আদায় এন্ট্রি করতে পারেন'
          : 'Only Admin or Manager can collect due payments',
        'warning'
      );
      return;
    }
    setCollectingCustomer(dueSummary);
    setCollectMode('full');
    setCollectAmount(String(dueSummary.totalDue));
    setCollectPaymentMethod('নগদ');
    setCollectNotes('');
  };

  const handleConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetId || !collectingCustomer) return;

    if (!canManage) {
      showToast(
        language === 'bn'
          ? 'শুধুমাত্র এডমিন বা ম্যানেজার বাকি আদায় করতে পারেন'
          : 'Only Admin or Manager can collect dues',
        'warning'
      );
      return;
    }

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast(
        language === 'bn' ? 'সঠিক আদায়ের পরিমাণ দিন' : 'Enter a valid payment amount',
        'warning'
      );
      return;
    }

    if (amountNum > collectingCustomer.totalDue) {
      showToast(
        language === 'bn'
          ? `আদায়ের পরিমাণ মোট বাকি (${formatCurrency(collectingCustomer.totalDue, language)}) এর চেয়ে বেশি হতে পারে না`
          : `Amount cannot exceed total due (${formatCurrency(collectingCustomer.totalDue, language)})`,
        'warning'
      );
      return;
    }

    setSubmittingCollection(true);
    try {
      await collectCustomerDuePayment(
        targetId,
        collectingCustomer.sales,
        amountNum,
        collectPaymentMethod,
        collectNotes.trim()
      );

      // Celebrate collection!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      const remaining = Math.max(0, collectingCustomer.totalDue - amountNum);
      showToast(
        language === 'bn'
          ? `"${collectingCustomer.customer}" এর ৳ ${amountNum.toLocaleString('en-US')} বাকি আদায় সফল হয়েছে!${
              remaining > 0 ? ` (অবশিষ্ট বাকি: ${formatCurrency(remaining, language)})` : ' (সম্পূর্ণ পরিশোধিত)'
            }`
          : `Collected ৳ ${amountNum.toLocaleString('en-US')} from "${collectingCustomer.customer}" successfully!`,
        'success'
      );

      setCollectingCustomer(null);
    } catch (err) {
      console.error(err);
      showToast(
        language === 'bn' ? 'বাকি আদায় সংরক্ষণ করতে সমস্যা হয়েছে' : 'Failed to collect due payment',
        'error'
      );
    } finally {
      setSubmittingCollection(false);
    }
  };

  const toggleExpand = (customer: string) => {
    setExpandedCustomer((prev) => (prev === customer ? null : customer));
  };

  return (
    <div className="space-y-4 pb-4">
      {/* 4 Segmented Accounting Sub-Tabs */}
      <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('customer')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 ${
            activeSubTab === 'customer'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="truncate">{language === 'bn' ? 'কাস্টমার পাওনা' : 'Customer'}</span>
          {customerDues.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white">
              {formatNumber(customerDues.length, language)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('supplier')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 ${
            activeSubTab === 'supplier'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-rose-600" />
          <span className="truncate">{language === 'bn' ? 'পাইকার দেনা' : 'Supplier'}</span>
          {supplierDues.filter((d) => d.dueAmount > 0).length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white">
              {formatNumber(
                supplierDues.filter((d) => d.dueAmount > 0).length,
                language
              )}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 ${
            activeSubTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
          <span className="truncate">{language === 'bn' ? 'খরচের খাতা' : 'Expenses'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('partnership')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 ${
            activeSubTab === 'partnership'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span className="truncate">{language === 'bn' ? 'পার্টনারশিপ' : 'Partners'}</span>
          {totalCapitalDue > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-500 text-white">
              বাকি
            </span>
          )}
        </button>
      </div>

      {/* Render Other Accounting Sub-Tabs */}
      {activeSubTab === 'supplier' && <SupplierDuesTab />}
      {activeSubTab === 'expenses' && <ExpensesTab />}
      {activeSubTab === 'partnership' && <PartnershipTab />}

      {/* Customer Dues Tab View */}
      {activeSubTab === 'customer' && (
        <>
          {/* Viewer Notice */}
          {isViewer && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{language === 'bn' ? 'ভিউয়ার মোড:' : 'Viewer Mode:'}</strong>{' '}
                {language === 'bn'
                  ? 'আপনি শুধুমাত্র বাকির খাতা দেখতে পারবেন। বাকি পরিশোধ মার্ক করার জন্য ম্যানেজার বা এডমিন অনুমতি প্রয়োজন।'
                  : 'You can only view dues. Manager or Admin permission is required to record due payments.'}
              </span>
            </div>
          )}

          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {language === 'bn' ? 'বাকি খাতা (কাস্টমার দেনা)' : 'Customer Dues Ledger'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? `${currentShop?.name || 'দোকানের'} গ্রাহকদের কাছে পাওনা টাকার সার্বিক বিবরণ`
                  : `Summary of outstanding customer dues for ${currentShop?.name || 'Shop'}`}
              </p>
            </div>
          </div>

      {/* Prominent Outstanding Dues Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 rounded-2xl p-4.5 text-white shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-rose-100 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{language === 'bn' ? 'মোট অনাদায়ী বাকি' : 'Total Outstanding Dues'}</span>
          </div>
          <div className="text-2xl md:text-3xl font-black mt-1 tracking-tight">
            {formatCurrency(totalDuesAmount, language)}
          </div>
          <p className="text-[11px] text-rose-100/90 mt-0.5">
            {language === 'bn'
              ? `মোট ${formatNumber(customerDues.length, 'bn')} জন ক্রেতার কাছে বাকি রয়েছে`
              : `${formatNumber(customerDues.length, 'en')} customer(s) have outstanding dues`}
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 text-white">
          <CreditCard className="w-6 h-6" />
        </div>
      </div>

      {/* Customer Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'ক্রেতার নাম দিয়ে খুঁজুন...' : 'Search by customer name...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomerDues.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-semibold text-slate-700 text-sm">
            {searchQuery
              ? (language === 'bn' ? 'এই নামে কোনো বাকি নেই' : 'No dues found for this name')
              : (language === 'bn' ? 'কোনো ক্রেতার কাছে বাকি নেই!' : 'No outstanding customer dues!')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'bn' ? 'সকল হিসাব পরিশোধিত রয়েছে' : 'All accounts are settled'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomerDues.map((item) => {
            const isExpanded = expandedCustomer === item.customer;

            return (
              <div
                key={item.customer}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition"
              >
                {/* Header Row */}
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div
                    onClick={() => toggleExpand(item.customer)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {item.customer.charAt(0) || <User className="w-5 h-5" />}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{item.customer}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                          {formatNumber(item.sales.length, language)} {language === 'bn' ? 'টি চালান' : 'invoices'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{language === 'bn' ? 'সর্বশেষ:' : 'Last:'} {formatBengaliDate(item.lastDate, language)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'মোট বাকি' : 'Total Due'}</span>
                      <span className="text-sm md:text-base font-black text-rose-600 block">
                        {formatCurrency(item.totalDue, language)}
                      </span>
                    </div>

                    {canManage && (
                      <button
                        onClick={() => openCollectionModal(item)}
                        title={language === 'bn' ? 'বাকি আদায় বা পরিশোধ গ্রহণ করুন' : 'Collect due payment'}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs shrink-0"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'bn' ? 'বাকি আদায়' : 'Collect'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(item.customer)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown of Outstanding Invoices */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-3 space-y-2 text-xs">
                    <div className="font-semibold text-slate-600 text-[11px] flex items-center justify-between">
                      <span>{language === 'bn' ? 'বাকির বিস্তারিত বিবরণী:' : 'Outstanding Invoices:'}</span>
                      <span>
                        {formatNumber(item.sales.length, language)} {language === 'bn' ? 'টি আইটেম' : 'items'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {item.sales.map((sale) => {
                        const invoiceDue =
                          sale.dueAmount !== undefined
                            ? Number(sale.dueAmount)
                            : sale.payment === 'বাকি'
                            ? Number(sale.total)
                            : 0;
                        const invoicePaid =
                          sale.paidAmount !== undefined
                            ? Number(sale.paidAmount)
                            : sale.payment === 'নগদ'
                            ? Number(sale.total)
                            : 0;

                        return (
                          <div
                            key={sale.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-slate-800">
                                {sale.productName}
                              </div>
                              <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span>{formatBengaliDate(sale.date, language)}</span>
                                <span>•</span>
                                <span>
                                  {formatQty(sale.qty, sale.unit, language)} @ {formatCurrency(sale.price, language)}
                                </span>
                                {sale.paymentMethod && (
                                  <span className="bg-slate-100 text-slate-600 px-1 rounded font-medium">
                                    {formatPaymentMethod(sale.paymentMethod, language)}
                                  </span>
                                )}
                              </div>
                              {invoicePaid > 0 && invoiceDue > 0 && (
                                <div className="text-[10px] text-emerald-600 mt-0.5">
                                  {language === 'bn' ? 'আগে পরিশোধ:' : 'Paid:'} {formatCurrency(invoicePaid, language)}
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold text-rose-600 block">
                                {formatCurrency(invoiceDue, language)}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                  sale.payment === 'আংশিক'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {sale.payment === 'আংশিক'
                                  ? (language === 'bn' ? 'আংশিক বাকি' : 'Partial Due')
                                  : (language === 'bn' ? 'বাকি' : 'Due')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Payment Collection Modal (সম্পূর্ণ বা আংশিক বাকি আদায় ও পেমেন্টের ধরন) */}
      {collectingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {language === 'bn' ? 'বাকি টাকা আদায় গ্রহণ' : 'Collect Due Payment'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {collectingCustomer.customer} • {language === 'bn' ? 'মোট বাকি: ' : 'Total Due: '}
                    <strong className="text-rose-600 font-bold">
                      {formatCurrency(collectingCustomer.totalDue, language)}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCollectingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Payment Mode (সম্পূর্ণ বা আংশিক) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'bn' ? 'আদায়ের ধরন নির্বাচন করুন' : 'Select Collection Mode'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectMode('full');
                      setCollectAmount(String(collectingCustomer.totalDue));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      collectMode === 'full'
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সম্পূর্ণ পরিশোধ' : 'Full Payment'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCollectMode('partial');
                      if (collectAmount === String(collectingCustomer.totalDue)) {
                        setCollectAmount('');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      collectMode === 'partial'
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'আংশিক আদায়' : 'Partial Payment'}</span>
                  </button>
                </div>
              </div>

              {/* Collection Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {language === 'bn' ? 'আদায়ের পরিমাণ (৳)' : 'Collection Amount (৳)'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {language === 'bn' ? 'মোট পাওনা:' : 'Total Due:'}{' '}
                    {formatCurrency(collectingCustomer.totalDue, language)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    max={collectingCustomer.totalDue}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder={language === 'bn' ? 'টাকার অংক লিখুন' : 'Enter amount'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Remaining Due Preview */}
                {(() => {
                  const inputNum = parseFloat(collectAmount) || 0;
                  const remaining = Math.max(0, collectingCustomer.totalDue - inputNum);
                  return (
                    <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        {language === 'bn' ? 'এই আদায়ে অবশিষ্ট বাকি থাকবে:' : 'Remaining Due after payment:'}
                      </span>
                      <strong className={remaining > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                        {remaining > 0
                          ? formatCurrency(remaining, language)
                          : (language === 'bn' ? 'পরিশোধ সম্পন্ন (০ ৳)' : 'Fully Cleared (৳ 0)')}
                      </strong>
                    </div>
                  );
                })()}
              </div>

              {/* Type of Payment (পেমেন্টের ধরন - ঐচ্ছিক) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {language === 'bn'
                      ? 'পেমেন্টের ধরন (Type of Payment) - ঐচ্ছিক'
                      : 'Type of Payment (Method) - Optional'}
                  </span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = collectPaymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setCollectPaymentMethod(method.id)}
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

              {/* Notes (ঐচ্ছিক) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'মন্তব্য বা ট্রানজেকশন নোট (ঐচ্ছিক)' : 'Notes / TxID (Optional)'}</span>
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: bKash TrxID #...' : 'e.g. bKash TrxID #...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectingCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={submittingCollection}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingCollection ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === 'bn' ? 'পেমেন্ট নিশ্চিত করুন' : 'Confirm Payment'}</span>
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
