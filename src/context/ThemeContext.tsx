import React, { createContext, useContext, useState, useEffect } from 'react';
import { Palette, Check, RotateCcw, X, Sparkles } from 'lucide-react';
import { useToast } from './ToastContext';

export interface AppTheme {
  id: string;
  nameBn: string;
  nameEn: string;
  // Login background
  loginBgClass: string;
  // Inside app Header bar background
  headerBgClass: string;
  // Inside app Page background
  pageBgClass: string;
  // Primary action button (save, submit, etc.)
  primaryBtnClass: string;
  // Primary central floating button on BottomNav
  floatingSaleBtnClass: string;
  // BottomNav active tab highlight
  activeTabClass: string;
  // Text accent color
  accentTextClass: string;
  // Badge background & border
  badgeClass: string;
  // Preview gradient swatch
  previewGradient: string;
  isDark?: boolean;
  isLight?: boolean;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'navy-indigo',
    nameBn: 'ক্লাসিক নেভি ও ইন্ডিগো (ডিফল্ট)',
    nameEn: 'Classic Navy & Indigo',
    loginBgClass: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900',
    headerBgClass: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white border-b border-indigo-600/30',
    pageBgClass: 'bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-indigo-500/30',
    activeTabClass: 'text-blue-600',
    accentTextClass: 'text-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    previewGradient: 'from-blue-700 via-indigo-700 to-purple-800',
  },
  {
    id: 'emerald-green',
    nameBn: 'বিজনেস এমারেল্ড গ্রিন',
    nameEn: 'Business Emerald Green',
    loginBgClass: 'bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-900',
    headerBgClass: 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 text-white border-b border-emerald-700/40',
    pageBgClass: 'bg-emerald-50/30 bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-500/30',
    activeTabClass: 'text-emerald-600',
    accentTextClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    previewGradient: 'from-emerald-800 via-teal-800 to-emerald-950',
  },
  {
    id: 'royal-gold',
    nameBn: 'রয়্যাল গোল্ড ও মিডনাইট নেভি',
    nameEn: 'Royal Gold & Midnight Navy',
    loginBgClass: 'bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950',
    headerBgClass: 'bg-gradient-to-r from-amber-700 via-yellow-700 to-slate-900 text-white border-b border-amber-600/40',
    pageBgClass: 'bg-amber-50/25 bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-amber-600 to-yellow-600 text-white shadow-amber-500/30',
    activeTabClass: 'text-amber-700',
    accentTextClass: 'text-amber-700',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    previewGradient: 'from-amber-700 via-yellow-700 to-slate-900',
  },
  {
    id: 'deep-purple',
    nameBn: 'মডার্ন পার্পল ও ভায়োলেট',
    nameEn: 'Modern Purple & Violet',
    loginBgClass: 'bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950',
    headerBgClass: 'bg-gradient-to-r from-purple-800 via-indigo-800 to-violet-900 text-white border-b border-purple-700/40',
    pageBgClass: 'bg-purple-50/25 bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-purple-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-purple-600 to-violet-600 text-white shadow-purple-500/30',
    activeTabClass: 'text-purple-600',
    accentTextClass: 'text-purple-700',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    previewGradient: 'from-purple-800 via-indigo-800 to-violet-900',
  },
  {
    id: 'dark-carbon',
    nameBn: 'ডার্ক কার্বন ও স্লিক ব্ল্যাক',
    nameEn: 'Dark Carbon & Sleek Black',
    loginBgClass: 'bg-gradient-to-br from-neutral-950 via-zinc-900 to-stone-900',
    headerBgClass: 'bg-gradient-to-r from-zinc-900 via-neutral-900 to-stone-950 text-white border-b border-zinc-800',
    pageBgClass: 'bg-zinc-950 text-zinc-100',
    primaryBtnClass: 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-white border border-zinc-700 shadow-zinc-900/40',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-zinc-800 to-neutral-700 text-white border border-zinc-600 shadow-black/50',
    activeTabClass: 'text-zinc-100',
    accentTextClass: 'text-zinc-300',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    previewGradient: 'from-zinc-900 via-neutral-900 to-stone-950',
    isDark: true,
  },
  {
    id: 'ocean-cyan',
    nameBn: 'ডিপ ওশান সায়ান ও টিল',
    nameEn: 'Deep Ocean Cyan & Teal',
    loginBgClass: 'bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950',
    headerBgClass: 'bg-gradient-to-r from-cyan-800 via-teal-800 to-blue-900 text-white border-b border-cyan-700/40',
    pageBgClass: 'bg-cyan-50/25 bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white shadow-cyan-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-cyan-600 to-teal-600 text-white shadow-cyan-500/30',
    activeTabClass: 'text-cyan-700',
    accentTextClass: 'text-cyan-700',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    previewGradient: 'from-cyan-800 via-teal-800 to-blue-900',
  },
  {
    id: 'crimson-sunset',
    nameBn: 'সানসেট রুবি ও ক্রিমসন',
    nameEn: 'Sunset Ruby & Crimson',
    loginBgClass: 'bg-gradient-to-br from-stone-950 via-rose-950 to-red-950',
    headerBgClass: 'bg-gradient-to-r from-rose-800 via-red-800 to-orange-900 text-white border-b border-rose-700/40',
    pageBgClass: 'bg-rose-50/25 bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-rose-500/30',
    activeTabClass: 'text-rose-600',
    accentTextClass: 'text-rose-700',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    previewGradient: 'from-rose-800 via-red-800 to-orange-900',
  },
  {
    id: 'clean-light',
    nameBn: 'ক্লিন সফট লাইট (সাদা ব্যাকগ্রাউন্ড)',
    nameEn: 'Clean Soft Light',
    loginBgClass: 'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100',
    headerBgClass: 'bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-900 text-white border-b border-slate-700',
    pageBgClass: 'bg-slate-100 text-slate-900',
    primaryBtnClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/25',
    floatingSaleBtnClass: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-indigo-500/30',
    activeTabClass: 'text-blue-600',
    accentTextClass: 'text-blue-700',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    previewGradient: 'from-slate-100 via-blue-50 to-indigo-100',
    isLight: true,
  },
];

