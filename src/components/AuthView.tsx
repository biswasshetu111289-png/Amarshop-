import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  Store,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  HelpCircle,
  ShieldCheck,
  X,
  Palette,
} from 'lucide-react';
import { PWAInstallBanner } from './PWAInstallBanner';

export const AuthView: React.FC = () => {
  const { login, register, loginWithGoogle, loginAsDemo, requestPasswordReset } = useAuth();
  const { themeId, activeTheme, customBg, cardStyle, setShowThemeModal } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { showToast } = useToast();

  const isLight = themeId === 'custom' ? false : Boolean(activeTheme.isLight);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      showToast('Google দিয়ে সফলভাবে প্রবেশ করেছেন!', 'success');
    } catch (err: unknown) {
      console.error('Google Sign-in err:', err);
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('popup-closed-by-user')) {
        showToast('Google লগইন উইন্ডো বন্ধ করা হয়েছে', 'warning');
      } else if (errMsg.includes('unauthorized-domain')) {
        showToast('Firebase কনসোলে এই অ্যাপের ডোমেইন Authorized Domains-এ যুক্ত করতে হবে', 'error');
      } else if (errMsg.includes('operation-not-allowed')) {
        showToast('Firebase Authentication-এ Google Sign-in মেথড অন (Enable) করতে হবে', 'error');
      } else {
        showToast('Google লগইন সম্পন্ন করা যায়নি। সাধারণ ইমেইল ও পাসওয়ার্ড দিয়েও প্রবেশ করতে পারবেন।', 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড পূরণ করুন', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email.trim(), password);
        showToast('একাউন্ট তৈরি সফল হয়েছে! আপনার স্টোরে স্বাগত।', 'success');
      } else {
        await login(email.trim(), password);
        showToast('লগইন সফল হয়েছে!', 'success');
      }
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : '';
      if (
        errMsg.includes('user-not-found') ||
        errMsg.includes('wrong-password') ||
        errMsg.includes('invalid-credential')
      ) {
        showToast('ভুল ইমেইল বা পাসওয়ার্ড প্রদান করা হয়েছে', 'error');
      } else if (errMsg.includes('email-already-in-use')) {
        showToast('এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা আছে! অনুগ্রহ করে লগইন করুন।', 'warning');
      } else if (errMsg.includes('invalid-email')) {
        showToast('সঠিক ইমেইল ঠিকানা দিন', 'warning');
      } else {
        showToast('লগইন/রেজিস্ট্রেশনে সমস্যা হয়েছে, আবার চেষ্টা করুন', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      await loginAsDemo();
      showToast('ডেমো স্টোরে সফলভাবে প্রবেশ করেছেন!', 'success');
    } catch (err) {
      console.error(err);
      showToast('ডেমো স্টোর খুলতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('অনুগ্রহ করে আপনার ইমেইল দিন', 'warning');
      return;
    }
    setResetLoading(true);
    try {
      await requestPasswordReset(resetEmail.trim());
      showToast('পাসওয়ার্ড রিসেট লিংক প্রক্রিয়া সম্পন্ন হয়েছে!', 'success');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      console.error(err);
      showToast('রিসেট লিংক পাঠানো যায়নি, ইমেইল সঠিক আছে কিনা দেখুন', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Determine container background
  const containerBgClass = themeId === 'custom' ? '' : activeTheme.loginBgClass;
  const containerStyle = themeId === 'custom' ? { backgroundColor: customBg } : {};

  // Determine Card Styling based on preference
  let cardClasses = 'w-full max-w-md rounded-2xl shadow-2xl p-6 transition-all duration-300';
  if (cardStyle === 'glass') {
    cardClasses += ' bg-white/90 backdrop-blur-md border border-white/50 text-slate-800';
  } else if (cardStyle === 'dark') {
    cardClasses += ' bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white';
  } else {
    // classic white
    cardClasses += ' bg-white border border-slate-100 text-slate-800';
  }

  return (
    <div
      className={`min-h-screen ${containerBgClass} flex flex-col justify-center items-center px-4 py-8 transition-colors duration-500 relative`}
      style={containerStyle}
    >
      {/* Top Controls: Global Theme Customizer & Help Button */}
      <div className="w-full max-w-md flex justify-between items-center mb-3">
        <button
          type="button"
          onClick={() => setShowThemeModal(true)}
          className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur transition border shadow-xs font-medium cursor-pointer ${
            isLight
              ? 'text-slate-700 bg-white/90 hover:bg-white border-slate-300 shadow-slate-200'
              : 'text-indigo-100 hover:text-white bg-white/10 hover:bg-white/20 border-white/15'
          }`}
          title="পুরো অ্যাপের থিম, ব্যাকগ্রাউন্ড কালার ও ডিজাইন পরিবর্তন করুন"
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span>কালার ও থিম পরিবর্তন</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur transition border font-medium cursor-pointer ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border-slate-300'
              : 'text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 border-white/10'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-300" />
          <span>লগইন সাহায্য</span>
        </button>
      </div>

      {/* Branding Header */}
      <div className="text-center mb-5 max-w-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl shadow-blue-500/25 overflow-hidden mb-3 border-2 border-white/20 bg-slate-900">
          <img
            src="/assets/aistudio/file_00000000312481fabfb649d53c7c85c6_7cd0cbb9.png"
            alt="My Business App Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <h1
          className={`text-2xl font-bold tracking-wide transition-colors ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          আমার বিজনেস ম্যানেজার
        </h1>
        <p
          className={`text-xs mt-1 transition-colors ${
            isLight ? 'text-slate-600' : 'text-indigo-200'
          }`}
        >
          পণ্য স্টক, নগদ-বাকি বিক্রি এবং কাস্টমার দেনার বিশ্বস্ত হিসাব
        </p>
      </div>

      {/* Main Form Card */}
      <div className={cardClasses}>
        <div className={`flex border-b mb-5 ${cardStyle === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 pb-3 text-center text-sm font-semibold transition-colors relative cursor-pointer ${
              !isRegister
                ? 'text-blue-600 border-b-2 border-blue-600'
                : cardStyle === 'dark'
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <LogIn className="w-4 h-4" />
              <span>লগইন</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 pb-3 text-center text-sm font-semibold transition-colors relative cursor-pointer ${
              isRegister
                ? 'text-blue-600 border-b-2 border-blue-600'
                : cardStyle === 'dark'
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>নতুন একাউন্ট (রেজিস্টার)</span>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              ইমেইল
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  cardStyle === 'dark'
                    ? 'bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800'
                    : 'bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 focus:bg-white'
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className={`block text-xs font-semibold uppercase tracking-wider ${
                  cardStyle === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                পাসওয়ার্ড
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotPassword(true);
                  }}
                  className="text-[11px] text-blue-500 hover:underline font-medium cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  cardStyle === 'dark'
                    ? 'bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800'
                    : 'bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 p-1 cursor-pointer"
                title={showPassword ? 'লুকান' : 'দেখুন'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-[11px] mt-1 ${cardStyle === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {isRegister
                ? 'আপনার পছন্দের যেকোনো ৬ অক্ষরের পাসওয়ার্ড দিন'
                : 'আপনার একাউন্টের গোপন পাসওয়ার্ড দিন'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer ${activeTheme.primaryBtnClass}`}
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{isRegister ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${cardStyle === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span
              className={`px-3 ${
                cardStyle === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'
              }`}
            >
              বা অন্যান্য মাধ্যমে প্রবেশ
            </span>
          </div>
        </div>

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className={`w-full py-2.5 px-4 mb-2.5 text-sm font-semibold rounded-xl border transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer ${
            cardStyle === 'dark'
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
          }`}
        >
          {googleLoading ? (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{googleLoading ? 'Google যাচাই করা হচ্ছে...' : 'Google দিয়ে সাইন ইন করুন'}</span>
        </button>

        {/* Demo Fast Login */}
        <button
          type="button"
          onClick={handleQuickDemoLogin}
          disabled={loading || googleLoading}
          className={`w-full py-2.5 px-4 text-sm font-semibold rounded-xl border transition flex items-center justify-center gap-2 cursor-pointer ${
            cardStyle === 'dark'
              ? 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>১-ক্লিকে ডেমো স্টোর লগইন</span>
        </button>

        {/* PWA Home Screen Install for mobile access */}
        <div className="pt-2">
          <PWAInstallBanner variant="compact" />
        </div>
      </div>

      {/* Security notice & data persistence reassurance */}
      <div
        className={`text-center mt-5 text-xs flex flex-col items-center gap-1.5 max-w-sm transition-colors ${
          isLight ? 'text-slate-600' : 'text-indigo-200'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ইমেইল লগইনের মাধ্যমে আপনার নিজস্ব ক্লাউড একাউন্টে সুরক্ষিত প্রবেশ</span>
        </div>
        <p
          className={`text-[11px] leading-relaxed text-center ${
            isLight ? 'text-slate-500' : 'text-indigo-300/80'
          }`}
        >
          প্রতিটি অ্যাপ আপডেটের পরও আপনার দোকানের পূর্বের সকল পণ্য, বিক্রি ও দেনার হিসাব ফায়ারবেস ক্লাউডে সম্পূর্ণ অপরিবর্তিত ও সংরক্ষিত থাকে।
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>পাসওয়ার্ড রিসেট করুন</span>
              </h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              আপনার নিবন্ধিত ইমেইল ঠিকানাটি লিখুন। আমরা আপনাকে পাসওয়ার্ড পরিবর্তনের নিরাপদ লিংক
              পাঠিয়ে দেব।
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2 text-xs border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" />
                <span>লগইন ও একাউন্ট নির্দেশনা</span>
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-900 mb-1">১. নিজের দোকান বা ব্যবসার একাউন্ট:</p>
                <p>
                  &quot;নতুন একাউন্ট (রেজিস্টার)&quot; ট্যাবে ক্লিক করে আপনার বাস্তব ইমেইল ও ৬ অক্ষরের যেকোনো পাসওয়ার্ড দিন। একাউন্ট তৈরি হলেই আপনার নিজস্ব সুরক্ষিত ডেটাবেজ তৈরি হবে।
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="font-bold text-emerald-900 mb-1">২. দ্রুত পরীক্ষা (ডেমো স্টোর):</p>
                <p>
                  &quot;১-ক্লিকে ডেমো স্টোর লগইন&quot; বাটনে ক্লিক করলে রেডিমেড স্যাম্পল প্রোডাক্টসহ একটি পরীক্ষামূলক স্টোর তাৎক্ষণিক ওপেন হবে।
                </p>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="font-bold text-indigo-900 mb-1">৩. তথ্যের সম্পূর্ণ গোপনীয়তা:</p>
                <p>
                  ফায়ারবেস রুলসের মাধ্যমে নিশ্চিত করা হয়েছে যে আপনার স্টকের পণ্য, দাম ও বিক্রির হিসাব শুধুমাত্র আপনার লগইন আইডি দিয়েই দেখা ও এডিট করা যাবে।
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <p className="font-bold text-purple-900 mb-1">৪. পুরো অ্যাপের কালার ও থিম পরিবর্তন:</p>
                <p>
                  উপরে &quot;কালার ও থিম পরিবর্তন&quot; বাটনে ক্লিক করে পছন্দমতো ৮টি প্রিমিয়াম থিম অথবা নিজস্ব কাস্টম কালার নির্বাচন করতে পারেন। এখানে পরিবর্তন করলে লগইন পেজের পাশাপাশি অ্যাপের ভেতরের হেডার, ব্যাকগ্রাউন্ড ও বাটন সবকিছুই বদলে যাবে!
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="font-bold text-amber-900 mb-1">৫. Google লগইন সক্রিয়করণ ও ভেরিফিকেশন:</p>
                <p>
                  Firebase Console-এ Authentication &gt; Sign-in method-এ Google চালু করুন এবং Settings &gt; Authorized domains-এ আপনার অ্যাপের লিঙ্কটি যুক্ত করুন। Google Cloud Consent Screen-এ &quot;Publish App&quot; করলে যেকোনো Google একাউন্ট দিয়ে লগইন সম্ভব হবে।
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
