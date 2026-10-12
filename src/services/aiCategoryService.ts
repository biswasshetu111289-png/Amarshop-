/**
 * AI-powered Product Auto-Categorization Service
 * Supports instant bilingual (Bangla & English) keyword/pattern detection
 * with direct mapping for specific retail items like Wallet, Watch, Bag, Belt, etc.
 */

// Common standard categories used in retail & inventory
export const COMMON_CATEGORIES = [
  'Wallet',
  'Watch',
  'Bag',
  'Belt',
  'Shoes',
  'Shirt',
  'Pant',
  'পোশাক ও ফ্যাশন',
  'ইলেকট্রনিক্স ও গ্যাজেট',
  'মোবাইল ও এক্সেসরিজ',
  'চাল',
  'ডাল',
  'তেল ও ঘি',
  'মসলা',
  'পানীয় ও চা/কফি',
  'স্ন্যাক্স ও বেকারি',
  'দুগ্ধজাত',
  'টয়লেট্রিজ ও ক্লিনিং',
  'প্রসাধন ও রূপচর্চা',
  'স্টেশনারি',
  'ওষুধ ও স্বাস্থ্যসেবা',
  'কাঁচাবাজার ও সবজি',
  'ফলমূল',
  'মাছ ও মাংস',
  'হার্ডওয়্যার ও গৃহস্থালি',
  'অন্যান্য',
];

