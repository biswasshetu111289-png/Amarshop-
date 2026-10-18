import React from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatQty, formatBengaliDate, formatNumber } from '../utils/formatters';
import {
  Package,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { NavTab } from './BottomNav';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    currentShop,
    userRole,
    canManage,
    totalProductsCount,
    todaySalesAmount,
    totalDuesAmount,
    totalProfitAmount,
    lowStockProducts,
    sales,
  } = useStore();
  const { language, t } = useLanguage();
  const { activeTheme, themeId, customBg } = useTheme();

  const recentSales = sales.slice(0, 5);

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
          {currentShop?.logoUrl && (
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 overflow-hidden shrink-0 shadow-sm">
              <img
                src={currentShop.logoUrl}
                alt={currentShop.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-blue-200 font-medium">
              {!currentShop?.logoUrl && <Store className="w-3.5 h-3.5" />}
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

        {canManage ? (
          <button
            onClick={() => onNavigate('sale')}
            className="px-3.5 py-2 bg-white text-blue-800 hover:bg-blue-50 active:scale-95 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
          >
            <span>{language === 'bn' ? 'নতুন বিক্রি' : 'New Sale'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => onNavigate('history')}
            className="px-3.5 py-2 bg-white/20 text-white hover:bg-white/30 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
          >
            <span>{language === 'bn' ? 'বিক্রি দেখুন' : 'View Sales'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4 Stat Cards in 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Total Products */}
        <div
          onClick={() => onNavigate('stock')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট স্টক' : 'Total Stock'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-800">
              {formatNumber(totalProductsCount, language)} {language === 'bn' ? 'টি' : ''}
            </div>
            <div className="text-[11px] text-blue-600 flex items-center gap-0.5 mt-0.5">
              <span>{language === 'bn' ? 'স্টক তালিকা দেখুন' : 'View Stock'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Card 2: Today's Sales */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition cursor-pointer group"
        >
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
            <div className="text-[11px] text-slate-500 mt-0.5">
              {language === 'bn' ? 'আজকের মোট বিক্রি' : "Today's Total Sales"}
            </div>
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

        {/* Card 4: Total Profit */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট লাভ' : 'Total Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-bold ${
                totalProfitAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(totalProfitAmount, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn' ? 'বিক্রি ও প্যাকেজিং সমন্বিত নিট লাভ' : 'Net profit after packaging cost'}
            </div>
          </div>
        </div>
      </div>

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
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{s.productName}</div>
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
    </div>
  );
};
