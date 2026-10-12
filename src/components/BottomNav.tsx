import React from 'react';
import { LayoutDashboard, Boxes, ShoppingCart, History, BookOpen } from 'lucide-react';
import { formatNumber } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';

export type NavTab = 'dashboard' | 'stock' | 'sale' | 'history' | 'dues';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lowStockCount: number;
  duesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  lowStockCount,
  duesCount,
}) => {
  const { language, t } = useLanguage();

  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: language === 'en' ? 'Dashboard' : 'হোম',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'stock' as NavTab,
      label: language === 'en' ? 'Stock' : 'স্টক',
      icon: Boxes,
      badge: lowStockCount,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'sale' as NavTab,
      label: language === 'en' ? 'Sale' : 'সেল',
      icon: ShoppingCart,
      isPrimaryAction: true,
      badge: 0,
    },
    {
      id: 'history' as NavTab,
      label: language === 'en' ? 'History' : 'হিস্ট্রি',
      icon: History,
      badge: 0,
    },
    {
      id: 'dues' as NavTab,
      label: language === 'en' ? 'Dues' : 'বাকি',
      icon: BookOpen,
      badge: duesCount,
      badgeColor: 'bg-amber-500',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] pb-safe">
      <div className="max-w-[600px] mx-auto px-2 flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isPrimaryAction) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="relative -top-4 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform transform active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-blue-500/40 ring-4 ring-blue-100'
                      : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-indigo-500/30 group-hover:scale-105'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 ${
                    isActive ? 'text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 py-1 flex flex-col items-center justify-center relative transition-colors focus:outline-none ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {tab.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[10px] font-bold text-white px-1.5 py-0.2 rounded-full min-w-4 text-center ring-2 ring-white ${tab.badgeColor || 'bg-blue-500'}`}
                  >
                    {formatNumber(tab.badge, language)}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 ${
                  isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
