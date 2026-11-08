import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatNumber, formatBengaliDate } from '../../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  ShoppingBag,
  Coins,
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Share2,
  Printer,
  Sparkles,
  Users,
  Armchair,
} from 'lucide-react';

interface MonthlyReportTabProps {
  onNavigateTab?: (subTab: string) => void;
}

export const MonthlyReportTab: React.FC<MonthlyReportTabProps> = ({ onNavigateTab }) => {
  const {
    sales,
    expenses,
    products,
    partners,
    supplierDues,
    fixedAssets,
    totalFixedAssetsAmount,
    currentShop,
    isViewer,
    allTimeTotalPurchaseCost,
    allTimeTotalPurchaseUnits,
    totalInventoryBuyValue,
  } = useStore();

  const { language } = useLanguage();

  // Current year-month in YYYY-MM format
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // View Mode: 'monthly' (specific month) or 'all_time' (total business report)
  const [reportScope, setReportScope] = useState<'monthly' | 'all_time'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Compile list of available months from sales and expenses
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthStr);
    for (const s of sales) {
      if (s.date && s.date.length >= 7) {
        set.add(s.date.substring(0, 7));
      }
    }
    for (const e of expenses) {
      if (e.date && e.date.length >= 7) {
        set.add(e.date.substring(0, 7));
      }
    }
    const arr = Array.from(set);
    arr.sort((a, b) => b.localeCompare(a));
    return arr;
  }, [sales, expenses, currentMonthStr]);

  // Product buy price map for calculating COGS
  const productBuyPriceMap = useMemo(() => {
    const map = new Map<string, { buyPrice: number; packagingPrice: number }>();
    for (const p of products) {
      map.set(p.id, {
        buyPrice: Number(p.buyPrice) || 0,
        packagingPrice: Number(p.packagingPrice) || 0,
      });
    }
    return map;
  }, [products]);

  // Filter sales and expenses based on selected scope
  const filteredSales = useMemo(() => {
    if (reportScope === 'all_time') return sales;
    return sales.filter((s) => s.date && s.date.startsWith(selectedMonth));
  }, [sales, reportScope, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    if (reportScope === 'all_time') return expenses;
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, reportScope, selectedMonth]);

  // Key Financial Metrics Calculation
  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  }, [filteredSales]);

  const totalCashSales = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const paid =
        s.paidAmount !== undefined
          ? Number(s.paidAmount)
          : s.payment === 'নগদ'
          ? Number(s.total)
          : 0;
      return sum + paid;
    }, 0);
  }, [filteredSales]);

  const totalDueSales = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const due =
        s.dueAmount !== undefined
          ? Number(s.dueAmount)
          : s.payment === 'বাকি'
          ? Number(s.total)
          : 0;
      return sum + due;
    }, 0);
  }, [filteredSales]);

  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // Cost of Goods Sold (পণ্য ক্রয় ও প্যাকেজিং খরচ)
  const totalCOGS = useMemo(() => {
    let cogs = 0;
    for (const s of filteredSales) {
      let costPerUnit = 0;
      if (s.productId && productBuyPriceMap.has(s.productId)) {
        const prod = productBuyPriceMap.get(s.productId)!;
        costPerUnit = prod.buyPrice + prod.packagingPrice;
      } else {
        costPerUnit = Number(s.packagingPrice || 0);
      }
      cogs += costPerUnit * Number(s.qty || 1);
    }
    return cogs;
  }, [filteredSales, productBuyPriceMap]);

  // Gross Profit = Total Sales - Cost of Goods Sold
  const grossProfit = useMemo(() => {
    return totalSalesAmount - totalCOGS;
  }, [totalSalesAmount, totalCOGS]);

  // Actual Net Profit = Gross Profit - Total Expenses
  const netProfit = useMemo(() => {
    return grossProfit - totalExpensesAmount;
  }, [grossProfit, totalExpensesAmount]);

  // Net Profit Margin %
  const netMargin = useMemo(() => {
    if (totalSalesAmount <= 0) return 0;
    return Math.round((netProfit / totalSalesAmount) * 100);
  }, [netProfit, totalSalesAmount]);

  // Format month label in Bengali (e.g. "নভেম্বর ২০২৬")
  const formatMonthLabel = (ymStr: string) => {
    if (!ymStr || ymStr.length < 7) return ymStr;
    const [y, m] = ymStr.split('-');
    const monthNamesBn = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ];
    const monthNamesEn = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const idx = parseInt(m, 10) - 1;
    if (language === 'bn') {
      const bnMonths = monthNamesBn[idx] || m;
      return `${bnMonths} ${y}`;
    }
    return `${monthNamesEn[idx] || m} ${y}`;
  };

  // -------------------------------------------------------------
  // CHART 1: Comparison Bar Chart Data (Sales vs Expenses vs Net Profit)
  // -------------------------------------------------------------
  const summaryChartData = useMemo(() => {
    return [
      {
        name: language === 'bn' ? 'বিক্রি' : 'Sales',
        amount: Math.max(0, totalSalesAmount),
        fill: '#2563eb', // Blue
      },
      {
        name: language === 'bn' ? 'ক্রয় খরচ' : 'COGS',
        amount: Math.max(0, totalCOGS),
        fill: '#f59e0b', // Amber
      },
      {
        name: language === 'bn' ? 'দোকান খরচ' : 'Expenses',
        amount: Math.max(0, totalExpensesAmount),
        fill: '#ef4444', // Red
      },
      {
        name: language === 'bn' ? 'নিট লাভ' : 'Net Profit',
        amount: Math.max(0, netProfit),
        fill: netProfit >= 0 ? '#10b981' : '#f43f5e', // Emerald or Rose
      },
    ];
  }, [totalSalesAmount, totalCOGS, totalExpensesAmount, netProfit, language]);

  // -------------------------------------------------------------
  // CHART 2: Timeline Breakdown
  // - If Monthly: Daily breakdown (Day 1..31)
  // - If Total Business: Month-by-month history
  // -------------------------------------------------------------
  interface TimelineDataPoint {
    label: string;
    sales: number;
    expenses: number;
    profit: number;
  }

  const timelineChartData: TimelineDataPoint[] = useMemo(() => {
    if (reportScope === 'monthly') {
      // Group by day of the month (e.g. 01, 02, ... 31)
      const daysMap = new Map<string, TimelineDataPoint>();
      
      // Determine number of days in selected month
      const [yearStr, monthStr] = selectedMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const daysInMonth = new Date(y, m, 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = String(d).padStart(2, '0');
        daysMap.set(dStr, {
          label: `${d}`,
          sales: 0,
          expenses: 0,
          profit: 0,
        });
      }

      for (const s of filteredSales) {
        if (!s.date) continue;
        const dayPart = s.date.split('-')[2];
        if (dayPart && daysMap.has(dayPart)) {
          const entry = daysMap.get(dayPart)!;
          entry.sales += Number(s.total || 0);
          
          let itemCost = 0;
          if (s.productId && productBuyPriceMap.has(s.productId)) {
            const p = productBuyPriceMap.get(s.productId)!;
            itemCost = p.buyPrice + p.packagingPrice;
          }
          entry.profit += Number(s.total || 0) - itemCost * Number(s.qty || 1);
        }
      }

      for (const e of filteredExpenses) {
        if (!e.date) continue;
        const dayPart = e.date.split('-')[2];
        if (dayPart && daysMap.has(dayPart)) {
          const entry = daysMap.get(dayPart)!;
          entry.expenses += Number(e.amount || 0);
          entry.profit -= Number(e.amount || 0);
        }
      }

      return Array.from(daysMap.values());
    } else {
      // Total Business Report: Month-by-month historical comparison
      const monthsMap = new Map<string, TimelineDataPoint>();

      // Populate last 6 to 12 months in ascending order
      const sortedMonths = [...availableMonths].reverse();
      for (const ym of sortedMonths) {
        const [y, m] = ym.split('-');
        const monthShortBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
        const label = language === 'bn' ? `${monthShortBn[parseInt(m, 10) - 1]} '${y.slice(2)}` : `${m}/${y.slice(2)}`;
        monthsMap.set(ym, {
          label,
          sales: 0,
          expenses: 0,
          profit: 0,
        });
      }

      for (const s of sales) {
        if (!s.date || s.date.length < 7) continue;
        const ym = s.date.substring(0, 7);
        if (monthsMap.has(ym)) {
          const entry = monthsMap.get(ym)!;
          entry.sales += Number(s.total || 0);
          let itemCost = 0;
          if (s.productId && productBuyPriceMap.has(s.productId)) {
            const p = productBuyPriceMap.get(s.productId)!;
            itemCost = p.buyPrice + p.packagingPrice;
          }
          entry.profit += Number(s.total || 0) - itemCost * Number(s.qty || 1);
        }
      }

      for (const e of expenses) {
        if (!e.date || e.date.length < 7) continue;
        const ym = e.date.substring(0, 7);
        if (monthsMap.has(ym)) {
          const entry = monthsMap.get(ym)!;
          entry.expenses += Number(e.amount || 0);
          entry.profit -= Number(e.amount || 0);
        }
      }

      return Array.from(monthsMap.values());
    }
  }, [reportScope, selectedMonth, filteredSales, filteredExpenses, sales, expenses, availableMonths, productBuyPriceMap, language]);

  // -------------------------------------------------------------
  // Category-wise Expense Breakdown
  // -------------------------------------------------------------
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      const cat = e.category || 'অন্যান্য খরচ';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount || 0));
    }
    const list = Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpensesAmount > 0 ? Math.round((amount / totalExpensesAmount) * 100) : 0,
    }));
    list.sort((a, b) => b.amount - a.amount);
    return list;
  }, [filteredExpenses, totalExpensesAmount]);

  // -------------------------------------------------------------
  // Top Selling Products this month/period
  // -------------------------------------------------------------
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number; unit: string }>();
    for (const s of filteredSales) {
      const key = s.productName;
      const existing = map.get(key);
      if (existing) {
        existing.qty += Number(s.qty || 0);
        existing.total += Number(s.total || 0);
      } else {
        map.set(key, {
          name: s.productName,
          qty: Number(s.qty || 0),
          total: Number(s.total || 0),
          unit: String(s.unit || 'পিস'),
        });
      }
    }
    const list = Array.from(map.values());
    list.sort((a, b) => b.total - a.total);
    return list.slice(0, 5);
  }, [filteredSales]);

  // Share report summary to WhatsApp / Clipboard
  const handleShareReport = () => {
    const scopeLabel =
      reportScope === 'all_time'
        ? (language === 'bn' ? 'সামগ্রিক ব্যবসার রিপোর্ট' : 'Total Business Report')
        : formatMonthLabel(selectedMonth);

    const message = `📊 *${currentShop?.name || 'আমার বিজনেস'} - আর্থিক রিপোর্ট*
📅 সময়কাল: ${scopeLabel}
─────────────────
💰 মোট বিক্রি: ${formatCurrency(totalSalesAmount, language)}
  - নগদ সেল: ${formatCurrency(totalCashSales, language)}
  - বাকি সেল: ${formatCurrency(totalDueSales, language)}
💸 পণ্য ক্রয় খরচ (COGS): ${formatCurrency(totalCOGS, language)}
📈 গ্রস মুনাফা: ${formatCurrency(grossProfit, language)}
🏷️ মোট দোকান খরচ: ${formatCurrency(totalExpensesAmount, language)}
─────────────────
✨ *একচুয়াল নিট লাভ: ${formatCurrency(netProfit, language)}*
📊 নিট প্রফিট মার্জিন: ${netMargin}%
─────────────────
📱 তৈরি হয়েছে: আমার বিজনেস ম্যানেজার অ্যাপ থেকে`;

    if (navigator.share) {
      navigator.share({
        title: `${currentShop?.name || 'দোকান'} রিপোর্ট`,
        text: message,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message);
      alert(language === 'bn' ? 'রিপোর্ট ক্লিপবোর্ডে কপি হয়েছে!' : 'Report copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-6">
      {/* Scope Selector & Month Picker Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {language === 'bn' ? 'আর্থিক ও ব্যবসায়িক রিপোর্ট' : 'Business & Financial Report'}
              </h2>
              <p className="text-xs text-blue-100">
                {language === 'bn'
                  ? 'বিক্রি, খরচ ও নিট লাভের স্বয়ংক্রিয় হিসাব ও গ্রাফ'
                  : 'Automated sales, expense & net profit report with charts'}
              </p>
            </div>
          </div>

          <button
            onClick={handleShareReport}
            className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold active:scale-95"
            title="রিপোর্ট শেয়ার করুন"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'শেয়ার' : 'Share'}</span>
          </button>
        </div>

        {/* Scope Pill Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setReportScope('monthly')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              reportScope === 'monthly'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'মাসিক রিপোর্ট' : 'Monthly Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => setReportScope('all_time')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              reportScope === 'all_time'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'সামগ্রিক ব্যবসার রিপোর্ট' : 'Total Business'}</span>
          </button>
        </div>

        {/* Month Selector Dropdown if Monthly Scope */}
        {reportScope === 'monthly' && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-blue-100 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-200" />
              <span>{language === 'bn' ? 'মাস নির্বাচন করুন:' : 'Select Month:'}</span>
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1.5 px-3 rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym} className="text-slate-800">
                  {formatMonthLabel(ym)} {ym === currentMonthStr ? (language === 'bn' ? '(চলতি মাস)' : '(Current)') : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4 Main Financial Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Total Sales */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {language === 'bn' ? 'মোট বিক্রি (Sales)' : 'Total Sales'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg font-black text-blue-600">
                {formatCurrency(totalSalesAmount, language)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1">
                <span className="bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-medium border border-emerald-100">
                  নগদ: {formatCurrency(totalCashSales, language)}
                </span>
                <span className="bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-medium border border-amber-100">
                  বাকি: {formatCurrency(totalDueSales, language)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
            {formatNumber(filteredSales.length, language)} {language === 'bn' ? 'টি বিক্রির চালান' : 'orders'}
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {language === 'bn' ? 'দোকান খরচ (Expenses)' : 'Expenses'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg font-black text-rose-600">
                {formatCurrency(totalExpensesAmount, language)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {language === 'bn' ? 'দৈনন্দিন পরিচালন খরচ' : 'Daily operational costs'}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
            {formatNumber(filteredExpenses.length, language)} {language === 'bn' ? 'টি খরচের এন্ট্রি' : 'expense entries'}
          </div>
        </div>

        {/* Card 3: COGS / Product Cost */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {language === 'bn'
                  ? (reportScope === 'all_time' ? 'বিক্রিত মালের ক্রয় (COGS)' : 'পণ্য ক্রয় খরচ (COGS)')
                  : 'Cost of Goods'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg font-black text-amber-700">
                {formatCurrency(totalCOGS, language)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                গ্রস লাভ: {formatCurrency(grossProfit, language)}
              </div>
              {reportScope === 'all_time' && (
                <div className="mt-1.5 pt-1 border-t border-amber-100/80 text-[10px] text-amber-900 font-semibold flex items-center justify-between">
                  <span>{language === 'bn' ? 'শুরু হতে মোট ক্রয়:' : 'Total Acquired:'}</span>
                  <span className="text-amber-800 font-bold">{formatCurrency(allTimeTotalPurchaseCost, language)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>{language === 'bn' ? 'মালের মূল ক্রয় ও প্যাকেজিং' : 'Base buy & packaging'}</span>
            {reportScope === 'all_time' && (
              <span className="font-semibold text-indigo-600">
                {formatNumber(allTimeTotalPurchaseUnits, language)} {language === 'bn' ? 'টি পণ্য' : 'units'}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Actual Net Profit */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {language === 'bn' ? 'একচুয়াল নিট লাভ' : 'Net Profit'}
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {netProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </div>
            </div>
            <div className="mt-1.5">
              <div className={`text-lg font-black ${
                netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatCurrency(netProfit, language)}
              </div>
              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-1 border border-emerald-100">
                মার্জিন: {netMargin}%
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
            {language === 'bn' ? 'সব খরচ বাদ দিয়ে আসল লাভ' : 'Net profit after all costs'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRAPH 1: RECHARTS BAR CHART - FINANCIAL COMPARISON */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>
                {language === 'bn'
                  ? 'আর্থিক তুলনা গ্রাফ (Financial Comparison Chart)'
                  : 'Financial Comparison Chart'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {reportScope === 'monthly'
                ? `${formatMonthLabel(selectedMonth)} এর বিক্রি, খরচ ও লাভের বার গ্রাফ`
                : 'ব্যবসার শুরু হতে সামগ্রিক বিক্রি, খরচ ও লাভের বার গ্রাফ'}
            </p>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="w-full h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip
                formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, 'পরিমাণ']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {summaryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend Summary */}
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 text-center">
          <div className="p-1 rounded-lg bg-blue-50/50">
            <span className="text-[9px] text-blue-600 block font-bold">বিক্রি</span>
            <span className="text-[11px] font-extrabold text-blue-700">৳{totalSalesAmount.toLocaleString()}</span>
          </div>
          <div className="p-1 rounded-lg bg-amber-50/50">
            <span className="text-[9px] text-amber-600 block font-bold">ক্রয় খরচ</span>
            <span className="text-[11px] font-extrabold text-amber-700">৳{totalCOGS.toLocaleString()}</span>
          </div>
          <div className="p-1 rounded-lg bg-rose-50/50">
            <span className="text-[9px] text-rose-600 block font-bold">খরচ</span>
            <span className="text-[11px] font-extrabold text-rose-700">৳{totalExpensesAmount.toLocaleString()}</span>
          </div>
          <div className="p-1 rounded-lg bg-emerald-50/50">
            <span className="text-[9px] text-emerald-600 block font-bold">নিট লাভ</span>
            <span className="text-[11px] font-extrabold text-emerald-700">৳{netProfit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRAPH 2: TIMELINE TREND GRAPH (Daily or Monthly) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>
                {reportScope === 'monthly'
                  ? (language === 'bn' ? 'চলতি মাসের দৈনিক ট্রেন্ড গ্রাফ' : 'Daily Sales & Expenses Trend')
                  : (language === 'bn' ? 'মাসভিত্তিক ঐতিহাসিক ট্রেন্ড গ্রাফ' : 'Monthly Historical Trend')}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {reportScope === 'monthly'
                ? 'মাসের কোন দিনে কত বিক্রি ও খরচ হয়েছে'
                : 'বিগত মাসগুলোর বিক্রি ও খরচের তুলনা'}
            </p>
          </div>
        </div>

        <div className="w-full h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineChartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `৳${Number(value).toLocaleString()}`,
                  name === 'sales'
                    ? (language === 'bn' ? 'বিক্রি' : 'Sales')
                    : (language === 'bn' ? 'খরচ' : 'Expense'),
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '11px',
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'sales'
                    ? (language === 'bn' ? 'বিক্রি (Sales)' : 'Sales')
                    : (language === 'bn' ? 'খরচ (Expenses)' : 'Expenses')
                }
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETAILED BREAKDOWNS: TOP PRODUCTS & EXPENSE CATEGORIES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Top Expense Categories */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
              <span>{language === 'bn' ? 'খরচের শীর্ষ খাতসমূহ' : 'Top Expense Categories'}</span>
            </h4>
            <span className="text-[10px] text-slate-400">
              মোট: {formatCurrency(totalExpensesAmount, language)}
            </span>
          </div>

          {expenseByCategory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              {language === 'bn' ? 'এই সময়ে কোনো খরচ রেকর্ড নেই' : 'No expenses recorded in this period'}
            </div>
          ) : (
            <div className="space-y-2">
              {expenseByCategory.slice(0, 5).map((cat) => (
                <div key={cat.category} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-700">
                    <span className="truncate">{cat.category}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(cat.amount, language)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
              <span>{language === 'bn' ? 'শীর্ষ বিক্রিত পণ্য' : 'Top Selling Products'}</span>
            </h4>
            <span className="text-[10px] text-slate-400">
              মোট: {formatCurrency(totalSalesAmount, language)}
            </span>
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              {language === 'bn' ? 'এই সময়ে কোনো বিক্রি রেকর্ড নেই' : 'No sales recorded in this period'}
            </div>
          ) : (
            <div className="space-y-2">
              {topSellingProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-800 block truncate max-w-[130px]">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.qty} {p.unit} বিক্রি
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-blue-700">{formatCurrency(p.total, language)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Partner Profit Sharing Projection (if partners exist) */}
      {partners.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-4 border border-indigo-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-indigo-950">
                {language === 'bn' ? 'পার্টনারদের মুনাফা বণ্টন অনুপাত' : 'Partner Profit Share Allocation'}
              </h4>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-100">
              নিট লাভ: {formatCurrency(netProfit, language)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {partners.map((partner) => {
              const ratio = partner.profitShareRatio || 50;
              const shareAmount = Math.round((netProfit * ratio) / 100);
              return (
                <div key={partner.id} className="p-2.5 bg-white rounded-2xl border border-indigo-100 shadow-xs">
                  <div className="text-xs font-bold text-slate-800 truncate">{partner.name}</div>
                  <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                    শেয়ার: {ratio}%
                  </div>
                  <div className="text-xs font-black text-emerald-600 mt-1">
                    {formatCurrency(shareAmount, language)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixed Assets Capital Summary Notice (চলতি খরচের বাইরে স্থায়ী মূলধন) */}
      {totalFixedAssetsAmount > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
              <Armchair className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-950 block">
                {language === 'bn' ? 'দোকানের মোট স্থায়ী সম্পদ (Fixed Assets)' : 'Store Fixed Assets Value'}
              </span>
              <span className="text-[11px] text-amber-800/80">
                {formatNumber(fixedAssets.length, language)} টি সরঞ্জাম (ফার্নিচার, শোকেস, ডেকোরেশন) — মূলধনে সংরক্ষিত, নিট লাভে প্রভাব ফেলে না
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-black text-amber-800 block">
              {formatCurrency(totalFixedAssetsAmount, language)}
            </span>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('fixed_assets')}
                className="text-[10px] text-indigo-600 font-bold hover:underline"
              >
                খাতা দেখুন &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