interface CategoryRule {
  category: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  // Specific Fashion & Accessories requested by user
  {
    category: 'Wallet',
    keywords: [
      'wallet', 'wallets', 'মানিব্যাগ', 'ওয়ালেট', 'ওয়ালেট', 'মানিব্যাগ-',
      'purse', 'purses', 'coin purse', 'card holder', 'cardholder', 'money clip'
    ],
  },
  {
    category: 'Watch',
    keywords: [
      'watch', 'watches', 'ঘড়ি', 'ঘড়ি', 'হাতঘড়ি', 'হাতঘড়ি', 'স্মার্টওয়াচ',
      'স্মার্টওয়াচ', 'smartwatch', 'smart watch', 'wrist watch', 'wristwatch',
      'rolex', 'casio', 'titan', 'tissot', 'fossil', 'curren', 'naviforce',
      'wall clock', 'clock', 'টাইটান', 'ক্যাসিও'
    ],
  },
  {
    category: 'Belt',
    keywords: [
      'belt', 'belts', 'বেল্ট', 'লেদার বেল্ট', 'leather belt', 'কোমর বেল্ট'
    ],
  },
  {
    category: 'Bag',
    keywords: [
      'bag', 'bags', 'ব্যাগ', 'backpack', 'backpacks', 'স্কুল ব্যাগ', 'handbag',
      'handbags', 'shoulder bag', 'travel bag', 'tote bag', 'side bag', 'ল্যাপটপ ব্যাগ',
      'laptop bag', 'school bag', 'লেডিস ব্যাগ', 'luggage', 'suitcase'
    ],
  },
  {
    category: 'Shoes',
    keywords: [
      'shoe', 'shoes', 'জুতো', 'জুতা', 'স্যান্ডেল', 'sandals', 'sandal', 'sneaker',
      'sneakers', 'কেডস', 'লোফার', 'loafer', 'loafers', 'boot', 'boots', 'চটি',
      'slippers', 'slipper', 'হিল', 'heels', 'bata', 'apex', 'বাটা', 'এপেক্স'
    ],
  },
  {
    category: 'Shirt',
    keywords: [
      'shirt', 'shirts', 't-shirt', 't-shirts', 'tshirt', 'tshirts', 'শার্ট',
      'টি-শার্ট', 'টি শার্ট', 'polo', 'polo shirt', 'পোলো শার্ট', 'গেঞ্জি'
    ],
  },
  {
    category: 'Pant',
    keywords: [
      'pant', 'pants', 'প্যান্ট', 'জিন্স', 'জিন্স প্যান্ট', 'jeans', 'trouser',
      'trousers', 'ট্রাউজার', 'gabardine', 'গ্যাবার্ডিন', 'পায়জামা', 'joggers'
    ],
  },
  {
    category: 'পোশাক ও ফ্যাশন',
    keywords: [
      'পোশাক', 'dress', 'শাড়ি', 'শাড়ি', 'saree', 'থ্রি-পিস', 'three piece',
      'পাঞ্জাবি', 'panjabi', 'বোরকা', 'borkha', 'হিজাব', 'hijab', 'ওড়না',
      'লুঙ্গি', 'lungi', 'গামছা', 'ফতুয়া', 'জ্যাকেট', 'jacket', 'hoodie', 'হুডি',
      'সালোয়ার', 'ব্লেজার', 'blazer', 'কুুর্তি', 'kurti'
    ],
  },
  {
    category: 'মোবাইল ও এক্সেসরিজ',
    keywords: [
      'mobile', 'phone', 'smartphone', 'মোবাইল', 'ফোন', 'iphone', 'samsung',
      'xiaomi', 'realme', 'vivo', 'oppo', 'charger', 'চার্জার', 'cable',
      'কেবল', 'power bank', 'পাওয়ার ব্যাংক', 'mobile cover', 'phone case',
      'glass protector', 'gorilla glass', 'sim', 'মেমোরি কার্ড', 'memory card'
    ],
  },
  {
    category: 'ইলেকট্রনিক্স ও গ্যাজেট',
    keywords: [
      'headphone', 'headphones', 'হেডফোন', 'earphone', 'earphones', 'ইয়ারফোন',
      'airpods', 'earbuds', 'speaker', 'স্পিকার', 'bluetooth', 'ব্লুটুথ',
      'লাইট', 'light', 'বাল্ব', 'bulb', 'ফ্যান', 'fan', 'ব্যাটারি', 'battery',
      'মাউস', 'mouse', 'কিবোর্ড', 'keyboard', 'router', 'রাউটার'
    ],
  },
  {
    category: 'পারফিউম ও সুগন্ধি',
    keywords: [
      'perfume', 'perfumes', 'পারফিউম', 'আতর', 'attar', 'body spray',
      'বডি স্প্রে', 'bodyspray', 'deodorant', 'ডিউড্রেন্ট', 'fog', 'fogg', 'axe'
    ],
  },
  {
    category: 'চশমা ও সানগ্লাস',
    keywords: [
      'sunglass', 'sunglasses', 'সানগ্লাস', 'সানগ্লাসেস', 'চশমা', 'eyeglass',
      'eyeglasses', 'frame', 'lens', 'গ্লাস'
    ],
  },
  // Grocery categories
  {
    category: 'চাল',
    keywords: [
      'চাল', 'রাইস', 'rice', 'বাসমতি', 'মিনিকেট', 'নাজিরশাইল', 'নাজির',
      'চিনিগুড়া', 'কালিজিরা', 'পোলাও', 'পোলাও চাল', 'আটাশ', '২৮ চাল', '২৯ চাল',
      'আতপ', 'সিদ্ধ চাল', 'বিরিয়ানি চাল', 'বালাই', 'পাইজাম'
    ],
  },
  {
    category: 'ডাল',
    keywords: [
      'ডাল', 'মসুর', 'মুগ', 'খেসারি', 'ছোলা', 'বুট', 'মাশকলাই', 'অড়হর',
      'lentil', 'daal', 'dal', 'ডালের', 'মটর'
    ],
  },
  {
    category: 'তেল ও ঘি',
    keywords: [
      'তেল', 'সয়াবিন', 'সরিষা', 'সরিষার', 'ঘি', 'অয়েল', 'oil', 'ghee',
      'রূপচাঁদা', 'তীর', 'ফ্রেশ তেল', 'সানফ্লাওয়ার', 'অলিভ অয়েল', 'পাম অয়েল'
    ],
  },
  {
    category: 'মসলা',
    keywords: [
      'মসলা', 'হলুদ', 'মরিচ', 'ধনিয়া', 'ধনে', 'জিরা', 'এলাচ', 'দারুচিনি',
      'লবঙ্গ', 'তেজপাতা', 'আদা', 'রসুন', 'পেঁয়াজ', 'পেয়াজ', 'গোলমরিচ', 'পাঁচফোড়ন',
      'রাঁধুনি', 'বিরিয়ানি মসলা', 'গরম মসলা', 'ম্যাগি মসলা', 'spices', 'chilli', 'turmeric'
    ],
  },
  {
    category: 'চিনি ও লবণ',
    keywords: [
      'চিনি', 'সুগার', 'sugar', 'লবণ', 'লবন', 'salt', 'গুড়', 'গুড়',
      'মোল্লা সল্ট', 'আইওডিন'
    ],
  },
  {
    category: 'পানীয় ও চা/কফি',
    keywords: [
      'চা', 'চা পাতা', 'tea', 'কফি', 'coffee', 'জুস', 'juice', 'কোক', 'coke',
      'কোকা-কোলা', 'পেপসি', 'pepsi', 'সেভেন আপ', '7up', 'স্প্রাইট', 'sprite',
      'ফান্টা', 'fanta', 'মিরিন্ডা', 'স্পিড', 'speed', 'টাইগার', 'tiger',
      'পানি', 'water', 'মিনারেল ওয়াটার', 'প্রাণ ফ্রুটো', 'ম্যাঙ্গো জুস', 'লাচ্ছি'
    ],
  },
  {
    category: 'স্ন্যাক্স ও বেকারি',
    keywords: [
      'বিস্কুট', 'biscuit', 'চিপস', 'chips', 'চানাচুর', 'chanachur', 'কেক', 'cake',
      'পাউরুটি', 'bread', 'নুডলস', 'noodles', 'ম্যাগি', 'চকলেট', 'chocolate',
      'কুকিজ', 'cookies', 'টোস্ট', 'toast', 'পাপড়', 'পপকর্ন', 'ওয়েফার', 'wafer',
      'লেক্সাস', 'এনার্জি', 'ড্রাই কেক'
    ],
  },
  {
    category: 'দুগ্ধজাত',
    keywords: [
      'দুধ', 'milk', 'গুঁড়ো দুধ', 'ডানো', 'নিডো', 'মার্কস', 'ডিপ্লোমা',
      'পনির', 'cheese', 'মাখন', 'butter', 'দই', 'মিষ্টি দই', 'টক দই',
      'কনডেন্সড মিল্ক', 'ডেইরি'
    ],
  },
  {
    category: 'টয়লেট্রিজ ও ক্লিনিং',
    keywords: [
      'সাবান', 'soap', 'লাইফবয়', 'লাক্স', 'ডেটোল', 'শ্যাম্পু', 'shampoo',
      'সানসিল্ক', 'ক্লিয়ার', 'ডোভ', 'ডিটারজেন্ট', 'detergent', 'হুইল', 'সার্ফ এক্সেল',
      'রিন', 'তিব্বত', 'ডিশওয়াশ', 'ভিম', 'হারপিক', 'harpic', 'টুথপেস্ট', 'toothpaste',
      'ক্লোজআপ', 'কোলগেট', 'পেপসোডেন্ট', 'টুথব্রাশ', 'ফ্লোর ক্লিনার', 'স্যাভলন'
    ],
  },
  {
    category: 'প্রসাধন ও রূপচর্চা',
    keywords: [
      'লোশন', 'lotion', 'বডি লোশন', 'ক্রিম', 'cream', 'ফেয়ারনেস', 'তিব্বত ক্রিম',
      'ফেসওয়াশ', 'facewash', 'লিপস্টিক', 'lipstick', 'পাউডার', 'powder',
      'কুমারিকা', 'নেলপলিশ', 'কাজল', 'মেকআপ', 'হেয়ার অয়েল', 'প্যারাস্যুট'
    ],
  },
  {
    category: 'স্টেশনারি',
    keywords: [
      'খাতা', 'নোটবুক', 'notebook', 'কলম', 'pen', 'পেন্সিল', 'pencil',
      'রাবার', 'eraser', 'শার্পনার', 'মার্কার', 'marker', 'কাগজ', 'পেপার', 'paper',
      'ফাইল', 'file', 'টেপ', 'tape', 'ক্যালকুলেটর', 'calculator', 'স্কেল', 'গ্লু', 'আঠা'
    ],
  },
  {
    category: 'ওষুধ ও স্বাস্থ্যসেবা',
    keywords: [
      'প্যারাসিটামল', 'নাপা', 'napa', 'এইস', 'ace', 'এন্টাসিড', 'antacid',
      'গ্যাস্ট্রিক', 'সার্জেল', 'sergel', 'প্যানটোনিক্স', 'স্যালাইন', 'saline',
      'ওরস্যালাইন', 'ব্যান্ডেজ', 'তুলা', 'মাস্ক', 'mask', 'থার্মোমিটার', 'ভিটামিন',
      'সিরাপ', 'ট্যাবলেট', 'ক্যাপসুল', 'ইনহেলার'
    ],
  },
  {
    category: 'কাঁচাবাজার ও সবজি',
    keywords: [
      'আলু', 'potato', 'টমেটো', 'tomato', 'কাঁচামরিচ', 'মরিচ কাঁচা', 'শসা',
      'বেগুন', 'গাজর', 'পটল', 'ঢ্যাঁড়শ', 'লাউ', 'মিষ্টি কুমড়া', 'ফুলকপি',
      'বাঁধাকপি', 'শাক', 'লাল শাক', 'পালং শাক', 'লেবু', 'ধনেপাতা'
    ],
  },
  {
    category: 'ফলমূল',
    keywords: [
      'আম', 'mango', 'কলা', 'banana', 'আপেল', 'apple', 'কমলা', 'orange',
      'আঙুর', 'grapes', 'খেজুর', 'dates', 'পেঁপে', 'papaya', 'মাল্টা', 'তরমুজ',
      'পেয়ারা', 'আনারস', 'ডালিম', 'বেদানা', 'লিচু'
    ],
  },
  {
    category: 'মাছ ও মাংস',
    keywords: [
      'মাছ', 'fish', 'ইলিশ', 'রুই', 'কাতলা', 'চিংড়ি', 'তেলাপিয়া', 'পাঙ্গাশ',
      'মাংস', 'meat', 'মুরগি', 'চিকেন', 'chicken', 'গরু', 'গরুর মাংস', 'beef',
      'খাসি', 'খাসির মাংস', 'mutton', 'ডিম', 'egg', 'হাঁসের ডিম', 'ফার্মের ডিম'
    ],
  },
  {
    category: 'হার্ডওয়্যার ও গৃহস্থালি',
    keywords: [
      'তালা', 'lock', 'বালতি', 'bucket', 'মগ', 'mug', 'ঝাড়ু', 'দড়ি',
      'স্ক্রু', 'তার', 'হাতুড়ি', 'রং', 'পেইন্ট', 'ব্রাশ', 'পাইপ'
    ],
  },
];

