import React, { useState } from 'react';
import { Sale } from '../types';
import {
  formatCurrency,
  formatBengaliDate,
  formatQty,
  formatPaymentMethod,
  formatPaymentType,
} from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Receipt,
  X,
  Printer,
  Share2,
  Copy,
  Check,
  Phone,
  Calendar,
  CreditCard,
  Building2,
  Coins,
  ArrowRight,
} from 'lucide-react';

interface InvoiceModalProps {
  sale: Sale;
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
  logoUrl?: string;
  onClose: () => void;
  onNextSale?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  shopName = 'আমার দোকান',
  shopPhone = '',
  shopAddress = '',
  logoUrl,
  onClose,
  onNextSale,
}) => {
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [whatsappPhone, setWhatsappPhone] = useState(sale.customerPhone || '');
  const [copied, setCopied] = useState(false);

  const invoiceNo = `INV-${sale.id ? sale.id.slice(-6).toUpperCase() : Date.now().toString().slice(-6)}`;
  const displayLogo = logoUrl || '/assets/aistudio/file_00000000312481fabfb649d53c7c85c6_7cd0cbb9.png';

  const paidAmt =
    sale.paidAmount !== undefined
      ? Number(sale.paidAmount)
      : sale.payment === 'নগদ'
      ? Number(sale.total)
      : 0;

  const dueAmt =
    sale.dueAmount !== undefined
      ? Number(sale.dueAmount)
      : sale.payment === 'বাকি'
      ? Number(sale.total)
      : 0;

  // Format Text Receipt for WhatsApp / SMS / Messenger
  const generateReceiptText = () => {
    const lines = [
      `🧾 *ক্যাশ মেমো / ইনভয়েস*`,
      `🏪 *${shopName}*`,
      shopAddress ? `📍 ${shopAddress}` : '',
      shopPhone ? `📞 ${shopPhone}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `📄 ইনভয়েস নং: #${invoiceNo}`,
      `📅 বিক্রির তারিখ: ${formatBengaliDate(sale.date, 'bn')}`,
      `👤 ক্রেতা: ${sale.customer || 'সম্মানিত ক্রেতা'}`,
      sale.customerPhone ? `📱 মোবাইল: ${sale.customerPhone}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 পণ্য: ${sale.productName}${sale.color ? ` (${sale.color})` : ''}`,
      `🔢 পরিমাণ: ${formatQty(sale.qty, sale.unit, 'bn')} @ ৳ ${sale.price.toLocaleString('en-US')}`,
      `💵 মোট মূল্য: ৳ ${sale.total.toLocaleString('en-US')}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `✅ পরিশোধিত: ৳ ${paidAmt.toLocaleString('en-US')} (${formatPaymentMethod(sale.paymentMethod || 'নগদ', 'bn')})`,
      dueAmt > 0
        ? `⚠️ অবশিষ্ট বকেয়া বাকি: ৳ ${dueAmt.toLocaleString('en-US')}`
        : `🎉 বকেয়া: ৳ ০ (সম্পূর্ণ পরিশোধিত)`,
      sale.collectionDate
        ? `📅 বাকি আদায়ের তারিখ: ${formatBengaliDate(sale.collectionDate, 'bn')}`
        : '',
      sale.collectionNotes ? `📝 নোট: ${sale.collectionNotes}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `ধন্যবাদ! আমাদের সাথেই থাকুন।`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  // Send WhatsApp Invoice
  const handleSendWhatsApp = () => {
    let cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      showToast('অনুগ্রহ করে কাস্টমারের ফোন নম্বর দিন', 'warning');
      return;
    }

    // Auto prepend 880 if local BD format 017...
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = `88${cleanPhone}`;
    }

    const text = encodeURIComponent(generateReceiptText());
    const waUrl = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(waUrl, '_blank');
    showToast('হোয়াটসঅ্যাপে ইনভয়েস পাঠানো হচ্ছে', 'success');
  };

  // Copy Receipt Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText());
      setCopied(true);
      showToast('ইনভয়েস টেক্সট কপি হয়েছে!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('কপি করতে ব্যর্থ হয়েছে', 'error');
    }
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base">
                {language === 'bn' ? 'বিক্রয় রসিদ / ইনভয়েস' : 'Sales Receipt / Invoice'}
              </h3>
              <p className="text-[11px] text-slate-300">#{invoiceNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="p-5 overflow-y-auto space-y-4 print:p-0" id="printable-invoice">
          {/* Shop Brand Section */}
          <div className="text-center pb-3 border-b border-dashed border-slate-200">
            {displayLogo && (
              <img
                src={displayLogo}
                alt={shopName}
                className="w-14 h-14 mx-auto object-contain rounded-2xl mb-1.5 shadow-xs"
              />
            )}
            <h2 className="text-lg font-black text-slate-900">{shopName}</h2>
            {shopAddress && <p className="text-xs text-slate-500">{shopAddress}</p>}
            {shopPhone && <p className="text-xs text-slate-600 font-semibold mt-0.5">ফোন: {shopPhone}</p>}
          </div>

          {/* Invoice Meta */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">ইনভয়েস নম্বর:</span>
              <span className="font-bold text-slate-800">#{invoiceNo}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">বিক্রির তারিখ:</span>
              <span className="font-bold text-slate-800">{formatBengaliDate(sale.date, language)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">ক্রেতার নাম:</span>
              <span className="font-bold text-blue-700">{sale.customer || 'সাধারণ ক্রেতা'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">মোবাইল:</span>
              <span className="font-bold text-slate-700">{sale.customerPhone || 'প্রযোজ্য নয়'}</span>
            </div>
          </div>

          {/* Item Details Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <div className="bg-slate-100 font-bold text-slate-700 px-3 py-2 flex items-center justify-between">
              <span>পণ্য ও বিবরণ</span>
              <span>মোট</span>
            </div>
            <div className="p-3 space-y-1 bg-white">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{sale.productName}</span>
                <span>{formatCurrency(sale.total, language)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  {formatQty(sale.qty, sale.unit, language)} × {formatCurrency(sale.price, language)}
                  {sale.color && ` • রং: ${sale.color}`}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-600">
              <span>সর্বমোট মূল্য:</span>
              <span className="font-bold text-slate-900">{formatCurrency(sale.total, language)}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700">
              <span>পরিশোধিত টাকা:</span>
              <span className="font-bold">
                {formatCurrency(paidAmt, language)}{' '}
                <span className="text-[10px] font-normal text-slate-500">
                  ({formatPaymentMethod(sale.paymentMethod || 'নগদ', language)})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span className="font-bold text-slate-700">অবশিষ্ট বাকি:</span>
              <span
                className={`font-black text-sm ${
                  dueAmt > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {dueAmt > 0 ? formatCurrency(dueAmt, language) : 'পরিশোধিত (৳ ০)'}
              </span>
            </div>

            {/* Collection Date if paid later */}
            {sale.collectionDate && (
              <div className="mt-2 pt-2 border-t border-dashed border-emerald-300 text-[11px] text-emerald-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <strong>বাকি আদায় সম্পন্ন:</strong> {formatBengaliDate(sale.collectionDate, language)}
                  {sale.collectionNotes ? ` (${sale.collectionNotes})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Thank You Note */}
          <div className="text-center text-[11px] text-slate-400 py-1 italic">
            আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ! আবার আসবেন।
          </div>

          {/* WhatsApp Share Box */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>হোয়াটসঅ্যাপে ইনভয়েস পাঠান</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">১ ক্লিকে সেন্ড</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 shrink-0"
              >
                <span>পাঠান</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">টেক্সট কপি</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {onNextSale && (
              <button
                onClick={() => {
                  onClose();
                  onNextSale();
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                পরবর্তী বিক্রি
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
