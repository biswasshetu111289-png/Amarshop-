/**
 * Utilities for in-store barcode generation, normalization, and POS scan audio feedback.
 */

export function normalizeBarcode(code: string | undefined | null): string {
  return (code || '').trim();
}

/**
 * Generates a unique 12-digit numeric in-store barcode (prefix 200)
 * compatible with Code-128 stickers, camera scanners, and USB/Bluetooth scanners.
 */
export function generateUniqueBarcode(existingBarcodes?: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const timePart = String(Date.now()).slice(-6);
    const randPart = String(Math.floor(100 + Math.random() * 900));
    const candidate = `200${timePart}${randPart}`;
    if (!existingBarcodes || !existingBarcodes.has(candidate)) {
      return candidate;
    }
  }
  return `200${Date.now().toString().slice(-9)}`;
}

/**
 * Plays a short POS-style beep using Web Audio API on successful scan.
 */
export function playScanBeep(): void {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 200);
  } catch {
    // Ignore audio errors if blocked by browser autoplay rules
  }
}
