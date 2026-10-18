import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { PartnerInvestor, CapitalContribution } from '../../types';
import { formatCurrency, formatNumber, formatBengaliDate } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlusCircle,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Lock,
  Phone,
  FileText,
  DollarSign,
  Info,
  Calendar,
} from 'lucide-react';

export const PartnershipTab: React.FC = () => {
  const {
    partners,
    loadingPartners,
    totalCommittedCapital,
    totalPaidCapital,
    totalCapitalDue,
    netProfitAmount,
    isAdmin,
    addPartnerInvestor,
    updatePartnerInvestor,
    addCapitalPayment,
    deletePartnerInvestor,
  } = useStore();

  const { language } = useLanguage();
  const { showToast } = useToast();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Selected partner state
  const [selectedPartner, setSelectedPartner] = useState<PartnerInvestor | null>(null);
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);

  // Add/Edit Form State
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerRole, setPartnerRole] = useState<'partner' | 'investor'>('partner');
  const [committedAmount, setCommittedAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [profitShareRatio, setProfitShareRatio] = useState('');
  const [partnerNotes, setPartnerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Capital Installment Form State
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentDate, setInstallmentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [installmentNotes, setInstallmentNotes] = useState('');

  // Open Add Modal
  const openAddModal = () => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন পার্টনার যোগ করতে পারেন', 'warning');
      return;
    }
    setPartnerName('');
    setPartnerPhone('');
    setPartnerRole('partner');
    setCommittedAmount('');
    setPaidAmount('');
    // Auto suggest 50% if 1 partner already exists
    const defaultRatio = partners.length === 1 ? '50' : partners.length === 0 ? '50' : '';
    setProfitShareRatio(defaultRatio);
    setPartnerNotes('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (p: PartnerInvestor) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন পার্টনার তথ্য এডিট করতে পারেন', 'warning');
      return;
    }
    setSelectedPartner(p);
    setPartnerName(p.name);
    setPartnerPhone(p.phone || '');
    setPartnerRole(p.role);
    setCommittedAmount(String(p.committedAmount));
    setPaidAmount(String(p.paidAmount));
    setProfitShareRatio(p.profitShareRatio !== undefined ? String(p.profitShareRatio) : '');
    setPartnerNotes(p.notes || '');
    setShowEditModal(true);
  };

  // Open Capital Payment Modal (আংশিক/বকেয়া মূলধন জমা)
  const openCapitalModal = (p: PartnerInvestor) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র প্রধান এডমিন মূলধন কিস্তি জমা এন্ট্রি করতে পারেন', 'warning');
      return;
    }
    setSelectedPartner(p);
    setInstallmentAmount(p.dueAmount > 0 ? String(p.dueAmount) : '');
    setInstallmentDate(new Date().toISOString().split('T')[0]);
    setInstallmentNotes(`বকেয়া মূলধন কিস্তি জমা (${p.name})`);
    setShowCapitalModal(true);
  };

  // Handle Add Partner Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      showToast('পার্টনার বা ইনভেস্টরের নাম দিন', 'warning');
      return;
    }
    const comm = parseFloat(committedAmount);
    if (isNaN(comm) || comm <= 0) {
      showToast('সঠিক চুক্তিবদ্ধ মূলধনের পরিমাণ দিন', 'warning');
      return;
    }
    const paid = parseFloat(paidAmount || '0') || 0;
    const ratio = parseFloat(profitShareRatio || '0') || 0;

    try {
      setSubmitting(true);
      await addPartnerInvestor({
        name: partnerName.trim(),
        phone: partnerPhone.trim(),
        role: partnerRole,
        committedAmount: comm,
        paidAmount: paid,
        dueAmount: Math.max(0, comm - paid),
        profitShareRatio: ratio,
        notes: partnerNotes.trim(),
      });
      showToast('নতুন পার্টনার সফলভাবে যোগ করা হয়েছে', 'success');
      setShowAddModal(false);
    } catch (err: any) {
      showToast(err.message || 'পার্টনার যোগ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Partner Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (!partnerName.trim()) {
      showToast('পার্টনারের নাম দিন', 'warning');
      return;
    }
    const comm = parseFloat(committedAmount);
    if (isNaN(comm) || comm <= 0) {
      showToast('সঠিক চুক্তিবদ্ধ মূলধনের পরিমাণ দিন', 'warning');
      return;
    }
    const paid = parseFloat(paidAmount || '0') || 0;
    const ratio = parseFloat(profitShareRatio || '0') || 0;

    try {
      setSubmitting(true);
      await updatePartnerInvestor(selectedPartner.id, {
        name: partnerName.trim(),
        phone: partnerPhone.trim(),
        role: partnerRole,
        committedAmount: comm,
        paidAmount: paid,
        dueAmount: Math.max(0, comm - paid),
        profitShareRatio: ratio,
        notes: partnerNotes.trim(),
      });
      showToast('পার্টনারের তথ্য আপডেট করা হয়েছে', 'success');
      setShowEditModal(false);
    } catch (err: any) {
      showToast(err.message || 'আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Capital Installment Submit
  const handleCapitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    const amt = parseFloat(installmentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('সঠিক জমার পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await addCapitalPayment(
        selectedPartner.id,
        amt,
        installmentNotes.trim(),
        installmentDate
      );
      showToast(`৳${amt} মূলধন জমা সফলভাবে রেকর্ড হয়েছে`, 'success');
      setShowCapitalModal(false);
    } catch (err: any) {
      showToast(err.message || 'মূলধন জমা রেকর্ড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Partner
  const handleDeletePartner = async () => {
    if (!selectedPartner) return;
    try {
      setSubmitting(true);
      await deletePartnerInvestor(selectedPartner.id);
      showToast('পার্টনার রেকর্ড মুছে ফেলা হয়েছে', 'info');
      setShowDeleteConfirmModal(false);
      setSelectedPartner(null);
    } catch (err: any) {
      showToast(err.message || 'মুছে ফেলতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Find partners with dues to calculate Inter-Partner Due balance
  const partnersWithDues = partners.filter((p) => p.dueAmount > 0);
  const fullyPaidPartners = partners.filter((p) => p.dueAmount <= 0 && p.committedAmount > 0);

  return (
    <div className="space-y-4">
      {/* Read-Only Notice for Non-Admin */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-800 flex items-center gap-2.5 text-xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {language === 'bn'
              ? 'আপনি শুধুমাত্র পার্টনারশিপ হিসাব দেখতে পাচ্ছেন। এন্ট্রি, এডিট বা ডিলিট শুধুমাত্র প্রধান এডমিন করতে পারবেন।'
              : 'You are viewing partnership data in read-only mode. Only the main Admin can add, edit, or delete.'}
          </span>
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Total Committed Capital */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট প্রতিশ্রুত মূলধন' : 'Target Capital'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-indigo-700">
              {formatCurrency(totalCommittedCapital, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn'
                ? `${formatNumber(partners.length, language)} জন অংশীদারের চুক্তি`
                : `${partners.length} partners total`}
            </div>
          </div>
        </div>

        {/* Card 2: Total Contributed / Paid Capital */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'জমা প্রদত্ত মূলধন' : 'Paid Capital'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-600">
              {formatCurrency(totalPaidCapital, language)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {totalCommittedCapital > 0
                ? `${formatNumber(
                    Math.round((totalPaidCapital / totalCommittedCapital) * 100),
                    language
                  )}% সংগৃহীত`
                : '০%'}
            </div>
          </div>
        </div>

        {/* Card 3: Total Capital Due (বকেয়া মূলধন) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'বকেয়া মূলধন (ডিউ)' : 'Capital Due'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600">
              {formatCurrency(totalCapitalDue, language)}
            </div>
            <div className="text-[11px] text-rose-500 mt-0.5">
              {language === 'bn'
                ? `${formatNumber(partnersWithDues.length, language)} জনের কাছে ডিউ`
                : `${partnersWithDues.length} pending`}
            </div>
          </div>
        </div>

        {/* Card 4: Net Profit for Distribution */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'বণ্টনযোগ্য নিট লাভ' : 'Distributable Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-bold ${
                netProfitAmount >= 0 ? 'text-blue-700' : 'text-rose-600'
              }`}
            >
              {formatCurrency(netProfitAmount, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn' ? 'সকল খরচ বাদ দিয়ে নিট লাভ' : 'After all expenses'}
            </div>
          </div>
        </div>
      </div>

      {/* Inter-Partner Due & Balance Explanation Banner */}
      {partnersWithDues.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-bold text-amber-950 flex items-center justify-between">
                <span>{language === 'bn' ? '🤝 পার্টনারদের অভ্যন্তরীণ দেনা-পাওনা বিবরণ' : 'Inter-Partner Capital Balances'}</span>
                <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  বাকি ৳{formatNumber(totalCapitalDue, language)}
                </span>
              </h4>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                {language === 'bn' ? (
                  <>
                    চুক্তি অনুযায়ী{' '}
                    {partnersWithDues.map((p, idx) => (
                      <span key={p.id}>
                        <strong className="text-amber-950 font-bold">{p.name}</strong>-এর প্রতিশ্রুত মূলধনের মধ্যে এখনো{' '}
                        <strong className="text-rose-700 font-bold">
                          {formatCurrency(p.dueAmount, language)}
                        </strong>{' '}
                        টাকা দেওয়া বাকি রয়েছে
                        {idx < partnersWithDues.length - 1 ? ', ' : '। '}
                      </span>
                    ))}
                    {fullyPaidPartners.length > 0 && (
                      <span>
                        যেহেতু{' '}
                        {fullyPaidPartners.map((p) => p.name).join(', ')}{' '}
                        সম্পূর্ণ মূলধন পরিশোধ করেছেন, তাই পার্টনারশিপ ইনভেস্টমেন্ট পারপাসে উক্ত বকেয়া টাকা অন্য পার্টনার বা ব্যবসার ফান্ডে জমা দেওয়া আবশ্যক।
                      </span>
                    )}
                  </>
                ) : (
                  `Investment commitment dues: ${partnersWithDues
                    .map((p) => `${p.name} owes ${formatCurrency(p.dueAmount, 'en')}`)
                    .join(', ')}.`
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partners List Header with Add Button */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>{language === 'bn' ? 'পার্টনার ও ইনভেস্টর তালিকা' : 'Partners & Investors'}</span>
          </h3>
          <p className="text-xs text-slate-500">
            {language === 'bn'
              ? 'চুক্তিবদ্ধ মূলধন, কিস্তি ও লাভ বণ্টনের হিসাব'
              : 'Capital contributions, partial payments & profit share'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন পার্টনার যোগ' : 'Add Partner'}</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {partners.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {language === 'bn' ? 'কোনো পার্টনার বা ইনভেস্টর যোগ করা হয়নি' : 'No partners added yet'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'bn'
                ? 'আপনার দোকানের পার্টনারদের নাম, চুক্তিবদ্ধ ইনভেস্টমেন্ট ও লাভের শতাংশ নির্ধারণ করে হিসাব শুরু করুন।'
                : 'Add partners, committed investments, and track capital dues and profit distribution.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রথম পার্টনার যোগ করুন' : 'Add First Partner'}</span>
            </button>
          )}
        </div>
      ) : (
        /* Partners Card List */
        <div className="space-y-3">
          {partners.map((partner) => {
            const isExpanded = expandedPartnerId === partner.id;
            const paidPercent =
              partner.committedAmount > 0
                ? Math.min(100, Math.round((partner.paidAmount / partner.committedAmount) * 100))
                : 100;
            const hasDue = partner.dueAmount > 0;

            // Estimated profit share for this partner
            const partnerShareRatio = partner.profitShareRatio || 0;
            const estimatedProfitShare =
              netProfitAmount > 0 ? (netProfitAmount * partnerShareRatio) / 100 : 0;

            return (
              <div
                key={partner.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-indigo-100 transition"
              >
                {/* Partner Card Top Bar */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          partner.role === 'partner'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {partner.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-800">{partner.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              partner.role === 'partner'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {partner.role === 'partner'
                              ? language === 'bn'
                                ? 'অংশীদার (Partner)'
                                : 'Partner'
                              : language === 'bn'
                              ? 'ইনভেস্টর (Investor)'
                              : 'Investor'}
                          </span>
                          {partner.profitShareRatio !== undefined && partner.profitShareRatio > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {formatNumber(partner.profitShareRatio, language)}% লাভ শেয়ার
                            </span>
                          )}
                        </div>
                        {partner.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{partner.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Action Menu */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(partner)}
                          title="এডিট করুন"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPartner(partner);
                            setShowDeleteConfirmModal(true);
                          }}
                          title="ডিলিট করুন"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Investment Figures Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center">
                    <div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {language === 'bn' ? 'চুক্তিবদ্ধ মূলধন' : 'Target'}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {formatCurrency(partner.committedAmount, language)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {language === 'bn' ? 'জমা প্রদত্ত' : 'Paid'}
                      </div>
                      <div className="text-xs font-bold text-emerald-600 mt-0.5">
                        {formatCurrency(partner.paidAmount, language)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-medium text-slate-500">
                        {language === 'bn' ? 'বকেয়া (ডিউ)' : 'Due'}
                      </div>
                      <div
                        className={`text-xs font-bold mt-0.5 ${
                          hasDue ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(partner.dueAmount, language)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar of Capital Paid */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        {hasDue ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {language === 'bn'
                              ? `৳${formatNumber(partner.dueAmount, language)} ইনভেস্টমেন্ট ডিউ আছে`
                              : `Due: ৳${partner.dueAmount}`}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {language === 'bn' ? 'সম্পূর্ণ মূলধন পরিশোধিত' : 'Fully Paid'}
                          </span>
                        )}
                      </span>
                      <span className="text-slate-600 font-bold">
                        {formatNumber(paidPercent, language)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          paidPercent >= 100
                            ? 'bg-emerald-500'
                            : paidPercent >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Profit Share Estimation */}
                  {partner.profitShareRatio !== undefined && partner.profitShareRatio > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                      <div className="flex items-center gap-1.5 text-blue-900 font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {language === 'bn'
                            ? `নিট লাভ থেকে প্রাপ্য (${formatNumber(partner.profitShareRatio, language)}%):`
                            : `Profit Share (${partner.profitShareRatio}%):`}
                        </span>
                      </div>
                      <span
                        className={`font-bold ${
                          estimatedProfitShare >= 0 ? 'text-blue-700' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(estimatedProfitShare, language)}
                      </span>
                    </div>
                  )}

                  {/* Actions Bar: Add Capital installment button & Expand contributions button */}
                  <div className="flex items-center justify-between pt-1">
                    {isAdmin && (
                      <button
                        onClick={() => openCapitalModal(partner)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 ${
                          hasDue
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>
                          {hasDue
                            ? language === 'bn'
                              ? 'বকেয়া মূলধন জমা দিন'
                              : 'Add Capital'
                            : language === 'bn'
                            ? 'অতিরিক্ত মূলধন জমা'
                            : 'Add Capital'}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setExpandedPartnerId(isExpanded ? null : partner.id)
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 transition ml-auto"
                    >
                      <span>
                        {language === 'bn'
                          ? `কিস্তি হিস্ট্রি (${formatNumber(
                              partner.contributions?.length || 0,
                              language
                            )})`
                          : `Installments (${partner.contributions?.length || 0})`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Capital Contributions / Installment Log */}
                {isExpanded && (
                  <div className="bg-slate-50/80 border-t border-slate-100 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{language === 'bn' ? 'মূলধন জমার কিস্তি হিস্ট্রি' : 'Capital Contribution History'}</span>
                      {partner.notes && (
                        <span className="text-[11px] text-slate-400 font-normal italic">
                          নোট: {partner.notes}
                        </span>
                      )}
                    </div>

                    {!partner.contributions || partner.contributions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1 text-center">
                        {language === 'bn' ? 'এখনো কোনো কিস্তি রেকর্ড নেই' : 'No contribution entries'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {partner.contributions.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/70 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <div>
                                <span className="font-medium text-slate-700">
                                  {formatBengaliDate(c.date, language)}
                                </span>
                                {c.notes && (
                                  <p className="text-[10px] text-slate-400">{c.notes}</p>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-emerald-600">
                              +{formatCurrency(c.amount, language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PARTNER MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'নতুন পার্টনার / ইনভেস্টর যোগ' : 'Add New Partner'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'চুক্তিবদ্ধ মূলধন ও লাভের শতকরা হার উল্লেখ করুন'
                      : 'Set agreed capital and profit percentage'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পার্টনারের নাম *' : 'Partner Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: মোহাম্মদ রফিক' : 'e.g. John Doe'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোবাইল নম্বর' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ধরন' : 'Role'}
                  </label>
                  <select
                    value={partnerRole}
                    onChange={(e) => setPartnerRole(e.target.value as 'partner' | 'investor')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="partner">
                      {language === 'bn' ? 'অংশীদার (Partner)' : 'Partner'}
                    </option>
                    <option value="investor">
                      {language === 'bn' ? 'বিনিয়োগকারী (Investor)' : 'Investor'}
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চুক্তিবদ্ধ মোট মূলধন (৳) *' : 'Target Capital (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={committedAmount}
                    onChange={(e) => setCommittedAmount(e.target.value)}
                    placeholder="১০,০০০"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'প্রাথমিক জমা দেওয়া (৳)' : 'Initial Paid (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="৫,০০০ (আংশিক)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-emerald-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Real-time Due preview */}
              {committedAmount && (
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    {language === 'bn' ? 'অবশিষ্ট বকেয়া ইনভেস্টমেন্ট:' : 'Remaining Due:'}
                  </span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatCurrency(
                      Math.max(
                        0,
                        (parseFloat(committedAmount) || 0) - (parseFloat(paidAmount || '0') || 0)
                      ),
                      language
                    )}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'প্রফিট শেয়ারের অনুপাত (%)' : 'Profit Share (%)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={profitShareRatio}
                    onChange={(e) => setProfitShareRatio(e.target.value)}
                    placeholder="৫০"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {language === 'bn'
                    ? 'ব্যবসায়িক নিট মুনাফা থেকে এই পার্টনার কত শতাংশ লাভ পাবেন (যেমন: ৫০%)'
                    : 'Percentage of business net profit this partner is entitled to'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'মন্তব্য বা চুক্তি নোট (ঐচ্ছিক)' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'যেমন: ৫০% পার্টনারশিপ চুক্তি, বাকি ৫,০০০ টাকা আগামী মাসে জমা দেবে'
                      : 'e.g. 50-50 partner agreement'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{language === 'bn' ? 'যোগ করুন' : 'Save Partner'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD CAPITAL INSTALLMENT (বকেয়া মূলধন জমা) */}
      {/* ========================================================================= */}
      {showCapitalModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'মূলধন কিস্তি জমা দিন' : 'Add Capital Installment'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    পার্টনার: <strong className="text-slate-700">{selectedPartner.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCapitalModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Current Due summary */}
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-rose-800 font-medium">বর্তমান ইনভেস্টমেন্ট বকেয়া:</span>
              <span className="text-sm font-bold text-rose-700">
                {formatCurrency(selectedPartner.dueAmount, language)}
              </span>
            </div>

            <form onSubmit={handleCapitalSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'জমার পরিমাণ (৳) *' : 'Installment Amount (৳) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="যেমন: ৫,০০০"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'জমার তারিখ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={installmentDate}
                  onChange={(e) => setInstallmentDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'নোট বা রেফারেন্স' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={installmentNotes}
                  onChange={(e) => setInstallmentNotes(e.target.value)}
                  placeholder="যেমন: দ্বিতীয় কিস্তি / অবশিষ্ট ৫,০০০ টাকা পরিশোধ"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{language === 'bn' ? 'জমা নিশ্চিত করুন' : 'Confirm Payment'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PARTNER MODAL */}
      {/* ========================================================================= */}
      {showEditModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'পার্টনার তথ্য পরিবর্তন' : 'Edit Partner'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পার্টনারের নাম *' : 'Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোবাইল' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'ধরন' : 'Role'}
                  </label>
                  <select
                    value={partnerRole}
                    onChange={(e) => setPartnerRole(e.target.value as 'partner' | 'investor')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="partner">অংশীদার (Partner)</option>
                    <option value="investor">বিনিয়োগকারী (Investor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'চুক্তিবদ্ধ মূলধন (৳) *' : 'Target Capital (৳) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={committedAmount}
                    onChange={(e) => setCommittedAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'মোট সংগৃহীত জমা (৳)' : 'Total Paid (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'প্রফিট শেয়ারের অনুপাত (%)' : 'Profit Share (%)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={profitShareRatio}
                    onChange={(e) => setProfitShareRatio(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'মন্তব্য বা চুক্তি নোট' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>আপডেট করুন</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRM MODAL */}
      {/* ========================================================================= */}
      {showDeleteConfirmModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {language === 'bn' ? 'পার্টনার রেকর্ড মুছে ফেলতে চান?' : 'Delete Partner Record?'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? `আপনি কি নিশ্চিতভাবে "${selectedPartner.name}"-এর পার্টনারশিপ হিসাব ডিলিট করতে চান?`
                  : `Are you sure you want to delete ${selectedPartner.name}?`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSelectedPartner(null);
                }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                {language === 'bn' ? 'না, বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeletePartner}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Delete'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
