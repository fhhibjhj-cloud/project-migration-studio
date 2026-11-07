// @ts-nocheck
import React, { useState } from 'react';
import { X, User, Lock, KeyRound, UserCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { store } from '../lib/store';
import { SaykoLogo } from './SaykoLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  actionPromptMessage?: string; // Optional context why modal opened (e.g. guest tried to bet)
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'register',
  actionPromptMessage,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  
  // Registration form fields: Full Name (optional/custom), Username, Password, Confirm Password
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login form fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || username.length < 3) {
      setError('نام کاربری باید حداقل ۳ کاراکتر باشد.');
      return;
    }
    if (!password || password.length < 3) {
      setError('رمز عبور باید حداقل ۳ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setError('رمز عبور با تکرار آن مطابقت ندارد.');
      return;
    }

    const displayName = fullName.trim() || username.trim();
    const res = store.register(displayName, username, password);
    if (!res.success) {
      setError(res.message || 'خطا در ثبت‌نام.');
      return;
    }

    // Instant auto-login complete
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginUsername.trim()) {
      setError('لطفاً نام کاربری را وارد کنید.');
      return;
    }

    const res = await store.loginLive(loginUsername, loginPassword);
    if (!res.success) {
      setError(res.message || 'نام کاربری یا رمز عبور اشتباه است.');
      return;
    }

    onClose();
  };

  const handleGuestLogin = () => {
    store.loginAsGuest();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo & Header */}
        <div className="pt-2 pb-4 text-center">
          <SaykoLogo size="md" className="mb-2" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {tab === 'register' ? 'ثبت‌نام در سایکو آنالیز' : 'ورود به حساب کاربری'}
          </h2>
          {actionPromptMessage ? (
            <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-2.5 rounded-xl text-right">
              {actionPromptMessage}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              پیش‌بینی هوشمند و نتایج زنده مسابقات اسب‌دوانی
            </p>
          )}
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 text-sm font-medium">
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ثبت‌نام جدید
          </button>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            ورود به سیستم
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* REGISTRATION FORM */}
        {tab === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                نام و نام خانوادگی (اختیاری)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: کمال توماج"
                  className="w-full h-10 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                نام کاربری دلخواه
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="حداقل ۳ حرف انگلیسی"
                  dir="ltr"
                  className="w-full h-10 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500"
                  required
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  رمز عبور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full h-10 pr-9 pl-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  تکرار رمز عبور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full h-10 pr-9 pl-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>
            </div>

            {/* Security Notice per Requirements */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed text-right flex items-start gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>در وارد کردن رمز و نام کاربری دقت کنید و آن را در جای امنی یادداشت کنید.</span>
            </div>

            <button
              type="submit"
              className="w-full h-11 mt-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ثبت‌نام و ورود خودکار</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                نام کاربری
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="نام کاربری خود را وارد کنید"
                  dir="ltr"
                  className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 mt-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ورود به حساب</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* GUEST MODE BUTTON */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 mb-2">یا بدون ثبت‌نام مرور کنید:</p>
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>ورود به عنوان مهمان (مشاهده بدون ثبت‌نام)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
