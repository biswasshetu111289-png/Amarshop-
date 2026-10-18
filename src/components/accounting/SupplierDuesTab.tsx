import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { SupplierDue, SupplierPayment, PAYMENT_METHODS } from '../../types';
import { formatCurrency, formatNumber, formatBengaliDate } from '../../utils/formatters';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit2,
  Trash2,
  Lock,
  Package,
} from 'lucide-react';

export const SupplierDuesTab: React.FC = () => {
  const {
    supplierDues,
    totalSupplierDuesAmount,
    isAdmin,
    addSupplierDue,
    updateSupplierDue,
    paySupplierDue,
    deleteSupplierDue,
  } = useStore();

  const { language } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [expandedDueId, setExpandedDueId] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDue, setSelectedDue] = useState<SupplierDue | null>(null);

  // Add/Edit Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pay Modal State
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('নগদ');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);

  // Filtered supplier dues
  const filteredDues = useMemo(() => {
    return supplierDues.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        d.supplierName.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q)) ||
        (d.invoiceNo && d.invoiceNo.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter === 'due') {
        return d.dueAmount > 0;
      }
      if (statusFilter === 'paid') {
        return d.dueAmount <= 0;
      }
      return true;
    });
  }, [supplierDues, searchQuery, statusFilter]);

  // Aggregate stats
  const totalPurchasedAmount = useMemo(() => {
    return supplierDues.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
  }, [supplierDues]);

  const totalPaidToSuppliers = useMemo(() => {
    return supplierDues.reduce((sum, d) => sum + (Number(d.paidAmount) || 0), 0);
  }, [supplierDues]);

  const pendingSuppliersCount = useMemo(() => {
    return supplierDues.filter((d) => d.dueAmount > 0).length;
  }, [supplierDues]);

  // Open Add Modal
  const openAddModal = () => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন পাইকার দেনা এন্ট্রি করতে পারেন', 'warning');
      return;
    }
    setSupplierName('');
    setSupplierPhone('');
    setInvoiceNo('');
    setDescription('');
    setTotalAmount('');
    setPaidAmount('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setSupplierNotes('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (d: SupplierDue) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন পাইকার তথ্য এডিট করতে পারেন', 'warning');
      return;
    }
    setSelectedDue(d);
    setSupplierName(d.supplierName);
    setSupplierPhone(d.phone || '');
    setInvoiceNo(d.invoiceNo || '');
    setDescription(d.description || '');
    setTotalAmount(String(d.totalAmount));
    setPaidAmount(String(d.paidAmount));
    setPurchaseDate(d.purchaseDate);
    setDueDate(d.dueDate || '');
    setSupplierNotes(d.notes || '');
    setShowEditModal(true);
  };

  // Open Pay Modal
  const openPayModal = (d: SupplierDue) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন পাইকারের দেনা পরিশোধ করতে পারেন', 'warning');
      return;
    }
    setSelectedDue(d);
    setPayAmount(String(d.dueAmount));
    setPaymentMethod('নগদ');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes(`পাইকার বিল পরিশোধ (${d.supplierName})`);
    setRecordExpense(true);
    setShowPayModal(true);
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast('পাইকার বা হোলসেলারের নাম দিন', 'warning');
      return;
    }
    const tot = parseFloat(totalAmount);
    if (isNaN(tot) || tot <= 0) {
      showToast('সঠিক মালের মোট মূল্যের পরিমাণ দিন', 'warning');
      return;
    }
    const paid = parseFloat(paidAmount || '0') || 0;

    try {
      setSubmitting(true);
      await addSupplierDue({
        supplierName: supplierName.trim(),
        phone: supplierPhone.trim(),
        invoiceNo: invoiceNo.trim(),
        description: description.trim(),
        totalAmount: tot,
        paidAmount: paid,
        dueAmount: Math.max(0, tot - paid),
        purchaseDate,
        dueDate: dueDate.trim() || undefined,
        status: tot - paid <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due',
        notes: supplierNotes.trim(),
      });
      showToast('পাইকার দেনা রেকর্ড সফলভাবে যুক্ত হয়েছে', 'success');
      setShowAddModal(false);
    } catch (err: any) {
      showToast(err.message || 'রেকর্ড যোগ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue) return;
    if (!supplierName.trim()) {
      showToast('পাইকারের নাম দিন', 'warning');
      return;
    }
    const tot = parseFloat(totalAmount);
    if (isNaN(tot) || tot <= 0) {
      showToast('সঠিক মালের মোট মূল্যের পরিমাণ দিন', 'warning');
      return;
    }
    const paid = parseFloat(paidAmount || '0') || 0;

    try {
      setSubmitting(true);
      await updateSupplierDue(selectedDue.id, {
        supplierName: supplierName.trim(),
        phone: supplierPhone.trim(),
        invoiceNo: invoiceNo.trim(),
        description: description.trim(),
        totalAmount: tot,
        paidAmount: paid,
        dueAmount: Math.max(0, tot - paid),
        purchaseDate,
        dueDate: dueDate.trim() || undefined,
        notes: supplierNotes.trim(),
      });
      showToast('পাইকার তথ্য আপডেট করা হয়েছে', 'success');
      setShowEditModal(false);
    } catch (err: any) {
      showToast(err.message || 'আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Pay Submit
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDue) return;
    const pAmt = parseFloat(payAmount);
    if (isNaN(pAmt) || pAmt <= 0) {
      showToast('সঠিক পরিশোধের পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await paySupplierDue(selectedDue.id, pAmt, {
        date: payDate,
        paymentMethod,
        notes: payNotes.trim(),
        recordExpense,
      });
      showToast(
        `৳${pAmt} পাইকার দেনা পরিশোধ সফলভাবে রেকর্ড হয়েছে${
          recordExpense ? ' এবং খরচের খাতায় যুক্ত হয়েছে' : ''
        }`,
        'success'
      );
      setShowPayModal(false);
    } catch (err: any) {
      showToast(err.message || 'পরিশোধ রেকর্ড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteDue = async () => {
    if (!selectedDue) return;
    try {
      setSubmitting(true);
      await deleteSupplierDue(selectedDue.id);
      showToast('পাইকার দেনা রেকর্ড মুছে ফেলা হয়েছে', 'info');
      setShowDeleteModal(false);
      setSelectedDue(null);
    } catch (err: any) {
      showToast(err.message || 'মুছে ফেলতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Read-Only Notice for Non-Admin */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800 flex items-center gap-2.5 text-xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {language === 'bn'
              ? 'আপনি শুধুমাত্র পাইকার দেনা খাতা দেখতে পাচ্ছেন। এন্ট্রি, পরিশোধ বা ডিলিট শুধুমাত্র প্রধান এডমিন করতে পারবেন।'
              : 'You are viewing supplier dues in read-only mode. Only the main Admin can add, pay, or delete.'}
          </span>
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Total Supplier Dues (পাইকার পাবে) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট পাইকার দেনা' : 'Supplier Dues'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600">
              {formatCurrency(totalSupplierDuesAmount, language)}
            </div>
            <div className="text-[11px] text-rose-500 mt-0.5">
              {language === 'bn'
                ? `${formatNumber(pendingSuppliersCount, language)} টি চালানে বাকি`
                : `${pendingSuppliersCount} pending invoices`}
            </div>
          </div>
        </div>

        {/* Card 2: Total Purchased */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট বাকিতে ক্রয়' : 'Total Invoiced'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-800">
              {formatCurrency(totalPurchasedAmount, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn'
                ? `মোট ${formatNumber(supplierDues.length, language)} টি ভাউচার`
                : `${supplierDues.length} total entries`}
            </div>
          </div>
        </div>

        {/* Card 3: Total Paid */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'পরিশোধিত টাকা' : 'Total Paid'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-600">
              {formatCurrency(totalPaidToSuppliers, language)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {totalPurchasedAmount > 0
                ? `${formatNumber(
                    Math.round((totalPaidToSuppliers / totalPurchasedAmount) * 100),
                    language
                  )}% পরিশোধ সম্পন্ন`
                : '০%'}
            </div>
          </div>
        </div>

        {/* Card 4: Action / Add Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-900">
              {language === 'bn' ? 'বাকিতে মাল এনেছেন?' : 'Bought on credit?'}
            </span>
            <p className="text-[11px] text-indigo-700/80 mt-0.5">
              {language === 'bn' ? 'হোলসেলার ও দেনার খাতা' : 'Record supplier purchase'}
            </p>
          </div>
          {isAdmin ? (
            <button
              onClick={openAddModal}
              className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'দেনা এন্ট্রি করুন' : 'Add Supplier Due'}</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 italic">শুধুমাত্র এডমিন এন্ট্রি করতে পারেন</span>
          )}
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'পাইকারের নাম, ফোন, চালান বা মালের বিবরণ দিয়ে খুঁজুন...'
                : 'Search supplier name, phone, memo...'
            }
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {language === 'bn' ? 'সবগুলো' : 'All'} ({formatNumber(supplierDues.length, language)})
          </button>

          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              statusFilter === 'due'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            {language === 'bn' ? 'বকেয়া দেনা' : 'Pending Dues'} (
            {formatNumber(pendingSuppliersCount, language)})
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {language === 'bn' ? 'পরিশোধিত' : 'Fully Paid'} (
            {formatNumber(supplierDues.filter((d) => d.dueAmount <= 0).length, language)})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredDues.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {language === 'bn' ? 'কোনো পাইকার দেনার রেকর্ড পাওয়া যায়নি' : 'No supplier dues found'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'bn'
                ? 'পাইকার বা হোলসেলারের কাছ থেকে বাকিতে মাল নিয়ে থাকলে এখানে এন্ট্রি করুন।'
                : 'Record purchases bought on credit from suppliers and track payments.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন পাইকার দেনা এন্ট্রি' : 'Add First Supplier Due'}</span>
            </button>
          )}
        </div>
      ) : (
        /* Supplier Dues Cards List */
        <div className="space-y-3">
          {filteredDues.map((due) => {
            const isExpanded = expandedDueId === due.id;
            const isFullyPaid = due.dueAmount <= 0;
            const paidPercent =
              due.totalAmount > 0
                ? Math.min(100, Math.round((due.paidAmount / due.totalAmount) * 100))
                : 100;

            return (
              <div
                key={due.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-slate-200 transition"
              >
                <div className="p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800">{due.supplierName}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFullyPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : due.paidAmount > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isFullyPaid
                            ? language === 'bn'
                              ? 'পরিশোধিত'
                              : 'Paid'
                            : due.paidAmount > 0
                            ? language === 'bn'
                              ? 'আংশিক পরিশোধ'
                              : 'Partial'
                            : language === 'bn'
                            ? 'বাকি দেনা'
                            : 'Due'}
                        </span>
                        {due.invoiceNo && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            মেমো: #{due.invoiceNo}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {language === 'bn' ? 'ক্রয়:' : 'Bought:'}{' '}
                          {formatBengaliDate(due.purchaseDate, language)}
                        </span>

                        {due.dueDate && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Clock className="w-3 h-3" />
                            {language === 'bn' ? 'পরিশোধের তারিখ:' : 'Due Date:'}{' '}
                            {formatBengaliDate(due.dueDate, language)}
                          </span>
                        )}

                        {due.phone && (
                          <a
                            href={`tel:${due.phone}`}
                            className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{due.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(due)}
                          title="এডিট"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDue(due);
                            setShowDeleteModal(true);
                          }}
                          title="ডিলিট"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description of products bought on credit */}
                  {due.description && (
                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-600">মালের বিবরণ:</span>{' '}
                        <span>{due.description}</span>
                      </div>
                    </div>
                  )}

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/70 rounded-xl text-center">
                    <div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {language === 'bn' ? 'মোট মূল্য' : 'Total'}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {formatCurrency(due.totalAmount, language)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {language === 'bn' ? 'পরিশোধিত' : 'Paid'}
                      </div>
                      <div className="text-xs font-bold text-emerald-600 mt-0.5">
                        {formatCurrency(due.paidAmount, language)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {language === 'bn' ? 'পাইকার পাবে' : 'Due'}
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          due.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(due.dueAmount, language)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFullyPaid
                            ? 'bg-emerald-500'
                            : paidPercent > 0
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center justify-between pt-1">
                    {isAdmin && !isFullyPaid ? (
                      <button
                        onClick={() => openPayModal(due)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'টাকা পরিশোধ করুন' : 'Pay Supplier'}</span>
                      </button>
                    ) : isFullyPaid ? (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'সম্পূর্ণ দেনা পরিশোধিত' : 'Fully Settled'}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">ভিউ মোড</span>
                    )}

                    <button
                      onClick={() => setExpandedDueId(isExpanded ? null : due.id)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 transition ml-auto"
                    >
                      <span>
                        {language === 'bn'
                          ? `পেমেন্ট হিস্ট্রি (${formatNumber(
                              due.payments?.length || 0,
                              language
                            )})`
                          : `Payments (${due.payments?.length || 0})`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Payment History */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-100 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{language === 'bn' ? 'পাইকার দেনা পরিশোধ হিস্ট্রি' : 'Payment History'}</span>
                      {due.notes && (
                        <span className="text-[11px] text-slate-400 italic">নোট: {due.notes}</span>
                      )}
                    </div>

                    {!due.payments || due.payments.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1 text-center">
                        {language === 'bn' ? 'এখনো কোনো পেমেন্ট রেকর্ড নেই' : 'No payments logged'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {due.payments.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/70 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <div>
                                <span className="font-medium text-slate-700">
                                  {formatBengaliDate(p.date, language)}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1.5">
                                  ({p.paymentMethod || 'নগদ'})
                                </span>
                                {p.notes && (
                                  <p className="text-[10px] text-slate-400">{p.notes}</p>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-emerald-600">
                              -{formatCurrency(p.amount, language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD SUPPLIER DUE */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'বাকিতে মাল ক্রয় / পাইকার দেনা' : 'Add Supplier Due'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'হোলসেলারের চালান ও বাকি টাকার হিসাব রাখুন'
                      : 'Record credit purchase from wholesaler'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পাইকার বা হোলসেলারের নাম *' : 'Supplier Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: ভাই ভাই গার্মেন্টস, চকবাজার' : 'Supplier Name'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চালান / মেমো নং (ঐচ্ছিক)' : 'Memo / Invoice #'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. 5042"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'কী মাল আনা হয়েছে (মালের বিবরণ) *' : 'Goods / Items Description *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'যেমন: ৫০ পিস কটন শার্ট, ২০ পিস জিন্স প্যান্ট'
                      : 'e.g. 50 pcs cotton shirts, 20 pcs jeans'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোট মালের মূল্য (৳) *' : 'Total Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="২৫,০০০"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'নগদে প্রদান করা হয়েছে (৳)' : 'Paid Amount (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="১০,০০০ (যদি দেন)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Real-time Due preview */}
              {totalAmount && (
                <div className="p-3 bg-rose-50 rounded-xl flex items-center justify-between text-xs border border-rose-100">
                  <span className="text-rose-800 font-medium">পাইকার বকেয়া পাবে (দেনা):</span>
                  <span className="font-bold text-rose-700 text-sm">
                    {formatCurrency(
                      Math.max(
                        0,
                        (parseFloat(totalAmount) || 0) - (parseFloat(paidAmount || '0') || 0)
                      ),
                      language
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্রয়ের তারিখ' : 'Purchase Date'}
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'টাকা পরিশোধের শেষ তারিখ' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোট / মন্তব্য' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="যেমন: ১৫ দিন পর চেকে বা নগদে পরিশোধ করতে হবে"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{language === 'bn' ? 'দেনা সংরক্ষণ করুন' : 'Save Due'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PAY SUPPLIER (পাইকার দেনা পরিশোধ) */}
      {/* ========================================================================= */}
      {showPayModal && selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'পাইকার দেনা পরিশোধ' : 'Pay Supplier Due'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    পাইকার: <strong className="text-slate-700">{selectedDue.supplierName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-rose-800 font-medium">বর্তমানে মোট বাকি দেনা:</span>
              <span className="text-sm font-bold text-rose-700">
                {formatCurrency(selectedDue.dueAmount, language)}
              </span>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পরিশোধের পরিমাণ (৳) *' : 'Payment Amount (৳) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'পরিশোধ মাধ্যম' : 'Payment Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {language === 'bn' ? pm.nameBn : pm.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'পরিশোধের তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Record as Expense Checkbox */}
              <label className="flex items-start gap-2.5 p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordExpense}
                  onChange={(e) => setRecordExpense(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 block">
                    {language === 'bn' ? 'খরচের খাতায় স্বয়ংক্রিয় যোগ করুন' : 'Auto-record as Expense'}
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    {language === 'bn'
                      ? 'এই টাকাটি খরচের খাতায় "পাইকার বিল পরিশোধ" হিসেবে যোগ হবে যাতে নিট প্রফিট সঠিক থাকে।'
                      : 'Logs this payout under daily expenses to accurately calculate net profit.'}
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোট' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="যেমন: কিস্তি পরিশোধ"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{language === 'bn' ? 'পরিশোধ নিশ্চিত করুন' : 'Confirm Payment'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT SUPPLIER DUE */}
      {/* ========================================================================= */}
      {showEditModal && selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'পাইকার তথ্য পরিবর্তন' : 'Edit Supplier Due'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পাইকারের নাম *' : 'Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোবাইল' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চালান নম্বর' : 'Invoice #'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'মালের বিবরণ' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোট মালের মূল্য (৳) *' : 'Total (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'পরিশোধিত টাকা (৳)' : 'Paid (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-emerald-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>আপডেট করুন</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {showDeleteModal && selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {language === 'bn' ? 'পাইকার দেনা রেকর্ড মুছবেন?' : 'Delete Supplier Due?'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? `আপনি কি নিশ্চিতভাবে "${selectedDue.supplierName}"-এর চালান রেকর্ড মুছে ফেলতে চান?`
                  : `Are you sure you want to delete ${selectedDue.supplierName}?`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDue(null);
                }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteDue}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>মুছে ফেলুন</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
