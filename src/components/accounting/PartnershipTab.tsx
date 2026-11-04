import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { PartnerInvestor, CapitalContribution } from '../../types';
import { formatCurrency, formatNumber, formatBengaliDate, toBengaliNumber } from '../../utils/formatters';
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
  Armchair,
  Calculator,
  Percent,
  ArrowRightLeft,
  Scale,
  Sparkles,
} from 'lucide-react';

export const PartnershipTab: React.FC = () => {
  const {
    partners,
    loadingPartners,
    totalCommittedCapital,
    totalPaidCapital,
    totalCapitalDue,
    netProfitAmount,
    totalFixedAssetsAmount,
    isAdmin,
    canManage,
    addPartnerInvestor,
    updatePartnerInvestor,
    addCapitalPayment,
    editCapitalPayment,
    deleteCapitalPayment,
    deletePartnerInvestor,
  } = useStore();

  const { language } = useLanguage();
  const { showToast } = useToast();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Contribution Edit Modal State
  const [editingContribution, setEditingContribution] = useState<{
    partnerId: string;
    partnerName: string;
    contribution: CapitalContribution;
  } | null>(null);
  const [editContribAmount, setEditContribAmount] = useState('');
  const [editContribDate, setEditContribDate] = useState('');
  const [editContribNotes, setEditContribNotes] = useState('');

  // Contribution Delete Confirm Modal State
  const [deletingContribution, setDeletingContribution] = useState<{
    partnerId: string;
    partnerName: string;
    contribution: CapitalContribution;
  } | null>(null);

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
    if (!canManage) {
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
    if (!canManage) {
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
    if (!canManage) {
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

  // Open Edit Contribution Modal
  const openEditContributionModal = (partner: PartnerInvestor, contrib: CapitalContribution) => {
    if (!canManage) {
      showToast('শুধুমাত্র প্রধান এডমিন বা ম্যানেজার কিস্তি সংশোধন করতে পারেন', 'warning');
      return;
    }
    setEditingContribution({
      partnerId: partner.id,
      partnerName: partner.name,
      contribution: contrib,
    });
    setEditContribAmount(String(contrib.amount));
    setEditContribDate(contrib.date || new Date().toISOString().split('T')[0]);
    setEditContribNotes(contrib.notes || '');
  };

  // Handle Save Edit Contribution
  const handleSaveEditContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContribution) return;
    const amt = parseFloat(editContribAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('সঠিক জমার পরিমাণ দিন', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await editCapitalPayment(
        editingContribution.partnerId,
        editingContribution.contribution.id,
        {
          amount: amt,
          date: editContribDate,
          notes: editContribNotes.trim(),
        }
      );
      showToast('কিস্তির তথ্য সফলভাবে আপডেট ও ব্যালেন্স সমন্বয় করা হয়েছে', 'success');
      setEditingContribution(null);
    } catch (err: any) {
      showToast(err.message || 'কিস্তি আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Contribution
  const handleDeleteContribution = (partner: PartnerInvestor, contrib: CapitalContribution) => {
    if (!canManage) {
      showToast('শুধুমাত্র প্রধান এডমিন বা ম্যানেজার কিস্তি মুছতে পারেন', 'warning');
      return;
    }
    setDeletingContribution({
      partnerId: partner.id,
      partnerName: partner.name,
      contribution: contrib,
    });
  };

  const handleConfirmDeleteContribution = async () => {
    if (!deletingContribution) return;
    try {
      setSubmitting(true);
      await deleteCapitalPayment(deletingContribution.partnerId, deletingContribution.contribution.id);
      showToast('কিস্তির রেকর্ড সফলভাবে মুছে ফেলা হয়েছে ও ব্যালেন্স সমন্বয় হয়েছে', 'info');
      setDeletingContribution(null);
    } catch (err: any) {
      showToast(err.message || 'মুছতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Add Investment / Capital handler
  const handleQuickAddInvestment = () => {
    if (partners.length === 0) {
      openAddModal();
    } else if (partners.length === 1) {
      openCapitalModal(partners[0]);
    } else {
      // Pick first partner or one with dues
      const withDue = partners.find(p => p.dueAmount > 0) || partners[0];
      openCapitalModal(withDue);
    }
  };

  // Apply quick share preset for 2, 3, or 4 partners
  const applySharePreset = async (type: 'equal' | '40_30_30') => {
    if (!canManage || partners.length === 0) return;
    try {
      setSubmitting(true);
      const count = partners.length;
      if (type === 'equal') {
        const baseShare = Math.floor((100 / count) * 100) / 100;
        for (let i = 0; i < count; i++) {
          const p = partners[i];
          const share = i === count - 1 ? Number((100 - baseShare * (count - 1)).toFixed(2)) : baseShare;
          const targetComm = totalCommittedCapital > 0 ? Math.round((totalCommittedCapital * share) / 100) : p.committedAmount;
          await updatePartnerInvestor(p.id, {
            profitShareRatio: share,
            committedAmount: targetComm,
            dueAmount: Math.max(0, targetComm - (Number(p.paidAmount) || 0)),
          });
        }
        showToast(`${count} জন অংশীদারের সমান শেয়ার (${baseShare}%) ও মূলধন সমীকরণ সফলভাবে নির্ধারণ করা হয়েছে`, 'success');
      } else if (type === '40_30_30' && count >= 3) {
        const ratios = [40, 30, 30];
        for (let i = 0; i < 3; i++) {
          const p = partners[i];
          const share = ratios[i];
          const targetComm = totalCommittedCapital > 0 ? Math.round((totalCommittedCapital * share) / 100) : p.committedAmount;
          await updatePartnerInvestor(p.id, {
            profitShareRatio: share,
            committedAmount: targetComm,
            dueAmount: Math.max(0, targetComm - (Number(p.paidAmount) || 0)),
          });
        }
        showToast('৪০% - ৩০% - ৩০% শেয়ার অনুপাত সফলভাবে প্রয়োগ করা হয়েছে', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'শেয়ার আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Find partners with dues to calculate Inter-Partner Due balance
  const partnersWithDues = partners.filter((p) => p.dueAmount > 0);
  const fullyPaidPartners = partners.filter((p) => p.dueAmount <= 0 && p.committedAmount > 0);

  // Partnership Equity & Share Analysis (২, ৩ বা ৪ পার্টনারের শেয়ার ও ইনভেস্টমেন্ট হিসাব)
  const equityAnalysis = useMemo(() => {
    return partners.map((p: PartnerInvestor) => {
      const share = p.profitShareRatio || (partners.length > 0 ? Number((100 / partners.length).toFixed(1)) : 0);
      const targetByShare = totalCommittedCapital > 0 ? Math.round((totalCommittedCapital * share) / 100) : p.committedAmount;
      const actualPaid = Number(p.paidAmount) || 0;
      const due = p.dueAmount;
      const diffVsShare = actualPaid - targetByShare;

      // Equalized share of currently paid total joint capital (যৌথ মূলধনের সমতা)
      const equalizedTargetOfPaid = Math.round((totalPaidCapital * share) / 100);
      // Capital balance relative to actual joint pool (পজিটিভ পাওনা vs নেগেটিভ ঘাটতি)
      const capitalAdjustmentBalance = actualPaid - equalizedTargetOfPaid;

      return {
        partner: p,
        share,
        targetByShare,
        actualPaid,
        due,
        diffVsShare,
        equalizedTargetOfPaid,
        capitalAdjustmentBalance,
        isUnderfunded: capitalAdjustmentBalance < -5,
        isOverfunded: capitalAdjustmentBalance > 5,
        isBalanced: Math.abs(capitalAdjustmentBalance) <= 5,
      };
    });
  }, [partners, totalCommittedCapital, totalPaidCapital]);

  // Overall Capital Gap between highest and lowest contributor
  const capitalGap = useMemo(() => {
    if (partners.length < 2) return 0;
    const amounts = partners.map((p) => Number(p.paidAmount) || 0);
    return Math.max(...amounts) - Math.min(...amounts);
  }, [partners]);

  // State for Equalization & Settlement Guide modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Inter-partner dues pairs (কার কাছে কে কত পাবে/দিবে)
  const settlementSuggestions = useMemo(() => {
    type EquityItem = (typeof equityAnalysis)[number];
    const overfunded = equityAnalysis.filter((e: EquityItem) => e.capitalAdjustmentBalance > 10);
    const underfunded = equityAnalysis.filter((e: EquityItem) => e.capitalAdjustmentBalance < -10);

    const suggestions: string[] = [];
    if (overfunded.length > 0 && underfunded.length > 0) {
      for (const under of underfunded) {
        for (const over of overfunded) {
          const settlementAmt = Math.min(Math.abs(under.capitalAdjustmentBalance), over.capitalAdjustmentBalance);
          if (settlementAmt > 10) {
            suggestions.push(
              `সমতার জন্য ${under.partner.name} থেকে ${over.partner.name} ৳${formatNumber(settlementAmt, language)} প্রাপ্য (যা ক্যাশ উত্তোলন বা লাভ বণ্টনে সমন্বয়যোগ্য)।`
            );
          }
        }
      }
    }
    return suggestions;
  }, [equityAnalysis, language]);


  return (
    <div className="space-y-4">
      {/* Read-Only Notice for Non-Admin */}
      {!canManage && (
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

        {/* Card 2: Total Joint Capital (মোট যৌথ মূলধন) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {language === 'bn' ? 'মোট যৌথ মূলধন' : 'Total Joint Capital'}
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
              {language === 'bn' ? 'একত্রিত প্রাথমিক ও পরবর্তী সকল কিস্তি' : 'Total combined capital pool'}
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

      {/* Fixed Assets Capital Investment Card */}
      {totalFixedAssetsAmount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-amber-900 font-bold flex items-center gap-1.5">
                <span>দোকানের স্থায়ী সম্পদে বিনিয়োগকৃত মূলধন</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full font-bold">
                  ক্যাপিটাল অ্যাসেট
                </span>
              </div>
              <p className="text-[11px] text-amber-800/80 mt-0.5">
                ফার্নিচার, ডিসপ্লে বক্স, শোকেস ও ডেকোরেশন বাবদ অংশীদারদের মূলধন সংরক্ষিত আছে
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-black text-amber-800">
              {formatCurrency(totalFixedAssetsAmount, language)}
            </div>
            <span className="text-[10px] text-slate-500">চলতি খরচের বাইরে</span>
          </div>
        </div>
      )}

      {/* Multi-Partner Share & Equity Calculator (২, ৩, ৪+ পার্টনারের শেয়ার ও ইনভেস্টমেন্ট সমীকরণ) */}
      {partners.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{language === 'bn' ? 'পার্টনারশিপ শেয়ার ও ইনভেস্টমেন্ট সমীকরণ' : 'Partnership Equity & Share Calculator'}</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    {formatNumber(partners.length, language)} মালিকানাভিত্তিক
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'শেয়ার অনুপাত অনুযায়ী কে কত ইনভেস্ট করার কথা ও বকেয়া/পাওনার হিসাব'
                    : 'Target investment vs actual paid by share percentage'}
                </p>
              </div>
            </div>

            {/* Quick Share Presets for 2, 3, 4 Partners */}
            {canManage && partners.length >= 2 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-semibold">শেয়ার প্রিসেট:</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => applySharePreset('equal')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition"
                  title="সকল পার্টনারের মাঝে সমান অনুপাত বণ্টন"
                >
                  {partners.length === 2
                    ? '৫০% - ৫০%'
                    : partners.length === 3
                    ? '৩৩.৩% সমবণ্টন'
                    : partners.length === 4
                    ? '২৫% সমবণ্টন'
                    : 'সমান শেয়ার'}
                </button>
                {partners.length === 3 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => applySharePreset('40_30_30')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition"
                  >
                    ৪০% - ৩০% - ৩০%
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Equity Breakdown Cards for Each Partner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {equityAnalysis.map((item) => {
              return (
                <div
                  key={item.partner.id}
                  className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                    item.isUnderfunded
                      ? 'bg-rose-50/50 border-rose-200'
                      : item.isOverfunded
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-emerald-50/40 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                          item.partner.role === 'partner'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.partner.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">
                          {item.partner.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          শেয়ার: <strong className="text-indigo-700">{formatNumber(item.share, language)}%</strong>
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.isUnderfunded
                          ? 'bg-rose-100 text-rose-800'
                          : item.isOverfunded
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.isUnderfunded
                        ? 'বকেয়া / শর্টফল'
                        : item.isOverfunded
                        ? 'অগ্রিম / উদ্বৃত্ত'
                        : 'সমতায় আছে'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-white/80 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block">টার্গেট ইনভেস্ট</span>
                      <span className="font-bold text-slate-700">
                        {formatCurrency(item.targetByShare, language)}
                      </span>
                    </div>
                    <div className="border-x border-slate-100">
                      <span className="text-[9px] text-emerald-600 block">মোট জমা</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(item.actualPaid, language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">অবশিষ্ট বকেয়া</span>
                      <span
                        className={`font-black ${
                          item.due > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {item.due > 0 ? formatCurrency(item.due, language) : '৳০'}
                      </span>
                    </div>
                  </div>

                  {/* Capital Adjustment / Equalization Balance Badge */}
                  <div className="p-2 rounded-xl bg-white/90 border border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-indigo-600" />
                      <span>পার্টনার ব্যালেন্স:</span>
                    </span>
                    <span
                      className={`font-black px-2 py-0.5 rounded text-[10px] ${
                        item.capitalAdjustmentBalance > 5
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.capitalAdjustmentBalance < -5
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.capitalAdjustmentBalance > 5
                        ? `+${formatCurrency(item.capitalAdjustmentBalance, language)} (পাওনা / Receivable)`
                        : item.capitalAdjustmentBalance < -5
                        ? `-${formatCurrency(Math.abs(item.capitalAdjustmentBalance), language)} (ঘাটতি / Payable)`
                        : '৳০ (সমতায় আছে)'}
                    </span>
                  </div>

                  {/* Inter-partner equity statement */}
                  <div className="text-[11px] leading-relaxed">
                    {item.isUnderfunded ? (
                      <p className="text-rose-700">
                        ⚠️ ৫০%-৫০% সমতায় <strong>-{formatCurrency(Math.abs(item.capitalAdjustmentBalance), language)}</strong> ঘাটতি রয়েছে।
                        ক্যাশ বা লাভ উত্তোলনের সময় এই ব্যালেন্স সমন্বয়যোগ্য।
                      </p>
                    ) : item.isOverfunded ? (
                      <p className="text-blue-700">
                        ✨ ৫০%-৫০% সমতায় <strong>+{formatCurrency(item.capitalAdjustmentBalance, language)}</strong> অতিরিক্ত পাওনা রয়েছে।
                        ক্যাশ বা লাভ উত্তোলনের সময় এই টাকা সমন্বয়যোগ্য।
                      </p>
                    ) : (
                      <p className="text-emerald-700">
                        ✅ অংশীদারিত্ব চুক্তি অনুযায়ী সম্পূর্ণ ইনভেস্টমেন্ট পরিশোধিত ও সমতায় আছে।
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inter-Partner Due Settlement Suggestions & Capital Gap */}
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl text-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                <span>পারস্পরিক দেনা-পাওনা ও ক্যাপিটাল গ্যাপ:</span>
                {capitalGap > 0 && (
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    গ্যাপ: ৳{formatNumber(capitalGap, language)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSettlementModal(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-lg text-[10px] shadow-xs flex items-center gap-1 transition"
              >
                <Info className="w-3 h-3" />
                <span>ব্যালেন্স সমন্বয় সহায়িকা</span>
              </button>
            </div>

            {settlementSuggestions.length > 0 ? (
              <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5">
                {settlementSuggestions.map((sug, i) => (
                  <li key={i}>{sug}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-emerald-800 font-medium">
                ✅ উভয় পার্টনারের মূলধন বর্তমানে সম্পূর্ণ সমান ও সমতায় আছে।
              </p>
            )}
          </div>
        </div>
      )}

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

        {canManage && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickAddInvestment}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              title="নতুন মূলধন বা ইনভেস্টমেন্ট জমা এন্ট্রি করুন"
            >
              <Coins className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন ইনভেস্টমেন্ট জমা' : 'Add Capital'}</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন পার্টনার' : 'Add Partner'}</span>
            </button>
          </div>
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
          {canManage && (
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
                    {canManage && (
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

                  {/* Capital Equalization & Balance Adjustment (ক্যাপিটাল অ্যাডজাস্টমেন্ট / পার্টনার ব্যালেন্স) */}
                  {partners.length >= 2 && (() => {
                    const ratio = partner.profitShareRatio || (partners.length > 0 ? 100 / partners.length : 50);
                    const equalizedTarget = Math.round((totalPaidCapital * ratio) / 100);
                    const capitalBalance = (Number(partner.paidAmount) || 0) - equalizedTarget;

                    return (
                      <div
                        className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition ${
                          capitalBalance > 5
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : capitalBalance < -5
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{language === 'bn' ? 'ক্যাপিটাল অ্যাডজাস্টমেন্ট ব্যালেন্স:' : 'Capital Balance:'}</span>
                          </span>
                          <span
                            className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                              capitalBalance > 5
                                ? 'bg-emerald-100 text-emerald-800'
                                : capitalBalance < -5
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {capitalBalance > 5
                              ? `+${formatCurrency(capitalBalance, language)} (পাওনা / Receivable)`
                              : capitalBalance < -5
                              ? `-${formatCurrency(Math.abs(capitalBalance), language)} (ঘাটতি / Payable)`
                              : '৳০ (সমতায় আছে)'}
                          </span>
                        </div>

                        <div className="text-[11px] leading-relaxed text-slate-600">
                          {capitalBalance > 5 ? (
                            <p className="text-emerald-800">
                              ✨ <strong>পজিটিভ ব্যালেন্স:</strong> মোট যৌথ মূলধনে {formatNumber(ratio, language)}% সমতার চেয়ে{' '}
                              <strong>+{formatCurrency(capitalBalance, language)}</strong> অতিরিক্ত মূলধন দিয়েছেন (ব্যবসা/অপর পার্টনারের নিকট পাওনা)।
                            </p>
                          ) : capitalBalance < -5 ? (
                            <p className="text-rose-800">
                              ⚠️ <strong>নেতিবাচক ব্যালেন্স:</strong> মোট যৌথ মূলধনে {formatNumber(ratio, language)}% সমতার চেয়ে{' '}
                              <strong>-{formatCurrency(Math.abs(capitalBalance), language)}</strong> ঘাটতি রয়েছে (পরিশোধযোগ্য)।
                            </p>
                          ) : (
                            <p className="text-slate-600">
                              ✅ মোট যৌথ মূলধনে {formatNumber(ratio, language)}% শেয়ার সমতা বজায় রয়েছে।
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            💡 পরবর্তীতে লাভ বা ক্যাশ উত্তোলনের সময় এই হিসাব সমন্বয় করা যাবে; তবে এটি মূল লাভ শেয়ারিং নিয়মে ({formatNumber(ratio, language)}%) কোনো প্রভাব ফেলবে না।
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions Bar: Add Capital installment button & Expand contributions button */}
                  <div className="flex items-center justify-between pt-1">
                    {canManage && (
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

                    {(() => {
                      // Get all contributions sorted chronologically by date
                      let list = partner.contributions ? [...partner.contributions] : [];
                      if (list.length === 0 && (Number(partner.paidAmount) || 0) > 0) {
                        list = [
                          {
                            id: `initial_${partner.id}`,
                            date: partner.createdAt ? partner.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                            amount: Number(partner.paidAmount) || 0,
                            notes: 'প্রারম্ভিক মূলধন জমা',
                          },
                        ];
                      }
                      const sortedContributions = list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                      const BENGALI_ORDINALS = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম', '১১তম', '১২তম', '১৩তম', '১৪তম', '১৫তম'];

                      return (
                        <>
                          <button
                            onClick={() =>
                              setExpandedPartnerId(isExpanded ? null : partner.id)
                            }
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 transition ml-auto"
                          >
                            <span>
                              {language === 'bn'
                                ? `কিস্তি হিস্ট্রি (${formatNumber(
                                    sortedContributions.length,
                                    language
                                  )})`
                                : `Installments (${sortedContributions.length})`}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Expanded Capital Contributions / Chronological Installment Log */}
                {isExpanded && (() => {
                  let list = partner.contributions ? [...partner.contributions] : [];
                  if (list.length === 0 && (Number(partner.paidAmount) || 0) > 0) {
                    list = [
                      {
                        id: `initial_${partner.id}`,
                        date: partner.createdAt ? partner.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        amount: Number(partner.paidAmount) || 0,
                        notes: 'প্রারম্ভিক মূলধন জমা',
                      },
                    ];
                  }
                  const sortedContributions = list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                  const BENGALI_ORDINALS = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম', '১১তম', '১২তম', '১৩তম', '১৪তম', '১৫তম'];

                  return (
                    <div className="bg-slate-50/90 border-t border-slate-100 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{language === 'bn' ? 'মূলধন জমার কিস্তি হিস্ট্রি (তারিখ ক্রমানুসারে)' : 'Chronological Installments'}</span>
                        </span>
                        {partner.notes && (
                          <span className="text-[11px] text-slate-400 font-normal italic truncate max-w-[200px]">
                            নোট: {partner.notes}
                          </span>
                        )}
                      </div>

                      {sortedContributions.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2 text-center">
                          {language === 'bn' ? 'এখনো কোনো কিস্তি রেকর্ড নেই' : 'No contribution entries'}
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {sortedContributions.map((c, idx) => {
                            const ordinalLabel =
                              idx < BENGALI_ORDINALS.length
                                ? `${BENGALI_ORDINALS[idx]} কিস্তি`
                                : `#${toBengaliNumber(idx + 1)} কিস্তি`;

                            return (
                              <div
                                key={c.id || idx}
                                className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs hover:border-indigo-300 hover:shadow-xs transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100 shrink-0">
                                    {ordinalLabel}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-800">
                                        {formatBengaliDate(c.date, language)}
                                      </span>
                                    </div>
                                    {c.notes && (
                                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{c.notes}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                    +{formatCurrency(c.amount, language)}
                                  </span>
                                  {canManage && (
                                    <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => openEditContributionModal(partner, c)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                        title={language === 'bn' ? 'কিস্তি সংশোধন করুন' : 'Edit contribution'}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteContribution(partner, c)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        title={language === 'bn' ? 'কিস্তি মুছে ফেলুন' : 'Delete contribution'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );          })}
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
                    {language === 'bn' ? 'নতুন ইনভেস্টমেন্ট / কিস্তি জমা' : 'Add Capital Installment'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? 'যেকোনো পার্টনারের নামে কিস্তি জমা দিন' : 'Deposit capital for any partner'}
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

            {/* Partner Dropdown Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                {language === 'bn' ? 'পার্টনার সিলেক্ট করুন *' : 'Select Partner *'}
              </label>
              <select
                value={selectedPartner.id}
                onChange={(e) => {
                  const targetPartner = partners.find((p) => p.id === e.target.value);
                  if (targetPartner) {
                    setSelectedPartner(targetPartner);
                    setInstallmentAmount(targetPartner.dueAmount > 0 ? String(targetPartner.dueAmount) : '');
                    setInstallmentNotes(`বকেয়া মূলধন কিস্তি জমা (${targetPartner.name})`);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role === 'partner' ? 'পার্টনার' : 'ইনভেস্টর'} — {p.dueAmount > 0 ? `বকেয়া: ৳${formatNumber(p.dueAmount, language)}` : 'বকেয়া নেই'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Partner Status Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">চুক্তিবদ্ধ</span>
                <span className="text-xs font-bold text-slate-800">
                  {formatCurrency(selectedPartner.committedAmount, language)}
                </span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] text-emerald-600 block">মোট জমা</span>
                <span className="text-xs font-bold text-emerald-700">
                  {formatCurrency(selectedPartner.paidAmount, language)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-500 block">বকেয়া ডিউ</span>
                <span
                  className={`text-xs font-black ${
                    selectedPartner.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {selectedPartner.dueAmount > 0
                    ? formatCurrency(selectedPartner.dueAmount, language)
                    : '৳০ (পরিশোধিত)'}
                </span>
              </div>
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

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT CONTRIBUTION MODAL */}
      {/* ========================================================================= */}
      {editingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'কিস্তির রেকর্ড সংশোধন' : 'Edit Contribution'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingContribution.partnerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContribution(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditContribution} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'জমার পরিমাণ (৳)' : 'Amount (৳)'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={editContribAmount}
                    onChange={(e) => setEditContribAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'জমার তারিখ' : 'Date'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editContribDate}
                  onChange={(e) => setEditContribDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'বিবরণ বা নোট' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={editContribNotes}
                  onChange={(e) => setEditContribNotes(e.target.value)}
                  placeholder="যেমন: ব্যাংক ট্রান্সফার, চেক বা নগদ জমা"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingContribution(null)}
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
                    <span>{language === 'bn' ? 'আপডেট করুন' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 6: DELETE CONTRIBUTION CONFIRM MODAL */}
      {/* ========================================================================= */}
      {deletingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {language === 'bn' ? 'কিস্তির রেকর্ড মুছে ফেলবেন?' : 'Delete Installment Record?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {language === 'bn' ? (
                  <>
                    <strong className="text-slate-800 font-bold">{deletingContribution.partnerName}</strong>-এর{' '}
                    <strong className="text-rose-600 font-bold">
                      {formatCurrency(deletingContribution.contribution.amount, language)}
                    </strong>{' '}
                    টাকার কিস্তিটি মুছে ফেললে তা মোট জমা মূলধন থেকে স্বয়ংক্রিয়ভাবে বাদ দেওয়া হবে।
                  </>
                ) : (
                  `Delete ${formatCurrency(deletingContribution.contribution.amount, 'en')} contribution for ${deletingContribution.partnerName}?`
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingContribution(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteContribution}
                disabled={submitting}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
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

      {/* ========================================================================= */}
      {/* MODAL 7: CAPITAL EQUALIZATION & SETTLEMENT GUIDE MODAL */}
      {/* ========================================================================= */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'bn' ? 'ক্যাপিটাল গ্যাপ ও ব্যালেন্স সমন্বয় সহায়িকা' : 'Capital Equalization Guide'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? '৫০%-৫০% সমতায় ব্যালেন্স সমন্বয়ের পদ্ধতি' : 'How to settle & offset partner balances'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Current Joint Pool & Gap Overview */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">মোট যৌথ মূলধন (Joint Capital)</span>
                <span className="text-sm font-bold text-indigo-700">
                  {formatCurrency(totalPaidCapital, language)}
                </span>
              </div>
              <div className="border-l border-indigo-200 pl-3">
                <span className="text-[10px] text-slate-500 block">বর্তমান ক্যাপিটাল গ্যাপ</span>
                <span className="text-sm font-black text-rose-600">
                  ৳{formatNumber(capitalGap, language)}
                </span>
              </div>
            </div>

            {/* Current Partner Balances List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">বর্তমান পার্টনার ব্যালেন্স স্থিতি:</h4>
              <div className="space-y-1.5">
                {equityAnalysis.map((item) => (
                  <div
                    key={item.partner.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-slate-800 font-bold block">{item.partner.name}</strong>
                      <span className="text-[10px] text-slate-500">
                        জমা: {formatCurrency(item.actualPaid, language)} ({item.share}% শেয়ার)
                      </span>
                    </div>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        item.capitalAdjustmentBalance > 5
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.capitalAdjustmentBalance < -5
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.capitalAdjustmentBalance > 5
                        ? `+${formatCurrency(item.capitalAdjustmentBalance, language)} (পাওনা)`
                        : item.capitalAdjustmentBalance < -5
                        ? `-${formatCurrency(Math.abs(item.capitalAdjustmentBalance), language)} (ঘাটতি)`
                        : '৳০ (সমতায়)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Options */}
            <div className="space-y-2.5 pt-1">
              <h4 className="text-xs font-bold text-slate-800">ব্যালেন্স সমন্বয়ের দুটি সহজ পদ্ধতি:</h4>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                    ১
                  </span>
                  <span>কিস্তি জমা দিয়ে মূলধন সমতায় আনা</span>
                </div>
                <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
                  ঘাটতি থাকা পার্টনার যেকোনো সময় "নতুন ইনভেস্টমেন্ট জমা দিন" অপশন ব্যবহার করে কিস্তি পরিশোধ করতে পারেন।
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                    ২
                  </span>
                  <span>লাভ বা ক্যাশ উত্তোলনের সময় সমন্বয় (Offsetting)</span>
                </div>
                <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
                  পরবর্তীতে ব্যবসা থেকে যখন মাসিক বা ত্রৈমাসিক লাভ/ক্যাশ উত্তোলন করা হবে, তখন ঘাটতি থাকা পার্টনারের উত্তোলিত লাভ থেকে এই ব্যালেন্স সমন্বয় করে পাওনাদার পার্টনারকে দেওয়া যাবে।
                </p>
              </div>
            </div>

            {/* Golden Rule Notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1 text-emerald-950">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>মূল লাভ শেয়ারিং নিয়ম সুরক্ষিত:</span>
              </div>
              <p>
                এই ক্যাপিটাল অ্যাডজাস্টমেন্ট ব্যবস্থা শুধুমাত্র ইনভেস্টমেন্টের দেনা-পাওনা ট্র্যাকিংয়ের জন্য। আপনাদের যৌথ চুক্তি অনুযায়ী মূল লাভ শেয়ারিংয়ের হার (যেমন ৫০% - ৫০%) সবসময় সম্পূর্ণ অক্ষুণ্ণ ও অপরিবর্তিত থাকবে।
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettlementModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                {language === 'bn' ? 'ঠিক আছে' : 'Got It'}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettlementModal(false);
                    handleQuickAddInvestment();
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'নতুন কিস্তি জমা' : 'Add Installment'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

