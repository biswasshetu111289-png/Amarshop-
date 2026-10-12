import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  saveProduct,
  deleteProduct,
  batchImportProducts,
} from '../services/storeService';
import {
  autoSuggestCategory,
  predictCategoryHeuristic,
  COMMON_CATEGORIES,
} from '../services/aiCategoryService';
import { Product, PRODUCT_UNITS, ProductUnit } from '../types';
import { parseProductCSV, ParsedProductRow } from '../utils/csv';
import {
  formatCurrency,
  formatQty,
  toBengaliNumber,
  formatNumber,
  formatUnit,
} from '../utils/formatters';
import {
  Plus,
  Search,
  Upload,
  FileSpreadsheet,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Check,
  CheckCircle2,
  Sparkles,
  Package,
  Palette,
  Layers,
  ShieldAlert,
  Info,
} from 'lucide-react';

const COMMON_COLORS = [
  { name: 'লাল', bg: 'bg-red-500', text: 'text-white' },
  { name: 'নীল', bg: 'bg-blue-500', text: 'text-white' },
  { name: 'সবুজ', bg: 'bg-emerald-600', text: 'text-white' },
  { name: 'কালো', bg: 'bg-slate-900', text: 'text-white' },
  { name: 'সাদা', bg: 'bg-white border border-slate-300', text: 'text-slate-800' },
  { name: 'হলুদ', bg: 'bg-amber-400', text: 'text-slate-900' },
  { name: 'গোলাপী', bg: 'bg-pink-500', text: 'text-white' },
  { name: 'সোনালী', bg: 'bg-yellow-600', text: 'text-white' },
  { name: 'ধূসর', bg: 'bg-slate-400', text: 'text-white' },
  { name: 'বাদামী', bg: 'bg-amber-800', text: 'text-white' },
  { name: 'মাল্টিকালার', bg: 'bg-gradient-to-r from-red-400 via-green-400 to-blue-500', text: 'text-white' },
];

