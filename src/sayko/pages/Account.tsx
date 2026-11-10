// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  Trash2, 
  LogOut, 
  History, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronRight,
  Wallet,
  Mail,
  Trophy,
  Volume2,
  VolumeX,
  Lock,
  Copy,
  Check,
  KeyRound,
  AlertCircle,
  Compass, Vibrate } from 'lucide-react';
import { haptics, HAPTIC_LEVELS } from '../lib/haptics';
import { store, UserProfile, PredictionSlip, Transaction } from '../lib/store';
import { sound } from '../lib/audio';
import { formatCardNumber } from '../lib/format';

interface AccountProps {
  currentUser: UserProfile | null;
  predictions: PredictionSlip[];
  transactions: Transaction[];
  onBackToHome: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToMessages?: () => void;
  onOpenAuth: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

const toEnDigits = (v: string) => String(v).replace(/[۰-۹]/g,(d)=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,(d)=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const Account: React.FC<AccountProps> = ({
  currentUser,
  predictions,
  transactions,
  onBackToHome,
  onNavigateToAdmin,
  onNavigateToMessages,
  onOpenAuth,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'slips' | 'ledger'>('profile');
  
  // Profile edit form fields - Full name, IBAN & 16-digit Card Number (phone completely removed)
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [iban, setIban] = useState(currentUser?.iban || '');
  const [ibanDigits, setIbanDigits] = useState(
    currentUser?.iban ? currentUser.iban.replace(/^IR/i, '') : ''
  );
  const isCardLocked = ((currentUser?.cardNumber || '').replace(/\D/g, '').length === 16);
  const [cardNumber, setCardNumber] = useState(currentUser?.cardNumber || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTxCode, setCopiedTxCode] = useState<string | null>(null);
  const [withdrawalStatus, setWithdrawalStatus] = useState(store.getWithdrawalStatus());

  const handleCopyTxTrackingCode = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      sound.playClick();
      setCopiedTxCode(code);
      setTimeout(() => {
        setCopiedTxCode(prev => prev === code ? null : prev);
      }, 2000);
    }).catch(() => {});
  };

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [withdrawalToast, setWithdrawalToast] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setIban(currentUser.iban || '');
      setIbanDigits(currentUser.iban ? currentUser.iban.replace(/^IR/i, '') : '');
      setCardNumber(currentUser.cardNumber || '');
    }
  }, [currentUser]);

  const [navBarEnabled, setNavBarEnabledState] = useState<boolean>(store.isNavBarEnabled);

  useEffect(() => {
    return store.subscribe(() => {
      setWithdrawalStatus(store.getWithdrawalStatus());
      setNavBarEnabledState(store.isNavBarEnabled);
    });
  }, []);

  const handleToggleNavBar = () => {
    const next = !navBarEnabled;
    setNavBarEnabledState(next);
    store.setNavBarEnabled(next);
    sound.playClick();
  };

  const handleCopyNumericId = (idNum: number | string) => {
    try {
      sound.playClick();
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(idNum)).catch(() => {});
      }
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    } catch (e) {
      console.warn('Copy numeric ID error:', e);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setPasswordFeedback(null);

    if (!newPassword || newPassword.length < 3) {
      setPasswordFeedback({ status: 'error', message: 'رمز عبور جدید باید حداقل ۳ کاراکتر باشد.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ status: 'error', message: 'رمز عبور جدید با تکرار آن یکسان نیست.' });
      return;
    }

    const res = store.changePassword(oldPassword, newPassword);
    if (res.success) {
      setPasswordFeedback({ status: 'success', message: 'رمز عبور با موفقیت به‌روزرسانی شد.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      sound.playSuccess();
    } else {
      setPasswordFeedback({ status: 'error', message: res.message || 'خطا در تغییر رمز عبور.' });
      sound.playAlert();
    }
  };

  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.isEnabled());
  const [hapticOn, setHapticOn] = useState<boolean>(haptics.enabled);
  const [hapticMs, setHapticMs] = useState<number>(haptics.ms);
  const [soundVolume, setSoundVolume] = useState<number>(sound.getVolume());

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
    if (next) {
      sound.playClick();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value) / 100;
    setSoundVolume(vol);
    sound.setVolume(vol);
  };

  const handleTestSound = () => {
    sound.playClick();
  };

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!currentUser || currentUser.isGuest) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ورود به حساب کاربری</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          برای دسترسی به سوابق فرم‌های پیش‌بینی، مدیریت کیف پول و ویرایش اطلاعات کاربری وارد حساب شوید.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            ورود یا ثبت‌نام
          </button>
          <button
            onClick={onBackToHome}
            className="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            بازگشت به خانه
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();


    // Determine finalized IBAN: once currentUser.iban is set, it cannot be changed or deleted
    let finalIban = currentUser.iban || '';
    const cleanIban = toEnDigits(ibanDigits).replace(/\D/g, '');
    if (!finalIban && cleanIban.length === 24) {
      finalIban = `IR${cleanIban}`;
    }
    const cleanCard = toEnDigits(cardNumber).replace(/\D/g, '');
    const finalCard = isCardLocked ? currentUser.cardNumber : (cleanCard.length === 16 ? cleanCard.replace(/(\d{4})(?=\d)/g, '$1-') : (currentUser.cardNumber || ''));
    if (!isCardLocked && cleanCard.length > 0 && cleanCard.length !== 16) { alert('شماره کارت باید ۱۶ رقم باشد.'); return; }
    if ((!isCardLocked && cleanCard.length === 16) || (!currentUser.iban && cleanIban.length === 24) || (!currentUser.isFullNameLocked && fullName.trim())) {
      if (!window.confirm('هشدار: نام و نام خانوادگی، شماره کارت و شماره شبا پس از ذخیره برای همیشه قفل می‌شوند و باید به نام خود صاحب کارت باشند. آیا از صحت اطلاعات مطمئن هستید؟')) return;
    }

    // If user's name is not locked yet, lock it upon saving
    if (!currentUser.isFullNameLocked && fullName.trim()) {
      store.lockFullName(fullName.trim());
    }
    store.updateProfile({
      fullName: currentUser.isFullNameLocked ? currentUser.fullName : (fullName.trim() || currentUser.fullName),
      iban: finalIban,
      cardNumber: finalCard,
    });

    setSaveSuccess(true);
    sound.playSuccess();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleConfirmDeleteAccount = () => {
    store.deleteAccount();
    setIsDeleteModalOpen(false);
    onBackToHome();
  };

  const handleLogout = () => {
    store.logout();
    onBackToHome();
  };

  const handleWithdrawClick = () => {
    try {
      sound.playClick();
      const status = store.getWithdrawalStatus();
      if (!status.allowed) {
        setWithdrawalToast(status.reason || 'تسویه حساب فقط از روز شنبه تا چهارشنبه امکانپذیر است.');
        sound.playAlert();
        setTimeout(() => setWithdrawalToast(null), 3800);
        return;
      }

      const profileCheck = store.validateProfileForWithdrawal(currentUser);
      if (!profileCheck.isValid) {
        setActiveTab('profile');
        setWithdrawalToast(profileCheck.message);
        sound.playAlert();
        setTimeout(() => setWithdrawalToast(null), 5000);
        onOpenWithdraw();
        return;
      }

      onOpenWithdraw();
    } catch (e) {
      console.warn('handleWithdrawClick error:', e);
      onOpenWithdraw();
    }
  };

  const userSlips = predictions.filter((p) => p.userId === currentUser.id);
  const userTxs = transactions.filter((t) => t.userId === currentUser.id);
  const pendingRequestsCount = transactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-4 pb-6 gpu-layer relative">
      
      {/* Floating Withdrawal Notice Toast */}
      {withdrawalToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-[92%] sm:max-w-md w-max animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/95 text-white border border-amber-500/50 shadow-2xl backdrop-blur-md text-xs font-bold" dir="rtl">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{withdrawalToast}</span>
            <button
              type="button"
              onClick={() => setWithdrawalToast(null)}
              className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-white mr-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header Actions */}
      <div className="flex items-center justify-between pb-1" dir="rtl">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-500" />
          <h1 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
            حساب کاربری
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-bold py-1.5 px-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
          title="خروج از حساب"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج از حساب</span>
        </button>
      </div>

      {/* User Summary & Wallet Card (Mobile-Optimized) */}
      <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-4 sm:p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-3.5 transition-colors">
        {/* User Identity Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-base sm:text-lg shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {currentUser.fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">@{currentUser.username}</span>
                
                {/* Unique Numeric ID with Copy button */}
                <button
                  type="button"
                  onClick={() => handleCopyNumericId(currentUser.numericId || 10842)}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800/90 dark:hover:bg-emerald-950/40 px-2 py-0.5 rounded-lg text-[10.5px] text-slate-700 dark:text-slate-300 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer group"
                  title="کلیک برای کپی شناسه عددی"
                >
                  <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">شناسه:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {currentUser.numericId || 10842}
                  </span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Mobile-Optimized Wallet Balance Box */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 sm:p-3.5 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 block leading-tight truncate">
                موجودی کیف پول
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5 truncate">
                اعتبار فعال حساب کاربری
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 text-left shrink-0" dir="ltr">
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg tabular-nums tracking-tight">
              {(currentUser?.balanceTomans ?? 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">تومان</span>
          </div>
        </div>
      </div>

      {/* Orange Notice if Withdrawals are Closed */}
      {!withdrawalStatus.allowed && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/50 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          <div className="text-right flex-1">
            <span className="font-black text-amber-800 dark:text-amber-200 block text-xs">
              تسویه بسته هست
            </span>
            <span className="text-[11px] opacity-90 mt-0.5 block leading-relaxed">
              {withdrawalStatus.reason || 'تسویه حساب فقط از روز شنبه تا چهارشنبه امکان‌پذیر است.'}
            </span>
          </div>
        </div>
      )}

      {/* Wallet Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenDeposit}
          className="py-2.5 px-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/50 text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-100 transition-colors cursor-pointer"
        >
          <Wallet className="w-4 h-4 text-sky-500" />
          <span>افزایش موجودی</span>
        </button>
        <button
          onClick={handleWithdrawClick}
          className="py-2.5 px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <CreditCard className="w-4 h-4 text-emerald-500" />
          <span>برداشت وجه</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          ویرایش مشخصات
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          گردش حساب
        </button>
      </div>

      {/* TAB 1: Profile Editor */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <form 
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-[#151d2a] rounded-[24px] p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-3.5"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-900 dark:text-white">مشخصات هویتی و مالی</span>
              <button
                type="button"
                onClick={() => handleCopyNumericId(currentUser.numericId || 10842)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-mono transition-colors cursor-pointer group"
                title="کلیک برای کپی شناسه عددی"
              >
                <span className="text-[10px] text-slate-400">شناسه:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentUser.numericId || 10842}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                )}
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>اطلاعات کاربری با موفقیت به‌روزرسانی شد.</span>
              </div>
            )}

            {!store.validateProfileForWithdrawal(currentUser).isValid && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs space-y-1.5 animate-in fade-in" dir="rtl">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>تکمیل مشخصات برای تسویه حساب الزامی است:</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pr-6">
                  جهت امکان ثبت درخواست برداشت و تسویه وجه، نام و نام خانوادگی، شماره کارت بانکی (۱۶ رقم) و شماره شبا (۲۴ رقم) باید در فرم زیر تکمیل و ذخیره گردند.
                </p>
              </div>
            )}

            {/* Read-only Full Name ("نام و نام خانوادگی"): can only be saved once, then locked permanently */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>نام و نام خانوادگی</span>
                {currentUser.isFullNameLocked && (
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    قفل شده (غیرقابل تغییر)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentUser.isFullNameLocked ? currentUser.fullName : fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={Boolean(currentUser.isFullNameLocked)}
                  placeholder="نام و نام خانوادگی خود را وارد کنید"
                  className={`w-full h-11 pr-10 pl-3 rounded-xl border text-xs focus:outline-hidden ${
                    currentUser.isFullNameLocked
                      ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed font-medium'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500'
                  }`}
                  required
                />
                {currentUser.isFullNameLocked ? (
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                ) : (
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                )}
              </div>
              {currentUser.isFullNameLocked ? (
                <p className="text-[10px] text-slate-400 mt-1">نام و نام خانوادگی ثبت و به دلایل امنیتی قفل گردیده است.</p>
              ) : (
                <p className="text-[10px] text-amber-500 mt-1">توجه: پس از ثبت، نام و نام خانوادگی برای همیشه قفل و غیرقابل تغییر خواهد شد.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                نام کاربری (غیرقابل تغییر)
              </label>
              <input
                type="text"
                value={currentUser.username}
                disabled
                dir="ltr"
                className="w-full h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            {/* Note: Phone field ("شماره موبایل") completely removed as requested */}

            {/* 16-digit Bank Card Number field */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                شماره کارت بانکی (جهت واریز جوایز و تسویه)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => { if (!isCardLocked) setCardNumber(formatCardNumber(toEnDigits(e.target.value))); }}
                  disabled={isCardLocked}
                  placeholder="۶۰۳۷۹۹................"
                  dir="ltr"
                  maxLength={19}
                  className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono tracking-widest focus:outline-hidden focus:border-emerald-500 text-slate-900 dark:text-white"
                />
                {isCardLocked ? <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" /> : <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />}
              </div>
              {isCardLocked ? (
                <p className="text-[10px] text-slate-400 mt-1">شماره کارت ثبت و به دلایل امنیتی قفل گردیده است.</p>
              ) : (
                <p className="text-[10px] text-amber-500 mt-1">توجه: شماره کارت باید به نام خود شما باشد و پس از ذخیره برای همیشه قفل می‌شود.</p>
              )}
            </div>

            {/* IBAN field: permanently locked and uneditable once saved */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>شماره شبا بانکی (جهت واریز جوایز و تسویه)</span>
                {currentUser.iban ? (
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    قفل شده (غیرقابل تغییر)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">۲۴ رقم بدون IR</span>
                )}
              </label>

              {currentUser.iban ? (
                <div className="relative">
                  <div className="w-full h-11 pr-10 pl-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between select-none" dir="ltr">
                    <span className="font-bold">{currentUser.iban}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      ثبت و قفل شده
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                  <p className="text-[10px] text-slate-400 mt-1">شماره شبا ثبت گردیده و به دلایل امنیتی غیرقابل تغییر یا حذف است.</p>
                </div>
              ) : (
                <div>
                  <div className="relative flex items-center" dir="ltr">
                    <div className="h-11 px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono font-bold text-xs flex items-center rounded-l-xl border-y border-l border-slate-300 dark:border-slate-600 select-none">
                      IR
                    </div>
                    <input
                      type="text"
                      value={ibanDigits}
                      onChange={(e) => {
                        const val = toEnDigits(e.target.value).replace(/\D/g, '').slice(0, 24);
                        setIbanDigits(val);
                      }}
                      placeholder="000000000000000000000000 (۲۴ رقم)"
                      maxLength={24}
                      className="flex-1 h-11 px-3 rounded-r-xl bg-slate-50 dark:bg-slate-800 border-y border-r border-slate-200 dark:border-slate-700 text-xs font-mono tracking-wider focus:outline-hidden focus:border-emerald-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-amber-500 mt-1">توجه: پس از ذخیره، شماره شبا برای همیشه قفل و غیرقابل ویرایش خواهد شد.</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              ذخیره تغییرات مشخصات
            </button>
          </form>

          {/* CHANGE PASSWORD CARD (تغییر رمز عبور) */}
          <form 
            onSubmit={handlePasswordChange}
            className="bg-white dark:bg-[#151d2a] rounded-[24px] p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-3.5"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <KeyRound className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white">تغییر رمز عبور حساب</h3>
            </div>

            {passwordFeedback && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                passwordFeedback.status === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                {passwordFeedback.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                رمز عبور فعلی
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="رمز عبور فعلی خود را وارد کنید"
                dir="ltr"
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  رمز عبور جدید
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="حداقل ۳ کاراکتر"
                  dir="ltr"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  تکرار رمز عبور جدید
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز جدید"
                  dir="ltr"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              به‌روزرسانی رمز عبور
            </button>
          </form>

          {/* ========================================================
              SOUND EFFECTS SETTINGS CARD (جلوه‌های صوتی)
              - Toggle Switch for UI sound effects ON / OFF
              - Volume Slider ("میزان صدای افکت‌ها")
              - Persistence in localStorage (soundEnabled and soundVolume)
              ======================================================== */}
          <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">جلوه‌های صوتی (UI Audio Feedback)</h3>
                  <p className="text-[11px] text-slate-400">تنظیم صدای لمس دکمه‌ها، کارت‌ها و انتخاب‌های شش پره</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestSound}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="پخش آزمایشی صدای لمس"
              >
                <span>تست صدا</span>
              </button>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  افکت‌های صوتی
                </span>
                <span className="text-[11px] text-slate-400">
                  {soundEnabled ? 'فعال (پخش صدای لمس ملایم)' : 'غیرفعال (حالت بی‌صدا)'}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                onClick={handleToggleSound}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  soundEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Slider */}
            <div className={`space-y-1.5 transition-opacity ${soundEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  میزان صدای افکت‌ها
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(soundVolume * 100)}
                onChange={handleVolumeChange}
                disabled={!soundEnabled}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* HAPTIC FEEDBACK SETTINGS (لرزش لمسی) */}
          <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Vibrate className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">لرزش لمسی (Haptic Feedback)</h3>
                  <p className="text-[11px] text-slate-400">لرزش ملایم هنگام لمس دکمه‌ها و انتخاب اسب‌ها</p>
                </div>
              </div>
              <button type="button" onClick={() => haptics.tap(true)} className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                تست لرزش
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">لرزش لمسی</span>
                <span className="text-[11px] text-slate-400">
                  {hapticOn ? 'فعال' : 'غیرفعال'}{!haptics.isSupported() ? ' — دستگاه یا مرورگر شما از لرزش پشتیبانی نمی‌کند' : ''}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hapticOn}
                onClick={() => { const n = !hapticOn; haptics.setEnabled(n); setHapticOn(n); if (n) haptics.tap(true); }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${hapticOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${hapticOn ? '-translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className={`space-y-1.5 transition-opacity ${hapticOn ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">شدت لرزش</span>
              <div className="grid grid-cols-3 gap-2">
                {HAPTIC_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => { haptics.setMs(lvl.ms); setHapticMs(lvl.ms); haptics.tap(true); }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${hapticMs === lvl.ms ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                  >
                    {lvl.label}
                    <span className="block font-mono text-[10px] opacity-80">{lvl.ms}ms</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================
              GLASSMORPHISM NAVIGATION BAR SETTINGS CARD (نویگیشن‌بار شیشه‌ای)
              - User Profile Toggle Switch to Enable / Disable bottom navigation bar
              - Instantly saves preference in store & storage
              ======================================================== */}
          <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">نوار ناوبری شیشه‌ای (نویگیشن‌بار شیشه‌ای)</h3>
                <p className="text-[11px] text-slate-400">کنترل نمایش نوار دسترسی سریع بلورین در پایین صفحات با تطبیق تم روز و شب</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  نمایش نوار شیشه‌ای پایین صفحه
                </span>
                <span className="text-[11px] text-slate-400">
                  {navBarEnabled ? 'فعال (نوار ناوبری شیشه‌ای در پایین صفحه نمایش داده می‌شود)' : 'غیرفعال (نوار ناوبری مخفی می‌باشد)'}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={navBarEnabled}
                onClick={handleToggleNavBar}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  navBarEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    navBarEnabled ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ========================================================
              SECTION 5.2: MANDATORY ACCOUNT DELETION FEATURE
              - Warning card with a red button "حذف حساب کاربری" (Delete Account)
              - Triggers Persian confirmation dialog modal
              - Upon confirmation, invokes deleteAccount API, wipes session, does logout
              ======================================================== */}
          <div className="bg-red-500/5 dark:bg-red-500/10 rounded-[24px] p-5 border border-red-500/20 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>ناحیه حساس: حذف دائم حساب کاربری</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed selectable-text">
              با حذف حساب کاربری، تمام سوابق فرم‌های پیش‌بینی، موجودی کیف پول و مشخصات هویتی شما برای همیشه از سامانه پاک شده و غیرقابل بازگشت خواهد بود.
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف حساب کاربری</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: User Prediction Slips */}
      {activeTab === 'ledger' && (
        <div className="space-y-2.5">
          {userTxs.length === 0 ? (
            <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-8 text-center border border-slate-100 dark:border-slate-800">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">گردش مالی ثبت نشده است.</p>
            </div>
          ) : (
            userTxs.map((tx) => (
              <div 
                key={tx.id}
                className="bg-white dark:bg-[#151d2a] rounded-[20px] p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {tx.type === 'deposit' ? 'شارژ حساب (درگاه بانکی)' : tx.type === 'withdraw' ? 'برداشت به حساب شبا' : 'هزینه ثبت فرم شش پره'}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      tx.status === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : tx.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {tx.status === 'approved' ? 'موفق' : tx.status === 'pending' ? 'در انتظار بررسی' : 'ناموفق'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1.5 flex-wrap">
                    <span>{tx.date}</span>
                    <span>·</span>
                    <span>شناسه رسید:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyTxTrackingCode(tx.trackingCode)}
                      className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="جهت کپی شناسه رسید کلیک کنید"
                    >
                      <span>{tx.trackingCode}</span>
                      {copiedTxCode === tx.trackingCode ? (
                        <span className="text-[9px] text-emerald-500 font-sans font-bold flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          کپی شد
                        </span>
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-400/60 hover:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-left font-mono font-bold text-sm tabular-nums">
                  <span className={tx.type === 'deposit' || tx.type === 'prediction_win' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}>
                    {tx.type === 'deposit' || tx.type === 'prediction_win' ? '+' : '-'}
                    {tx.amountTomans.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[10px] text-slate-400 mr-1 font-normal">ت</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Dialog Modal for Account Deletion */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-2xl border border-red-500/30 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              آیا از حذف حساب کاربری خود اطمینان دارید؟
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              این عملیات غیرقابل بازگشت است. موجودی کیف پول شما و تمام سوابق فرم‌های فعال بلافاصله پاک خواهند شد.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all"
              >
                بله، حساب من را حذف کن
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification when Numeric ID is copied */}
      {copiedId && (
        <div 
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white border border-emerald-500/50 px-4 py-2 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
          dir="rtl"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
          <span>شناسه کپی شد</span>
        </div>
      )}

    </div>
  );
};
