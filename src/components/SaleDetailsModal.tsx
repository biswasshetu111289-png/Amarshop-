import React from 'react';
import { Sale } from '../types';
import {
  formatCurrency,
  formatBengaliDate,
  formatQty,
  formatPaymentMethod,
  formatPaymentType,
} from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Calendar,
  User,
  Phone,
  Package,
  Receipt,
  Share2,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Coins,
  CreditCard,
  FileText,
} from 'lucide-react';

interface SaleDetailsModalProps {
  sale: Sale;
  onClose: () => void;
  onOpenInvoice: (sale: Sale) => void;
  onEdit?: (sale: Sale) => void;
  onDelete?: (sale: Sale) => void;
  canManage: boolean;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  onClose,
  onOpenInvoice,
  onEdit,
  onDelete,
  canManage,
}) => {
  const { language } = useLanguage();

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

  const isDuePaid = sale.collectionDate || (sale.payment === 'নগদ' && paidAmt >= sale.total);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{sale.productName}</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {language === 'bn' ? 'বিক্রির পূর্ণাঙ্গ বিবরণ ও পেমেন্ট হিস্ট্রি' : 'Sale Details & Payment History'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Sale Highlights Summary */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">বিক্রির মোট মূল্য</span>
              <span className="text-xl font-black text-slate-900">
                {formatCurrency(sale.total, language)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {formatQty(sale.qty, sale.unit, language)} @ {formatCurrency(sale.price, language)}
              </span>
            </div>
            <div className="text-right">
              <span
                className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                  sale.payment === 'বাকি'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : sale.payment === 'আংশিক'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {formatPaymentType(sale.payment, language)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                মেথড: {formatPaymentMethod(sale.paymentMethod || 'নগদ', language)}
              </span>
            </div>
          </div>

          {/* Dates & Timeline */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>তারিখ ও লেনদেন সময়কাল</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block">কবে সেল হয়েছে:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {formatBengaliDate(sale.date, language)}
                </span>
              </div>

              {sale.collectionDate ? (
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block">বাকি আদায়ের তারিখ:</span>
                  <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {formatBengaliDate(sale.collectionDate, language)}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-slate-400 block">বাকি পরিশোধ অবস্থা:</span>
                  <span className="font-bold text-slate-600 text-xs">
                    {dueAmt > 0 ? 'বকেয়া বাকি বিদ্যমান' : 'নগদে পরিশোধিত'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Due Collection Highlight Box (বাকি আদায়ের স্পষ্ট বিবরণ) */}
          {sale.collectionDate && (
            <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>বাকি টাকা আদায় সফলভাবে সম্পন্ন হয়েছে</span>
              </div>
              <div className="text-[11px] text-emerald-800 space-y-0.5">
                <p>
                  📅 <strong>আদায়ের তারিখ:</strong> {formatBengaliDate(sale.collectionDate, language)}
                </p>
                <p>
                  💳 <strong>আদায়কৃত পেমেন্ট মাধ্যম:</strong>{' '}
                  {formatPaymentMethod(sale.paymentMethod || 'নগদ', language)}
                </p>
                {sale.collectionNotes && (
                  <p>
                    📝 <strong>আদায়কালীন নোট / TrxID:</strong> {sale.collectionNotes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* If Outstanding Due Exists */}
          {dueAmt > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-900 block flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>অবশিষ্ট বকেয়া বাকি</span>
                </span>
                <span className="text-[11px] text-rose-700 mt-0.5 block">
                  কাস্টমারের কাছে এখনো পাওনা আছে
                </span>
              </div>
              <span className="text-base font-black text-rose-600">
                {formatCurrency(dueAmt, language)}
              </span>
            </div>
          )}

          {/* Customer Details */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>ক্রেতার তথ্য</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block">নাম:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {sale.customer || 'সাধারণ ক্রেতা (নামহীন)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">মোবাইল নম্বর:</span>
                <span className="font-bold text-slate-700 text-xs">
                  {sale.customerPhone || 'প্রযোজ্য নয়'}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Item Specs */}
          {(sale.color || sale.packagingPrice || sale.notes) && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
              {sale.color && (
                <p>
                  <strong>রং / ভ্যারিয়েশন:</strong> {sale.color}
                </p>
              )}
              {sale.packagingPrice && sale.packagingPrice > 0 && (
                <p>
                  <strong>প্যাকেজিং খরচ:</strong> {formatCurrency(sale.packagingPrice, language)}
                </p>
              )}
              {sale.notes && (
                <p>
                  <strong>মন্তব্য:</strong> {sale.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Footer Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {canManage && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(sale);
                }}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                <span>এডিট</span>
              </button>
            )}

            {canManage && onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(sale);
                }}
                className="px-2.5 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenInvoice(sale);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ইনভয়েস ও শেয়ার</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
