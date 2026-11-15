import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { createMultiProductSale, batchImportSales } from '../services/storeService';
import { formatCurrency, formatQty, getTodayString, toBengaliNumber, formatNumber, formatUnit } from '../utils/formatters';
import { parseSaleCSV, ParsedSaleRow } from '../utils/csv';
import { PaymentType, PAYMENT_METHODS, Sale } from '../types';
import { InvoiceModal } from './InvoiceModal';
import confetti from 'canvas-confetti';
import {
  ShoppingCart,
  BookOpen,
  Search,
  Check,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  User,
  Calendar,
  X,
  Plus,
  Trash2,
  Package,
  Palette,
  ShieldAlert,
  CreditCard,
  Banknote,
  Coins,
  Phone,
  Receipt,
} from 'lucide-react';

interface CartItem {
  tempId: string;
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
  packagingPrice: number;
  color: string;
}

export const SaleEntryView: React.FC<{ onSuccessNavigate?: () => void }> = ({
  onSuccessNavigate,
}) => {
  const { user } = useAuth();
  const { products, sales, customerDues, currentShop, canManage, isViewer } = useStore();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [payment, setPayment] = useState<PaymentType>('নগদ');
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleColor, setSaleColor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showAddressBookModal, setShowAddressBookModal] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [completedSalesForInvoice, setCompletedSalesForInvoice] = useState<Sale[] | null>(null);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);

  // Address book compiled from all past sales & customer dues
  const customerAddressBook = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string; count: number; lastDate: string }>();
    for (const s of sales) {
      const name = s.customer?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = map.get(key);
      const phone = s.customerPhone?.trim() || existing?.phone || "";
      if (existing) {
        existing.count += 1;
        if (s.date > existing.lastDate) existing.lastDate = s.date;
        if (!existing.phone && phone) existing.phone = phone;
      } else {
        map.set(key, { name, phone, count: 1, lastDate: s.date });
      }
    }
    for (const d of customerDues) {
      const name = d.customer?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        if (!existing.phone && d.phone) existing.phone = d.phone;
      } else {
        map.set(key, { name, phone: d.phone || "", count: d.sales.length, lastDate: d.lastDate });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [sales, customerDues]);

  const selectCustomerFromBook = (c: { name: string; phone: string }) => {
    setCustomer(c.name);
    setCustomerPhone(c.phone || "");
    setShowAddressBookModal(false);
    if (c.phone) {
      setAddressNotice('✅ "' + c.name + '" এর ফোন (' + c.phone + ') অটো-লোড হয়েছে!');
    } else {
      setAddressNotice('✅ "' + c.name + '" সিলেক্ট হয়েছে।');
    }
    setTimeout(() => setAddressNotice(null), 4000);
  };

  // Saved phone contacts state (cached in localStorage)
  const [phoneContacts, setPhoneContacts] = useState<{ name: string; phone: string }[]>(() => {
    try {
      const saved = localStorage.getItem("amar_shop_phone_contacts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showPhoneContactModal, setShowPhoneContactModal] = useState(false);
  const [phoneContactSearch, setPhoneContactSearch] = useState("");
  const phoneVcfInputRef = useRef<HTMLInputElement>(null);

  // Save phone contacts to localStorage
  const savePhoneContactsList = (list: { name: string; phone: string }[]) => {
    setPhoneContacts(list);
    try {
      localStorage.setItem("amar_shop_phone_contacts", JSON.stringify(list));
    } catch (e) {
      console.warn("Storage error:", e);
    }
  };

  // Trigger Phone Contacts: Native Android / Mobile Contact Picker or Modal Fallback
  const handleOpenPhoneContacts = async () => {
    const hasNativePicker =
      typeof navigator !== "undefined" &&
      "contacts" in navigator &&
      "ContactsManager" in window;

    if (hasNativePicker) {
      try {
        const props = ["name", "tel"];
        const contacts = await (navigator as any).contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const picked = contacts[0];
          const name = (picked.name?.[0] || "").trim();
          let rawPhone = (picked.tel?.[0] || "").trim();
          // Clean phone number (strip whitespace & hyphens)
          const cleanPhone = rawPhone.replace(/[^\d+]/g, "");
          if (name) setCustomer(name);
          if (cleanPhone) setCustomerPhone(cleanPhone);

          // Add to phone contacts cache
          if (name) {
            const updated = [{ name, phone: cleanPhone }, ...phoneContacts.filter(c => c.name !== name)].slice(0, 500);
            savePhoneContactsList(updated);
          }

          setAddressNotice(`✅ ফোনের কন্টাক্ট থেকে "${name}" (${cleanPhone}) সিলেক্ট হয়েছে!`);
          showToast(`ফোনের কন্টাক্ট থেকে "${name}" সিলেক্ট হয়েছে`, "success");
          return;
        }
      } catch (err: any) {
        // User cancelled or browser rejected
        console.warn("Native contact picker error/dismiss:", err);
      }
    }

    // Fallback: Open Phone Contacts Modal
    setShowPhoneContactModal(true);
  };

  // Parse imported .vcf (vCard) file from user's phone
  const handleImportVCF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      const cards = text.split(/BEGIN:VCARD/i);
      const parsed: { name: string; phone: string }[] = [];

      for (const card of cards) {
        if (!card.trim()) continue;
        let cName = "";
        let cPhone = "";
        const fnMatch = card.match(/FN[;:]([^\r\n]+)/i);
        if (fnMatch) {
          cName = fnMatch[1].replace(/.*:/, "").trim();
        }
        const telMatch = card.match(/TEL[^:]*:([^\r\n]+)/i);
        if (telMatch) {
          cPhone = telMatch[1].replace(/[^\d+]/g, "").trim();
        }
        if (cName) {
          parsed.push({ name: cName, phone: cPhone });
        }
      }

      if (parsed.length > 0) {
        // Merge with existing
        const map = new Map<string, string>();
        for (const p of parsed) {
          map.set(p.name, p.phone);
        }
        for (const p of phoneContacts) {
          if (!map.has(p.name)) {
            map.set(p.name, p.phone);
          }
        }
        const merged = Array.from(map.entries()).map(([name, phone]) => ({ name, phone }));
        savePhoneContactsList(merged);
        showToast(`ফোন থেকে মোট ${parsed.length} টি কন্টাক্ট সফলভাবে ইমপোর্ট হয়েছে!`, "success");
      } else {
        showToast("কন্টাক্ট ফাইল থেকে কোনো নম্বর পাওয়া যায়নি", "warning");
      }
    };
    reader.readAsText(file);
    if (phoneVcfInputRef.current) phoneVcfInputRef.current.value = "";
  };

  // CSV Import State
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<ParsedSaleRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetId = currentShop?.id || user?.uid || '';

  // Only products with stock > 0
  const availableProducts = products.filter((p) => p.qty > 0);

  // Current selected product object
  const currentProduct = products.find((p) => p.id === selectedProductId);

  // Auto-fill price, default color, and values when product changes
  useEffect(() => {
    if (currentProduct) {
      setPrice(String(currentProduct.sellPrice));
      const pColors = currentProduct.colors && currentProduct.colors.length > 0
        ? currentProduct.colors
        : currentProduct.color
        ? currentProduct.color.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      setSaleColor(pColors[0] || currentProduct.color || '');
    } else {
      setSaleColor('');
    }
  }, [selectedProductId, currentProduct]);

  // Live totals including any multi-product cart items + currently selected draft item
  const currentDraftQty = parseFloat(qty) || 0;
  const currentDraftPrice = parseFloat(price) || 0;
  const currentDraftTotal =
    selectedProductId && currentProduct && currentDraftQty > 0
      ? currentDraftQty * currentDraftPrice
      : 0;
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = cartSubtotal + currentDraftTotal;

  const getUsedQtyInCart = (productId: string) =>
    cartItems
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.qty, 0);

  const handleAddToCart = () => {
    if (!selectedProductId || !currentProduct) {
      showToast(
        language === 'bn' ? 'কার্টে যোগ করতে আগে একটি প্রোডাক্ট সিলেক্ট করুন' : 'Select a product first',
        'warning'
      );
      return;
    }

    const saleQty = parseFloat(qty);
    const salePrice = parseFloat(price);

    if (isNaN(saleQty) || saleQty <= 0) {
      showToast(language === 'bn' ? 'সঠিক পরিমাণ দিন' : 'Enter a valid quantity', 'warning');
      return;
    }

    const alreadyInCart = getUsedQtyInCart(currentProduct.id);
    const remainingAvailable = currentProduct.qty - alreadyInCart;
    if (saleQty > remainingAvailable) {
      showToast(
        language === 'bn'
          ? `পর্যাপ্ত স্টক নেই! বাকি স্টক মাত্র ${formatQty(Math.max(0, remainingAvailable), currentProduct.unit, language)}`
          : `Insufficient stock! Remaining stock is ${formatQty(Math.max(0, remainingAvailable), currentProduct.unit, language)}`,
        'error'
      );
      return;
    }

    if (isNaN(salePrice) || salePrice < 0) {
      showToast(
        language === 'bn' ? 'সঠিক বিক্রয় মূল্য দিন' : 'Enter a valid selling price',
        'warning'
      );
      return;
    }

    const chosenColor = saleColor.trim() || currentProduct.color || '';
    const lineTotal = saleQty * salePrice;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === currentProduct.id &&
          item.price === salePrice &&
          item.color === chosenColor
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        const updatedQty = next[existingIdx].qty + saleQty;
        next[existingIdx] = {
          ...next[existingIdx],
          qty: updatedQty,
          total: updatedQty * salePrice,
        };
        return next;
      }
      return [
        ...prev,
        {
          tempId: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          productId: currentProduct.id,
          productName: currentProduct.name,
          unit: currentProduct.unit,
          qty: saleQty,
          price: salePrice,
          total: lineTotal,
          packagingPrice: currentProduct.packagingPrice || 0,
          color: chosenColor,
        },
      ];
    });

    showToast(
      language === 'bn'
        ? `"${currentProduct.name}" কার্টে যোগ হয়েছে — আরও পণ্য যোগ করুন অথবা বিক্রি নিশ্চিত করুন`
        : `"${currentProduct.name}" added to cart`,
      'success'
    );

    setSelectedProductId('');
    setQty('1');
    setPrice('');
    setSaleColor('');
  };

  const handleRemoveFromCart = (tempId: string) => {
    setCartItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetId) return;

    const itemsToSubmit: CartItem[] = [...cartItems];

    // Include currently selected product if present
    if (selectedProductId && currentProduct) {
      const saleQty = parseFloat(qty);
      const salePrice = parseFloat(price);

      if (isNaN(saleQty) || saleQty <= 0) {
        showToast(language === 'bn' ? 'সঠিক পরিমাণ দিন' : 'Enter a valid quantity', 'warning');
        return;
      }

      const alreadyInCart = getUsedQtyInCart(currentProduct.id);
      const remainingAvailable = currentProduct.qty - alreadyInCart;
      if (saleQty > remainingAvailable) {
        showToast(
          language === 'bn'
            ? `পর্যাপ্ত স্টক নেই! বাকি স্টক মাত্র ${formatQty(Math.max(0, remainingAvailable), currentProduct.unit, language)}`
            : `Insufficient stock! Remaining stock is ${formatQty(Math.max(0, remainingAvailable), currentProduct.unit, language)}`,
          'error'
        );
        return;
      }

      if (isNaN(salePrice) || salePrice < 0) {
        showToast(
          language === 'bn' ? 'সঠিক বিক্রয় মূল্য দিন' : 'Enter a valid selling price',
          'warning'
        );
        return;
      }

      itemsToSubmit.push({
        tempId: 'current',
        productId: currentProduct.id,
        productName: currentProduct.name,
        unit: currentProduct.unit,
        qty: saleQty,
        price: salePrice,
        total: saleQty * salePrice,
        packagingPrice: currentProduct.packagingPrice || 0,
        color: saleColor.trim() || currentProduct.color || '',
      });
    }

    if (itemsToSubmit.length === 0) {
      showToast(
        language === 'bn' ? 'অনুগ্রহ করে অন্তত একটি প্রোডাক্ট সিলেক্ট করুন' : 'Please select at least one product',
        'warning'
      );
      return;
    }

    const grandTotal = itemsToSubmit.reduce((sum, item) => sum + item.total, 0);

    if (payment === 'বাকি' && !customer.trim()) {
      showToast(
        language === 'bn'
          ? 'বাকিতে বিক্রির ক্ষেত্রে কাস্টমারের নাম বাধ্যতামূলক'
          : 'Customer name is required for credit/due sales',
        'warning'
      );
      return;
    }

    if (payment === 'আংশিক') {
      const parsedPaid = parseFloat(paidAmount);
      if (isNaN(parsedPaid) || parsedPaid < 0) {
        showToast(
          language === 'bn' ? 'সঠিক পরিশোধিত টাকার পরিমাণ দিন' : 'Enter valid paid amount',
          'warning'
        );
        return;
      }
      if (parsedPaid >= grandTotal) {
        showToast(
          language === 'bn'
            ? 'পরিশোধিত টাকা মোট বিক্রির সমান বা বেশি হলে "নগদ" নির্বাচন করুন'
            : 'Paid amount equals total. Please choose Full Paid',
          'warning'
        );
        return;
      }
      if (!customer.trim()) {
        showToast(
          language === 'bn'
            ? 'আংশিক পেমেন্টের ক্ষেত্রে বাকি টাকা কাস্টমারের নামে যুক্ত হবে, তাই নাম লিখুন'
            : 'Customer name is required to record remaining due',
          'warning'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const finalPaidAmount =
        payment === 'নগদ'
          ? grandTotal
          : payment === 'বাকি'
          ? 0
          : parseFloat(paidAmount) || 0;

      // Distribute paid/due sequentially across items so total paid + due match invoice exact sum
      let remainingCash = finalPaidAmount;
      const preparedSalesPayload = itemsToSubmit.map((item) => {
        let itemPaid = 0;
        let itemDue = item.total;
        let itemPaymentStatus: PaymentType = payment;

        if (payment === 'নগদ') {
          itemPaid = item.total;
          itemDue = 0;
          itemPaymentStatus = 'নগদ';
        } else if (payment === 'বাকি') {
          itemPaid = 0;
          itemDue = item.total;
          itemPaymentStatus = 'বাকি';
        } else {
          itemPaid = Math.min(item.total, Math.max(0, remainingCash));
          remainingCash = Math.max(0, remainingCash - itemPaid);
          itemDue = Math.max(0, item.total - itemPaid);
          itemPaymentStatus =
            itemDue <= 0 ? 'নগদ' : itemPaid > 0 ? 'আংশিক' : 'বাকি';
        }

        return {
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          unit: item.unit,
          price: item.price,
          total: item.total,
          date,
          payment: itemPaymentStatus,
          paymentMethod:
            itemPaymentStatus === 'বাকি'
              ? 'বাকি'
              : paymentMethod === 'বাকি'
              ? 'নগদ'
              : paymentMethod || 'নগদ',
          paidAmount: itemPaid,
          dueAmount: itemDue,
          customer: customer.trim(),
          customerPhone: customerPhone.trim(),
          packagingPrice: item.packagingPrice,
          color: item.color,
        };
      });

      const createdSales = await createMultiProductSale(targetId, preparedSalesPayload);

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });

      showToast(
        language === 'bn'
          ? `${toBengaliNumber(createdSales.length)} টি পণ্যের ৳ ${grandTotal.toLocaleString('en-US')} বিক্রি সংরক্ষিত হয়েছে!`
          : `Sale of ${createdSales.length} item(s) totaling ৳ ${grandTotal.toLocaleString('en-US')} saved!`,
        'success'
      );

      // Reset form & cart
      setCartItems([]);
      setSelectedProductId('');
      setQty('1');
      setPrice('');
      setSaleColor('');
      setCustomer('');
      setCustomerPhone('');
      setPayment('নগদ');
      setPaymentMethod('নগদ');
      setPaidAmount('');

      // Launch Money Receipt Modal with all items!
      setCompletedSalesForInvoice(createdSales);
    } catch (err) {
      console.error(err);
      showToast(
        language === 'bn' ? 'বিক্রি এন্ট্রি করতে সমস্যা হয়েছে' : 'Failed to record sale',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Sales Import
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const { rows, errors } = parseSaleCSV(content);
      setCsvPreview(rows);
      setCsvErrors(errors);
      if (rows.length === 0 && errors.length > 0) {
        showToast(errors[0], 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSVBatch = async () => {
    if (!user || !targetId || csvPreview.length === 0) return;
    setImportingCSV(true);
    try {
      const result = await batchImportSales(targetId, csvPreview, products);
      showToast(
        `সফলভাবে ${toBengaliNumber(result.imported)} টি বিক্রয় রেকর্ড ইমপোর্ট ও স্টক সমন্বয় করা হয়েছে`,
        'success'
      );
      setShowCSVModal(false);
      setCsvPreview([]);
      setCsvFileName('');
    } catch (err) {
      console.error(err);
      showToast('বিক্রি ইমপোর্টে সমস্যা হয়েছে', 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Staff / Sales Mode Banner */}
      {isViewer && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-800">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>{language === 'bn' ? 'কর্মচারী / সেলস মোড:' : 'Staff / Sales Mode:'}</strong>{' '}
            {language === 'bn'
              ? 'আপনি দোকানের প্রোডাক্ট বিক্রি এন্ট্রি করতে পারবেন এবং বর্তমান স্টক দেখতে পারবেন।'
              : 'You can record sales and view current product inventory.'}
          </span>
        </div>
      )}

      {/* Header with Title and CSV Import */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {language === 'bn' ? 'নতুন বিক্রি এন্ট্রি' : 'New Sale Entry'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'bn'
              ? `${currentShop?.name || 'দোকানে'} বিক্রির সাথে সাথে স্টক স্বয়ংক্রিয়ভাবে কমবে`
              : 'Stock will automatically deduct upon recording sale'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setShowCSVModal(true);
              setCsvPreview([]);
              setCsvErrors([]);
            }}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'CSV সেলস' : 'CSV Sales'}</span>
          </button>
        )}
      </div>

      {/* Main Sale Form Card */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm">
        <form onSubmit={handleSubmitSale} className="space-y-4">
          {/* Product Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'bn' ? 'প্রোডাক্ট নির্বাচন করুন' : 'Select Product'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <select
              required={cartItems.length === 0}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
            >
              <option value="">
                {language === 'bn'
                  ? cartItems.length > 0
                    ? '-- আরও পণ্য যোগ করতে চাইলে বেছে নিন --'
                    : '-- প্রোডাক্ট বেছে নিন --'
                  : '-- Select Product --'}
              </option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.color ? `(${p.color})` : ''} ({language === 'bn' ? 'মজুদ: ' : 'Stock: '}
                  {formatQty(Math.max(0, p.qty - getUsedQtyInCart(p.id)), p.unit, language)}) — {formatCurrency(p.sellPrice, language)}
                </option>
              ))}
            </select>

            {/* Display Selected Product Stock & Details Info */}
            {currentProduct && (
              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-600">
                    {language === 'bn' ? 'বর্তমান স্টক: ' : 'Current Stock: '}
                  </span>
                  <span className="font-bold text-blue-700">
                    {formatQty(Math.max(0, currentProduct.qty - getUsedQtyInCart(currentProduct.id)), currentProduct.unit, language)}
                  </span>
                </div>
                {/* Selectable Color Variant Chips if product has colors */}
                {(() => {
                  const pColors =
                    currentProduct.colors && currentProduct.colors.length > 0
                      ? currentProduct.colors
                      : currentProduct.color
                      ? currentProduct.color.split(',').map((c) => c.trim()).filter(Boolean)
                      : [];
                  if (pColors.length === 0) return null;
                  return (
                    <div className="w-full pt-1.5 border-t border-blue-200/60 mt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                          <Palette className="w-3 h-3 text-purple-600" />
                          <span>{language === 'bn' ? 'বিক্রির কালার বেছে নিন:' : 'Select Sold Color:'}</span>
                        </span>
                        {saleColor && (
                          <span className="text-[10px] text-purple-700 font-semibold bg-purple-100 px-1.5 py-0.2 rounded">
                            {saleColor}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pColors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSaleColor(c)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition border ${
                              saleColor === c
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs font-bold'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {Boolean(currentProduct.packagingPrice && currentProduct.packagingPrice > 0) && (
                  <div className="flex items-center gap-1 text-amber-700 font-medium">
                    <Package className="w-3 h-3" />
                    <span>
                      {language === 'bn' ? 'প্যাক: ' : 'Pack: '}
                      {formatCurrency(currentProduct.packagingPrice!, language)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-600">
                    {language === 'bn' ? 'নির্ধারিত রেট: ' : 'Unit Price: '}
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(currentProduct.sellPrice, language)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'bn'
                  ? `পরিমাণ (${currentProduct ? currentProduct.unit : 'একক'})`
                  : `Quantity (${formatUnit(currentProduct?.unit, language) || 'unit'})`}{' '}
                {cartItems.length === 0 && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="number"
                step="any"
                required={cartItems.length === 0}
                min="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'bn' ? 'বিক্রয় মূল্য (৳)' : 'Selling Price (৳)'}{' '}
                {cartItems.length === 0 && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="number"
                step="any"
                required={cartItems.length === 0}
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={language === 'bn' ? 'রেট দিন' : 'Enter price'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
              />
            </div>
          </div>

          {/* Multi-Product Add to Cart Trigger */}
          {canManage && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedProductId}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>
                  {language === 'bn'
                    ? 'কার্টে যোগ করে আরও পণ্য নিন (একই মানি রিসিট)'
                    : 'Add to Multi-Item Cart (Same Receipt)'}
                </span>
              </button>
            </div>
          )}

          {/* Multi-Product Cart Preview List */}
          {cartItems.length > 0 && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {language === 'bn'
                      ? `রিসিটে যুক্ত পণ্যসমূহ (${toBengaliNumber(cartItems.length)} টি)`
                      : `Cart Items (${cartItems.length})`}
                  </span>
                </span>
                <span className="text-xs font-black text-indigo-800">
                  {formatCurrency(cartSubtotal, language)}
                </span>
              </div>

              <div className="divide-y divide-indigo-100 bg-white rounded-xl border border-indigo-100 overflow-hidden">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.tempId}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {language === 'bn' ? toBengaliNumber(idx + 1) : idx + 1}. {item.productName}
                        {item.color ? ` (${item.color})` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatQty(item.qty, item.unit, language)} × {formatCurrency(item.price, language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-slate-900">
                        {formatCurrency(item.total, language)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.tempId)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title={language === 'bn' ? 'বাদ দিন' : 'Remove'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date & Payment Mode */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'বিক্রির তারিখ' : 'Sale Date'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'পরিশোধের অবস্থা' : 'Payment Status'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    
                    onClick={() => {
                      setPayment('নগদ');
                      setPaidAmount('');
                      if (paymentMethod === 'বাকি') setPaymentMethod('নগদ');
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      payment === 'নগদ'
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'নগদ' : 'Full Paid'}</span>
                  </button>

                  <button
                    type="button"
                    
                    onClick={() => {
                      setPayment('আংশিক');
                      if (paymentMethod === 'বাকি') setPaymentMethod('নগদ');
                      if (!paidAmount && totalAmount > 0) {
                        setPaidAmount(String(Math.round(totalAmount / 2)));
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      payment === 'আংশিক'
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Coins className="w-3 h-3 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'আংশিক' : 'Partial'}</span>
                  </button>

                  <button
                    type="button"
                    
                    onClick={() => {
                      setPayment('বাকি');
                      setPaidAmount('');
                      setPaymentMethod('বাকি');
                    }}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      payment === 'বাকি'
                        ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'বাকি' : 'Full Due'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Type of Payment (পেমেন্টের ধরন - ঐচ্ছিক) */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {language === 'bn'
                      ? 'পেমেন্টের মাধ্যম (Type of Payment)'
                      : 'Type of Payment (Method)'}
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {payment === 'বাকি'
                    ? language === 'bn'
                      ? 'বাকি হিসেবে নির্ধারিত'
                      : 'Set to Due'
                    : language === 'bn'
                    ? 'পদ্ধতি বেছে নিন'
                    : 'Select method'}
                </span>
              </div>

              {payment === 'বাকি' ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white border border-amber-600 shadow-xs">
                    {language === 'en' ? 'Due / Credit' : 'বাকি (Credit)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'bn'
                      ? 'বাকিতে বিক্রির পেমেন্ট মাধ্যম বাকি থাকবে'
                      : 'Credit sales use Due as payment method'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        
                        onClick={() => setPaymentMethod(method.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {language === 'en' ? method.nameEn : method.nameBn}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Partial Payment Calculation Block */}
            {payment === 'আংশিক' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-blue-600" />
                    <span>{language === 'bn' ? 'পরিশোধিত টাকা (Paid Amount)' : 'Paid Amount (৳)'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-700">
                    {language === 'bn' ? 'মোট বিক্রয়:' : 'Total:'} {formatCurrency(totalAmount, language)}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={totalAmount > 0 ? totalAmount : undefined}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="পরিশোধিত পরিমাণ লিখুন"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Live breakdown of partial vs remaining due */}
                {(() => {
                  const currentPaid = parseFloat(paidAmount) || 0;
                  const remainingDue = Math.max(0, totalAmount - currentPaid);
                  return (
                    <div className="pt-1.5 border-t border-blue-200/80 flex items-center justify-between text-xs font-medium">
                      <div className="text-emerald-700">
                        <span>{language === 'bn' ? 'নগদ জমা: ' : 'Paid: '}</span>
                        <strong>{formatCurrency(currentPaid, language)}</strong>
                        <span className="text-[10px] text-slate-500 ml-1">({paymentMethod})</span>
                      </div>
                      <div className="text-rose-700 font-bold">
                        <span>{language === 'bn' ? 'বাকি থাকবে: ' : 'Remaining Due: '}</span>
                        <span>{formatCurrency(remainingDue, language)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Customer Name & Address Book Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                {language === 'bn' ? 'কাস্টমারের তথ্য (নাম ও ফোন)' : 'Customer Details'}{' '}
                {payment === 'বাকি' ? (
                  <span className="text-rose-500">
                    {language === 'bn' ? '* (বাকির জন্য আবশ্যক)' : '* (Required)'}
                  </span>
                ) : payment === 'আংশিক' ? (
                  <span className="text-blue-600">
                    {language === 'bn' ? '* (বাকি রাখার জন্য আবশ্যক)' : '* (Required)'}
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">
                    {language === 'bn' ? '(ঐচ্ছিক)' : '(Optional)'}
                  </span>
                )}
              </label>

              {/* Contact Picker Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenPhoneContacts}
                  className="text-xs font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-emerald-300 shadow-xs cursor-pointer active:scale-95"
                  title="আপনার মোবাইলের সেভ করা কন্টাক্ট লিস্ট থেকে কাস্টমার সিলেক্ট করুন"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{language === 'bn' ? '📱 ফোনের কন্টাক্ট' : 'Phone Contacts'}</span>
                </button>

                {customerAddressBook.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddressBookModal(true)}
                    className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 border border-slate-200"
                    title="দোকানের আগের কাস্টমারদের তালিকা"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                    <span>{language === 'bn' ? 'দোকানের কাস্টমার (' + customerAddressBook.length + ')' : 'Store Contacts'}</span>
                  </button>
                )}
              </div>
            </div>

            {addressNotice && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addressNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    list="customer-suggestions"
                    value={customer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomer(val);
                      // Auto-fill phone if matched exactly in address book
                      const match = customerAddressBook.find(
                        (c) => c.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (match && match.phone) {
                        setCustomerPhone(match.phone);
                        setAddressNotice('✅ ফোন নম্বর অটো-লোড হয়েছে: ' + match.phone);
                        setTimeout(() => setAddressNotice(null), 3000);
                      }
                    }}
                    placeholder={
                      payment === 'বাকি' || payment === 'আংশিক'
                        ? (language === 'bn' ? 'কাস্টমারের নাম লিখুন বা এড্রেস বুক থেকে নিন' : 'Customer name')
                        : (language === 'bn' ? 'নাম লিখুন বা এড্রেস বুক সিলেক্ট করুন' : 'Name (optional)')
                    }
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:bg-white disabled:opacity-60 ${
                      (payment === 'বাকি' || payment === 'আংশিক') && !customer.trim()
                        ? 'border-amber-400 focus:ring-amber-500'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                  />
                  <datalist id="customer-suggestions">
                    {customerAddressBook.slice(0, 15).map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.phone ? c.phone : ""}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={language === 'bn' ? '০১৭xxxxxxxx (হোয়াটসঅ্যাপ / মেমো)' : '017xxxxxxxx'}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Total Calculation Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-200 block">
                {language === 'bn' ? 'মোট বিক্রয় মূল্য' : 'Total Sale Amount'}
                {cartItems.length > 0 &&
                  ` (${toBengaliNumber(cartItems.length + (selectedProductId && currentDraftQty > 0 ? 1 : 0))} টি আইটেম)`}
              </span>
              <span className="text-xl font-black tracking-tight block mt-0.5">
                {formatCurrency(totalAmount, language)}
              </span>
            </div>

            <div className="text-right text-[11px] text-slate-300">
              {selectedProductId && currentProduct ? (
                <>
                  <div>
                    {language === 'bn' ? 'চলতি আইটেম: ' : 'Current: '}
                    {qty || 0} {formatUnit(currentProduct?.unit, language)}
                  </div>
                  <div>
                    {language === 'bn' ? 'দর: ' : 'Rate: '}@{price || 0} ৳
                  </div>
                </>
              ) : (
                <div>
                  {language === 'bn'
                    ? `${toBengaliNumber(cartItems.length)} টি পণ্য কার্টে`
                    : `${cartItems.length} item(s) in cart`}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          {canManage ? (
            <button
              type="submit"
              disabled={submitting || (availableProducts.length === 0 && cartItems.length === 0)}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    {cartItems.length > 0
                      ? language === 'bn'
                        ? 'বিক্রয় নিশ্চিত ও মানি রিসিট তৈরি করুন'
                        : 'Complete Multi-Item Sale & Receipt'
                      : language === 'bn'
                      ? 'বিক্রয় নিশ্চিত করুন'
                      : 'Complete Sale'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <div className="p-3 text-center bg-slate-100 rounded-xl text-xs font-semibold text-slate-500">
              {language === 'bn'
                ? 'ভিউয়ার একাউন্টে বিক্রি এন্ট্রি করার অনুমতি নেই'
                : 'Viewer accounts cannot record new sales'}
            </div>
          )}
        </form>
      </div>

      {/* CSV Sales Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {language === 'bn' ? 'বিক্রয় CSV ইমপোর্ট' : 'Import Sales CSV'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn' ? 'পূর্বের বা দৈনিক বিক্রির তালিকা আপলোড' : 'Upload previous or daily sales records'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCSVModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl text-center cursor-pointer transition"
              >
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">
                  {language === 'bn' ? 'বিক্রয় CSV ফাইল নির্বাচন করুন' : 'Select Sales CSV File'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'কলাম হেডার: পণ্য, পরিমাণ, একক, মূল্য, তারিখ, পেমেন্ট, ক্রেতা'
                    : 'Headers: product, qty, unit, price, date, payment, customer'}
                </p>
                {csvFileName && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                    ✓ {csvFileName}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileChange}
                  className="hidden"
                />
              </div>

              {csvErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-700 text-xs">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />{' '}
                    {language === 'bn' ? 'ফাইলে ত্রুটি পাওয়া গেছে:' : 'Errors found in file:'}
                  </div>
                  {csvErrors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>
              )}

              {csvPreview.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">
                    {language === 'bn'
                      ? `প্রিভিউ (${toBengaliNumber(csvPreview.length)} টি বিক্রির রেকর্ড)`
                      : `Preview (${csvPreview.length} sales records)`}
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">{language === 'bn' ? 'পণ্য' : 'Product'}</th>
                          <th className="py-2 px-2 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                          <th className="py-2 px-2 text-right">{language === 'bn' ? 'মূল্য' : 'Price'}</th>
                          <th className="py-2 px-2 text-center">{language === 'bn' ? 'পেমেন্ট' : 'Payment'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvPreview.slice(0, 15).map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2.5 font-medium">{row.productName}</td>
                            <td className="py-1.5 px-2 text-center">{row.qty} {formatUnit(row.unit, language)}</td>
                            <td className="py-1.5 px-2 text-right">{formatCurrency(row.price, language)}</td>
                            <td className="py-1.5 px-2 text-center">{row.payment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCSVModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={csvPreview.length === 0 || importingCSV}
                onClick={handleImportCSVBatch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                {importingCSV
                  ? (language === 'bn' ? 'ইমপোর্ট হচ্ছে...' : 'Importing...')
                  : (language === 'bn' ? 'সব বিক্রি ইমপোর্ট করুন' : 'Import All Sales')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Customer Address Book Modal */}
      {showAddressBookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? 'দোকানের কাস্টমার তালিকা' : 'Store Customers'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressBookModal(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  placeholder={language === 'bn' ? 'নাম বা ফোন নম্বর খুঁজুন...' : 'Search customer...'}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-2 overflow-y-auto flex-1 divide-y divide-slate-100">
              {customerAddressBook
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(addressSearch.toLowerCase()) ||
                    c.phone.includes(addressSearch)
                )
                .map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => selectCustomerFromBook(c)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 rounded-xl flex items-center justify-between transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {c.phone || (language === 'bn' ? 'ফোন নম্বর নেই' : 'No phone')}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {formatNumber(c.count, language)} {language === 'bn' ? 'বার' : 'orders'}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Phone Contacts Fallback Modal */}
      {showPhoneContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-200" />
                <span>{language === 'bn' ? 'ফোনের সেভ করা কন্টাক্ট' : 'Saved Phone Contacts'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPhoneContactModal(false)}
                className="p-1 text-emerald-100 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phoneContactSearch}
                  onChange={(e) => setPhoneContactSearch(e.target.value)}
                  placeholder={language === 'bn' ? 'নাম বা নম্বর খুঁজুন...' : 'Search contact...'}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
              <input
                ref={phoneVcfInputRef}
                type="file"
                accept=".vcf,text/vcard"
                onChange={handleImportVCF}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => phoneVcfInputRef.current?.click()}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ফোন থেকে .vcf কন্টাক্ট ফাইল ইমপোর্ট করুন' : 'Import .vcf Contacts File'}</span>
              </button>
            </div>
            <div className="p-2 overflow-y-auto flex-1 divide-y divide-slate-100">
              {phoneContacts.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  {language === 'bn'
                    ? 'কোনো কন্টাক্ট লোড করা নেই। আপনার ফোনের Contacts অ্যাপ থেকে .vcf ফাইল এক্সপোর্ট করে এখানে আপলোড করতে পারেন।'
                    : 'No contacts saved yet. Import a .vcf file from your phone contacts.'}
                </p>
              ) : (
                phoneContacts
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(phoneContactSearch.toLowerCase()) ||
                      c.phone.includes(phoneContactSearch)
                  )
                  .map((c, idx) => (
                    <button
                      key={`${c.name}_${idx}`}
                      type="button"
                      onClick={() => {
                        setCustomer(c.name);
                        setCustomerPhone(c.phone);
                        setShowPhoneContactModal(false);
                        setAddressNotice(`✅ "${c.name}" (${c.phone}) সিলেক্ট হয়েছে!`);
                      }}
                      className="w-full p-2.5 text-left hover:bg-emerald-50/70 rounded-xl flex items-center justify-between transition"
                    >
                      <span className="text-xs font-bold text-slate-800">{c.name}</span>
                      <span className="text-xs font-mono text-emerald-700">{c.phone}</span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Money Receipt Modal */}
      {completedSalesForInvoice && completedSalesForInvoice.length > 0 && (
        <InvoiceModal
          sales={completedSalesForInvoice}
          shopName={currentShop?.name}
          shopPhone={currentShop?.phone}
          shopAddress={currentShop?.address}
          logoUrl={currentShop?.logoUrl}
          onClose={() => setCompletedSalesForInvoice(null)}
          onNextSale={() => {
            setCompletedSalesForInvoice(null);
            if (onSuccessNavigate) onSuccessNavigate();
          }}
        />
      )}
    </div>
  );
};
