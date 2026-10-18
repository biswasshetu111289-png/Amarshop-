import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import {
  seedSampleProducts,
  clearAllSales,
  getProductsCollection,
  getSalesCollection,
  approveShopJoinRequest,
  rejectShopJoinRequest,
  updateShopMemberRole,
  removeShopMember,
  inviteMemberDirect,
  updateShopDetails,
  deleteShop,
} from '../services/storeService';
import { getDocs } from 'firebase/firestore';
import { ShopRole, Shop, StoreBackupData, AutoBackupFrequency, AutoBackupSnapshot, Product, Sale } from '../types';
import {
  buildStoreBackupData,
  downloadBackupFile,
  parseBackupFile,
  getAutoBackupFrequency,
  setAutoBackupFrequency,
  getAutoBackupSnapshots,
  uploadToGoogleDrive,
} from '../services/backupService';
import {
  Store,
  LogOut,
  User,
  Settings,
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Download,
  Upload,
  Trash2,
  Edit2,
  Info,
  ShieldAlert,
  ChevronDown,
  Plus,
  Users,
  Copy,
  Check,
  UserPlus,
  UserCheck,
  UserX,
  Building2,
  Link,
  Shield,
  Eye,
  Sliders,
  Camera,
  Image as ImageIcon,
  HardDrive,
  Clock,
  Calendar,
  FileJson,
  Cloud,
  ExternalLink,
  RefreshCw,
  Globe,
  Palette,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallBanner } from './PWAInstallBanner';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';