export const StockView: React.FC = () => {
  const { user } = useAuth();
  const {
    products,
    currentShop,
    canManage,
    isViewer,
  } = useStore();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  const [stockFilter, setStockFilter] = useState<'available' | 'all' | 'zero'>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [purgingDemo, setPurgingDemo] = useState(false);

  // Form State
  const [activeTab, setActiveTab] = useState<'basic' | 'packaging_color'>('basic');
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState<ProductUnit>('পিস');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formSellPrice, setFormSellPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPackagingPrice, setFormPackagingPrice] = useState('');
  const [formColor, setFormColor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Auto-Categorize State
  const [aiSuggestedCat, setAiSuggestedCat] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [isCategoryManuallyEdited, setIsCategoryManuallyEdited] = useState(false);

  const targetId = currentShop?.id || user?.uid || '';

  // Handle instant product name input and heuristic categorization
  const handleProductNameChange = (newName: string) => {
    setFormName(newName);
    // Instant real-time heuristic auto-categorization as user types
    const instant = predictCategoryHeuristic(newName);
    if (instant) {
      setAiSuggestedCat(instant);
      if (!isCategoryManuallyEdited) {
        setFormCategory(instant);
      }
    } else if (!isCategoryManuallyEdited && !newName.trim()) {
      setAiSuggestedCat(null);
      setFormCategory('');
    }
  };

  // Demo products detection & purge
  const demoProductNames = useMemo(
    () =>
      new Set([
        'বাসমতি চাল ৫ কেজি',
        'মিনিকেট চাল ২৫ কেজি',
        'তীর সয়াবিন তেল ৫ লিটার',
        'রূপচাঁদা সরিষার তেল ১ লিটার',
        'মসুর ডাল (চিকন)',
        'প্রাণ প্রিমিয়াম ঘি ৫০০ গ্রাম',
      ]),
    []
  );

  const demoProducts = useMemo(
    () => products.filter((p) => demoProductNames.has(p.name.trim())),
    [products, demoProductNames]
  );
  const demoProductsCount = demoProducts.length;

  const removeDemoProductsFromShop = useCallback(async () => {
    if (!targetId || demoProducts.length === 0) return 0;
    for (const p of demoProducts) {
      await deleteProduct(targetId, p.id);
    }
    return demoProducts.length;
  }, [targetId, demoProducts]);

  // CSV Import State
  const [csvPreview, setCsvPreview] = useState<ParsedProductRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger AI Auto-categorization (instant heuristic + optional Gemini assist)
  useEffect(() => {
    if (!formName.trim() || formName.trim().length < 2) {
      if (!isCategoryManuallyEdited) {
        setAiSuggestedCat(null);
      }
      return;
    }

    // 1. Instant heuristic check
    const instant = predictCategoryHeuristic(formName);
    if (instant) {
      setAiSuggestedCat(instant);
      if (!isCategoryManuallyEdited) {
        setFormCategory(instant);
      }
      return;
    }

    // 2. Debounced API check for complex/unfamiliar phrases
    const timer = setTimeout(async () => {
      setAiThinking(true);
      try {
        const res = await autoSuggestCategory(formName);
        if (res.category) {
          setAiSuggestedCat(res.category);
          if (!isCategoryManuallyEdited) {
            setFormCategory(res.category);
          }
        }
      } catch (e) {
        console.debug('AI auto categorize error:', e);
      } finally {
        setAiThinking(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [formName, isCategoryManuallyEdited]);

  // Calculate distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // Counts for stock filter options
  const availableCount = useMemo(() => products.filter((p) => p.qty > 0).length, [products]);
  const zeroCount = useMemo(() => products.filter((p) => p.qty <= 0).length, [products]);
  const allCount = products.length;

  // Filter products by stock availability, search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Available Stock (Without Zero) vs All Product List vs Zero Stock
      if (stockFilter === 'available' && p.qty <= 0) return false;
      if (stockFilter === 'zero' && p.qty > 0) return false;

      // 2. Search match
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.color && p.color.toLowerCase().includes(searchTerm.toLowerCase()));

      // 3. Category match
      const matchCat =
        selectedCategory === 'all' || p.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [products, stockFilter, searchTerm, selectedCategory]);

  const openAddModal = () => {
    if (!canManage) {
      showToast('শুধুমাত্র এডমিন বা ম্যানেজার নতুন পণ্য যুক্ত করতে পারেন', 'warning');
      return;
    }
    setEditingProduct(null);
    setActiveTab('basic');
    setFormName('');
    setFormQty('');
    setFormUnit('পিস');
    setFormBuyPrice('');
    setFormSellPrice('');
    setFormCategory('');
    setFormPackagingPrice('');
    setFormColor('');
    setAiSuggestedCat(null);
    setIsCategoryManuallyEdited(false);
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    if (!canManage) {
      showToast('শুধুমাত্র এডমিন বা ম্যানেজার পণ্য সংশোধন করতে পারেন', 'warning');
      return;
    }
    setEditingProduct(product);
    setActiveTab('basic');
    setFormName(product.name);
    setFormQty(String(product.qty));
    setFormUnit((product.unit as ProductUnit) || 'পিস');
    setFormBuyPrice(String(product.buyPrice));
    setFormSellPrice(String(product.sellPrice));
    setFormCategory(product.category || '');
    setFormPackagingPrice(product.packagingPrice ? String(product.packagingPrice) : '');
    setFormColor(product.color || '');
    setAiSuggestedCat(null);
    setIsCategoryManuallyEdited(Boolean(product.category && product.category.trim()));
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetId) return;

    if (!canManage) {
      showToast('আপনার পণ্য সংরক্ষণের অনুমতি নেই', 'error');
      return;
    }

    if (!formName.trim()) {
      showToast('প্রোডাক্টের নাম লিখুন', 'warning');
      return;
    }
    const qty = parseFloat(formQty);
    const buyPrice = parseFloat(formBuyPrice);
    const sellPrice = parseFloat(formSellPrice);
    const packagingPrice = formPackagingPrice ? parseFloat(formPackagingPrice) : 0;

    if (isNaN(qty) || qty < 0) {
      showToast('সঠিক পরিমাণ দিন', 'warning');
      return;
    }
    if (isNaN(buyPrice) || buyPrice < 0) {
      showToast('সঠিক ক্রয় মূল্য দিন', 'warning');
      return;
    }
    if (isNaN(sellPrice) || sellPrice < 0) {
      showToast('সঠিক বিক্রয় মূল্য দিন', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await saveProduct(targetId, {
        id: editingProduct ? editingProduct.id : undefined,
        name: formName.trim(),
        qty,
        unit: formUnit,
        buyPrice,
        sellPrice,
        category: formCategory.trim(),
        packagingPrice: isNaN(packagingPrice) ? 0 : packagingPrice,
        color: formColor.trim(),
      });

      showToast(
        editingProduct ? 'প্রোডাক্টের তথ্য আপডেট হয়েছে' : 'নতুন প্রোডাক্ট যুক্ত হয়েছে',
        'success'
      );
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      showToast('সংরক্ষণ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!user || !targetId) return;
    if (!canManage) {
      showToast('শুধুমাত্র এডমিন বা ম্যানেজার পণ্য মুছতে পারেন', 'warning');
      return;
    }

    const confirmed = window.confirm(`আপনি কি "${product.name}" মুছে ফেলতে চান?`);
    if (!confirmed) return;

    try {
      await deleteProduct(targetId, product.id);
      showToast('প্রোডাক্ট মুছে ফেলা হয়েছে', 'info');
    } catch (err) {
      console.error(err);
      showToast('মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // CSV Drag and drop / file read
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const processCSVFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const { rows, errors } = parseProductCSV(content);
      setCsvPreview(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = async () => {
    if (!user || !targetId || csvPreview.length === 0) return;
    setImportingCSV(true);
    try {
      const { added, updated } = await batchImportProducts(
        targetId,
        csvPreview.map((r) => ({
          name: r.name,
          qty: r.qty,
          unit: r.unit,
          buyPrice: r.buyPrice,
          sellPrice: r.sellPrice,
          category: r.category,
        })),
        products
      );

      showToast(
        `সফলভাবে ${toBengaliNumber(added)}টি নতুন এবং ${toBengaliNumber(updated)}টি প্রোডাক্ট আপডেট হয়েছে!`,
        'success'
      );
      setShowCSVModal(false);
      setCsvPreview([]);
      setCsvFileName('');
    } catch (err) {
      console.error(err);
      showToast('CSV ইমপোর্টে সমস্যা হয়েছে', 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  // Live profit calculation
  const buyNum = parseFloat(formBuyPrice) || 0;
  const sellNum = parseFloat(formSellPrice) || 0;
  const packNum = parseFloat(formPackagingPrice) || 0;
  const totalCost = buyNum + packNum;
  const currentUnitProfit = sellNum - totalCost;

  const handlePurgeDemoData = async () => {
    setPurgingDemo(true);
    try {
      const count = await removeDemoProductsFromShop();
      showToast(`${toBengaliNumber(count)}টি পুরনো ডেমো প্রোডাক্ট সফলভাবে মুছে ফেলা হয়েছে!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'ডেমো প্রোডাক্ট মুছতে সমস্যা হয়েছে', 'error');
    } finally {
      setPurgingDemo(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Viewer Notice Banner */}
      {isViewer && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>ভিউয়ার একাউন্ট:</strong> আপনি এই দোকানের ডাটা শুধুমাত্র দেখতে পারবেন। পণ্য
            যোগ, পরিবর্তন বা মুছে ফেলার জন্য এডমিন বা ম্যানেজার এক্সেস প্রয়োজন।
          </span>
        </div>
      )}

      {/* Demo Products Found Warning Banner */}
      {demoProductsCount > 0 && canManage && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                <span>দোকানে পুরনো ডেমো ডাটা পাওয়া গেছে ({toBengaliNumber(demoProductsCount)}টি স্যাম্পল পণ্য)</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                বাসমতি চাল, মিনিকেট চাল, তীর সয়াবিন তেল ইত্যাদি টেস্ট ডেমো পণ্য রয়েছে। আপনি চাইলে ১ ক্লিকে এগুলো মুছে আপনার দোকান পরিষ্কার রাখতে পারেন।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePurgeDemoData}
            disabled={purgingDemo}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 transition text-xs disabled:opacity-50 self-end sm:self-auto cursor-pointer"
          >
            {purgingDemo ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                <span>পরিষ্কার হচ্ছে...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>পুরনো ডেমো ডাটা মুছুন</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Top Header & Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>{language === 'bn' ? 'স্টক ম্যানেজমেন্ট' : 'Stock Management'}</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">
              {formatNumber(products.length, language)} {language === 'bn' ? 'টি পণ্য' : 'items'}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'bn'
              ? `${currentShop?.name || 'দোকানের'} মজুদ পণ্য ও মূল্য তালিকা`
              : 'Live inventory stock and price catalog'}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCSVModal(true)}
              className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              title={language === 'bn' ? 'CSV ফাইল আপলোড করুন' : 'Upload CSV file'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{language === 'bn' ? 'CSV ইমপোর্ট' : 'CSV Import'}</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন প্রোডাক্ট' : 'New Product'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Category Filter Card */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
        {/* Stock Filter Segmented Tabs: Available Stock vs All Products vs Out of Stock */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setStockFilter('available')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              stockFilter === 'available'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="truncate">{language === 'bn' ? 'স্টক আছে (Available)' : 'Available Stock'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                stockFilter === 'available' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {formatNumber(availableCount, language)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              stockFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="truncate">{language === 'bn' ? 'সকল পণ্য (All List)' : 'All Products'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                stockFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {formatNumber(allCount, language)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('zero')}
            className={`col-span-2 sm:col-span-1 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              stockFilter === 'zero'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="truncate">{language === 'bn' ? 'শূন্য স্টক (Out of Stock)' : 'Zero Stock'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                stockFilter === 'zero' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {formatNumber(zeroCount, language)}
            </span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'প্রোডাক্টের নাম, কালার বা ক্যাটাগরি দিয়ে খুঁজুন...'
                : 'Search by product name, color or category...'
            }
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {language === 'bn' ? 'সকল' : 'All'} ({formatNumber(products.length, language)})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Table / Cards */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
          <div className="text-3xl mb-2">📦</div>
          <p className="font-semibold text-slate-700 text-sm">
            {language === 'bn' ? 'কোনো প্রোডাক্ট পাওয়া যায়নি' : 'No products found'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? (language === 'bn' ? 'অন্য নাম দিয়ে সার্চ করুন' : 'Try searching with another keyword')
              : (language === 'bn' ? 'নতুন প্রোডাক্ট যুক্ত করুন' : 'Add your first product to get started')}
          </p>
          {canManage && !searchTerm && (
            <button
              onClick={openAddModal}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />{' '}
              {language === 'bn' ? 'প্রথম প্রোডাক্ট যোগ করুন' : 'Add First Product'}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-3">{language === 'bn' ? 'প্রোডাক্টের বিবরণ' : 'Product Details'}</th>
                  <th className="py-3 px-2 text-center">{language === 'bn' ? 'স্টক' : 'Stock'}</th>
                  <th className="py-3 px-2 text-right">{language === 'bn' ? 'ক্রয় মূল্য' : 'Buy Price'}</th>
                  <th className="py-3 px-2 text-right">{language === 'bn' ? 'বিক্রয় মূল্য' : 'Sell Price'}</th>
                  <th className="py-3 px-2 text-right">{language === 'bn' ? 'নিট লাভ' : 'Net Profit'}</th>
                  {canManage && <th className="py-3 px-2.5 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.qty <= 5;
                  const itemCost = p.buyPrice + (p.packagingPrice || 0);
                  const unitProfit = p.sellPrice - itemCost;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 leading-snug">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {p.category && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                              {p.category}
                            </span>
                          )}
                          {p.color && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                              <Palette className="w-2.5 h-2.5 text-purple-600" />
                              {p.color}
                            </span>
                          )}
                          {Boolean(p.packagingPrice && p.packagingPrice > 0) && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                              <Package className="w-2.5 h-2.5 text-amber-600" />
                              {language === 'bn' ? 'প্যাক: ' : 'Pack: '}{formatCurrency(p.packagingPrice!, language)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isLow
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {formatQty(p.qty, p.unit, language)}
                        </span>
                        {isLow && (
                          <div className="text-[9px] text-rose-600 font-bold mt-0.5">
                            {language === 'bn' ? 'কম স্টক!' : 'Low Stock!'}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-600 whitespace-nowrap">
                        <div>{formatCurrency(p.buyPrice, language)}</div>
                        {Boolean(p.packagingPrice && p.packagingPrice > 0) && (
                          <div className="text-[10px] text-slate-400">
                            +{language === 'bn' ? 'প্যাক ' : 'Pack '}{formatCurrency(p.packagingPrice!, language)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(p.sellPrice, language)}
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(unitProfit, language)}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              title={language === 'bn' ? 'এডিট করুন' : 'Edit'}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal with Packaging & Color Tabs */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>
                  {editingProduct
                    ? (language === 'bn' ? 'পণ্য সংশোধন করুন' : 'Edit Product')
                    : (language === 'bn' ? 'নতুন পণ্য যোগ করুন' : 'Add New Product')}
                </span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: Basic Info vs Packaging & Color */}
            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`flex-1 py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'basic'
                    ? 'border-blue-600 text-blue-600 bg-white font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'মূল বিবরণ' : 'Basic Info'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('packaging_color')}
                className={`flex-1 py-2.5 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'packaging_color'
                    ? 'border-purple-600 text-purple-600 bg-white font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'প্যাকেজিং ও কালার অপশন' : 'Packaging & Color'}</span>
                {(formPackagingPrice || formColor) && (
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                )}
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {activeTab === 'basic' && (
                <>
                  {/* Product Name with AI Auto-Categorize trigger */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {language === 'bn' ? 'প্রোডাক্টের নাম' : 'Product Name'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => handleProductNameChange(e.target.value)}
                        placeholder={
                          language === 'bn'
                            ? 'যেমন: বাসমতি চাল ৫ কেজি / টি-শার্ট কটন'
                            : 'e.g. Basmati Rice 5kg / Cotton T-Shirt'
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    {/* AI Suggestion Chip */}
                    {aiThinking && (
                      <div className="text-[11px] text-blue-600 flex items-center gap-1 mt-1 font-medium animate-pulse">
                        <Sparkles className="w-3 h-3 text-blue-500 animate-spin" />
                        <span>
                          {language === 'bn'
                            ? 'এআই ক্যাটাগরি বিশ্লেষণ করছে...'
                            : 'AI analyzing category...'}
                        </span>
                      </div>
                    )}
                    {aiSuggestedCat && (
                      <div className="mt-1.5 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/80 flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>
                            {language === 'bn' ? 'এআই প্রস্তাবিত ক্যাটাগরি:' : 'Suggested Category:'}
                          </span>
                          <span className="font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                            {aiSuggestedCat}
                          </span>
                        </div>
                        {formCategory !== aiSuggestedCat ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormCategory(aiSuggestedCat);
                              setIsCategoryManuallyEdited(false);
                            }}
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold text-[10px] shrink-0"
                          >
                            {language === 'bn' ? 'এপ্লাই' : 'Apply'}
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-0.5">
                            <Check className="w-3 h-3" />{' '}
                            {language === 'bn' ? 'সক্রিয়' : 'Active'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'বর্তমান স্টক (পরিমাণ)' : 'Current Stock (Qty)'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={formQty}
                        onChange={(e) => setFormQty(e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'একক (Unit)' : 'Unit'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value as ProductUnit)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      >
                        {PRODUCT_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {formatUnit(u, language)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'ক্রয় মূল্য (৳)' : 'Buy Price (৳)'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={formBuyPrice}
                        onChange={(e) => setFormBuyPrice(e.target.value)}
                        placeholder="450"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'বিক্রয় মূল্য (৳)' : 'Sell Price (৳)'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={formSellPrice}
                        onChange={(e) => setFormSellPrice(e.target.value)}
                        placeholder="520"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Category Field with quick category suggestions */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 flex items-center gap-1">
                        <span>{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</span>
                        <span className="text-slate-400 font-normal text-[11px]">
                          {language === 'bn' ? '(ইচ্ছেমতো পরিবর্তনযোগ্য)' : '(Customizable)'}
                        </span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bn' ? 'নিচে ক্লিক করে বেছে নিন' : 'Click below to select'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormCategory(val);
                          setIsCategoryManuallyEdited(val.trim().length > 0);
                        }}
                        placeholder={
                          language === 'bn'
                            ? 'যেমন: Wallet, Watch, চাল, তেল, পোশাক...'
                            : 'e.g. Wallet, Watch, Rice, Clothing...'
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white pr-8"
                      />
                      {formCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormCategory('');
                            setIsCategoryManuallyEdited(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title={language === 'bn' ? 'ক্যাটাগরি খালি করুন' : 'Clear category'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Auto Category Indicator & Manual Controls */}
                    <div className="flex items-center justify-between mt-1 text-[11px] min-h-[16px]">
                      {aiSuggestedCat && formCategory === aiSuggestedCat && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          এআই অটো ক্যাটাগরি: <strong className="underline">{aiSuggestedCat}</strong>
                        </span>
                      )}
                      {isCategoryManuallyEdited && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-slate-500">
                            ✍️ ম্যানুয়ালি নির্ধারিত
                          </span>
                          {aiSuggestedCat && formCategory !== aiSuggestedCat && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormCategory(aiSuggestedCat);
                                setIsCategoryManuallyEdited(false);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-1 hover:underline ml-auto"
                            >
                              <Sparkles className="w-3 h-3" />
                              এআই ক্যাটাগরিতে ফেরত যান ({aiSuggestedCat})
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Category Buttons */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COMMON_CATEGORIES.slice(0, 10).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFormCategory(cat);
                            setIsCategoryManuallyEdited(true);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                            formCategory === cat
                              ? 'bg-blue-600 text-white border-blue-600 font-bold'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Tab 2: Packaging Price & Color Options */}
              {activeTab === 'packaging_color' && (
                <div className="space-y-4">
                  {/* Packaging Cost */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-xs">
                          {language === 'bn' ? 'প্যাকেজিং খরচ (Packaging Cost)' : 'Packaging Cost (Per Unit)'}
                        </h4>
                        <p className="text-[10px] text-amber-700">
                          {language === 'bn'
                            ? 'বক্স, প্যাকেট, কার্টন বা গিফট র‍্যাপিংয়ের প্রতি ইউনিটের অতিরিক্ত খরচ'
                            : 'Additional cost per unit for box, packaging or wrapping'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                          ৳
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={formPackagingPrice}
                          onChange={(e) => setFormPackagingPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formPackagingPrice
                          ? (language === 'bn' ? `৳${formPackagingPrice} যোগ হবে` : `+৳${formPackagingPrice}`)
                          : (language === 'bn' ? 'ঐচ্ছিক' : 'Optional')}
                      </div>
                    </div>
                  </div>

                  {/* Color Option */}
                  <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-purple-600" />
                      <div>
                        <h4 className="font-bold text-purple-900 text-xs">
                          {language === 'bn' ? 'কালার অপশন (Color Option)' : 'Color Option'}
                        </h4>
                        <p className="text-[10px] text-purple-700">
                          {language === 'bn'
                            ? 'পোশাক, জুতো, ইলেকট্রনিক্স বা পণ্যের রঙ নির্ধারণ করুন'
                            : 'Specify variant color for clothing, gadgets or products'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Palette Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COMMON_COLORS.map((col) => (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => setFormColor(col.name)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            formColor === col.name
                              ? 'ring-2 ring-purple-600 ring-offset-1 shadow-xs bg-white text-purple-900 font-bold border border-purple-300'
                              : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                          <span>{col.name}</span>
                          {formColor === col.name && <Check className="w-3 h-3 text-purple-600" />}
                        </button>
                      ))}
                    </div>

                    {/* Custom Color Input */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {language === 'bn' ? 'অথবা কাস্টম কালারের নাম লিখুন:' : 'Or enter custom color name:'}
                      </label>
                      <input
                        type="text"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        placeholder={
                          language === 'bn'
                            ? 'যেমন: নেভি ব্লু, মেরুন, মেটালিক সিলভার ইত্যাদি'
                            : 'e.g. Navy Blue, Maroon, Silver, etc.'
                        }
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Profit Preview Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{language === 'bn' ? 'মূল ক্রয়মূল্য:' : 'Base Buy Price:'}</span>
                  <span className="font-medium">{formatCurrency(buyNum, language)}</span>
                </div>
                {packNum > 0 && (
                  <div className="flex items-center justify-between text-amber-700 font-medium">
                    <span>{language === 'bn' ? '+ প্যাকেজিং খরচ:' : '+ Packaging Cost:'}</span>
                    <span>{formatCurrency(packNum, language)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-800 font-semibold border-t border-slate-200/80 pt-1">
                  <span>{language === 'bn' ? 'মোট কার্যকরী খরচ:' : 'Total Cost:'}</span>
                  <span>{formatCurrency(totalCost, language)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-800 font-semibold">
                  <span>{language === 'bn' ? 'বিক্রয় মূল্য:' : 'Sell Price:'}</span>
                  <span>{formatCurrency(sellNum, language)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-bold text-slate-900">
                    {language === 'bn' ? 'প্রতি ইউনিটে নিট লাভ:' : 'Net Profit / Unit:'}
                  </span>
                  <span
                    className={`font-black text-sm ${
                      currentUnitProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(currentUnitProfit, language)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 disabled:opacity-50 transition"
                >
                  {submitting ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {editingProduct
                          ? (language === 'bn' ? 'আপডেট করুন' : 'Update')
                          : (language === 'bn' ? 'যোগ করুন' : 'Save Product')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {language === 'bn' ? 'CSV ফাইল ইমপোর্ট' : 'Import CSV File'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn'
                      ? 'Google Sheets বা Excel থেকে পণ্য আপলোড'
                      : 'Upload products from Google Sheets or Excel'}
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
                className="p-6 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-2xl text-center cursor-pointer transition"
              >
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">
                  {language === 'bn'
                    ? 'CSV ফাইল সিলেক্ট করুন বা ড্র্যাগ করুন'
                    : 'Select or drag CSV file'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'কলাম হেডার: নাম, পরিমাণ, একক, ক্রয় মূল্য, বিক্রয় মূল্য, ক্যাটাগরি'
                    : 'Headers: name, qty, unit, buyPrice, sellPrice, category'}
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
                      ? `প্রিভিউ (${toBengaliNumber(csvPreview.length)} টি পণ্য পাওয়া গেছে)`
                      : `Preview (${csvPreview.length} products found)`}
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                          <th className="py-2 px-2 text-center">{language === 'bn' ? 'স্টক' : 'Stock'}</th>
                          <th className="py-2 px-2 text-right">{language === 'bn' ? 'ক্রয়' : 'Buy Price'}</th>
                          <th className="py-2 px-2 text-right">{language === 'bn' ? 'বিক্রয়' : 'Sell Price'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreview.slice(0, 15).map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2.5 font-medium">{row.name}</td>
                            <td className="py-1.5 px-2 text-center">{row.qty} {formatUnit(row.unit, language)}</td>
                            <td className="py-1.5 px-2 text-right">{formatCurrency(row.buyPrice, language)}</td>
                            <td className="py-1.5 px-2 text-right">{formatCurrency(row.sellPrice, language)}</td>
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
                onClick={handleConfirmCSVImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                {importingCSV
                  ? (language === 'bn' ? 'আপলোড হচ্ছে...' : 'Importing...')
                  : (language === 'bn' ? 'সব পণ্য ইমপোর্ট করুন' : 'Import All Products')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
