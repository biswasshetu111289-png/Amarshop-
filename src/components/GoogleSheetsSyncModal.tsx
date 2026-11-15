import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Shop } from '../types';
import {
  downloadShopAsExcelWorkbook,
  fetchShopFullData,
  getSavedShopSheetMeta,
  SheetSyncResult,
  ShopFullData,
  syncShopToGoogleSheet,
} from '../services/googleSheetsService';
import { formatNumber } from '../utils/formatters';
import {
  FileSpreadsheet,
  X,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Download,
  Store,
  ShieldCheck,
  AlertTriangle,
  Cloud,
  Sparkles,
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingConfirmation {
  mode: 'single' | 'all';
  targets: Array<{
    shop: Shop;
    data: ShopFullData;
    existingSheetId?: string;
  }>;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    user,
    hasWorkspaceToken,
    getWorkspaceToken,
    connectGoogleWorkspace,
    clearWorkspaceToken,
  } = useAuth();
  const { shops, currentShop, refreshShops } = useStore();
  const { showToast } = useToast();
  const { language } = useLanguage();

  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [preparingConfirm, setPreparingConfirm] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [recentResults, setRecentResults] = useState<Record<string, SheetSyncResult>>({});
  const [downloadingExcelId, setDownloadingExcelId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      await connectGoogleWorkspace();
      showToast(
        language === 'bn'
          ? 'গুগল শিটস ও ড্রাইভ সফলভাবে কানেক্ট হয়েছে!'
          : 'Connected to Google Sheets & Drive!',
        'success'
      );
    } catch (err: any) {
      console.error('Google Workspace auth failed:', err);
      showToast(
        err?.message ||
          (language === 'bn'
            ? 'গুগল একাউন্ট কানেক্ট করতে সমস্যা হয়েছে'
            : 'Failed to connect Google account'),
        'error'
      );
    } finally {
      setConnectingGoogle(false);
    }
  };

  // Step 1 before mutating Google Sheets: prepare explicit confirmation dialog
  const handlePrepareSync = async (targetShops: Shop[], mode: 'single' | 'all') => {
    const token = getWorkspaceToken();
    if (!token) {
      showToast(
        language === 'bn'
          ? 'প্রথমে "Sign in with Google" বাটনে ক্লিক করে গুগল শিটস কানেক্ট করুন'
          : 'Please sign in with Google first to connect Google Sheets',
        'warning'
      );
      return;
    }

    if (targetShops.length === 0) {
      showToast(
        language === 'bn' ? 'কোনো দোকান পাওয়া যায়নি' : 'No shops found to sync',
        'warning'
      );
      return;
    }

    setPreparingConfirm(true);
    try {
      const targets = await Promise.all(
        targetShops.map(async (shop) => {
          const data = await fetchShopFullData(shop.id);
          const meta = getSavedShopSheetMeta(shop);
          return {
            shop,
            data,
            existingSheetId: meta.spreadsheetId,
          };
        })
      );

      setPendingConfirm({ mode, targets });
    } catch (err: any) {
      console.error('Prepare sync error:', err);
      showToast(
        language === 'bn'
          ? 'দোকানের ডাটা লোড করতে সমস্যা হয়েছে'
          : 'Failed to prepare shop data',
        'error'
      );
    } finally {
      setPreparingConfirm(false);
    }
  };

  // Step 2: Execute sync ONLY after explicit user confirmation
  const handleConfirmedSync = async () => {
    if (!pendingConfirm) return;
    let token = getWorkspaceToken();
    if (!token) {
      setPendingConfirm(null);
      showToast('গুগল সেশন শেষ হয়ে গেছে, পুনরায় কানেক্ট করুন।', 'warning');
      return;
    }

    setSyncing(true);
    const updatedResults: Record<string, SheetSyncResult> = { ...recentResults };
    let successCount = 0;

    try {
      for (let i = 0; i < pendingConfirm.targets.length; i++) {
        const item = pendingConfirm.targets[i];
        setSyncProgress(
          language === 'bn'
            ? `(${i + 1}/${pendingConfirm.targets.length}) "${item.shop.name}" সেভ হচ্ছে...`
            : `(${i + 1}/${pendingConfirm.targets.length}) Saving "${item.shop.name}"...`
        );

        const result = await syncShopToGoogleSheet(token, item.shop, item.data);
        updatedResults[item.shop.id] = result;
        successCount++;
      }

      setRecentResults(updatedResults);
      setPendingConfirm(null);
      await refreshShops();

      showToast(
        language === 'bn'
          ? `সফলভাবে ${formatNumber(successCount, language)}টি শপের সকল ডাটা আলাদা গুগল শিটে সেভ হয়েছে!`
          : `Successfully saved ${successCount} shop(s) to separate Google Sheets!`,
        'success'
      );
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      if (err?.status === 401 || err?.status === 403) {
        clearWorkspaceToken();
        setPendingConfirm(null);
        showToast(
          language === 'bn'
            ? 'গুগল অ্যাক্সেস অনুমতির মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার "Sign in with Google" করুন।'
            : 'Google access expired or missing permission. Please reconnect with Google.',
          'error'
        );
      } else {
        showToast(err?.message || 'গুগল শিটে সেভ করতে সমস্যা হয়েছে', 'error');
      }
    } finally {
      setSyncing(false);
      setSyncProgress('');
    }
  };

  const handleDownloadLocalExcel = async (shop: Shop) => {
    setDownloadingExcelId(shop.id);
    try {
      const data = await fetchShopFullData(shop.id);
      downloadShopAsExcelWorkbook(shop, data);
      showToast(
        language === 'bn'
          ? `"${shop.name}" এর এক্সেল (.xls) ফাইল ডাউনলোড সম্পন্ন!`
          : `Downloaded Excel (.xls) workbook for "${shop.name}"!`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showToast('এক্সেল ফাইল তৈরি করতে সমস্যা হয়েছে', 'error');
    } finally {
      setDownloadingExcelId(null);
    }
  };

  const shopList = shops.length > 0 ? shops : currentShop ? [currentShop] : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-300 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>
                  {language === 'bn'
                    ? 'গুগল শিট ও এক্সেল ব্যাকআপ হাব'
                    : 'Google Sheets & Excel Sync Hub'}
                </span>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.2 rounded-full">
                  {formatNumber(shopList.length, language)} {language === 'bn' ? 'টি শপ' : 'Shops'}
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {language === 'bn'
                  ? 'প্রতিটি দোকানের জন্য আলাদা গুগল শিট তৈরি করে সব হিসাব স্থায়ীভাবে সেভ রাখুন'
                  : 'Create & sync separate Google Sheets for each shop automatically'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Google Workspace Auth Connection Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              hasWorkspaceToken
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  hasWorkspaceToken
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {hasWorkspaceToken ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm">
                  {hasWorkspaceToken
                    ? language === 'bn'
                      ? 'গুগল শিটস ও ড্রাইভ কানেক্টেড আছে'
                      : 'Google Sheets & Drive Connected'
                    : language === 'bn'
                    ? 'গুগল শিটস কানেক্ট করুন'
                    : 'Connect Your Google Account'}
                </h4>
                <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
                  {hasWorkspaceToken
                    ? language === 'bn'
                      ? `একাউন্ট (${user?.email || 'Google'}) থেকে সরাসরি গুগল শিটে ডাটা সেভ করতে পারবেন।`
                      : `Ready to save & update spreadsheets in ${user?.email || 'your Google Drive'}.`
                    : language === 'bn'
                    ? 'আপনার প্রতিটি দোকানের ডাটা গুগল শিটে সেভ করতে নিচের "Sign in with Google" বাটনে ক্লিক করে অনুমতি দিন।'
                    : 'Sign in with Google to allow creating and updating spreadsheets in your Drive.'}
                </p>
              </div>
            </div>

            {/* Official Google Sign-In Button styling */}
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={connectingGoogle || syncing}
              className="shrink-0 inline-flex items-center justify-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f1f1f] font-medium text-xs rounded-full border border-[#747775] shadow-xs transition cursor-pointer disabled:opacity-60"
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              {connectingGoogle ? (
                <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              <span>
                {hasWorkspaceToken
                  ? language === 'bn'
                    ? 'পুনরায় কানেক্ট / পরিবর্তন'
                    : 'Reconnect Google'
                  : 'Sign in with Google'}
              </span>
            </button>
          </div>

          {/* What gets saved inside each shop's spreadsheet */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {language === 'bn'
                  ? 'প্রতিটি দোকানের গুগল শিটে ৮টি আলাদা ট্যাব/পাতা থাকবে:'
                  : 'Each shop gets its own Google Sheet with 8 organized tabs:'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
              {[
                'সারসংক্ষেপ (Summary)',
                'পণ্য ও স্টক (Products)',
                'বিক্রির খাতা (Sales)',
                'কাস্টমার বাকি (Dues)',
                'দোকানের খরচ (Expenses)',
                'পাইকার দেনা (Suppliers)',
                'পার্টনার মূলধন (Partners)',
                'স্থায়ী সম্পদ (Assets)',
              ].map((tab) => (
                <span
                  key={tab}
                  className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700"
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>

          {/* Sync All Shops Action Bar */}
          {shopList.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200">
              <div>
                <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">
                  {language === 'bn'
                    ? `সবগুলো দোকান (${formatNumber(shopList.length, language)}টি) একসাথে সেভ করুন`
                    : `Sync All ${shopList.length} Shops Together`}
                </h4>
                <p className="text-[11px] text-indigo-800/80 mt-0.5">
                  {language === 'bn'
                    ? 'প্রত্যেক দোকানের জন্য আলাদা আলাদা গুগল স্প্রেডশিট ফাইল তৈরি/আপডেট হবে।'
                    : 'Creates or updates a separate Google Spreadsheet for every shop.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!hasWorkspaceToken || preparingConfirm || syncing}
                onClick={() => handlePrepareSync(shopList, 'all')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${preparingConfirm ? 'animate-spin' : ''}`} />
                <span>
                  {preparingConfirm
                    ? language === 'bn'
                      ? 'প্রস্তুত হচ্ছে...'
                      : 'Preparing...'
                    : language === 'bn'
                    ? 'সব শপ গুগল শিটে সেভ করুন'
                    : 'Save All Shops to Sheets'}
                </span>
              </button>
            </div>
          )}

          {/* Individual Shop Cards */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-700 text-xs">
              {language === 'bn' ? 'আপনার দোকানসমূহের তালিকা:' : 'Your Shops:'}
            </h4>

            {shopList.map((shop) => {
              const liveResult = recentResults[shop.id];
              const savedMeta = getSavedShopSheetMeta(shop);
              const sheetUrl = liveResult?.spreadsheetUrl || savedMeta.spreadsheetUrl;
              const lastSync = liveResult?.syncedAt || savedMeta.lastSyncedAt;
              const isCurrent = currentShop?.id === shop.id;

              return (
                <div
                  key={shop.id}
                  className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                    isCurrent
                      ? 'bg-white border-blue-300 ring-1 ring-blue-100 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {shop.logoUrl ? (
                          <img
                            src={shop.logoUrl}
                            alt={shop.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{shop.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                              {language === 'bn' ? 'সক্রিয়' : 'Active'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {lastSync ? (
                            <span className="text-emerald-700 font-medium">
                              ✓ শেষ সেভ:{' '}
                              {new Date(lastSync).toLocaleString('bn-BD', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span>
                              {language === 'bn'
                                ? 'এখনো গুগল শিটে সেভ করা হয়নি'
                                : 'Not synced to Google Sheets yet'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {sheetUrl && (
                      <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 transition"
                      >
                        <span>{language === 'bn' ? 'গুগল শিট খুলুন' : 'Open Sheet'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Per-shop actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!hasWorkspaceToken || preparingConfirm || syncing}
                      onClick={() => handlePrepareSync([shop], 'single')}
                      className="flex-1 min-w-[150px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>
                        {sheetUrl
                          ? language === 'bn'
                            ? 'গুগল শিট আপডেট করুন'
                            : 'Update Google Sheet'
                          : language === 'bn'
                          ? 'গুগল শিটে সেভ করুন'
                          : 'Save to Google Sheet'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={downloadingExcelId === shop.id}
                      onClick={() => handleDownloadLocalExcel(shop)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
                      title="অফলাইন এক্সেল (.xls) ফাইল হিসেবে ডাউনলোড করুন"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        {downloadingExcelId === shop.id
                          ? '...'
                          : language === 'bn'
                          ? 'Excel (.xls)'
                          : 'Excel (.xls)'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'bn'
                ? 'প্রতিটি দোকানের স্প্রেডশিট আপনার Google Drive-এ "AmarBusiness - [দোকানের নাম]" নামে সুরক্ষিতভাবে সংরক্ষিত থাকবে। আপনি গুগল শিট থেকে যেকোনো সময় File > Download > Microsoft Excel (.xlsx) হিসেবেও ডাউনলোড করতে পারবেন।'
                : 'Each shop spreadsheet is securely saved in your Google Drive as "AmarBusiness - [Shop Name]". You can also download it as .xlsx anytime directly from Google Sheets.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>

      {/* MANDATORY Explicit Confirmation Dialog before modifying/overwriting Google Sheets */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {language === 'bn'
                    ? 'গুগল শিটে ডাটা সেভ / আপডেট নিশ্চিত করুন'
                    : 'Confirm Google Sheets Update'}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {language === 'bn'
                    ? 'নিচের দোকানের স্প্রেডশিটগুলো আপনার গুগল ড্রাইভে তৈরি বা সর্বশেষ ডাটা দিয়ে আপডেট করা হবে:'
                    : 'The following spreadsheets in your Google Drive will be created or updated with current data:'}
                </p>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {pendingConfirm.targets.map(({ shop, data, existingSheetId }) => (
                <div
                  key={shop.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      AmarBusiness - {shop.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        existingSheetId
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {existingSheetId
                        ? language === 'bn'
                          ? 'আপডেট হবে'
                          : 'Will Update'
                        : language === 'bn'
                          ? 'নতুন তৈরি হবে'
                          : 'New Sheet'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>পণ্য: {formatNumber(data.products.length, language)}</span>
                    <span>বিক্রি: {formatNumber(data.sales.length, language)}</span>
                    <span>খরচ: {formatNumber(data.expenses.length, language)}</span>
                    <span>পার্টনার: {formatNumber(data.partners.length, language)}</span>
                    <span>পাইকার: {formatNumber(data.supplierDues.length, language)}</span>
                  </div>
                </div>
              ))}
            </div>

            {syncProgress && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{syncProgress}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={syncing}
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-xs disabled:opacity-50"
              >
                {language === 'bn' ? 'বাতিল করুন' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={handleConfirmedSync}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {syncing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'নিশ্চিত করুন ও সেভ করুন' : 'Confirm & Save'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
