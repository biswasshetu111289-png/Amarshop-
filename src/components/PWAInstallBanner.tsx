import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';

interface PWAInstallBannerProps {
  variant?: 'banner' | 'compact' | 'header-btn';
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ variant = 'banner' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useLanguage();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running in standalone mode (installed app), do not show
  if (isInstalled) {
    return null;
  }

  // Header button variant (compact icon + text for top bar)
  if (variant === 'header-btn') {
    if (!isInstallable && !isIOS) return null;

    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (isIOS) {
              setShowIOSModal(true);
            } else {
              install();
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-sm active:scale-95 transition"
          title={language === 'bn' ? 'ফোনে অ্যাপ ইনস্টল করুন' : 'Install App on Phone'}
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-950" />
          <span>{language === 'bn' ? 'অ্যাপ ইনস্টল' : 'Install'}</span>
        </button>

        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} language={language} />
        )}
      </>
    );
  }

  // Compact variant for settings modal
  if (variant === 'compact') {
    return (
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                {language === 'bn' ? 'হোম স্ক্রিনে অ্যাপ ইনস্টল' : 'Install to Home Screen'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {language === 'bn'
                  ? 'কোনো ব্রাউজার লোডিং ছাড়াই দ্রুত ব্যবহারের জন্য'
                  : 'Fast native-like experience without browser delays'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isIOS) {
                setShowIOSModal(true);
              } else if (isInstallable) {
                install();
              } else {
                // If browser didn't fire beforeinstallprompt yet
                setShowIOSModal(true);
              }
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ইনস্টল' : 'Install'}</span>
          </button>
        </div>

        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} language={language} />
        )}
      </div>
    );
  }

  // Banner variant (dismissible banner on main screen)
  if (isDismissed) return null;

  return (
    <>
      <div className="mb-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3 sm:p-3.5 rounded-2xl shadow-md border border-blue-400/30 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-amber-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm leading-tight">
                  {language === 'bn' ? 'মোবাইলে ইনস্টল করে সহজে চালান' : 'Install App for Faster Access'}
                </h4>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 mt-0.5 line-clamp-1">
                {language === 'bn'
                  ? 'নেটওয়ার্ক দুর্বল হলেও দ্রুত খুলবে এবং ব্রাউজার ছাড়াই কাজ করবে।'
                  : 'Opens instantly even during network fluctuations.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isIOS) {
                  setShowIOSModal(true);
                } else if (isInstallable) {
                  install();
                } else {
                  setShowIOSModal(true);
                }
              }}
              className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ইনস্টল করুন' : 'Install App'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              title={language === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSModal && (
        <IOSInstallModal onClose={() => setShowIOSModal(false)} language={language} />
      )}
    </>
  );
};

interface IOSInstallModalProps {
  onClose: () => void;
  language: 'bn' | 'en';
}

const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ onClose, language }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {language === 'bn' ? 'মোবাইলে ইনস্টল করার নিয়ম' : 'How to Install on Mobile'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'bn' ? 'হোম স্ক্রিনে আইকন যুক্ত করুন' : 'Add icon to your Home Screen'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600 my-2">
          <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              ১
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {language === 'bn' ? 'ব্রাউজার মেন্যু চাপুন' : 'Open Browser Menu'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'Chrome ব্রাউজারে উপরে ৩-ডট (⋮) বাটনে অথবা iPhone-এ Safari-এর নিচে Share (📤) বাটনে চাপ দিন।'
                  : 'Tap the 3 dots (⋮) in Chrome or the Share button (📤) in Safari.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              ২
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {language === 'bn' ? '"ইনস্টল করুন" বা "Add to Home Screen"' : '"Add to Home screen" or "Install App"'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'মেন্যু থেকে "Install app" অথবা "Add to Home Screen" অপশনটি সিলেক্ট করুন।'
                  : 'Select "Install app" or "Add to Home Screen" from the options.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {language === 'bn' ? 'সম্পন্ন!' : 'Done!'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'আপনার মোবাইলের স্ক্রিনে অ্যাপটির আইকন তৈরি হয়ে যাবে। সেখান থেকেই এক ক্লিকে খুলতে পারবেন।'
                  : 'The app icon will be saved to your screen for instant one-tap access.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          {language === 'bn' ? 'বুঝেছি' : 'Got it'}
        </button>
      </div>
    </div>
  );
};
