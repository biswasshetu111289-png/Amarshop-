import React from 'react';
import { LayoutDashboard, Package, PlusCircle, History, BookOpen, AlertCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface DesktopNavProps {
  currentTab: 'dashboard' | 'stock' | 'sale' | 'history' | 'dues';
  onSelectTab: (tab: 'dashboard' | 'stock' | 'sale' | 'history' | 'dues') => void;
  lowStockCount: number;
  duesCount: number;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({
  currentTab,
  onSelectTab,
  lowStockCount,
  duesCount,
}) => {
  const { language } = useLanguage();
  const { todaySalesAmount, netProfitAmount, isViewer } = useStore();
  const { activeTheme, themeId, customBg } = useTheme();

  const navItems = [
    {
      id: 'dashboard' as const,
      labelBn: 'ড্যাশবোর্ড',
      labelEn: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'stock' as const,
      labelBn: 'স্টক ও পণ্য তালিকা',
      labelEn: 'Stock & Inventory',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'sale' as const,
      labelBn: 'নতুন বিক্রি',
      labelEn: 'New Sale',
      icon: <PlusCircle className="w-4 h-4" />,
      isAction: true,
    },
    {
      id: 'history' as const,
      labelBn: 'বিক্রির খাতা ও হিস্ট্রি',
      labelEn: 'Sales History',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'dues' as const,
      labelBn: 'হিসাব ও বাকি খাতা',
      labelEn: 'Accounts & Dues',
      icon: <BookOpen className="w-4 h-4" />,
      badge: duesCount > 0 ? duesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-xs sticky top-[57px] z-30 transition-all">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;

            if (item.isAction) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-blue-500/20'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{language === 'bn' ? item.labelBn : item.labelEn}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 relative cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{language === 'bn' ? item.labelBn : item.labelEn}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-slate-900' : item.badgeColor
                    }`}
                  >
                    {formatNumber(item.badge, language)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop Quick Summary Widget */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 text-emerald-900">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-600 font-medium">
              {language === 'bn' ? 'আজকের সেল:' : "Today's Sales:"}
            </span>
            <span className="font-bold text-emerald-700">
              {formatCurrency(todaySalesAmount, language)}
            </span>
          </div>

          {!isViewer && (
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 text-indigo-900">
              <span className="text-slate-600 font-medium">
                {language === 'bn' ? 'নিট লাভ:' : 'Net Profit:'}
              </span>
              <span
                className={`font-bold ${
                  netProfitAmount >= 0 ? 'text-indigo-700' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netProfitAmount, language)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
