import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, RefreshCw, ScanBarcode, X, Keyboard } from 'lucide-react';
import { playScanBeep } from '../utils/barcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  continuousMode?: boolean;
  language?: 'bn' | 'en';
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title,
  subtitle,
  continuousMode = false,
  language = 'bn',
}) => {
  const reactId = useId();
  const scannerDomId = `barcode-reader-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIdx, setSelectedCameraIdx] = useState(0);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [keepScanning, setKeepScanning] = useState(continuousMode);

  const scannerRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const lastScanTimestampRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const keepScanningRef = useRef(keepScanning);
  keepScanningRef.current = keepScanning;

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setKeepScanning(continuousMode);
  }, [continuousMode, isOpen]);

  const stopScanner = async () => {
    const inst = scannerRef.current;
    if (inst && isRunningRef.current) {
      isRunningRef.current = false;
      try {
        await inst.stop();
      } catch {
        // ignore stop errors
      }
      try {
        inst.clear();
      } catch {
        // ignore clear errors
      }
    }
    scannerRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setManualCode('');
      setLastScanned(null);
      setCameraError(null);
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      setStarting(true);
      setCameraError(null);

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (cancelled) return;

        let availableCameras: Array<{ id: string; label: string }> = [];
        try {
          const list = await Html5Qrcode.getCameras();
          availableCameras = list.map((c) => ({ id: c.id, label: c.label || 'Camera' }));
          if (!cancelled) {
            setCameras(availableCameras);
          }
        } catch {
          // Will fall back to facingMode: environment
        }

        if (cancelled) return;

        const html5QrCode = new Html5Qrcode(scannerDomId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 12,
          qrbox: { width: 250, height: 140 },
          aspectRatio: 1.5,
        };

        const handleSuccess = (decodedText: string) => {
          const clean = decodedText.trim();
          if (!clean) return;
          const now = Date.now();
          // Debounce duplicate consecutive detections within 1.4s
          if (
            lastScanTimestampRef.current.code === clean &&
            now - lastScanTimestampRef.current.time < 1400
          ) {
            return;
          }
          lastScanTimestampRef.current = { code: clean, time: now };

          playScanBeep();
          try {
            navigator.vibrate?.(75);
          } catch {
            // ignore
          }
          setLastScanned(clean);
          onScanRef.current(clean);

          if (!keepScanningRef.current) {
            stopScanner().finally(() => {
              onCloseRef.current();
            });
          }
        };

        const targetCamera =
          availableCameras.length > 0 && availableCameras[selectedCameraIdx]
            ? availableCameras[selectedCameraIdx].id
            : { facingMode: 'environment' };

        try {
          await html5QrCode.start(targetCamera, config, handleSuccess, () => {});
          if (cancelled) {
            await html5QrCode.stop().catch(() => {});
            return;
          }
          isRunningRef.current = true;
        } catch (primaryErr: any) {
          // Retry with generic environment constraint if specific camera ID failed
          if (typeof targetCamera === 'string') {
            await html5QrCode.start({ facingMode: 'environment' }, config, handleSuccess, () => {});
            if (cancelled) {
              await html5QrCode.stop().catch(() => {});
              return;
            }
            isRunningRef.current = true;
          } else {
            throw primaryErr;
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn('Barcode camera error:', err);
          const msg = String(err?.message || err || '');
          if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
            setCameraError(
              language === 'bn'
                ? 'ক্যামেরা পারমিশন দেওয়া হয়নি। ব্রাউজার থেকে ক্যামেরার অনুমতি দিন অথবা নিচে কোড স্ক্যান/লিখুন।'
                : 'Camera permission denied. Allow camera access or enter/scan barcode below.'
            );
          } else {
            setCameraError(
              language === 'bn'
                ? 'ক্যামেরা চালু করা যায়নি। ফোনে অন্য অ্যাপ ক্যামেরা ব্যবহার করছে কিনা দেখুন বা নিচে কোড স্ক্যান/লিখুন।'
                : 'Unable to start camera. You can still use a USB scanner or type the code below.'
            );
          }
        }
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, selectedCameraIdx, scannerDomId, language]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    playScanBeep();
    onScan(clean);
    setManualCode('');
    setLastScanned(clean);
    if (!keepScanning) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/15 rounded-xl">
              <ScanBarcode className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {title || (language === 'bn' ? 'বারকোড স্ক্যানার' : 'Barcode Scanner')}
              </h3>
              <p className="text-[11px] text-slate-300">
                {subtitle ||
                  (language === 'bn'
                    ? 'ক্যামেরার সামনে বারকোড ধরুন বা USB স্ক্যানার ব্যবহার করুন'
                    : 'Point camera at barcode or use USB/Bluetooth scanner')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Camera viewport */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 min-h-[220px] flex items-center justify-center">
            <div id={scannerDomId} className="w-full" />

            {starting && !cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white gap-2 text-xs">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>{language === 'bn' ? 'ক্যামেরা চালু হচ্ছে...' : 'Starting camera...'}</span>
              </div>
            )}

            {cameraError && (
              <div className="p-5 text-center space-y-2 text-xs text-amber-200">
                <Camera className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="leading-relaxed">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepScanning}
                onChange={(e) => setKeepScanning(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                {language === 'bn' ? 'একটানা একাধিক স্ক্যান মোড' : 'Continuous multi-scan'}
              </span>
            </label>

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedCameraIdx((prev) => (prev + 1) % cameras.length)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{language === 'bn' ? 'ক্যামেরা বদলান' : 'Switch Camera'}</span>
              </button>
            )}
          </div>

          {lastScanned && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
              <span>
                {language === 'bn' ? 'সর্বশেষ স্ক্যান:' : 'Last scanned:'}{' '}
                <strong className="font-mono">{lastScanned}</strong>
              </span>
              <span className="text-emerald-600">✓</span>
            </div>
          )}

          {/* USB / Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {language === 'bn'
                  ? 'অথবা USB/Bluetooth স্ক্যানার বা হাতে কোড লিখে Enter দিন:'
                  : 'Or use USB/Bluetooth scanner / type barcode:'}
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={language === 'bn' ? 'বারকোড নম্বর...' : 'Barcode number...'}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition cursor-pointer"
              >
                {language === 'bn' ? 'ব্যবহার করুন' : 'Apply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
