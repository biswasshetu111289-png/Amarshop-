import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Sparkles, X, Check, Barcode as BarcodeIcon } from 'lucide-react';
import { Product } from '../types';
import { generateUniqueBarcode } from '../utils/barcode';
import { formatCurrency, toBengaliNumber } from '../utils/formatters';

interface BarcodeLabelModalProps {
  product: Product | null;
  shopName?: string;
  existingBarcodes?: Set<string>;
  canManage: boolean;
  onSaveBarcode?: (product: Product, newBarcode: string) => Promise<void>;
  onClose: () => void;
  language?: 'bn' | 'en';
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  product,
  shopName = '',
  existingBarcodes,
  canManage,
  onSaveBarcode,
  onClose,
  language = 'bn',
}) => {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [copies, setCopies] = useState(6);
  const [showPrice, setShowPrice] = useState(true);
  const [showShopName, setShowShopName] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!product) return;
    setSavedFeedback(false);
    if (product.barcode && product.barcode.trim()) {
      setBarcodeValue(product.barcode.trim());
    } else {
      setBarcodeValue(generateUniqueBarcode(existingBarcodes));
    }
  }, [product, existingBarcodes]);

  useEffect(() => {
    if (!svgRef.current || !barcodeValue.trim()) return;
    try {
      JsBarcode(svgRef.current, barcodeValue.trim(), {
        format: 'CODE128',
        width: 2,
        height: 52,
        displayValue: true,
        fontSize: 13,
        margin: 6,
        background: '#ffffff',
        lineColor: '#0f172a',
      });
    } catch {
      // ignore invalid char edge cases
    }
  }, [barcodeValue]);

  if (!product) return null;

  const isUnsavedBarcode = (product.barcode || '').trim() !== barcodeValue.trim();

  const handleSaveToProduct = async () => {
    if (!onSaveBarcode || !barcodeValue.trim()) return;
    setSaving(true);
    try {
      await onSaveBarcode(product, barcodeValue.trim());
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintStickers = async () => {
    const cleanCode = barcodeValue.trim();
    if (!cleanCode) return;

    // Auto-save barcode onto product if user hasn't saved it yet & has permission
    if (isUnsavedBarcode && canManage && onSaveBarcode) {
      try {
        await onSaveBarcode(product, cleanCode);
      } catch {
        // Still allow printing
      }
    }

    // Generate clean SVG markup via an offscreen SVG element
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(tempSvg, cleanCode, {
        format: 'CODE128',
        width: 1.7,
        height: 44,
        displayValue: true,
        fontSize: 12,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      return;
    }

    const svgHtml = new XMLSerializer().serializeToString(tempSvg);
    const escapedProduct = product.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedShop = (shopName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const priceText = `৳ ${Number(product.sellPrice || 0).toLocaleString('en-US')}`;

    const labelCount = Math.min(Math.max(1, Number(copies) || 1), 60);
    const labelsHtml = Array.from({ length: labelCount })
      .map(
        () => `
        <div class="label-card">
          ${showShopName && escapedShop ? `<div class="shop">${escapedShop}</div>` : ''}
          <div class="pname">${escapedProduct}</div>
          <div class="barcode-wrap">${svgHtml}</div>
          ${showPrice ? `<div class="price">${priceText}</div>` : ''}
        </div>`
      )
      .join('');

    const htmlDoc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Barcode Labels - ${escapedProduct}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 8px;
              background: #fff;
              color: #000;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }
            .label-card {
              border: 1px dashed #94a3b8;
              border-radius: 6px;
              padding: 8px 6px;
              text-align: center;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .shop {
              font-size: 9px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .pname {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 3px;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .barcode-wrap svg {
              max-width: 100%;
              height: auto;
            }
            .price {
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="grid">${labelsHtml}</div>
        </body>
      </html>`;

    // Safe hidden iframe printing (avoids window.open popup blocks inside iFrame)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlDoc);
      frameDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }, 250);
    } else {
      iframe.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-cyan-200" />
            <div>
              <h3 className="text-sm font-bold">
                {language === 'bn' ? 'বারকোড স্টিকার ও প্রিন্ট' : 'Barcode Sticker & Print'}
              </h3>
              <p className="text-[11px] text-blue-100 truncate max-w-[260px]">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          {/* Sticker Preview Card */}
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center text-center">
            {showShopName && shopName && (
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                {shopName}
              </span>
            )}
            <span className="font-bold text-slate-900 text-sm mb-1">{product.name}</span>
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
              <svg ref={svgRef} />
            </div>
            {showPrice && (
              <span className="mt-1.5 font-black text-slate-900 text-sm">
                {formatCurrency(product.sellPrice, language)}
              </span>
            )}
          </div>

          {/* Edit / Generate Barcode Value */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">
              {language === 'bn' ? 'বারকোড নম্বর (Code-128):' : 'Barcode Value (Code-128):'}
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                disabled={!canManage}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {canManage && (
                <button
                  type="button"
                  onClick={() => setBarcodeValue(generateUniqueBarcode(existingBarcodes))}
                  className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer"
                  title={language === 'bn' ? 'নতুন কোড তৈরি করুন' : 'Generate new code'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অটো' : 'Auto'}</span>
                </button>
              )}
            </div>

            {canManage && onSaveBarcode && isUnsavedBarcode && (
              <button
                type="button"
                disabled={saving || !barcodeValue.trim()}
                onClick={handleSaveToProduct}
                className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {saving
                    ? language === 'bn'
                      ? 'সেভ হচ্ছে...'
                      : 'Saving...'
                    : language === 'bn'
                    ? 'এই বারকোড প্রোডাক্টে সেভ করুন'
                    : 'Save Barcode to Product'}
                </span>
              </button>
            )}

            {savedFeedback && (
              <p className="text-[11px] font-bold text-emerald-600 text-center">
                ✓ {language === 'bn' ? 'বারকোড প্রোডাক্টে সেভ হয়েছে!' : 'Barcode saved to product!'}
              </p>
            )}
          </div>

          {/* Print Options */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-700">
                {language === 'bn' ? 'স্টিকার সংখ্যা (Copies):' : 'Label Copies:'}
              </span>
              <div className="flex items-center gap-1">
                {[1, 3, 6, 12, 24].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCopies(n)}
                    className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                      copies === n
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'bn' ? toBengaliNumber(n) : n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShopName}
                  onChange={(e) => setShowShopName(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>{language === 'bn' ? 'দোকানের নাম' : 'Shop Name'}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>{language === 'bn' ? 'দাম (৳)' : 'Price (৳)'}</span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handlePrintStickers}
              disabled={!barcodeValue.trim()}
              className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow disabled:opacity-40 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {language === 'bn'
                  ? `স্টিকার প্রিন্ট করুন (${toBengaliNumber(copies)} টি)`
                  : `Print ${copies} Stickers`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
