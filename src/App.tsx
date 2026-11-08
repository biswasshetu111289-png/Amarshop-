import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useStore } from './context/StoreContext';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import { useViewMode } from './context/ViewModeContext';
import { AuthView } from './components/AuthView';
import { Header } from './components/Header';
import { DesktopNav } from './components/DesktopNav';
import { BottomNav, NavTab } from './components/BottomNav';
import { ViewModeModal } from './components/ViewModeModal';
import { DashboardView } from './components/DashboardView';
import { StockView } from './components/StockView';
import { SaleEntryView } from './components/SaleEntryView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { CreditDuesView, DuesSubTab } from './components/CreditDuesView';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner';

export default function App() {
  const { user, loading } = useAuth();
  const { lowStockProducts, customerDues, supplierDues } = useStore();
  const { language } = useLanguage();
  const { themeId, activeTheme, customBg } = useTheme();
  const { isDesktop } = useViewMode();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [duesSubTab, setDuesSubTab] = useState<DuesSubTab>('customer');
  const [stockInitialFilter, setStockInitialFilter] = useState<'available' | 'all' | 'zero'>('available');

  const handleNavigate = (
    tab: NavTab,
    subTab?: DuesSubTab,
    stockFilter?: 'available' | 'all' | 'zero'
  ) => {
    if (tab === 'dues' && subTab) {
      setDuesSubTab(subTab);
    }
    if (tab === 'stock' && stockFilter) {
      setStockInitialFilter(stockFilter);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-blue-200">
          {language === 'bn' ? 'আমার বিজনেস ম্যানেজার লোড হচ্ছে...' : 'Amar Business Manager is loading...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <UpdateNotificationBanner />
        <div className="flex-1">
          <AuthView />
        </div>
      </div>
    );
  }

  const appBgClass = themeId === 'custom' ? '' : activeTheme.pageBgClass;
  const appStyle = themeId === 'custom' ? { backgroundColor: `${customBg}10` } : {};

  const totalDuesBadgeCount =
    customerDues.length + supplierDues.filter((s) => s.dueAmount > 0).length;

  return (
    <div
      className={`min-h-screen ${appBgClass} flex flex-col antialiased transition-colors duration-300`}
      style={appStyle}
    >
      {/* App Update Notification Banner */}
      <UpdateNotificationBanner />

      {/* Top Header */}
      <Header />

      {/* Desktop Top Navigation Bar (Only on Desktop mode) */}
      {isDesktop && (
        <DesktopNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'dues') {
              setDuesSubTab('customer');
            }
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          lowStockCount={lowStockProducts.length}
          duesCount={totalDuesBadgeCount}
        />
      )}

      {/* Main Content Area: Responsive container (max-w-[600px] on mobile, max-w-7xl on desktop) */}
      <main
        className={`flex-1 w-full mx-auto transition-all duration-300 ${
          isDesktop ? 'max-w-7xl px-6 pt-6 pb-12' : 'max-w-[600px] px-3.5 pt-4 pb-24'
        }`}
      >
        <PWAInstallBanner variant="banner" />
        {currentTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
        {currentTab === 'stock' && <StockView initialFilter={stockInitialFilter} />}
        {currentTab === 'sale' && (
          <SaleEntryView onSuccessNavigate={() => setCurrentTab('history')} />
        )}
        {currentTab === 'history' && <SalesHistoryView />}
        {currentTab === 'dues' && <CreditDuesView initialSubTab={duesSubTab} />}
      </main>

      {/* Offline Connectivity Notification */}
      <OfflineIndicator />

      {/* View Mode Switcher Modal */}
      <ViewModeModal />

      {/* Fixed Bottom Navigation (Only on Mobile mode) */}
      {!isDesktop && (
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'dues') {
              setDuesSubTab('customer');
            }
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          lowStockCount={lowStockProducts.length}
          duesCount={totalDuesBadgeCount}
        />
      )}
    </div>
  );
}
