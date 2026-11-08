import React from 'react';
import { useViewMode, ViewMode } from '../context/ViewModeContext';
import { useLanguage } from '../context/LanguageContext';
import { Monitor, Smartphone, Sparkles, Check, X, Laptop } from 'lucide-react';

export const ViewModeModal: React.FC = () => {
  const { viewMode, setViewMode, isDesktop, showViewModeModal, setShowViewModeModal } = useViewMode();
  const { language } = useLanguage();

  if (!showViewModeModal) return null;

  const options: Array<{
    id: ViewMode;
    titleBn: string;
    titleEn: string;
    descBn: string;
    descEn: string;
    icon: React.ReactNode;
    badgeBn: string;
    badgeEn: string;
  }> = [
    {
      id: 'auto',
      titleBn: 'অটো রেসপন্সিভ (প্রস্তাবিত)',
      titleEn: 'Auto Responsive (Recommended)',
      descBn: 'মোবাইল ফোনে মোবাইল ভিউ এবং কম্পিউটার/ল্যাপটপের বড় পর্দায় স্বয়ংক্রিয়ভাবে ডেস্কটপ ভিউ লোড হবে।',
      descEn: 'Automatically detects screen size: mobile view on phones, multi-column dashboard on PC/Laptops.',
      icon: <Sparkles className="w-5 h-5 text-indigo-500" />,
      badgeBn: 'স্মার্ট অটো',
      badgeEn: 'Smart Auto',
    },
    {
      id: 'desktop',
      titleBn: 'ডেস্কটপ ভিউ (ওয়াইড স্ক্রিন)',
      titleEn: 'Desktop View (Wide Screen)',
      descBn: 'প্রশস্ত ১২৮০ পিক্সেল ড্যাশবোর্ড, টপ নেভিগেশন মেনু, পাশাপাশি মাল্টি-কলাম গ্রিড ও বিস্তৃত তালিকা।',
      descEn: 'Full 1280px wide container, desktop top bar navigation, side-by-side cards, and expanded tables.',
      icon: <Monitor className="w-5 h-5 text-blue-600" />,
      badgeBn: 'পিসি/ট্যাবলেট উপযোগী',
      badgeEn: 'PC & Mac',
    },
    {
      id: 'mobile',
      titleBn: 'মোবাইল ভিউ (ফোন সাইজ)',
      titleEn: 'Mobile View (Phone Size)',
      descBn: 'মোবাইল অ্যাপের মতো কমপ্যাক্ট ৬০০ পিক্সেল ফ্রেম ও নিচের বটম নেভিগেশন বার।',
      descEn: 'Compact 600px centered frame with classic bottom navigation bar just like a native phone app.',
      icon: <Smartphone className="w-5 h-5 text-emerald-600" />,
      badgeBn: 'স্মার্টফোন ফ্রেম',
      badgeEn: 'Mobile Frame',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-yellow-300 border border-white/15">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {language === 'bn' ? 'স্ক্রিন ভিউ মোড নির্বাচন' : 'Choose View Mode'}
              </h3>
              <p className="text-xs text-blue-200">
                {language === 'bn'
                  ? 'ডেস্কটপ ও মোবাইল ডিসপ্লের সুবিধা নিন'
                  : 'Optimize layout for desktop monitors or mobile'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowViewModeModal(false)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="text-xs text-slate-500 font-medium">
            {language === 'bn'
              ? 'আপনার পছন্দের ভিউ মোড নির্বাচন করুন। এটি আপনার ব্রাউজারে সংরক্ষিত থাকবে:'
              : 'Select your preferred layout style. Your preference is saved locally:'}
          </div>

          <div className="space-y-2.5">
            {options.map((opt) => {
              const isSelected = viewMode === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    setViewMode(opt.id);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isSelected ? 'bg-white shadow-xs' : 'bg-slate-100'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {language === 'bn' ? opt.titleBn : opt.titleEn}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {language === 'bn' ? opt.badgeBn : opt.badgeEn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {language === 'bn' ? opt.descBn : opt.descEn}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Status banner */}
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {language === 'bn' ? 'বর্তমান কার্যকর ভিউ:' : 'Currently Active View:'}
            </span>
            <span className="font-bold flex items-center gap-1.5 text-indigo-700">
              {isDesktop ? (
                <>
                  <Monitor className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ডেস্কটপ ভিউ (প্রশস্ত)' : 'Desktop View (Wide)'}</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>{language === 'bn' ? 'মোবাইল ভিউ (কমপ্যাক্ট)' : 'Mobile View (Compact)'}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => setShowViewModeModal(false)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm shadow transition"
          >
            {language === 'bn' ? 'ঠিক আছে' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