interface ThemeContextType {
  themeId: string;
  activeTheme: AppTheme;
  customBg: string;
  cardStyle: 'white' | 'glass' | 'dark';
  setThemeId: (id: string) => void;
  setCustomBg: (hex: string) => void;
  setCardStyle: (style: 'white' | 'glass' | 'dark') => void;
  resetTheme: () => void;
  showThemeModal: boolean;
  setShowThemeModal: (show: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'navy-indigo',
  activeTheme: APP_THEMES[0],
  customBg: '#0f172a',
  cardStyle: 'white',
  setThemeId: () => {},
  setCustomBg: () => {},
  setCardStyle: () => {},
  resetTheme: () => {},
  showThemeModal: false,
  setShowThemeModal: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<string>(() => {
    return localStorage.getItem('amarshop_app_theme') || localStorage.getItem('amarshop_login_theme') || 'navy-indigo';
  });

  const [customBg, setCustomBgState] = useState<string>(() => {
    return localStorage.getItem('amarshop_app_custom_bg') || localStorage.getItem('amarshop_login_custom_bg') || '#0f172a';
  });

  const [cardStyle, setCardStyleState] = useState<'white' | 'glass' | 'dark'>(() => {
    return (localStorage.getItem('amarshop_app_card_style') as 'white' | 'glass' | 'dark') || 'white';
  });

  const [showThemeModal, setShowThemeModal] = useState(false);

  const activeTheme = APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    localStorage.setItem('amarshop_app_theme', id);
    localStorage.setItem('amarshop_login_theme', id);
  };

  const setCustomBg = (hex: string) => {
    setCustomBgState(hex);
    setThemeIdState('custom');
    localStorage.setItem('amarshop_app_theme', 'custom');
    localStorage.setItem('amarshop_login_theme', 'custom');
    localStorage.setItem('amarshop_app_custom_bg', hex);
    localStorage.setItem('amarshop_login_custom_bg', hex);
  };

  const setCardStyle = (style: 'white' | 'glass' | 'dark') => {
    setCardStyleState(style);
    localStorage.setItem('amarshop_app_card_style', style);
    localStorage.setItem('amarshop_login_card_style', style);
  };

