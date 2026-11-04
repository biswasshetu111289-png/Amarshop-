import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  formatCurrency,
  formatBengaliDate,
  formatNumber,
} from '../../utils/formatters';
import { FixedAsset, FIXED_ASSET_CATEGORIES, FixedAssetCategory } from '../../types';
import {
  Armchair,
  Plus,
  Search,
  Filter,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Edit2,
  Trash2,
  Info,
  CheckCircle2,
  Layers,
  Sparkles,
  Lock,
  Wallet,
  Building,
} from 'lucide-react';

export const FixedAssetsTab: React.FC = () => {
  const {
    fixedAssets,
    loadingFixedAssets,
    totalFixedAssetsAmount,
    partners,
    canManage,
    addFixedAsset,
    updateFixedAsset,
    deleteFixedAsset,
  } = useStore();

  const { language } = useLanguage();
  const { showToast } = useToast();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState<FixedAssetCategory>('ফার্নিচার ও ডেকোরেশন');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [fundedBy, setFundedBy] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Open Add Modal
  const openAddModal = () => {
    if (!canManage) {
      showToast('শুধুমাত্র এডমিন বা ম্যানেজার নতুন স্থায়ী সম্পদ যোগ করতে পারেন', 'warning');
      return;
    }
    setName('');
    setCost('');
    setCategory('ফার্নিচার ও ডেকোরেশন');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setFundedBy(partners.length > 0 ? 'পার্টনারশিপ ফান্ড' : 'দোকান ফান্ড');
    setInvoiceNo('');
    setNotes('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (asset: FixedAsset) => {
    if (!canManage) {
      showToast('শুধুমাত্র এডমিন বা ম্যানেজার স্থায়ী সম্পদ এডিট করতে পারেন', 'warning');
      return;
    }
    setSelectedAsset(asset);
    setName(asset.name);
    setCost(String(asset.cost));
    setCategory((asset.category as FixedAssetCategory) || 'ফার্নিচার ও ডেকোরেশন');
    setPurchaseDate(asset.purchaseDate || new Date().toISOString().split('T')[0]);
    setFundedBy(asset.fundedBy || '');
    setInvoiceNo(asset.invoiceNo || '');
    setNotes(asset.notes || '');
    setShowEditModal(true);
  };

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('স্থায়ী সম্পদের নাম দিন', 'warning');
      return;
    }
    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum <= 0) {
      showToast('সঠিক খরচের পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await addFixedAsset({
        name: name.trim(),
        cost: costNum,
        category,
        purchaseDate,
        fundedBy: fundedBy.trim(),
        invoiceNo: invoiceNo.trim(),
        notes: notes.trim(),
      });
      showToast('নতুন স্থায়ী সম্পদ সফলভাবে যোগ করা হয়েছে', 'success');
      setShowAddModal(false);
    } catch (err: any) {
      showToast(err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    if (!name.trim()) {
      showToast('স্থায়ী সম্পদের নাম দিন', 'warning');
      return;
    }
    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum <= 0) {
      showToast('সঠিক খরচের পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await updateFixedAsset(selectedAsset.id, {
        name: name.trim(),
        cost: costNum,
        category,
        purchaseDate,
        fundedBy: fundedBy.trim(),
        invoiceNo: invoiceNo.trim(),
        notes: notes.trim(),
      });
      showToast('স্থায়ী সম্পদ সফলভাবে আপডেট করা হয়েছে', 'success');
      setShowEditModal(false);
      setSelectedAsset(null);
    } catch (err: any) {
      showToast(err.message || 'আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedAsset) return;
    try {
      setSubmitting(true);
      await deleteFixedAsset(selectedAsset.id);
      showToast('স্থায়ী সম্পদ তালিকা থেকে মুছে ফেলা হয়েছে', 'info');
      setShowDeleteModal(false);
      setSelectedAsset(null);
    } catch (err: any) {
      showToast(err.message || 'মুছতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return fixedAssets.filter((asset) => {
      const matchQuery =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.fundedBy && asset.fundedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.invoiceNo && asset.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.notes && asset.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === 'all' || asset.category === selectedCategory;

      return matchQuery && matchCategory;
    });
  }, [fixedAssets, searchQuery, selectedCategory]);

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    for (const a of fixedAssets) {
      const cat = a.category || 'অন্যান্য স্থায়ী সম্পদ';
      if (!stats[cat]) {
        stats[cat] = { count: 0, total: 0 };
      }
      stats[cat].count += 1;
      stats[cat].total += Number(a.cost) || 0;
    }
    return stats;
  }, [fixedAssets]);

  return (
    <div className="space-y-4">
      {/* Read-Only Notice for Viewers */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800 flex items-center gap-2.5 text-xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {language === 'bn'
              ? 'আপনি শুধুমাত্র স্থায়ী সম্পদের বিবরণ দেখতে পাচ্ছেন। এন্ট্রি, এডিট বা ডিলিট শুধুমাত্র এডমিন করতে পারবেন।'
              : 'You are viewing fixed assets in read-only mode. Only the Admin can make changes.'}
          </span>
        </div>
      )}

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Card 1: Total Fixed Asset Value */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট স্থায়ী সম্পদ (মূল্য)' : 'Total Asset Value'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Armchair className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-700">
              {formatCurrency(totalFixedAssetsAmount, language)}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{language === 'bn' ? 'মূলধনী সম্পদ (নিট লাভ থেকে কাটা যাবে না)' : 'Capital investment'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Items Count */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট সরঞ্জাম সংখ্যা' : 'Total Items'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-indigo-700">
              {formatNumber(fixedAssets.length, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn' ? 'দোকানের অবকাঠামো ও সাজসজ্জা' : 'Store fittings & equipment'}
            </div>
          </div>
        </div>

        {/* Card 3: Top Category */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'ক্যাটাগরি বৈচিত্র্য' : 'Asset Categories'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700">
              {formatNumber(Object.keys(categoryStats).length, language)} <span className="text-xs font-normal text-slate-500">টি খাত</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {Object.keys(categoryStats)[0] || (language === 'bn' ? 'কোনো এন্ট্রি নেই' : 'No entries')}
            </div>
          </div>
        </div>
      </div>

      {/* Educational & Separation Banner */}
      <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
              <span>{language === 'bn' ? 'স্থায়ী সম্পদ ও মূলধনী খরচ নীতি' : 'Fixed Asset & Capital Policy'}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-bold">
                নিট লাভে প্রভাব ফেলে না
              </span>
            </h4>
            <p className="text-amber-900/90 leading-relaxed text-[11px]">
              {language === 'bn'
                ? 'দোকানের ডিসপ্লে বক্স, শোকেস, কাউন্টার টেবিল, লাইটিং বা টুলস কেনার মূলধনী খরচ এখানে লিখে রাখুন। এটি দৈনন্দিন চলতি খরচের সাথে যুক্ত হবে না এবং বিক্রয় লভ্যাংশ বা নিট লাভ থেকে বাদ যাবে না।'
                : 'Capital expenditures on furniture, showcases, and equipment are logged here. They do not reduce daily net profit as they represent long-term capital assets.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Category Filter, and Add Button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'bn' ? 'স্থায়ী সম্পদ খুঁজুন (নাম, মেমো, নোট)...' : 'Search fixed assets...'}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition"
            />
          </div>

          {/* Add Asset Button */}
          {canManage && (
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন সম্পদ যোগ' : 'Add Asset'}</span>
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {language === 'bn' ? 'সকল সম্পদ' : 'All'} ({formatNumber(fixedAssets.length, language)})
          </button>
          {FIXED_ASSET_CATEGORIES.map((cat) => {
            const count = fixedAssets.filter((a) => a.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] opacity-80">({formatNumber(count, language)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset List or Empty State */}
      {loadingFixedAssets ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">স্থায়ী সম্পদের হিসাব লোড হচ্ছে...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Armchair className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {searchQuery || selectedCategory !== 'all'
                ? language === 'bn'
                  ? 'কোনো স্থায়ী সম্পদ খুঁজে পাওয়া যায়নি'
                  : 'No matching assets found'
                : language === 'bn'
                ? 'কোনো স্থায়ী সম্পদ এন্ট্রি করা হয়নি'
                : 'No fixed assets recorded yet'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'bn'
                ? 'দোকানের ডিসপ্লে বক্স, শোকেস, ফার্নিচার, সাইনবোর্ড বা টুলস কেনার হিসাব লিখে রাখুন।'
                : 'Record showcases, furniture, shop signs, and tools purchased for business setup.'}
            </p>
          </div>
          {canManage && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রথম সম্পদ যোগ করুন' : 'Add First Asset'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-amber-200 transition space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Armchair className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-snug">{asset.name}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {asset.category}
                      </span>
                      {asset.fundedBy && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Wallet className="w-2.5 h-2.5" />
                          <span>{asset.fundedBy}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-amber-700">
                    {formatCurrency(asset.cost, language)}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatBengaliDate(asset.purchaseDate, language)}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Invoice details */}
              {(asset.invoiceNo || asset.notes) && (
                <div className="bg-slate-50/80 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                  {asset.invoiceNo && (
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold">চালান/মেমো:</span>
                      <span>{asset.invoiceNo}</span>
                    </div>
                  )}
                  {asset.notes && (
                    <p className="text-slate-500 italic">"{asset.notes}"</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {canManage && (
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-50">
                  <button
                    onClick={() => openEditModal(asset)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                    title="সম্পাদনা করুন"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowDeleteModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD FIXED ASSET */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'নতুন স্থায়ী সম্পদ যোগ করুন' : 'Add Fixed Asset'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? 'ফার্নিচার, ডিসপ্লে বক্স, শোকেস বা সরঞ্জাম' : 'Capital equipment & store fixtures'}
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

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'সম্পদ বা সরঞ্জামের নাম *' : 'Asset Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: গ্লাস ডিসপ্লে কাউন্টার / মেটাল রেক / ক্যাশ টেবিল"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্রয়/তৈরির খরচ (৳) *' : 'Cost (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="যেমন: ১৫,০০০"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-amber-700 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্রয়ের তারিখ *' : 'Purchase Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FixedAssetCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                >
                  {FIXED_ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'অর্থায়নকারী / ফান্ড' : 'Funded By'}
                  </label>
                  <input
                    type="text"
                    value={fundedBy}
                    onChange={(e) => setFundedBy(e.target.value)}
                    placeholder="যেমন: পার্টনার ১ / পার্টনারশিপ ফান্ড"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চালান বা মেমো নং' : 'Invoice/Memo #'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="ঐচ্ছিক (যেমন: M-104)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোট বা অতিরিক্ত বিবরণ' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: প্রধান ডিসপ্লে কাউন্টার, গ্লাস ৫ মিমি, ওয়ারেন্টি ১ বছর"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>এটি ব্যবসায় স্থায়ী মূলধন হিসেবে সংরক্ষিত থাকবে, চলতি খরচ থেকে নিট লাভ কমাবে না।</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{language === 'bn' ? 'সম্পদ সংরক্ষণ করুন' : 'Save Asset'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT FIXED ASSET */}
      {/* ========================================================================= */}
      {showEditModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'স্থায়ী সম্পদ সম্পাদনা' : 'Edit Fixed Asset'}
                  </h3>
                  <p className="text-xs text-slate-400">তথ্য বা খরচের পরিমাণ সংশোধন করুন</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAsset(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'সম্পদ বা সরঞ্জামের নাম *' : 'Asset Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্রয়/তৈরির খরচ (৳) *' : 'Cost (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-amber-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ক্রয়ের তারিখ *' : 'Purchase Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FixedAssetCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
                >
                  {FIXED_ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'অর্থায়নকারী / ফান্ড' : 'Funded By'}
                  </label>
                  <input
                    type="text"
                    value={fundedBy}
                    onChange={(e) => setFundedBy(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চালান বা মেমো নং' : 'Invoice/Memo #'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোট বা অতিরিক্ত বিবরণ' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAsset(null);
                  }}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{language === 'bn' ? 'আপডেট নিশ্চিত করুন' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {showDeleteModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-800">
                {language === 'bn' ? 'স্থায়ী সম্পদ রেকর্ড মুছবেন?' : 'Delete Fixed Asset?'}
              </h4>
              <p className="text-xs text-slate-500">
                আপনি কি নিশ্চিতভাবে <strong className="text-slate-800 font-bold">{selectedAsset.name}</strong> ({formatCurrency(selectedAsset.cost, language)}) এর রেকর্ড মুছে ফেলতে চান?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAsset(null);
                }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                {language === 'bn' ? 'না, বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Delete'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
