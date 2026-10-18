import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '../../types';
import { formatCurrency, formatNumber, formatBengaliDate } from '../../utils/formatters';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Tag,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  Edit2,
  Trash2,
  Lock,
  ArrowRight,
  Filter,
  CheckCircle2,
  PieChart,
} from 'lucide-react';

export const ExpensesTab: React.FC = () => {
  const {
    expenses,
    totalExpensesAmount,
    grossProfitAmount,
    netProfitAmount,
    sales,
    isAdmin,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useStore();

  const { language } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_month'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | string>('যাতায়াত ও ভাড়া');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthPrefix = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Total sales revenue for margin %
  const totalSalesRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [sales]);

  const netProfitMarginPercent = useMemo(() => {
    if (totalSalesRevenue <= 0) return 0;
    return Math.round((netProfitAmount / totalSalesRevenue) * 100);
  }, [netProfitAmount, totalSalesRevenue]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        e.title.toLowerCase().includes(q) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.paidBy && e.paidBy.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }

      if (dateFilter === 'today' && e.date !== todayStr) {
        return false;
      }

      if (dateFilter === 'this_month' && !e.date.startsWith(currentMonthPrefix)) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, dateFilter, todayStr, currentMonthPrefix]);

  // Category-wise totals for insight
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of expenses) {
      const cat = exp.category || 'অন্যান্য খরচ';
      map.set(cat, (map.get(cat) || 0) + Number(exp.amount));
    }
    const list = Array.from(map.entries()).map(([cat, amt]) => ({ category: cat, total: amt }));
    list.sort((a, b) => b.total - a.total);
    return list;
  }, [expenses]);

  // Open Add Modal
  const openAddModal = () => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন খরচ যোগ করতে পারেন', 'warning');
      return;
    }
    setTitle('');
    setAmount('');
    setCategory('যাতায়াত ও ভাড়া');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidBy('');
    setNotes('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (exp: Expense) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন খরচ এডিট করতে পারেন', 'warning');
      return;
    }
    setSelectedExpense(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setCategory(exp.category);
    setDate(exp.date);
    setPaidBy(exp.paidBy || '');
    setNotes(exp.notes || '');
    setShowEditModal(true);
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('খরচের বিবরণ বা নাম দিন', 'warning');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('সঠিক খরচের পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await addExpense({
        title: title.trim(),
        amount: amt,
        category,
        date,
        paidBy: paidBy.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showToast('খরচ সফলভাবে যোগ করা হয়েছে', 'success');
      setShowAddModal(false);
    } catch (err: any) {
      showToast(err.message || 'খরচ যোগ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    if (!title.trim()) {
      showToast('খরচের নাম দিন', 'warning');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('সঠিক খরচের পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await updateExpense(selectedExpense.id, {
        title: title.trim(),
        amount: amt,
        category,
        date,
        paidBy: paidBy.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showToast('খরচের তথ্য আপডেট করা হয়েছে', 'success');
      setShowEditModal(false);
    } catch (err: any) {
      showToast(err.message || 'আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Submit
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    try {
      setSubmitting(true);
      await deleteExpense(selectedExpense.id);
      showToast('খরচ রেকর্ড মুছে ফেলা হয়েছে', 'info');
      setShowDeleteModal(false);
      setSelectedExpense(null);
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
              ? 'আপনি শুধুমাত্র খরচের হিসাব দেখতে পাচ্ছেন। এন্ট্রি, এডিট বা ডিলিট শুধুমাত্র প্রধান এডমিন করতে পারবেন।'
              : 'You are viewing expenses in read-only mode. Only the main Admin can add, edit, or delete.'}
          </span>
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Total Business Expenses */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট ব্যবসার খরচ' : 'Total Expenses'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600">
              {formatCurrency(totalExpensesAmount, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn'
                ? `মোট ${formatNumber(expenses.length, language)} টি খরচ এন্ট্রি`
                : `${expenses.length} expense entries`}
            </div>
          </div>
        </div>

        {/* Card 2: Actual Net Profit (প্রকৃত নিট লাভ) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'প্রকৃত নিট মুনাফা' : 'Actual Net Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {language === 'bn' ? 'খরচ বাদ দিয়ে আসল লাভ' : 'Profit after all costs'}
            </div>
          </div>
        </div>

        {/* Card 3: Gross Profit from Sales */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'বিক্রির গ্রস লাভ' : 'Sales Gross Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-800">
              {formatCurrency(grossProfitAmount, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn' ? 'কেনাবেচার লাভ' : 'Revenue minus product cost'}
            </div>
          </div>
        </div>

        {/* Card 4: Net Margin % */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'নিট প্রফিট মার্জিন' : 'Net Margin'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-bold ${
                netProfitMarginPercent >= 0 ? 'text-blue-700' : 'text-rose-600'
              }`}
            >
              {formatNumber(netProfitMarginPercent, language)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn' ? 'মোট বিক্রির উপর লাভ' : 'Percentage of sales'}
            </div>
          </div>
        </div>
      </div>

      {/* Actual Net Profit Formula & Live Breakdown Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-indigo-200 tracking-wide flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <span>{language === 'bn' ? 'আসল নিট লাভের হিসাব বিবরণী' : 'Net Profit Live Formula'}</span>
          </h4>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-indigo-200 font-medium">
            লাইভ হিসাব
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-white/5 rounded-xl border border-white/10">
            <div className="text-[10px] text-indigo-300">বিক্রির মোট লাভ</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5">
              +{formatCurrency(grossProfitAmount, language)}
            </div>
          </div>

          <div className="p-2 bg-white/5 rounded-xl border border-white/10">
            <div className="text-[10px] text-rose-300">মোট ব্যবসার খরচ</div>
            <div className="text-xs font-bold text-rose-400 mt-0.5">
              -{formatCurrency(totalExpensesAmount, language)}
            </div>
          </div>

          <div className="p-2 bg-white/15 rounded-xl border border-white/20">
            <div className="text-[10px] text-amber-300 font-semibold">একচুয়াল নিট লাভ</div>
            <div
              className={`text-sm font-extrabold mt-0.5 ${
                netProfitAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              ={formatCurrency(netProfitAmount, language)}
            </div>
          </div>
        </div>
      </div>

      {/* Header and Add Button */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            <span>{language === 'bn' ? 'দৈনন্দিন খরচের খাতা' : 'Daily Expenses List'}</span>
          </h3>
          <p className="text-xs text-slate-500">
            {language === 'bn'
              ? 'দোকান ভাড়া, ডেলিভারি, বেতন ও অন্যান্য খরচ'
              : 'Rent, delivery, courier, utilities & other business costs'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন খরচ যোগ' : 'Add Expense'}</span>
          </button>
        )}
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'খরচের নাম, ক্যাটাগরি বা নোট দিয়ে খুঁজুন...'
                : 'Search expense title, category, notes...'
            }
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-rose-500 shadow-sm"
          />
        </div>

        {/* Date Filter Quick Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              dateFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {language === 'bn' ? 'সব তারিখ' : 'All Dates'}
          </button>

          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              dateFilter === 'today'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            {language === 'bn' ? 'আজকের খরচ' : "Today's"}
          </button>

          <button
            onClick={() => setDateFilter('this_month')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
              dateFilter === 'this_month'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            {language === 'bn' ? 'চলতি মাস' : 'This Month'}
          </button>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 text-xs focus:outline-none shrink-0"
          >
            <option value="all">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {language === 'bn' ? 'কোনো খরচ পাওয়া যায়নি' : 'No expenses logged'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'bn'
                ? 'দোকানের ভাড়া, ডেলিভারি বা দৈনন্দিন যেকোনো খরচ লিখে রাখুন।'
                : 'Log daily costs to calculate accurate net profit margin.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রথম খরচ যোগ করুন' : 'Add First Expense'}</span>
            </button>
          )}
        </div>
      ) : (
        /* Expenses List */
        <div className="space-y-2.5">
          {filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm hover:border-slate-200 transition flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-800">{exp.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {exp.category}
                  </span>
                  {exp.paidBy && (
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      প্রদানকারী: {exp.paidBy}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatBengaliDate(exp.date, language)}
                  </span>
                  {exp.notes && (
                    <span className="italic text-slate-500">নোট: {exp.notes}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-base font-bold text-rose-600">
                  -{formatCurrency(exp.amount, language)}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedExpense(exp);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD EXPENSE */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'নতুন খরচ এন্ট্রি' : 'Add Business Expense'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? 'খরচের বিবরণ ও ক্যাটাগরি দিন' : 'Enter expense details'}
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
                  {language === 'bn' ? 'খরচের নাম / বিবরণ *' : 'Expense Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'যেমন: রেডেক্স কুরিয়ার ডেলিভারি খরচ, দোকানের বিদ্যুৎ বিল'
                      : 'e.g. Courier delivery fee'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'খরচের পরিমাণ (৳) *' : 'Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="৫০০"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-rose-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'কে পরিশোধ করেছে?' : 'Paid By'}
                  </label>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    placeholder="ক্যাশ কাউন্টার / পার্টনার"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোট বা মন্তব্য' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ঐচ্ছিক মেমো বা ভাউচার নম্বর"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
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
                    <span>{language === 'bn' ? 'খরচ সংরক্ষণ করুন' : 'Save Expense'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EXPENSE */}
      {/* ========================================================================= */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'খরচ সম্পাদনা' : 'Edit Expense'}
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
                  {language === 'bn' ? 'খরচের বিবরণ *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'পরিমাণ (৳) *' : 'Amount *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-rose-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'প্রদানকারী' : 'Paid By'}
                  </label>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'মন্তব্য' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
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
      {/* MODAL 3: DELETE CONFIRM */}
      {/* ========================================================================= */}
      {showDeleteModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {language === 'bn' ? 'খরচ মুছে ফেলবেন?' : 'Delete Expense?'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? `আপনি কি "${selectedExpense.title}" (৳${formatNumber(
                      selectedExpense.amount,
                      language
                    )})-এর খরচটি মুছতে চান?`
                  : `Are you sure you want to delete this expense?`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedExpense(null);
                }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
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