  const resetTheme = () => {
    setThemeIdState('navy-indigo');
    setCustomBgState('#0f172a');
    setCardStyleState('white');
    localStorage.removeItem('amarshop_app_theme');
    localStorage.removeItem('amarshop_login_theme');
    localStorage.removeItem('amarshop_app_custom_bg');
    localStorage.removeItem('amarshop_login_custom_bg');
    localStorage.removeItem('amarshop_app_card_style');
    localStorage.removeItem('amarshop_login_card_style');
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        activeTheme,
        customBg,
        cardStyle,
        setThemeId,
        setCustomBg,
        setCardStyle,
        resetTheme,
        showThemeModal,
        setShowThemeModal,
      }}
    >
      {children}
      {showThemeModal && <ThemeCustomizerModal onClose={() => setShowThemeModal(false)} />}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Universal Global Theme Modal (Works on Login page and everywhere inside the app)
 */
export const ThemeCustomizerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { themeId, customBg, cardStyle, setThemeId, setCustomBg, setCardStyle, resetTheme } = useTheme();
  const { showToast } = useToast();

  const handleApplyTheme = (id: string) => {
    setThemeId(id);
    showToast('পুরো অ্যাপের থিম সফলভাবে পরিবর্তন করা হয়েছে!', 'success');
  };

  const handleApplyCustom = (hex: string) => {
    setCustomBg(hex);
    showToast('কাস্টম ব্যাকগ্রাউন্ড কালার সেভ হয়েছে!', 'success');
  };

  const handleApplyCardStyle = (style: 'white' | 'glass' | 'dark') => {
    setCardStyle(style);
    showToast('কার্ড স্টাইল পরিবর্তন করা হয়েছে!', 'success');
  };

  const handleReset = () => {
    resetTheme();
    showToast('ডিফল্ট থিমে ফিরিয়ে নেওয়া হয়েছে', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">অ্যাপ ও লগইন থিম কাস্টমাইজার</h3>
              <p className="text-[11px] text-slate-500">এখানে পরিবর্তন করলে পুরো অ্যাপের কালার ও স্টাইল পরিবর্তিত হবে</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* Preset Themes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                জনপ্রিয় কালার থিমসমূহ ({APP_THEMES.length}টি)
              </label>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold">
                গ্লোবাল থিম
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {APP_THEMES.map((theme) => {
                const isSelected = themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleApplyTheme(theme.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 bg-gradient-to-br ${theme.previewGradient} shadow-xs border border-white/20`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{theme.nameBn}</p>
                      <p className="text-[10px] text-slate-500 truncate">{theme.nameEn}</p>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                কাস্টম কালার (Custom Color)
              </label>
              {themeId === 'custom' && (
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">
                  সক্রিয়
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              আপনার পছন্দের যেকোনো একরঙা কালার বা কোড দিয়ে পুরো অ্যাপের ব্যাকগ্রাউন্ড ও হেডার সেট করুন:
            </p>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={customBg.startsWith('#') ? customBg : '#0f172a'}
                onChange={(e) => handleApplyCustom(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
              />
              <input
                type="text"
                value={customBg}
                onChange={(e) => handleApplyCustom(e.target.value)}
                placeholder="#0f172a"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Swatches */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'রয়্যাল নেভি', hex: '#0f172a' },
                { label: 'ডিপ গ্রিন', hex: '#064e3b' },
                { label: 'বার্গান্ডি', hex: '#4c0519' },
                { label: 'মিডনাইট ব্ল্যাক', hex: '#09090b' },
                { label: 'রয়্যাল ব্লু', hex: '#1e3a8a' },
                { label: 'স্লেট গ্রে', hex: '#334155' },
              ].map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => handleApplyCustom(swatch.hex)}
                  className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatch.hex }} />
                  <span>{swatch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Style Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ফর্ম ও কার্ড ডিজাইন স্টাইল
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'white', label: 'সাদা ফ্ল্যাট', desc: 'Classic White' },
                { id: 'glass', label: 'গ্লাস ফ্রস্টেড', desc: 'Glassmorphism' },
                { id: 'dark', label: 'ডার্ক কার্ড', desc: 'Dark Mode' },
              ].map((card) => {
                const isSelected = cardStyle === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleApplyCardStyle(card.id as 'white' | 'glass' | 'dark')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">{card.label}</p>
                    <p className="text-[10px] text-slate-500">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ডিফল্টে ফিরুন</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20"
          >
            হয়ে গেছে (সম্পন্ন)
          </button>
        </div>
      </div>
    </div>
  );
};
