import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

export interface Translations {
  [key: string]: {
    bn: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  nav_dashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  nav_stock: { bn: 'স্টক', en: 'Stock' },
  nav_sell: { bn: 'নতুন বিক্রি', en: 'New Sale' },
  nav_history: { bn: 'বিক্রির হিসাব', en: 'Sales History' },
  nav_dues: { bn: 'বাকির খাতা', en: 'Due Khata' },

  // Header & General
  app_name: { bn: 'আমার বিজনেস ম্যানেজার', en: 'Amar Business Manager' },
  my_shop: { bn: 'আমার দোকান', en: 'My Shop' },
  all_shops: { bn: 'আপনার দোকানসমূহ (Multi-Shop)', en: 'Your Shops (Multi-Shop)' },
  select_or_create_shop: { bn: 'দোকান নির্বাচন করুন অথবা নতুন তৈরি করুন', en: 'Select a shop or create a new one' },
  create_new_shop_btn: { bn: '+ নতুন দোকান তৈরি করুন', en: '+ Create New Shop' },
  join_shop_with_code: { bn: 'কোড দিয়ে দোকানে যোগ দিন', en: 'Join Shop with Code' },
  settings_and_admin: { bn: 'দোকান ও একাউন্ট সেটিংস', en: 'Shop & Account Settings' },
  shop_code: { bn: 'শপ কোড', en: 'Shop Code' },
  active_shop_code: { bn: 'সক্রিয় শপ কোড:', en: 'Active Shop Code:' },
  account_email: { bn: 'আপনার একাউন্ট ইমেইল:', en: 'Account Email:' },
  copy: { bn: 'কপি', en: 'Copy' },
  copied: { bn: 'কপি হয়েছে', en: 'Copied' },
  switch_shop: { bn: 'দোকান পরিবর্তন', en: 'Switch Shop' },
  team_members: { bn: 'টিম ও মেম্বার', en: 'Team & Members' },
  team_management: { bn: 'টিম ও মেম্বার ম্যানেজমেন্ট', en: 'Team & Member Management' },
  backup_restore: { bn: 'ডাটা ব্যাকআপ ও রিস্টোর', en: 'Backup & Restore' },
  logout: { bn: 'লগআউট', en: 'Logout' },
  role_admin: { bn: 'এডমিন', en: 'Admin' },
  role_manager: { bn: 'ম্যানেজার', en: 'Manager' },
  role_viewer: { bn: 'ভিউয়ার', en: 'Viewer' },

  // Dashboard
  business_overview: { bn: 'ব্যবসায়িক পরিস্থিতি', en: 'Business Overview' },
  business_subtitle: { bn: 'আজকের বিক্রি, লাভ ও মজুদের লাইভ আপডেট', en: "Today's sales, profit & inventory live update" },
  new_sale_action: { bn: 'নতুন বিক্রি', en: 'New Sale' },
  view_sales_btn: { bn: 'বিক্রি দেখুন', en: 'View Sales' },
  total_products_card: { bn: 'মোট প্রোডাক্ট', en: 'Total Products' },
  view_stock_list: { bn: 'স্টক তালিকা দেখুন', en: 'View Stock' },
  today_sales: { bn: 'আজকের সেল', en: "Today's Sales" },
  today_sales_sub: { bn: 'আজকের মোট বিক্রি', en: "Today's total sales" },
  today_profit: { bn: 'মোট লাভ', en: 'Total Profit' },
  net_profit_sub: { bn: 'বিক্রি ও প্যাকেজিং সমন্বিত নিট লাভ', en: 'Net profit with packaging' },
  total_products: { bn: 'মোট পণ্য', en: 'Total Products' },
  total_dues: { bn: 'মোট বাকি', en: 'Total Dues' },
  view_due_book: { bn: 'বাকি খাতা দেখুন', en: 'View Due Ledger' },
  quick_sell_action: { bn: '+ নতুন বিক্রি করুন', en: '+ Make a Sale' },
  quick_stock_action: { bn: '+ পণ্য যুক্ত করুন', en: '+ Add Product' },
  recent_sales_title: { bn: 'সাম্প্রতিক বিক্রি', en: 'Recent Sales' },
  see_all: { bn: 'সব দেখুন', en: 'See All' },
  no_sales_yet: { bn: 'এখনও কোনো বিক্রি হয়নি', en: 'No sales recorded yet' },
  low_stock_alert: { bn: 'কম স্টক সতর্কতা', en: 'Low Stock Alert' },
  low_stock_notice: { bn: '৫ টি বা তার কম মজুদ পণ্য', en: 'Items with 5 or fewer in stock' },
  items_count: { bn: 'টি পণ্য', en: 'items' },

  // Sell Entry
  sell_entry_title: { bn: 'নতুন বিক্রি এন্ট্রি', en: 'New Sale Entry' },
  sell_entry_subtitle: { bn: 'বিক্রির সাথে সাথে স্টক স্বয়ংক্রিয়ভাবে কমবে', en: 'Stock automatically deducts upon sale' },
  select_product: { bn: 'প্রোডাক্ট নির্বাচন করুন', en: 'Select Product' },
  select_product_placeholder: { bn: '-- প্রোডাক্ট বেছে নিন --', en: '-- Select Product --' },
  available_stock_label: { bn: 'বর্তমান স্টক', en: 'Current Stock' },
  rate_label: { bn: 'নির্ধারিত রেট', en: 'Unit Price' },
  quantity: { bn: 'পরিমাণ', en: 'Quantity' },
  selling_price: { bn: 'বিক্রয় মূল্য (৳)', en: 'Selling Price (৳)' },
  date: { bn: 'তারিখ', en: 'Date' },
  payment_status: { bn: 'পরিশোধের অবস্থা', en: 'Payment Status' },
  payment_status_paid: { bn: 'সম্পূর্ণ নগদ/পরিশোধ', en: 'Full Paid' },
  payment_status_partial: { bn: 'আংশিক পেমেন্ট', en: 'Partial Payment' },
  payment_status_due: { bn: 'সম্পূর্ণ বাকি', en: 'Full Due' },
  payment_type: { bn: 'পেমেন্টের ধরন (Type of Payment)', en: 'Type of Payment (Method)' },
  payment_type_optional: { bn: 'পেমেন্টের ধরন (Type of Payment) - ঐচ্ছিক', en: 'Type of Payment (Method) - Optional' },
  payment_method_cash: { bn: 'নগদ (Cash)', en: 'Cash' },
  payment_method_bkash: { bn: 'বিকাশ (bKash)', en: 'bKash' },
  payment_method_nagad: { bn: 'নগদ পে (Nagad)', en: 'Nagad' },
  payment_method_rocket: { bn: 'রকেট (Rocket)', en: 'Rocket' },
  payment_method_card: { bn: 'কার্ড (Card)', en: 'Card' },
  payment_method_bank: { bn: 'ব্যাংক (Bank)', en: 'Bank Transfer' },
  payment_method_other: { bn: 'অন্যান্য (Other)', en: 'Other' },
  paid_amount_label: { bn: 'পরিশোধিত টাকা (Paid Amount)', en: 'Paid Amount' },
  due_amount_label: { bn: 'বাকি টাকা (Due Amount)', en: 'Remaining Due' },
  customer_name: { bn: 'কাস্টমারের নাম', en: 'Customer Name' },
  customer_phone: { bn: 'মোবাইল নম্বর', en: 'Phone Number' },
  customer_phone_optional: { bn: 'মোবাইল নম্বর (ঐচ্ছিক)', en: 'Mobile Number (Optional)' },
  customer_phone_placeholder: { bn: '০১৭xxxxxxxx (ঐচ্ছিক)', en: '017xxxxxxxx (Optional)' },
  customer_required_for_due: { bn: '* (বাকির জন্য বাধ্যতামূলক)', en: '* (Required for Due)' },
  customer_optional: { bn: '(ঐচ্ছিক)', en: '(Optional)' },
  complete_sale_btn: { bn: 'বিক্রয় নিশ্চিত করুন', en: 'Complete Sale' },
  saving_sale: { bn: 'সংরক্ষণ হচ্ছে...', en: 'Saving...' },

  // Stock View
  stock_title: { bn: 'পণ্য ও স্টক ব্যবস্থাপনা', en: 'Product & Stock Management' },
  stock_subtitle: { bn: 'দোকানের সকল পণ্যের তালিকা ও লাইভ মজুদ', en: 'Live inventory and products list' },
  filter_available_stock: { bn: 'স্টক আছে (Available Stock)', en: 'Available Stock (> 0)' },
  filter_all_products: { bn: 'সকল পণ্য (All Products)', en: 'All Products' },
  filter_zero_stock: { bn: 'শূন্য স্টক (Out of Stock)', en: 'Out of Stock (0)' },
  add_new_product_btn: { bn: '+ নতুন পণ্য', en: '+ Add Product' },
  search_placeholder: { bn: 'পণ্যের নাম বা ক্যাটাগরি খুঁজুন...', en: 'Search product or category...' },
  all_categories: { bn: 'সকল ক্যাটাগরি', en: 'All Categories' },
  product_name: { bn: 'প্রোডাক্টের নাম', en: 'Product Name' },
  unit: { bn: 'একক', en: 'Unit' },
  buy_price: { bn: 'ক্রয় মূল্য (৳)', en: 'Buy Price (৳)' },
  sell_price: { bn: 'বিক্রয় মূল্য (৳)', en: 'Sell Price (৳)' },
  category: { bn: 'ক্যাটাগরি', en: 'Category' },
  edit: { bn: 'সংশোধন', en: 'Edit' },
  delete: { bn: 'মুছুন', en: 'Delete' },

  // Due Khata (Credit Dues)
  dues_title: { bn: 'বাকি খাতা (কাস্টমার দেনা)', en: 'Customer Dues Ledger' },
  dues_subtitle: { bn: 'গ্রাহকদের কাছে পাওনা টাকার সার্বিক হিসাব', en: 'Outstanding dues and collection' },
  total_unpaid_due: { bn: 'মোট অনাদায়ী বাকি', en: 'Total Outstanding Due' },
  customers_count: { bn: 'জন ক্রেতার কাছে বাকি রয়েছে', en: 'customers have dues' },
  search_customer_placeholder: { bn: 'ক্রেতার নাম দিয়ে খুঁজুন...', en: 'Search customer name...' },
  receive_due_payment_btn: { bn: 'বাকি আদায়', en: 'Receive Payment' },
  mark_all_paid: { bn: 'সম্পূর্ণ পরিশোধ', en: 'Full Paid' },
  partial_due_payment: { bn: 'আংশিক আদায়', en: 'Partial Due Payment' },
  payment_collection_modal_title: { bn: 'বাকি টাকা আদায় গ্রহণ', en: 'Collect Due Payment' },
  collection_amount_label: { bn: 'আদায়ের পরিমাণ (৳)', en: 'Collection Amount (৳)' },
  confirm_payment_btn: { bn: 'পেমেন্ট সংরক্ষণ করুন', en: 'Confirm Payment' },

  // Sales History
  history_title: { bn: 'বিক্রির ইতিহাস ও হিসাব', en: 'Sales History & Records' },
  history_subtitle: { bn: 'প্রতিদিনের সম্পন্ন হওয়া বিক্রির তালিকা', en: 'All completed sales records' },
  total_sales_count: { bn: 'মোট বিক্রয় সংখ্যা', en: 'Total Sales Count' },
  cash_sales: { bn: 'নগদ বিক্রয়', en: 'Cash Sales' },
  due_sales: { bn: 'বাকি বিক্রয়', en: 'Due Sales' },
  view_invoice: { bn: 'রসিদ', en: 'Receipt' },
  print: { bn: 'প্রিন্ট', en: 'Print' },

  // Common
  cancel: { bn: 'বাতিল', en: 'Cancel' },
  save: { bn: 'সংরক্ষণ', en: 'Save' },
  confirm: { bn: 'নিশ্চিত করুন', en: 'Confirm' },
  success: { bn: 'সফল হয়েছে', en: 'Success' },
  error: { bn: 'সমস্যা হয়েছে', en: 'Error' },
  language_choice: { bn: 'ভাষা / Language', en: 'Language / ভাষা' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

const LANGUAGE_STORAGE_KEY = 'amar_business_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {
      // ignore
    }
    return 'bn';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  useEffect(() => {
    document.title =
      language === 'bn'
        ? 'আমার বিজনেস ম্যানেজার - স্টক ও সেলস ম্যানেজমেন্ট'
        : 'Amar Business Manager - Stock & Sales Management';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const item = translations[key];
    if (!item) return key;
    return item[language] || item.bn || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
