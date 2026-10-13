import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLanguage } from '../context/LanguageContext';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language } = useLanguage();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/95 text-white px-4 py-2 text-xs font-semibold shadow-xl border border-amber-400 backdrop-blur-xs animate-bounce">
      <WifiOff className="w-4 h-4 text-amber-200" />
      <span>
        {language === 'bn'
          ? 'ইন্টারনেট সংযোগ নেই — ক্যাশ মেমোরি থেকে চলছে'
          : 'Offline Mode — Operating from local cache'}
      </span>
      <span className="h-2 w-2 rounded-full bg-white animate-ping ml-1" />
    </div>
  );
};
