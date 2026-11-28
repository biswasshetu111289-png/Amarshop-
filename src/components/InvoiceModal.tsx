import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sale } from '../types';
import {
  amountInWords,
  formatBengaliDate,
  formatCurrency,
  formatPaymentMethod,
  formatPaymentType,
  formatQty,
  toBengaliNumber,
} from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  FileText,
  Printer,
  Receipt,
  Share2,
  X,
} from 'lucide-react';

interface InvoiceModalProps {
  sale?: Sale;
  sales?: Sale[];
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
  logoUrl?: string;
  onClose: () => void;
  onNextSale?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  sale,
  sales,
  shopName = 'আমার দোকান',
  shopPhone = '',
  shopAddress = '',
  logoUrl,
  onClose,
  onNextSale,
}) => {
  const { language } = useLanguage();
  const { showToast } = useToast();

  const items = useMemo<Sale[]>(() => {
    if (sales && sales.length > 0) return sales;
    if (sale) return [sale];
    return [];
  }, [sale, sales]);

  const primary = items[0];

  const [whatsappPhone, setWhatsappPhone] = useState(
    () => items.find((s) => s.customerPhone?.trim())?.customerPhone || ''
  );
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState<'official' | 'thermal'>('official');
  const [posPaperWidth, setPosPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [receiptNote, setReceiptNote] = useState(
    () =>
      items.find((s) => s.collectionNotes?.trim() || s.notes?.trim())?.collectionNotes ||
      items.find((s) => s.notes?.trim())?.notes ||
      ''
  );

  // Isolate receipt portal when modal is open so browser Print / PDF never prints background app height
  useEffect(() => {
    document.body.classList.add('receipt-modal-open');
    return () => {
      document.body.classList.remove('receipt-modal-open');
      document.body.classList.remove('printing-receipt');
    };
  }, []);

  if (!primary) return null;

  const receiptNo = primary.invoiceGroupId
    ? primary.invoiceGroupId
    : `MR-${primary.id ? primary.id.slice(-6).toUpperCase() : Date.now().toString().slice(-6)}`;

  const displayLogo =
    logoUrl || '/assets/aistudio/file_00000000c2a882309c8990fa8c4569eb_c897d5b0.png';

  const customerName =
    items.find((s) => s.customer?.trim())?.customer?.trim() ||
    (language === 'bn' ? 'সাধারণ ক্রেতা' : 'Walk-in Customer');
  const customerPhone = items.find((s) => s.customerPhone?.trim())?.customerPhone?.trim() || '';

  const grossSubtotal =
    Math.round(
      items.reduce((sum, s) => {
        const lineSub =
          s.subtotal !== undefined ? Number(s.subtotal) : Number(s.price || 0) * Number(s.qty || 0);
        return sum + lineSub;
      }, 0) * 100
    ) / 100;

  const totalDiscount =
    Math.round(
      items.reduce((sum, s) => sum + Number(s.discount || 0), 0) * 100
    ) / 100;

  const grandTotal =
    Math.round(items.reduce((sum, s) => sum + Number(s.total || 0), 0) * 100) / 100;

  const totalPaid =
    Math.round(
      items.reduce((sum, s) => {
        if (s.paidAmount !== undefined) return sum + Number(s.paidAmount || 0);
        return sum + (s.payment === 'নগদ' ? Number(s.total || 0) : 0);
      }, 0) * 100
    ) / 100;

  const totalDue = Math.max(
    0,
    Math.round(
      items.reduce((sum, s) => {
        if (s.dueAmount !== undefined) return sum + Number(s.dueAmount || 0);
        return sum + (s.payment === 'বাকি' ? Number(s.total || 0) : 0);
      }, 0) * 100
    ) / 100
  );

  const uniqueMethods = Array.from(
    new Set(
      items
        .map((s) => (s.payment === 'বাকি' ? 'বাকি' : s.paymentMethod || 'নগদ'))
        .filter(Boolean)
    )
  );
  const paymentMethodLabel = uniqueMethods
    .map((m) => formatPaymentMethod(m, language))
    .join(', ');

  const statusText =
    totalDue <= 0
      ? language === 'bn'
        ? 'সম্পূর্ণ পরিশোধিত (নগদ)'
        : 'Fully Paid'
      : totalPaid > 0
      ? language === 'bn'
        ? 'আংশিক পরিশোধিত'
        : 'Partially Paid'
      : language === 'bn'
      ? 'বাকি (Credit)'
      : 'Due / Credit';

  const collectionDate = items.find((s) => s.collectionDate)?.collectionDate;
  const wordsText = amountInWords(grandTotal, language);

  // Format Text Receipt for WhatsApp / SMS / Messenger
  const generateReceiptText = () => {
    const itemLines = items.map((item, idx) => {
      const no = toBengaliNumber(idx + 1);
      const colorText = item.color ? ` (${item.color})` : '';
      const discText =
        Number(item.discount || 0) > 0
          ? ` (ছাড়: -৳ ${Number(item.discount).toLocaleString('en-US')})`
          : '';
      return `${no}. ${item.productName}${colorText}\n   ${formatQty(item.qty, item.unit, 'bn')} × ৳ ${Number(item.price).toLocaleString('en-US')}${discText} = ৳ ${Number(item.total).toLocaleString('en-US')}`;
    });

    const lines = [
      `🧾 *মানি রিসিট / MONEY RECEIPT*`,
      `🏪 *${shopName}*`,
      shopAddress ? `📍 ${shopAddress}` : '',
      shopPhone ? `📞 ${shopPhone}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `📄 রিসিট নং: #${receiptNo}`,
      `📅 তারিখ: ${formatBengaliDate(primary.date, 'bn')}`,
      `👤 ক্রেতা: ${customerName}`,
      customerPhone ? `📱 মোবাইল: ${customerPhone}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 *পণ্যের বিবরণ (${toBengaliNumber(items.length)} টি আইটেম):*`,
      ...itemLines,
      `━━━━━━━━━━━━━━━━━━━━`,
      totalDiscount > 0
        ? `🧾 সাবটোটাল: ৳ ${grossSubtotal.toLocaleString('en-US')}`
        : '',
      totalDiscount > 0
        ? `🏷️ ডিসকাউন্ট / ছাড়: -৳ ${totalDiscount.toLocaleString('en-US')}`
        : '',
      `💵 *সর্বমোট বিল:* ৳ ${grandTotal.toLocaleString('en-US')}`,
      `🗣️ কথায়: ${amountInWords(grandTotal, 'bn')}`,
      `✅ *পরিশোধিত:* ৳ ${totalPaid.toLocaleString('en-US')} (${uniqueMethods.map((m) => formatPaymentMethod(m, 'bn')).join(', ')})`,
      totalDue > 0
        ? `⚠️ *অবশিষ্ট বকেয়া:* ৳ ${totalDue.toLocaleString('en-US')}`
        : `🎉 *বকেয়া:* ৳ ০ (সম্পূর্ণ পরিশোধিত)`,
      collectionDate
        ? `📅 বাকি আদায়ের তারিখ: ${formatBengaliDate(collectionDate, 'bn')}`
        : '',
      receiptNote.trim() ? `📝 নোট: ${receiptNote.trim()}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `ধন্যবাদ! আমাদের সাথেই থাকুন।`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  // Send WhatsApp Invoice (uses anchor click instead of window.open)
  const handleSendWhatsApp = () => {
    let cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      showToast(
        language === 'bn'
          ? 'অনুগ্রহ করে কাস্টমারের ফোন নম্বর দিন'
          : 'Please enter customer phone number',
        'warning'
      );
      return;
    }

    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = `88${cleanPhone}`;
    }

    const text = encodeURIComponent(generateReceiptText());
    const waUrl = `https://wa.me/${cleanPhone}?text=${text}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(
      language === 'bn' ? 'হোয়াটসঅ্যাপে মানি রিসিট পাঠানো হচ্ছে' : 'Opening WhatsApp...',
      'success'
    );
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText());
      setCopied(true);
      showToast(
        language === 'bn' ? 'মানি রিসিট টেক্সট কপি হয়েছে!' : 'Money Receipt copied!',
        'success'
      );
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast(language === 'bn' ? 'কপি করতে ব্যর্থ হয়েছে' : 'Failed to copy', 'error');
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove('printing-receipt');
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 5000);
    setTimeout(() => {
      window.print();
    }, 80);
  };

  // Dynamic @page stylesheet tailored to Official A4 vs POS Thermal (80mm / 58mm)
  const dynamicPrintCss =
    printMode === 'official'
      ? `@media print {
          @page { size: A4 portrait; margin: 7mm 8mm; }
          html, body { width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
        }`
      : posPaperWidth === '58mm'
      ? `@media print {
          @page { size: 58mm auto; margin: 1.5mm; }
          html, body { width: 55mm !important; max-width: 55mm !important; margin: 0 !important; padding: 0 !important; }
        }`
      : `@media print {
          @page { size: 80mm auto; margin: 2mm; }
          html, body { width: 76mm !important; max-width: 76mm !important; margin: 0 !important; padding: 0 !important; }
        }`;

  const renderReceiptBody = (isForPrint: boolean) => {
    if (printMode === 'official') {
      const compactPad = isForPrint ? 'p-3.5 space-y-2.5' : 'p-4 sm:p-5 space-y-3.5';
      const cellPad = isForPrint ? 'py-1.5 px-2' : 'py-2 px-2.5';
      return (
        <div
          className={`border-2 border-slate-800 bg-white text-slate-900 ${
            isForPrint ? 'rounded-lg shadow-none' : 'rounded-xl shadow-xs'
          }`}
        >
          {/* Accent Top Strip */}
          <div className="h-1.5 bg-gradient-to-r from-slate-900 via-indigo-900 to-emerald-700" />

          <div className={compactPad}>
            {/* Top Header: Shop Brand vs MONEY RECEIPT Badge */}
            <div
              className={`flex ${
                isForPrint ? 'flex-row items-start' : 'flex-col sm:flex-row sm:items-start'
              } justify-between gap-3 pb-2.5 border-b-2 border-slate-200`}
            >
              <div className="flex items-start gap-2.5">
                {displayLogo && (
                  <img
                    src={displayLogo}
                    alt={shopName}
                    className={`${
                      isForPrint ? 'w-12 h-12' : 'w-13 h-13'
                    } object-contain rounded-xl border border-slate-200 p-0.5 bg-white shrink-0`}
                  />
                )}
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {shopName}
                  </h2>
                  {shopAddress && (
                    <p className="text-[11px] text-slate-600 mt-0.5 max-w-xs leading-tight">
                      {shopAddress}
                    </p>
                  )}
                  {shopPhone && (
                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                      {language === 'bn' ? 'মোবাইল:' : 'Phone:'} {shopPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className={`${isForPrint ? 'text-right' : 'sm:text-right'} shrink-0`}>
                <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-black tracking-wider uppercase">
                  {language === 'bn' ? 'মানি রিসিট / MONEY RECEIPT' : 'MONEY RECEIPT'}
                </div>
                <div className="mt-1.5 space-y-0.5 text-[11px]">
                  <p className="font-bold text-slate-800">
                    {language === 'bn' ? 'রিসিট নং:' : 'Receipt No:'}{' '}
                    <span className="font-mono text-indigo-800">#{receiptNo}</span>
                  </p>
                  <p className="text-slate-600 font-medium">
                    {language === 'bn' ? 'তারিখ:' : 'Date:'}{' '}
                    {formatBengaliDate(primary.date, language)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer & Payment Meta */}
            <div
              className={`grid ${
                isForPrint ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
              } gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs`}
            >
              <div className="space-y-0.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    {language === 'bn' ? 'ক্রেতার নাম (Received From)' : 'Received With Thanks From'}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">{customerName}</span>
                </div>
                {customerPhone && (
                  <p className="text-[11px] text-slate-600 font-semibold font-mono">
                    {language === 'bn' ? 'মোবাইল:' : 'Mobile:'} {customerPhone}
                  </p>
                )}
              </div>

              <div className={`${isForPrint ? 'text-right' : 'sm:text-right'} space-y-0.5`}>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    {language === 'bn' ? 'পেমেন্ট অবস্থা ও মাধ্যম' : 'Payment Status & Method'}
                  </span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      totalDue <= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : totalPaid > 0
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {statusText}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  {language === 'bn' ? 'মাধ্যম:' : 'Method:'}{' '}
                  {paymentMethodLabel || (language === 'bn' ? 'নগদ' : 'Cash')}
                </p>
              </div>
            </div>

            {/* Itemized Products Table (paginates cleanly when items are numerous) */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="receipt-items-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th className={`${cellPad} w-9 text-center`}>
                      {language === 'bn' ? 'নং' : '#'}
                    </th>
                    <th className={cellPad}>
                      {language === 'bn' ? 'পণ্যের বিবরণ' : 'Item Description'}
                    </th>
                    <th className={`${cellPad} text-center`}>
                      {language === 'bn' ? 'পরিমাণ' : 'Qty'}
                    </th>
                    <th className={`${cellPad} text-right`}>
                      {language === 'bn' ? 'দর' : 'Rate'}
                    </th>
                    {totalDiscount > 0 && (
                      <th className={`${cellPad} text-right`}>
                        {language === 'bn' ? 'ছাড়' : 'Disc.'}
                      </th>
                    )}
                    <th className={`${cellPad} text-right`}>
                      {language === 'bn' ? 'মোট টাকা' : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {items.map((item, idx) => {
                    const itemDisc = Number(item.discount || 0);
                    return (
                      <tr
                        key={item.id || idx}
                        className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                      >
                        <td className={`${cellPad} text-center font-semibold text-slate-500`}>
                          {language === 'bn' ? toBengaliNumber(idx + 1) : idx + 1}
                        </td>
                        <td className={cellPad}>
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          {item.color && (
                            <span className="text-[10px] text-slate-500">
                              {language === 'bn' ? `রং/ধরন: ${item.color}` : `Variant: ${item.color}`}
                            </span>
                          )}
                        </td>
                        <td className={`${cellPad} text-center font-semibold text-slate-700 whitespace-nowrap`}>
                          {formatQty(item.qty, item.unit, language)}
                        </td>
                        <td className={`${cellPad} text-right text-slate-700 whitespace-nowrap`}>
                          {formatCurrency(item.price, language)}
                        </td>
                        {totalDiscount > 0 && (
                          <td className={`${cellPad} text-right text-amber-700 font-semibold whitespace-nowrap`}>
                            {itemDisc > 0 ? `-${formatCurrency(itemDisc, language)}` : '—'}
                          </td>
                        )}
                        <td className={`${cellPad} text-right font-bold text-slate-900 whitespace-nowrap`}>
                          {formatCurrency(item.total, language)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary & Signature Block kept together cleanly (receipt-no-break) */}
            <div className="receipt-no-break space-y-2.5">
              {/* Summary & Amount in Words */}
              <div
                className={`grid ${
                  isForPrint ? 'grid-cols-12' : 'grid-cols-1 sm:grid-cols-12'
                } gap-2.5 items-stretch`}
              >
                {/* Amount in Words + Notes */}
                <div
                  className={`${
                    isForPrint ? 'col-span-7' : 'sm:col-span-7'
                  } bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between space-y-1.5 text-xs`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      {language === 'bn' ? 'কথায় (সর্বমোট বিল):' : 'Amount In Words:'}
                    </span>
                    <p className="font-bold text-slate-800 mt-0.5 leading-snug text-[11px]">
                      {wordsText}
                    </p>
                  </div>

                  {collectionDate && (
                    <div className="pt-1.5 border-t border-dashed border-emerald-300 text-[10px] text-emerald-800 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>
                        <strong>{language === 'bn' ? 'বাকি আদায়ের তারিখ:' : 'Due Settled On:'}</strong>{' '}
                        {formatBengaliDate(collectionDate, language)}
                      </span>
                    </div>
                  )}

                  {receiptNote.trim() && (
                    <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-600 flex items-start gap-1.5">
                      <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>{language === 'bn' ? 'নোট:' : 'Note:'}</strong>{' '}
                        {receiptNote.trim()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Totals Breakdown */}
                <div
                  className={`${
                    isForPrint ? 'col-span-5' : 'sm:col-span-5'
                  } bg-slate-50 border border-slate-300 rounded-xl p-2.5 space-y-1 text-[11px]`}
                >
                  {totalDiscount > 0 && (
                    <>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>{language === 'bn' ? 'মোট আসল মূল্য:' : 'Subtotal:'}</span>
                        <span className="font-semibold">{formatCurrency(grossSubtotal, language)}</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-800">
                        <span className="font-semibold">
                          {language === 'bn' ? 'মোট ডিসকাউন্ট (-):' : 'Discount (-):'}
                        </span>
                        <span className="font-bold">-{formatCurrency(totalDiscount, language)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-slate-800">
                    <span className="font-bold">
                      {language === 'bn' ? 'সর্বমোট বিল:' : 'Net Total:'}
                    </span>
                    <span className="font-black text-slate-900 text-xs">
                      {formatCurrency(grandTotal, language)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="font-semibold">
                      {language === 'bn' ? 'জমা / পরিশোধিত:' : 'Amount Paid:'}
                    </span>
                    <span className="font-bold">{formatCurrency(totalPaid, language)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-300 pt-1">
                    <span className="font-bold text-slate-800">
                      {language === 'bn' ? 'অবশিষ্ট বকেয়া:' : 'Balance Due:'}
                    </span>
                    <span
                      className={`font-black text-xs ${
                        totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {totalDue > 0
                        ? formatCurrency(totalDue, language)
                        : language === 'bn'
                        ? '৳ ০ (পরিশোধিত)'
                        : '৳ 0 (Paid)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Footer Section */}
              <div
                className={`${
                  isForPrint ? 'pt-5 mt-2' : 'pt-7 mt-3'
                } border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-[11px]`}
              >
                <div className={isForPrint ? 'pt-4' : 'pt-5'}>
                  <div className="border-t border-slate-700 w-4/5 mx-auto pt-1 font-bold text-slate-700">
                    {language === 'bn' ? 'ক্রেতার স্বাক্ষর' : 'Customer Signature'}
                  </div>
                </div>
                <div className={isForPrint ? 'pt-4' : 'pt-5'}>
                  <div className="border-t border-slate-700 w-4/5 mx-auto pt-1 font-bold text-slate-800">
                    {language === 'bn' ? 'কর্তৃপক্ষের স্বাক্ষর ও সিল' : 'Authorized Signature & Seal'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{shopName}</p>
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-400">
                {language === 'bn'
                  ? 'আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ! এটি একটি অফিসিয়াল মানি রিসিট।'
                  : 'Thank you for your business! This is an official Money Receipt.'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Thermal POS Layout (fits both 80mm and compact 58mm thermal rolls)
    const is58mm = posPaperWidth === '58mm';
    return (
      <div
        className={
          isForPrint
            ? `w-full bg-white text-black ${
                is58mm ? 'text-[10px] leading-tight space-y-1.5' : 'text-[11px] leading-snug space-y-2'
              }`
            : `${
                is58mm ? 'max-w-[230px] p-2.5 text-[10px]' : 'max-w-[310px] p-3.5 text-[11px]'
              } mx-auto border border-dashed border-slate-400 rounded-xl bg-white text-slate-900 space-y-2`
        }
      >
        {/* Shop Brand */}
        <div className="text-center pb-1.5 border-b border-dashed border-slate-400">
          {displayLogo && (
            <img
              src={displayLogo}
              alt={shopName}
              className={`${
                is58mm ? 'w-8 h-8' : 'w-10 h-10'
              } mx-auto object-contain rounded mb-1`}
            />
          )}
          <h2 className={`${is58mm ? 'text-xs' : 'text-sm'} font-black leading-tight`}>
            {shopName}
          </h2>
          {shopAddress && (
            <p className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} text-slate-700 leading-tight`}>
              {shopAddress}
            </p>
          )}
          {shopPhone && (
            <p className={`${is58mm ? 'text-[9px]' : 'text-[10px]'} font-bold`}>
              ফোন: {shopPhone}
            </p>
          )}
          <div className="mt-1 inline-block px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded">
            MONEY RECEIPT #{receiptNo}
          </div>
        </div>

        {/* Date & Customer Meta */}
        <div
          className={`space-y-0.5 ${
            is58mm ? 'text-[9px]' : 'text-[10px]'
          } border-b border-dashed border-slate-400 pb-1.5`}
        >
          <div className="flex justify-between gap-1">
            <span className="text-slate-600">{language === 'bn' ? 'তারিখ:' : 'Date:'}</span>
            <span className="font-bold text-right">{formatBengaliDate(primary.date, language)}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-slate-600">{language === 'bn' ? 'ক্রেতা:' : 'Customer:'}</span>
            <span className="font-bold text-right truncate max-w-[65%]">{customerName}</span>
          </div>
          {customerPhone && (
            <div className="flex justify-between gap-1">
              <span className="text-slate-600">{language === 'bn' ? 'মোবাইল:' : 'Phone:'}</span>
              <span className="font-mono font-semibold text-right">{customerPhone}</span>
            </div>
          )}
        </div>

        {/* Itemized List */}
        <div className="space-y-1 border-b border-dashed border-slate-400 pb-1.5">
          <div
            className={`flex justify-between font-bold ${
              is58mm ? 'text-[9px]' : 'text-[10px]'
            } text-slate-700 border-b border-dotted border-slate-300 pb-0.5`}
          >
            <span>{language === 'bn' ? 'পণ্যের বিবরণ' : 'Item'}</span>
            <span>{language === 'bn' ? 'মোট' : 'Total'}</span>
          </div>
          {items.map((item, idx) => {
            const itemDisc = Number(item.discount || 0);
            return (
              <div key={item.id || idx} className="space-y-0.5">
                <div className="flex justify-between items-start gap-1 font-bold">
                  <span className="break-words">
                    {idx + 1}. {item.productName}
                    {item.color ? ` (${item.color})` : ''}
                  </span>
                  <span className="whitespace-nowrap shrink-0">
                    {formatCurrency(item.total, language)}
                  </span>
                </div>
                <div
                  className={`${
                    is58mm ? 'text-[9px]' : 'text-[10px]'
                  } text-slate-600 flex justify-between gap-1`}
                >
                  <span>
                    {formatQty(item.qty, item.unit, language)} × {formatCurrency(item.price, language)}
                  </span>
                  {itemDisc > 0 && (
                    <span className="font-semibold">
                      ছাড়: -{formatCurrency(itemDisc, language)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="space-y-0.5">
          {totalDiscount > 0 && (
            <>
              <div className="flex justify-between text-slate-700">
                <span>{language === 'bn' ? 'আসল মূল্য:' : 'Subtotal:'}</span>
                <span>{formatCurrency(grossSubtotal, language)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{language === 'bn' ? 'ডিসকাউন্ট (-):' : 'Discount (-):'}</span>
                <span>-{formatCurrency(totalDiscount, language)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-black pt-0.5">
            <span>{language === 'bn' ? 'সর্বমোট বিল:' : 'Net Total:'}</span>
            <span>{formatCurrency(grandTotal, language)}</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-semibold">
            <span>
              {language === 'bn' ? 'পরিশোধিত' : 'Paid'} ({paymentMethodLabel}):
            </span>
            <span>{formatCurrency(totalPaid, language)}</span>
          </div>
          <div className="flex justify-between font-black border-t border-dashed border-slate-400 pt-1">
            <span>{language === 'bn' ? 'বকেয়া:' : 'Due:'}</span>
            <span className={totalDue > 0 ? 'text-rose-700' : 'text-emerald-800'}>
              {formatCurrency(totalDue, language)}
            </span>
          </div>
          <p className={`${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'} text-slate-700 pt-0.5 leading-snug`}>
            <strong>{language === 'bn' ? 'কথায়:' : 'In Words:'}</strong> {wordsText}
          </p>
          {receiptNote.trim() && (
            <p className={`${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'} text-slate-700 leading-snug`}>
              <strong>{language === 'bn' ? 'নোট:' : 'Note:'}</strong> {receiptNote.trim()}
            </p>
          )}
        </div>

        {/* POS Signatures & Thank You */}
        <div className="receipt-no-break pt-5 grid grid-cols-2 gap-3 text-center text-[9px] border-t border-dashed border-slate-400">
          <div className="border-t border-slate-700 pt-0.5 font-bold">
            {language === 'bn' ? 'ক্রেতা' : 'Customer'}
          </div>
          <div className="border-t border-slate-700 pt-0.5 font-bold">
            {language === 'bn' ? 'বিক্রেতা' : 'Seller'}
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-600 pt-0.5">
          {language === 'bn' ? 'ধন্যবাদ! আবার আসবেন।' : 'Thank you! Come again.'}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="receipt-print-modal fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
        <div
          className={`receipt-print-card bg-white rounded-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] ${
            printMode === 'official' ? 'max-w-2xl' : 'max-w-md'
          }`}
        >
          {/* Top Modal Header (Hidden on print) */}
          <div className="no-print px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-xl">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  {language === 'bn' ? 'মানি রিসিট / ক্যাশ মেমো' : 'Official Money Receipt'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  #{receiptNo} •{' '}
                  {language === 'bn'
                    ? `${toBengaliNumber(items.length)} টি পণ্য`
                    : `${items.length} item(s)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Format Switcher */}
              <div className="hidden sm:flex bg-white/10 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPrintMode('official')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    printMode === 'official'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'প্রফেশনাল A4/PDF' : 'Official A4/PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('thermal')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    printMode === 'thermal'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'পস (POS)' : 'Thermal POS'}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
            {/* Mobile Format Switcher */}
            <div className="no-print sm:hidden flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintMode('official')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  printMode === 'official' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'bn' ? 'প্রফেশনাল A4 / PDF' : 'Official A4/PDF'}
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('thermal')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  printMode === 'thermal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'bn' ? 'পস (POS রোল)' : 'POS Receipt'}
              </button>
            </div>

            {/* POS Paper Size Selector (80mm vs 58mm) */}
            {printMode === 'thermal' && (
              <div className="no-print flex items-center justify-between gap-2 bg-indigo-50/90 border border-indigo-200 px-3 py-2 rounded-xl text-xs">
                <span className="font-bold text-indigo-950">
                  {language === 'bn' ? 'POS পেপারের মাপ:' : 'POS Paper Width:'}
                </span>
                <div className="flex bg-white border border-indigo-200 rounded-lg p-0.5 font-bold text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPosPaperWidth('80mm')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      posPaperWidth === '80mm'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-indigo-50'
                    }`}
                  >
                    80mm ({language === 'bn' ? 'বড় রোল' : 'Standard'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosPaperWidth('58mm')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      posPaperWidth === '58mm'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-indigo-50'
                    }`}
                  >
                    58mm ({language === 'bn' ? 'ছোট রোল' : 'Compact'})
                  </button>
                </div>
              </div>
            )}

            {/* ================= PREVIEW MONEY RECEIPT AREA ================= */}
            <div id="printable-money-receipt-preview">{renderReceiptBody(false)}</div>

            {/* Optional Note Editor (No-print) */}
            <div className="no-print bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">
                {language === 'bn'
                  ? 'রিসিটে অতিরিক্ত নোট / শর্তাবলি যুক্ত করুন (ঐচ্ছিক)'
                  : 'Optional Receipt Note / Warranty Terms'}
              </label>
              <input
                type="text"
                value={receiptNote}
                onChange={(e) => setReceiptNote(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'যেমন: ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি / বিক্রিত মাল ফেরত নেওয়া হয় না'
                    : 'e.g. 7 days replacement warranty'
                }
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* WhatsApp Share Box (No-print) */}
            <div className="no-print bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {language === 'bn'
                      ? 'হোয়াটসঅ্যাপে মানি রিসিট পাঠান'
                      : 'Send Money Receipt via WhatsApp'}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {formatPaymentType(primary.payment, language)}
                </span>
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
                  <span>{language === 'bn' ? 'পাঠান' : 'Send'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer (No-print) */}
          <div className="no-print p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">
                      {language === 'bn' ? 'কপি হয়েছে' : 'Copied'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">
                      {language === 'bn' ? 'টেক্সট কপি' : 'Copy Text'}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {onNextSale && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNextSale();
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  {language === 'bn' ? 'পরবর্তী বিক্রি' : 'Next Sale'}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Print-Only Portal outside #root so Print/PDF never carries app background height */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="receipt-print-portal hidden print:block">
            <style>{dynamicPrintCss}</style>
            <div id="printable-money-receipt">{renderReceiptBody(true)}</div>
          </div>,
          document.body
        )}
    </>
  );
};