export const Header: React.FC = () => {
  const { user, logout, requestPasswordReset } = useAuth();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { activeTheme, themeId, customBg, setShowThemeModal } = useTheme();
  const {
    currentShop,
    shops,
    userRole,
    isAdmin,
    setCurrentShop,
    refreshShops,
    createNewShop,
    joinShop,
    updateShop,
    deleteShop: contextDeleteShop,
    restoreBackup,
  } = useStore();
  const { showToast } = useToast();

  // Modals state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showShopSwitcher, setShowShopSwitcher] = useState(false);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [showJoinShopModal, setShowJoinShopModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEditShopModal, setShowEditShopModal] = useState(false);

  // Delete Shop Confirmation State (Password mandatory)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletingShop, setDeletingShop] = useState(false);

  // Edit Shop state
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopAddress, setEditShopAddress] = useState('');
  const [editShopPhone, setEditShopPhone] = useState('');
  const [editShopDescription, setEditShopDescription] = useState('');
  const [editShopLogoUrl, setEditShopLogoUrl] = useState('');
  const [savingShopEdit, setSavingShopEdit] = useState(false);

  // Forms state
  const [newShopName, setNewShopName] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopLogoUrl, setNewShopLogoUrl] = useState('');
  const [creatingShop, setCreatingShop] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningShop, setJoiningShop] = useState(false);

  const [directInviteEmail, setDirectInviteEmail] = useState('');
  const [directInviteRole, setDirectInviteRole] = useState<ShopRole>('manager');
  const [invitingDirect, setInvitingDirect] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);

  // JSON Restore state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<StoreBackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoring, setRestoring] = useState(false);

  // Auto-backup & Google Drive state
  const [autoBackupFreq, setAutoBackupFreqState] = useState<AutoBackupFrequency>(() => getAutoBackupFrequency());
  const [autoSnapshots, setAutoSnapshots] = useState<AutoBackupSnapshot[]>(() =>
    getAutoBackupSnapshots(currentShop?.id)
  );
  const [showGDriveModal, setShowGDriveModal] = useState(false);
  const [gDriveTokenInput, setGDriveTokenInput] = useState('');
  const [uploadingGDrive, setUploadingGDrive] = useState(false);

  // Action states
  const [seeding, setSeeding] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearingSales, setClearingSales] = useState(false);

  const targetId = currentShop?.id || user?.uid || '';

  // Process image helper (resizes to compact JPEG data URL)
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('অনুগ্রহ করে একটি ছবি ফাইল (.jpg, .png, .webp) দিন'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 320;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('ছবি প্রসেস করতে ব্যর্থ হয়েছে'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('ফাইল পড়তে ব্যর্থ'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUploadForEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageFile(file);
      setEditShopLogoUrl(dataUrl);
      showToast('লোগো/ছবি সফলভাবে লোড হয়েছে!', 'info');
    } catch (err: any) {
      showToast(err.message || 'ছবি লোড করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleImageUploadForCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageFile(file);
      setNewShopLogoUrl(dataUrl);
      showToast('লোগো/ছবি সফলভাবে লোড হয়েছে!', 'info');
    } catch (err: any) {
      showToast(err.message || 'ছবি লোড করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('সফলভাবে লগআউট হয়েছে', 'info');
    } catch {
      showToast('লগআউটে সমস্যা হয়েছে', 'error');
    }
  };

  const handleCopyCode = () => {
    if (!currentShop?.inviteCode) return;
    navigator.clipboard.writeText(currentShop.inviteCode);
    setCopiedCode(true);
    showToast('শপ কোড কপি করা হয়েছে!', 'info');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const openEditShopModal = (shop: Shop) => {
    setEditingShop(shop);
    setEditShopName(shop.name || '');
    setEditShopAddress(shop.address || '');
    setEditShopPhone(shop.phone || '');
    setEditShopDescription(shop.description || '');
    setEditShopLogoUrl(shop.logoUrl || '');
    setShowEditShopModal(true);
  };

  const handleSaveShopEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;
    if (!editShopName.trim()) {
      showToast('দোকানের নাম খালি রাখা যাবে না', 'warning');
      return;
    }
    setSavingShopEdit(true);
    try {
      await updateShop(editingShop.id, {
        name: editShopName,
        address: editShopAddress,
        phone: editShopPhone,
        description: editShopDescription,
        logoUrl: editShopLogoUrl,
      });
      showToast(`দোকানের তথ্য পরিবর্তন করা হয়েছে: "${editShopName.trim()}"`, 'success');
      setShowEditShopModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'দোকানের তথ্য পরিবর্তন করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSavingShopEdit(false);
    }
  };

  const handleDeleteShopWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;
    if (!deletePassword.trim()) {
      showToast('দোকান মুছে ফেলতে পাসওয়ার্ড প্রদান বাধ্যতামূলক', 'warning');
      return;
    }

    setDeletingShop(true);
    try {
      // Re-authenticate user if email & auth available
      if (auth.currentUser && user?.email) {
        try {
          const credential = EmailAuthProvider.credential(user.email, deletePassword.trim());
          await reauthenticateWithCredential(auth.currentUser, credential);
        } catch (authErr: any) {
          const errCode = authErr?.code || authErr?.message || '';
          if (
            errCode.includes('wrong-password') ||
            errCode.includes('invalid-credential') ||
            errCode.includes('invalid-password')
          ) {
            showToast('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড ছাড়া দোকান মুছে ফেলা যাবে না।', 'error');
            setDeletingShop(false);
            return;
          }
          const isGoogleUser = auth.currentUser.providerData.some((p) => p.providerId === 'google.com');
          if (isGoogleUser && deletePassword.trim().toUpperCase() !== 'DELETE' && deletePassword.trim() !== user.email) {
            showToast('Google একাউন্টের ক্ষেত্রে পাসওয়ার্ড অথবা "DELETE" লিখে নিশ্চিত করুন', 'warning');
            setDeletingShop(false);
            return;
          }
        }
      }

      await contextDeleteShop(editingShop.id);
      showToast(`"${editingShop.name}" দোকানটি সফলভাবে মুছে ফেলা হয়েছে!`, 'success');
      setShowDeleteConfirmModal(false);
      setShowEditShopModal(false);
      setDeletePassword('');
      setEditingShop(null);
    } catch (err: unknown) {
      console.error('Delete shop error:', err);
      const msg = err instanceof Error ? err.message : 'দোকান মুছতে সমস্যা হয়েছে';
      showToast(msg, 'error');
    } finally {
      setDeletingShop(false);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      showToast('দোকানের নাম লিখুন', 'warning');
      return;
    }
    setCreatingShop(true);
    try {
      const created = await createNewShop(
        newShopName,
        '',
        newShopAddress,
        newShopPhone,
        newShopLogoUrl
      );
      showToast(`"${created.name}" দোকান সফলভাবে তৈরি হয়েছে!`, 'success');
      setNewShopName('');
      setNewShopAddress('');
      setNewShopPhone('');
      setNewShopLogoUrl('');
      setShowCreateShopModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'দোকান তৈরি করতে সমস্যা হয়েছে', 'error');
    } finally {
      setCreatingShop(false);
    }
  };

  const handleJoinShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      showToast('শপ কোড বা আইডি লিখুন', 'warning');
      return;
    }
    setJoiningShop(true);
    try {
      const res = await joinShop(joinCodeInput);
      if (res.isDirectAdmin) {
        showToast(
          `অভিনন্দন! "${res.shopName}" শপটি সফলভাবে এডমিন হিসেবে আপনার একাউন্টে যুক্ত ও সক্রিয় হয়েছে!`,
          'success'
        );
      } else {
        showToast(`"${res.shopName}" দোকানে যুক্ত হওয়ার আবেদন পাঠানো হয়েছে!`, 'success');
      }
      setJoinCodeInput('');
      setShowJoinShopModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'দোকানে যুক্ত হতে সমস্যা হয়েছে', 'error');
    } finally {
      setJoiningShop(false);
    }
  };

  const handleApproveRequest = async (targetUid: string, role: ShopRole) => {
    if (!currentShop?.id) return;
    try {
      await approveShopJoinRequest(currentShop.id, targetUid, role);
      showToast(`সফলভাবে মেম্বার যুক্ত করা হয়েছে (${role === 'manager' ? 'ম্যানেজার' : 'ভিউয়ার'})`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'অনুমোদন করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleRejectRequest = async (targetUid: string) => {
    if (!currentShop?.id) return;
    try {
      await rejectShopJoinRequest(currentShop.id, targetUid);
      showToast('অনুরোধ বাতিল করা হয়েছে', 'info');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'বাতিল করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleUpdateRole = async (targetUid: string, newRole: ShopRole) => {
    if (!currentShop?.id) return;
    try {
      await updateShopMemberRole(currentShop.id, targetUid, newRole);
      showToast('মেম্বার রোল আপডেট করা হয়েছে', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'রোল পরিবর্তন ব্যর্থ', 'error');
    }
  };

  const handleRemoveMember = async (targetUid: string, email: string) => {
    if (!currentShop?.id) return;
    const confirmed = window.confirm(`আপনি কি "${email}" মেম্বারকে এই দোকান থেকে রিমুভ করতে চান?`);
    if (!confirmed) return;
    try {
      await removeShopMember(currentShop.id, targetUid);
      showToast('মেম্বার রিমুভ করা হয়েছে', 'info');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'রিমুভ করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDirectInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop?.id || !directInviteEmail.trim()) {
      showToast('ইমেইল ঠিকানা দিন', 'warning');
      return;
    }
    setInvitingDirect(true);
    try {
      await inviteMemberDirect(currentShop.id, directInviteEmail, directInviteRole);
      showToast(`"${directInviteEmail}" মেম্বার হিসেবে যুক্ত হয়েছে!`, 'success');
      setDirectInviteEmail('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'ইনভাইট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setInvitingDirect(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await requestPasswordReset(user.email);
      showToast(`পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে: ${user.email}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('পাসওয়ার্ড রিসেট লিংক পাঠাতে সমস্যা হয়েছে', 'error');
    } finally {
      setSendingReset(false);
    }
  };

  const handleAddSampleProducts = async () => {
    if (!targetId) return;
    setSeeding(true);
    try {
      await seedSampleProducts(targetId);
      showToast('স্যাম্পল প্রোডাক্ট যুক্ত করা হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showToast('স্যাম্পল প্রোডাক্ট যুক্ত করতে সমস্যা হয়েছে', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleExportData = async () => {
    if (!targetId) return;
    setExporting(true);
    try {
      const prodSnap = await getDocs(getProductsCollection(targetId));
      const saleSnap = await getDocs(getSalesCollection(targetId));

      const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      const sales = saleSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];

      const backup = buildStoreBackupData(
        targetId,
        currentShop?.name || 'আমার দোকান',
        user?.email,
        products,
        sales,
        {
          name: currentShop?.name,
          address: currentShop?.address,
          phone: currentShop?.phone,
          description: currentShop?.description,
          logoUrl: currentShop?.logoUrl,
        }
      );

      downloadBackupFile(backup);
      showToast('সকল তথ্যের JSON ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!', 'success');
    } catch (err) {
      console.error(err);
      showToast('ব্যাকআপ ডাউনলোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleJSONFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র দোকানের এডমিন ডাটা রিস্টোর করতে পারেন', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseBackupFile(file);
      setRestoreCandidate(parsed);
      setShowRestoreModal(true);
    } catch (err: any) {
      showToast(err.message || 'ব্যাকআপ ফাইল পড়তে সমস্যা হয়েছে', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleExecuteRestore = async () => {
    if (!isAdmin) {
      showToast('শুধুমাত্র দোকানের এডমিন ডাটা রিস্টোর করতে পারেন', 'error');
      return;
    }
    if (!restoreCandidate || !currentShop?.id) return;
    setRestoring(true);
    try {
      const result = await restoreBackup(restoreCandidate, restoreMode);
      showToast(
        `সফলভাবে ${result.restoredProducts}টি পণ্য ও ${result.restoredSales}টি বিক্রি রিস্টোর সম্পন্ন!`,
        'success'
      );
      setShowRestoreModal(false);
      setRestoreCandidate(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'রিস্টোর করতে সমস্যা হয়েছে', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleAutoBackupFreqChange = (freq: AutoBackupFrequency) => {
    setAutoBackupFrequency(freq);
    setAutoBackupFreqState(freq);
    showToast(
      freq === 'off'
        ? 'স্বয়ংক্রিয় ব্যাকআপ বন্ধ করা হয়েছে'
        : `স্বয়ংক্রিয় ব্যাকআপ "${freq === 'daily' ? 'দৈনিক' : 'সাপ্তাহিক'}" হিসেবে সেট করা হয়েছে`,
      'info'
    );
  };

  const handleUploadBackupToGDrive = async () => {
    if (!targetId) return;
    setUploadingGDrive(true);
    try {
      const prodSnap = await getDocs(getProductsCollection(targetId));
      const saleSnap = await getDocs(getSalesCollection(targetId));
      const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
      const sales = saleSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];

      const backup = buildStoreBackupData(
        targetId,
        currentShop?.name || 'আমার দোকান',
        user?.email,
        products,
        sales,
        {
          name: currentShop?.name,
          address: currentShop?.address,
          phone: currentShop?.phone,
          description: currentShop?.description,
          logoUrl: currentShop?.logoUrl,
        }
      );

      // If token provided, upload via REST
      if (gDriveTokenInput.trim()) {
        await uploadToGoogleDrive(gDriveTokenInput.trim(), backup);
        showToast('গুগল ড্রাইভে ব্যাকআপ ফাইল সফলভাবে আপলোড হয়েছে!', 'success');
      } else {
        // Direct download file and prompt Drive open
        downloadBackupFile(backup);
        setShowGDriveModal(true);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'গুগল ড্রাইভ আপলোডে সমস্যা হয়েছে', 'error');
    } finally {
      setUploadingGDrive(false);
    }
  };

  const handleClearSales = async () => {
    if (!targetId) return;
    const confirmed = window.confirm(
      'সতর্কতা: আপনি কি এই দোকানের সমস্ত বিক্রির ইতিহাস মুছে ফেলতে চান?'
    );
    if (!confirmed) return;

    setClearingSales(true);
    try {
      const count = await clearAllSales(targetId);
      showToast(`${count}টি বিক্রির রেকর্ড মুছে ফেলা হয়েছে`, 'info');
    } catch (err) {
      console.error(err);
      showToast('মুছতে সমস্যা হয়েছে', 'error');
    } finally {
      setClearingSales(false);
    }
  };

  // Role badge color helper
  const roleBadge = () => {
    if (userRole === 'admin') {
      return (
        <span className="text-[10px] bg-amber-400/25 text-amber-200 border border-amber-400/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
          <Shield className="w-3 h-3 text-amber-300" /> এডমিন
        </span>
      );
    }
    if (userRole === 'manager') {
      return (
        <span className="text-[10px] bg-emerald-400/25 text-emerald-200 border border-emerald-400/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
          <Sliders className="w-3 h-3 text-emerald-300" /> ম্যানেজার
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-slate-300/25 text-slate-200 border border-slate-300/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
        <Eye className="w-3 h-3 text-slate-300" /> ভিউয়ার
      </span>
    );
  };

  const pendingRequestsCount = Object.keys(currentShop?.joinRequests || {}).length;
  const headerBgClass = themeId === 'custom' ? 'text-white shadow-md' : activeTheme.headerBgClass;
  const headerCustomStyle = themeId === 'custom' ? { backgroundColor: customBg } : {};

  return (
    <>
      <header className={`sticky top-0 z-40 ${headerBgClass} transition-colors duration-300`} style={headerCustomStyle}>
        <div className="max-w-[600px] mx-auto px-3.5 py-2.5 flex items-center justify-between">
          {/* Shop Switcher & Title */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowShopSwitcher(!showShopSwitcher)}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition backdrop-blur flex items-center justify-center border border-white/20 shadow-sm text-yellow-300 relative overflow-hidden shrink-0"
              title="দোকান পরিবর্তন করুন"
            >
              {currentShop?.logoUrl ? (
                <img
                  src={currentShop.logoUrl}
                  alt={currentShop.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Store className="w-5 h-5" />
              )}
              {pendingRequestsCount > 0 && isAdmin && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-indigo-700 animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowShopSwitcher(!showShopSwitcher)}
                  className="font-bold text-sm sm:text-base leading-tight hover:text-blue-100 flex items-center gap-1 text-left"
                >
                  <span className="truncate max-w-[130px] sm:max-w-[190px]">
                    {currentShop?.name || 'আমার দোকান'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0" />
                </button>
                {roleBadge()}
                {isAdmin && currentShop && (
                  <button
                    type="button"
                    onClick={() => openEditShopModal(currentShop)}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/25 active:scale-95 transition text-yellow-300 hover:text-yellow-200 border border-white/15 shadow-xs flex items-center gap-1"
                    title="দোকানের নাম পরিবর্তন করুন (এডমিন)"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span className="text-[10px] hidden sm:inline font-semibold">নাম পরিবর্তন</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-blue-100/90 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-200" />
                  <span className="truncate max-w-[130px] sm:max-w-[160px]">
                    {user?.email}
                  </span>
                </span>
                {currentShop?.inviteCode && (
                  <span
                    onClick={handleCopyCode}
                    className="cursor-pointer text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.2 rounded border border-white/20 text-yellow-200 font-mono flex items-center gap-1"
                    title="ক্লিক করে কোড কপি করুন"
                  >
                    কোড: {currentShop.inviteCode}
                    {copiedCode ? <Check className="w-2.5 h-2.5 text-emerald-300" /> : <Copy className="w-2.5 h-2.5" />}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Global Theme & Color Customizer Button */}
            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              title={language === 'bn' ? 'অ্যাপের থিম ও কালার পরিবর্তন' : 'Change Theme & Colors'}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition flex items-center gap-1.5 text-xs font-bold border border-white/20 shadow-xs cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">{language === 'bn' ? 'থিম' : 'Theme'}</span>
            </button>

            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition flex items-center gap-1.5 text-xs font-bold border border-white/20 shadow-xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-yellow-300" />
              <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* PWA Mobile Install Button */}
            <PWAInstallBanner variant="header-btn" />

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowMembersModal(true)}
                title={language === 'bn' ? 'টিম ও মেম্বার ম্যানেজমেন্ট' : 'Team & Member Management'}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition flex items-center gap-1 text-xs font-medium border border-white/10 relative"
              >
                <Users className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">{language === 'bn' ? 'টিম' : 'Team'}</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              title={language === 'bn' ? 'এডমিন ও ডাটা কন্ট্রোল' : 'Settings & Admin Control'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition flex items-center gap-1 text-xs font-medium border border-white/10"
            >
              <Settings className="w-4 h-4 text-blue-200" />
              <span className="hidden sm:inline">{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
            </button>

            <button
              onClick={handleLogout}
              title={language === 'bn' ? 'লগআউট' : 'Logout'}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 active:bg-red-500/40 text-white/90 hover:text-white transition flex items-center gap-1 text-xs font-medium border border-white/10"
            >
              <LogOut className="w-4 h-4 text-red-200" />
            </button>
          </div>
        </div>
      </header>

      {/* Shop Switcher Dropdown Modal */}
      {showShopSwitcher && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    আপনার দোকানসমূহ (Multi-Shop)
                  </h3>
                  <p className="text-xs text-slate-500">দোকান নির্বাচন করুন অথবা নতুন তৈরি করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowShopSwitcher(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Shops */}
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {shops.map((s) => {
                const isSelected = currentShop?.id === s.id;
                const isOwner = s.ownerId === user?.uid;
                const memberRole = isOwner ? 'admin' : (s.members?.[user?.uid || '']?.role || 'viewer');

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCurrentShop(s);
                      setShowShopSwitcher(false);
                      showToast(`"${s.name}" দোকানে স্যুইচ করা হয়েছে`, 'info');
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          s.name.charAt(0) || 'দ'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {s.name}
                          </h4>
                          {isSelected && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                              সক্রিয়
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>রোল: {memberRole === 'admin' ? 'এডমিন' : memberRole === 'manager' ? 'ম্যানেজার' : 'ভিউয়ার'}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">কোড: {s.inviteCode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {memberRole === 'admin' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditShopModal(s);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200"
                          title="দোকানের নাম ও তথ্য পরিবর্তন করুন"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                        >
                          নির্বাচন
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action buttons to create or join */}
            <div className="pt-3 border-t border-slate-100 space-y-2 mt-3 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowShopSwitcher(false);
                    setShowCreateShopModal(true);
                  }}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন দোকান তৈরি</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowShopSwitcher(false);
                    setShowJoinShopModal(true);
                  }}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Link className="w-4 h-4" />
                  <span>কোড দিয়ে যুক্ত হন</span>
                </button>
              </div>

              {/* Restore option - Only visible to shop Admin */}
              {isAdmin && (
                <div className="flex items-center justify-end pt-1 text-[11px]">
                  <label className="text-slate-600 hover:text-blue-700 font-semibold cursor-pointer hover:underline flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>JSON ব্যাকআপ রিস্টোর (এডমিন)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        setShowShopSwitcher(false);
                        handleJSONFileSelect(e);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Shop Modal */}
      {showCreateShopModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">নতুন দোকান তৈরি</h3>
                  <p className="text-xs text-slate-500">আপনার আরেকটি ব্যবসার জন্য আলাদা হিসাব</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateShopModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="যেমন: ভাই ভাই জেনারেল স্টোর / ঢাকা ফ্যাশন"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের লোগো বা ছবি (ঐচ্ছিক)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {newShopLogoUrl ? (
                      <img src={newShopLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span>{newShopLogoUrl ? 'ছবি পরিবর্তন' : 'ছবি নির্বাচন করুন'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUploadForCreate}
                      />
                    </label>
                    {newShopLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setNewShopLogoUrl('')}
                        className="ml-2 text-rose-500 hover:underline text-[11px]"
                      >
                        রিমুভ
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">দোকানের ব্যানার, সাইনবোর্ড বা লোগো</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={newShopAddress}
                  onChange={(e) => setNewShopAddress(e.target.value)}
                  placeholder="যেমন: মিরপুর ১০, ঢাকা"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="tel"
                  value={newShopPhone}
                  onChange={(e) => setNewShopPhone(e.target.value)}
                  placeholder="যেমন: 01700000000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateShopModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={creatingShop}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingShop ? 'তৈরি হচ্ছে...' : 'দোকান তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Shop Modal */}
      {showJoinShopModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Link className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">দোকানে যুক্ত হন</h3>
                  <p className="text-xs text-slate-500">অন্য কোনো দোকানে যুক্ত হতে শপ কোড লিখুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowJoinShopModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinShop} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের শপ কোড (Shop Invite Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="যেমন: K9W3M7"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold tracking-widest text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  দোকানের মালিকের কাছ থেকে ৬ অক্ষরের কোডটি সংগ্রহ করুন।
                </p>
              </div>

              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-900 leading-relaxed space-y-1">
                <p className="font-semibold text-purple-950">ℹ️ এডমিন অনুমোদন প্রক্রিয়া:</p>
                <p>
                  কোড সাবমিট করলে দোকানের এডমিনের কাছে আপনার যুক্ত হওয়ার আবেদন পৌঁছে যাবে।
                  এডমিন আবেদন অনুমোদন দিলে আপনি ম্যানেজার বা ভিউয়ার হিসেবে দোকানে যুক্ত হতে পারবেন।
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinShopModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={joiningShop}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {joiningShop ? 'যাচাই ও পাঠানো হচ্ছে...' : 'যুক্ত হওয়ার আবেদন পাঠান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team & Member Management Modal (RBAC) */}
      {showMembersModal && currentShop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    দোকানের টিম ও মেম্বার কন্ট্রোল
                  </h3>
                  <p className="text-xs text-slate-500">{currentShop.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Share Invite Code Box */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-indigo-900 block">
                    এই দোকানের ইনভাইট শপ কোড:
                  </span>
                  <div className="text-lg font-mono font-black text-indigo-700 tracking-wider mt-0.5">
                    {currentShop.inviteCode}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    অন্য ইউজারদের এই কোডটি দিন যাতে তারা জয়েন রিকোয়েস্ট পাঠাতে পারে
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition shrink-0"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'কপি হয়েছে' : 'কোড কপি'}</span>
                </button>
              </div>

              {/* Pending Join Requests */}
              {currentShop.joinRequests && Object.keys(currentShop.joinRequests).length > 0 && (
                <div className="space-y-2 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      অনুমোদনের অপেক্ষায় ({Object.keys(currentShop.joinRequests).length} জন)
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {Object.entries(currentShop.joinRequests).map(([reqUid, req]) => (
                      <div
                        key={reqUid}
                        className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{req.displayName || req.email}</div>
                          <div className="text-[11px] text-slate-500">{req.email}</div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(reqUid, 'manager')}
                            title="ম্যানেজার হিসেবে যুক্ত করুন (ইনপুট, এডিট ও ডিলিট করতে পারবে)"
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" /> ম্যানেজার
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(reqUid, 'viewer')}
                            title="ভিউয়ার হিসেবে যুক্ত করুন (শুধুমাত্র দেখতে পারবে)"
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                          >
                            ভিউয়ার
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(reqUid)}
                            title="বাতিল করুন"
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Invite Member by Email */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  সরাসরি মেম্বার যোগ করুন
                </span>
                <form onSubmit={handleDirectInvite} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={directInviteEmail}
                    onChange={(e) => setDirectInviteEmail(e.target.value)}
                    placeholder="মেম্বারের ইমেইল এড্রেস..."
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={directInviteRole}
                    onChange={(e) => setDirectInviteRole(e.target.value as ShopRole)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="manager">ম্যানেজার</option>
                    <option value="viewer">ভিউয়ার</option>
                    <option value="admin">এডমিন</option>
                  </select>
                  <button
                    type="submit"
                    disabled={invitingDirect}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {invitingDirect ? 'যুক্ত হচ্ছে...' : 'যোগ করুন'}
                  </button>
                </form>
              </div>

              {/* Current Active Members List */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  বর্তমান টিম মেম্বারদের তালিকা ({Object.keys(currentShop.members || {}).length} জন)
                </span>

                <div className="space-y-2">
                  {Object.entries(currentShop.members || {}).map(([mUid, member]) => {
                    const isOwner = currentShop.ownerId === mUid;
                    const isSelf = user?.uid === mUid;

                    return (
                      <div
                        key={mUid}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>{member.displayName || member.email}</span>
                            {isOwner && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                মালিক / প্রধান এডমিন
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                                আপনি
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{member.email}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isOwner ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                              এডমিন
                            </span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(mUid, e.target.value as ShopRole)}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                              >
                                <option value="manager">ম্যানেজার</option>
                                <option value="viewer">ভিউয়ার</option>
                                <option value="admin">এডমিন</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(mUid, member.email)}
                                title="মেম্বার রিমুভ করুন"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roles explanation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block">রোল ও অধিকার নির্দেশিকা:</span>
                <p>• <strong>এডমিন:</strong> পুরো দোকানের সকল ডাটা, মেম্বার ও সেটিংস নিয়ন্ত্রণ করার পূর্ণ ক্ষমতা।</p>
                <p>• <strong>ম্যানেজার:</strong> প্রোডাক্ট স্টক ইনপুট, এডিট, ডিলিট এবং বিক্রির হিসাব সংশোধন করার ক্ষমতা।</p>
                <p>• <strong>ভিউয়ার:</strong> শুধুমাত্র রিপোর্ট, স্টক ও বিক্রির ডাটা দেখতে পারবে, পরিবর্তন করতে পারবে না।</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings & Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    দোকান ও একাউন্ট সেটিংস
                  </h3>
                  <p className="text-xs text-slate-500">{currentShop?.name || 'আমার দোকান'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Account Credentials Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">আপনার একাউন্ট ইমেইল:</span>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {userRole === 'admin' ? 'এডমিন' : userRole === 'manager' ? 'ম্যানেজার' : 'ভিউয়ার'}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 break-all">{user?.email}</p>
                <div className="pt-1 text-[11px] text-slate-500 font-mono break-all flex items-center justify-between border-t border-slate-200/60">
                  <span>সক্রিয় শপ কোড:</span>
                  <span className="font-bold text-indigo-700">{currentShop?.inviteCode || 'N/A'}</span>
                </div>
              </div>

              {/* Install PWA Prompt */}
              <PWAInstallBanner variant="compact" />

              {/* Shop Profile & Name/Logo Edit Card */}
              {currentShop && (
                <div className="p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl border border-indigo-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-indigo-600" />
                      দোকানের তথ্য ও প্রোফাইল
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountModal(false);
                          openEditShopModal(currentShop);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <Edit2 className="w-3 h-3" /> তথ্য ও লোগো পরিবর্তন
                      </button>
                    )}
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-indigo-100 flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {currentShop.logoUrl ? (
                        <img src={currentShop.logoUrl} alt={currentShop.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-7 h-7 text-indigo-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{currentShop.name}</span>
                      </div>
                      {currentShop.phone && (
                        <div className="text-slate-600 flex items-center gap-1">
                          <span className="text-slate-400">মোবাইল:</span>
                          <span className="font-mono">{currentShop.phone}</span>
                        </div>
                      )}
                      {currentShop.address && (
                        <div className="text-slate-600 flex items-center gap-1">
                          <span className="text-slate-400">ঠিকানা:</span>
                          <span>{currentShop.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* App Language Selection Card */}
              <div className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">
                      {language === 'bn' ? 'অ্যাপের ভাষা (App Language)' : 'App Language (ভাষা)'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {language === 'bn' ? 'বাংলা অথবা English নির্বাচন করুন' : 'Switch between Bangla & English'}
                    </p>
                  </div>
                </div>
                <div className="flex bg-slate-200 p-0.5 rounded-xl border border-slate-300 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setLanguage('bn')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      language === 'bn'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      language === 'en'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* App Theme Selection Card */}
              <div className="p-3 bg-gradient-to-r from-slate-50 to-purple-50/50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">
                      {language === 'bn' ? 'অ্যাপের কালার ও থিম (Theme)' : 'App Theme & Colors'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      বর্তমান: {themeId === 'custom' ? 'কাস্টম কালার' : activeTheme.nameBn}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setShowThemeModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'থিম বদলান' : 'Change'}</span>
                </button>
              </div>

              {/* Data Backup & Restore Suite */}
              <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    ডাটা ব্যাকআপ ও রিস্টোর (JSON ও গুগল ড্রাইভ)
                  </h4>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    সুরক্ষিত ব্যাকআপ
                  </span>
                </div>

                {/* 1. JSON Export & JSON Restore Action Buttons */}
                <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-1`}>
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{exporting ? 'ডাউনলোড হচ্ছে...' : 'JSON ব্যাকআপ নিন'}</span>
                  </button>

                  {isAdmin && (
                    <label className="cursor-pointer py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition text-center">
                      <Upload className="w-3.5 h-3.5" />
                      <span>JSON রিস্টোর করুন (এডমিন)</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleJSONFileSelect}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  💡 JSON ফাইল ডাউনলোড করে রাখলে যেকোনো সময় এক ক্লিকে সম্পূর্ণ দোকান বা স্টক রিস্টোর করতে পারবেন।
                </p>

                {/* 2. Auto Backup Frequency & Google Drive Sync */}
                <div className="pt-2 border-t border-blue-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      অটো ব্যাকআপ শিডিউল:
                    </label>
                    <select
                      value={autoBackupFreq}
                      onChange={(e) => handleAutoBackupFreqChange(e.target.value as AutoBackupFrequency)}
                      className="px-2 py-1 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="daily">দৈনিক (Daily - অটো)</option>
                      <option value="weekly">সাপ্তাহিক (Weekly - অটো)</option>
                      <option value="off">বন্ধ (Off)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                        <Cloud className="w-3.5 h-3.5 text-blue-600" />
                        গুগল ড্রাইভে ব্যাকআপ:
                      </span>
                      <p className="text-[10px] text-slate-500">
                        গুগল ড্রাইভে ফাইল সেভ বা সংরক্ষণ করুন
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUploadBackupToGDrive}
                      disabled={uploadingGDrive}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>{uploadingGDrive ? 'আপলোড হচ্ছে...' : 'গুগল ড্রাইভে সেভ'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Recent Auto-Snapshots history list if any */}
                {autoSnapshots.length > 0 && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-1.5">
                    <span className="font-bold text-slate-700 text-[10px] block">
                      সদ্য তৈরিকৃত অটো ব্যাকআপ ফাইলসমূহ ({autoSnapshots.length}টি):
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {autoSnapshots.slice(0, 3).map((snap) => (
                        <div
                          key={snap.id}
                          className="bg-white/90 p-1.5 rounded-lg border border-slate-200 flex items-center justify-between text-[10px]"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              {new Date(snap.timestamp).toLocaleDateString('bn-BD', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-slate-500 ml-1.5">
                              ({snap.productsCount} পণ্য, {snap.salesCount} বিক্রি)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => downloadBackupFile(snap.data)}
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              ডাউনলোড
                            </button>
                            {isAdmin && (
                              <>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRestoreCandidate(snap.data);
                                    setShowRestoreModal(true);
                                  }}
                                  className="text-indigo-600 hover:underline font-semibold"
                                >
                                  রিস্টোর
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Seeding Action */}
              {isAdmin && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      স্যাম্পল পণ্য যুক্ত করুন
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      চাল, ডাল, তেলসহ টেস্ট প্রোডাক্ট স্টকে লোড করুন
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSampleProducts}
                    disabled={seeding}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {seeding ? 'যোগ হচ্ছে...' : '+ ডেমো পণ্য'}
                  </button>
                </div>
              )}

              {/* Password Action */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    পাসওয়ার্ড পরিবর্তন
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    আপনার ইমেইলে রিসেট লিংক পাঠানো হবে
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={sendingReset}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs disabled:opacity-50 shrink-0"
                >
                  {sendingReset ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক'}
                </button>
              </div>

              {/* Danger Zone: Clear Sales */}
              {isAdmin && (
                <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      টেস্ট সেলস হিস্ট্রি ক্লিয়ার
                    </h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      এই দোকানের সকল বিক্রির ইতিহাস মুছে ফ্রেশ শুরু করতে চান?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSales}
                    disabled={clearingSales}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50 shrink-0 text-[11px]"
                  >
                    {clearingSales ? 'মুছে যাচ্ছে...' : 'বিক্রি মুছুন'}
                  </button>
                </div>
              )}

              {/* Security info */}
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  ফায়ারবেজ ক্লাউড ফায়ারস্টোরে আপনার দোকানের সকল পণ্য, বিক্রি ও মেম্বার ডাটা রিয়েলটাইমে
                  নিরাপদে সংরক্ষিত থাকে।
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  handleLogout();
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট করুন</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shop Name & Details Modal (Admin only) */}
      {showEditShopModal && editingShop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">দোকানের নাম পরিবর্তন</h3>
                  <p className="text-xs text-slate-500">এডমিন দ্বারা দোকানের নাম ও বিবরণ আপডেট</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditShopModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShopEdit} className="space-y-3 text-xs">
              {/* Shop Logo upload & preview */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের লোগো বা ছবি
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {editShopLogoUrl ? (
                      <img src={editShopLogoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{editShopLogoUrl ? 'লোগো পরিবর্তন' : 'লোগো বা ছবি যোগ করুন'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUploadForEdit}
                        />
                      </label>
                      {editShopLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditShopLogoUrl('')}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                        >
                          মুছুন
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">দোকানের সাইনবোর্ড বা লোগোর ছবি</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  দোকানের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  placeholder="যেমন: ভাই ভাই স্টোর / নিউ ফ্যাশন"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={editShopAddress}
                  onChange={(e) => setEditShopAddress(e.target.value)}
                  placeholder="যেমন: মিরপুর ১০, ঢাকা"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="tel"
                  value={editShopPhone}
                  onChange={(e) => setEditShopPhone(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">বিবরণ / স্লোগান (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  value={editShopDescription}
                  onChange={(e) => setEditShopDescription(e.target.value)}
                  placeholder="যেমন: পাইকারি ও খুচরা বিক্রেতা..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                ℹ️ লোগো ও নাম পরিবর্তন করলে সকল মেম্বার ও রসিদে সাথে সাথে নতুন তথ্য প্রদর্শিত হবে।
              </div>

              {/* Danger Zone: Delete Shop */}
              {isAdmin && editingShop && (
                <div className="p-3 bg-rose-50/90 rounded-xl border border-rose-200 space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      দোকান মুছে ফেলুন (Delete Shop)
                    </h5>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                      স্থায়ী ডিলিট
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    এই দোকানটি মুছে ফেললে এর সকল পণ্য স্টক, বিক্রির হিসাব ও দেনাদারদের হিসাব স্থায়ীভাবে ডিলিট হয়ে যাবে। নিরাপত্তার স্বার্থে পাসওয়ার্ড প্রদান বাধ্যতামূলক।
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePassword('');
                      setShowDeleteConfirmModal(true);
                    }}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>&quot;{editingShop.name}&quot; দোকান ডিলিট করুন</span>
                  </button>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditShopModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingShopEdit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingShopEdit ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Shop Confirmation Modal with Mandatory Password */}
      {showDeleteConfirmModal && editingShop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-950 text-base">দোকান মুছে ফেলা নিশ্চিতকরণ</h3>
                  <p className="text-xs text-rose-600">পাসওয়ার্ড প্রদান বাধ্যতামূলক</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletePassword('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteShopWithPassword} className="space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <p className="font-bold text-rose-900">
                  সতর্কতা: &quot;{editingShop.name}&quot; দোকানটি স্থায়ীভাবে ডিলিট হতে যাচ্ছে!
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  এই দোকানের সাথে সম্পর্কিত সকল পণ্য, বিক্রয় ইতিহাস ও দেনাদারদের হিসাব পুরোপুরি মুছে যাবে। এই পদক্ষেপটি আর কখনো ফিরিয়ে আনা সম্ভব নয়।
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  আপনার একাউন্টের পাসওয়ার্ড লিখুন <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="আপনার গোপন পাসওয়ার্ড লিখুন"
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  আপনার অনুমতি ও নিরাপত্তা নিশ্চিত করতেই পাসওয়ার্ড প্রদান বাধ্যতামূলক।
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={deletingShop}
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setDeletePassword('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={deletingShop || !deletePassword.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {deletingShop ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>যাচাই ও ডিলিট হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>পাসওয়ার্ড দিয়ে স্থায়ীভাবে মুছুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore from JSON Modal */}
      {showRestoreModal && restoreCandidate && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">JSON ব্যাকআপ রিস্টোর</h3>
                  <p className="text-xs text-slate-500">ফাইল থেকে তথ্য লোড করার প্রিভিউ</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreCandidate(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* File Info Card */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">ব্যাকআপের দোকানের নাম:</span>
                  <span className="font-bold text-slate-900">{restoreCandidate.shopName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">ব্যাকআপের তারিখ:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(restoreCandidate.exportedAt).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 font-bold">
                  <span className="text-slate-700">মোট পণ্য ও বিক্রি:</span>
                  <span className="text-blue-700">
                    {restoreCandidate.totalProducts}টি পণ্য • {restoreCandidate.totalSales}টি বিক্রি
                  </span>
                </div>
              </div>

              {/* Restore Mode Selection */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block">রিস্টোরের পদ্ধতি বেছে নিন:</span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setRestoreMode('merge')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      restoreMode === 'merge'
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">মার্জ করুন (Merge)</div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        বিদ্যমান পণ্যের সাথে ব্যাকআপের পণ্য আপডেট ও যুক্ত হবে। (প্রস্তাবিত)
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setRestoreMode('replace')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      restoreMode === 'replace'
                        ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-rose-900 text-xs">সম্পূর্ণ নতুন (Replace)</div>
                      <p className="text-[10px] text-rose-600/80 mt-1">
                        বর্তমান পণ্য ও বিক্রি মুছে সম্পূর্ণ ব্যাকআপের ডাটা বসবে।
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  সক্রিয় দোকান: <strong>{currentShop?.name}</strong>। রিস্টোর সম্পন্ন হলে সাথে সাথে আপনার লাইভ
                  স্টক ও হিস্ট্রি আপডেট হয়ে যাবে।
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestoreCandidate(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={handleExecuteRestore}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {restoring ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>রিস্টোর হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>রিস্টোর নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Info & Direct Sync Modal */}
      {showGDriveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">গুগল ড্রাইভ ব্যাকআপ</h3>
                  <p className="text-xs text-slate-500">Google Drive স্টোরেজে ডাটা সংরক্ষণ</p>
                </div>
              </div>
              <button
                onClick={() => setShowGDriveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন!</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  আপনার সম্পূর্ণ দোকানের ডাটা JSON ফরম্যাটে ডাউনলোড হয়েছে। আপনি এটি সরাসরি গুগল ড্রাইভে সেভ করে
                  রাখতে পারেন।
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 block">গুগল ড্রাইভে আপলোড করার সহজ নিয়ম:</span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
                  <li>নিচের বাটনে ক্লিক করে আপনার <strong>Google Drive</strong> খুলুন।</li>
                  <li>ডাউনলোড হওয়া <strong>JSON ব্যাকআপ ফাইলটি</strong> ড্র্যাগ করে বা New &gt; File upload দিয়ে ড্রাইভে ছেড়ে দিন।</li>
                  <li>ভবিষ্যতে যেকোনো নতুন ডিভাইসে ফাইলটি দিয়ে <strong>JSON রিস্টোর</strong> বাটনে ক্লিক করে সাথে সাথে সকল ডাটা ফেরত পাবেন।</li>
                </ol>
              </div>

              <div className="pt-1">
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Google Drive খুলুন</span>
                </a>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500">
                ℹ️ Google Login ভেরিফিকেশন সমস্যা এড়াতে আপনি যেকোনো সময় নিরাপদ ইমেইল লগইন ব্যবহার করে এবং এই JSON ফাইলের মাধ্যমে ড্রাইভ ব্যাকআপ নিরাপদ রাখতে পারবেন।
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGDriveModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
                >
                  বুঝেছি
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
