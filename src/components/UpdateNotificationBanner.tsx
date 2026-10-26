import React, { useState, useEffect, useCallback } from "react";
import { APP_BUILD_TIME, APP_VERSION } from "../version";
import { Sparkles, RefreshCw, X, CheckCircle2 } from "lucide-react";

export const UpdateNotificationBanner: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [justUpdatedToast, setJustUpdatedToast] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("just_updated") === "true") {
        sessionStorage.removeItem("just_updated");
        setJustUpdatedToast(true);
        const timer = setTimeout(() => setJustUpdatedToast(false), 5000);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      const response = await fetch("/version.json?_t=" + Date.now(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.buildTime === "number") {
          if (data.buildTime > APP_BUILD_TIME) {
            setHasUpdate(true);
            if (data.releaseNotes) {
              setUpdateNotes(data.releaseNotes);
            }
          }
        }
      }
    } catch {
      // Network/offline errors ignored
    }
  }, []);

  useEffect(() => {
    checkForUpdates();

    const handleFocusOrOnline = () => {
      checkForUpdates();
    };

    window.addEventListener("focus", handleFocusOrOnline);
    window.addEventListener("online", handleFocusOrOnline);

    const interval = setInterval(checkForUpdates, 45000);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        if (reg.waiting) {
          setHasUpdate(true);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("focus", handleFocusOrOnline);
      window.removeEventListener("online", handleFocusOrOnline);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          await reg.update().catch(() => {});
        }
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      try {
        sessionStorage.setItem("just_updated", "true");
      } catch {
        // Ignore
      }

      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set("v", String(Date.now()));
      window.location.replace(targetUrl.toString());
    } catch (err) {
      console.error("Update error:", err);
      window.location.reload();
    }
  };

  if (justUpdatedToast) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[500px] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="bg-emerald-600 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between border border-emerald-400">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            <div className="text-xs">
              <span className="font-bold block">অ্যাপটি সফলভাবে আপডেট হয়েছে! (v{APP_VERSION})</span>
              <span className="text-emerald-100 text-[11px]">নতুন ফিচার ও নতুন লোগো লোড সম্পন্ন।</span>
            </div>
          </div>
          <button
            onClick={() => setJustUpdatedToast(false)}
            className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-600 text-white shadow-xl border-b border-white/20">
        <div className="max-w-[600px] mx-auto px-3.5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-amber-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs tracking-tight">🚀 অ্যাপের নতুন আপডেট এসেছে!</span>
                <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  নতুন
                </span>
              </div>
              <p className="text-[11px] text-blue-100 truncate mt-0.5">
                {updateNotes || "নতুন লোগো ও দ্রুতগতির আপডেট সাথে সাথে পেতে আপডেট করুন।"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-blue-100 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition"
            >
              পরে
            </button>

            <button
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={"w-3.5 h-3.5 text-blue-700 " + (isUpdating ? "animate-spin" : "")} />
              <span>{isUpdating ? "আপডেট হচ্ছে..." : "এখনই আপডেট করুন"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
