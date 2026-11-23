/**
 * Compresses and resizes a product photo in the browser so it stays compact
 * (~15-40 KB JPEG Data URL) and safe for Firestore documents.
 */
export function compressProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('অনুগ্রহ করে একটি সঠিক ছবি ফাইল (.jpg, .png, .webp) নির্বাচন করুন'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 280;

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

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ব্রাউজারে ছবি প্রসেস করা সম্ভব হয়নি'));
          return;
        }

        // Fill white background for transparent PNG/WebP images
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        if (dataUrl.length > 180_000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('ছবিটি পড়া যায়নি, অনুগ্রহ করে অন্য ছবি দিন'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('ফাইল পড়তে সমস্যা হয়েছে'));
    reader.readAsDataURL(file);
  });
}