/**
 * Predict category from product name using instant word boundary and regex matching.
 * Priority given to exact matches, word-boundary matches, and highest weighted score.
 */
export function predictCategoryHeuristic(productName: string): string | null {
  if (!productName || !productName.trim()) return null;
  const raw = productName.toLowerCase().trim();
  // Tokenize into clean words
  const words = raw.split(/[\s,./\-_+&()]+/).filter(Boolean);

  // 1. Direct word check (highest priority: if word is exact keyword like 'wallet', 'watch', etc.)
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      // Check if any word exactly matches the keyword
      if (words.includes(kwLower)) {
        return rule.category;
      }
      // Check if keyword is multi-word (e.g. "smart watch", "t-shirt") and is present as phrase
      if (kwLower.includes(' ') || kwLower.includes('-')) {
        const cleanKw = kwLower.replace(/[-]/g, ' ');
        const cleanRaw = raw.replace(/[-]/g, ' ');
        if (cleanRaw.includes(cleanKw)) {
          return rule.category;
        }
      }
    }
  }

  // 1.5 Direct substring check for unambiguous terms (length >= 4 or specific Bengali terms)
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      if (kwLower.length >= 4 && raw.includes(kwLower)) {
        return rule.category;
      }
    }
  }

  // 2. Substring matching with scoring
  let bestCategory: string | null = null;
  let highestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      if (raw === kwLower) {
        score += 20;
      } else if (raw.startsWith(kwLower + ' ') || raw.endsWith(' ' + kwLower)) {
        score += 10;
      } else if (raw.includes(kwLower)) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestCategory = rule.category;
    }
  }

  return highestScore >= 5 ? bestCategory : null;
}

/**
 * Auto-suggest category for product with optional Gemini assistance
 */
export async function autoSuggestCategory(productName: string): Promise<{
  category: string | null;
  source: 'ai_rule' | 'gemini' | 'none';
}> {
  if (!productName || productName.trim().length < 2) {
    return { category: null, source: 'none' };
  }

  // 1. Instant smart pattern classifier
  const ruleMatch = predictCategoryHeuristic(productName);
  if (ruleMatch) {
    return { category: ruleMatch, source: 'ai_rule' };
  }

  // 2. Fallback to Gemini if API key is present
  try {
    const apiKey =
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY);

    if (apiKey) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an AI assistant for a retail and inventory management app.
Product Name: "${productName.trim()}".
From this list of categories: [${COMMON_CATEGORIES.join(', ')}], pick the single best category.
Reply ONLY with the exact category name from the list, nothing else.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      const matched = COMMON_CATEGORIES.find(
        (c) => text.toLowerCase() === c.toLowerCase() || text.includes(c)
      );
      if (matched) {
        return { category: matched, source: 'gemini' };
      }
    }
  } catch (err) {
    console.debug('Gemini categorization fallback skipped:', err);
  }

  return { category: null, source: 'none' };
}
