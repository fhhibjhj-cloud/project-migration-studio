// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, CreditCard, Wallet, ShieldCheck, CheckCircle2, AlertCircle, Lock, AlertTriangle, Copy, ShieldAlert, User, ArrowLeft } from 'lucide-react';
import { store, UserProfile } from '../lib/store';
import { formatInputAmount, formatSmartAmountFa } from '../lib/format';
import { sound } from '../lib/audio';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
  currentUser: UserProfile | null;
  onRequireAuth: () => void;
  onNavigateToAccount?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  type,
  currentUser,
  onRequireAuth,
  onNavigateToAccount,
}) => {
  // Pre-set amounts: ۱۰۰,۰۰۰ / ۲۰۰,۰۰۰ / ۵۰۰,۰۰۰ / ۱,۰۰۰,۰۰۰ / ۲,۰۰۰,۰۰۰ / ۵,۰۰۰,۰۰۰ تومان
  const quickAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];

  // ALL HOOKS MUST BE DECLARED UNCONDITIONALLY AT THE VERY TOP
  const [amount, setAmount] = useState<number>(100000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('۱۰۰,۰۰۰');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(100000);
  const [ibanDigits, setIbanDigits] = useState<string>('');
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);
  const [lastTxTrackingCode, setLastTxTrackingCode] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      sound.playSuccess();
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  // Synchronize state whenever modal opens or active user changes
  useEffect(() => {
    try {
      if (isOpen) {
        setAmount(100000);
        setCustomAmountStr('۱۰۰,۰۰۰');
        setSelectedQuick(100000);
        const existingIban = currentUser?.iban || '';
        if (existingIban.startsWith('IR')) {
          setIbanDigits(existingIban.substring(2));
        } else {
          setIbanDigits(existingIban);
        }
        setFeedback(null);
        setShowWithdrawSuccessModal(false);
        setWithdrawSuccessMsg('');
      }
    } catch (err) {
      console.warn('WalletModal reset error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle clicking a pre-set amount button
  const handleSelectQuick = (val: number) => {
    try {
      sound.playClick();
      setSelectedQuick(val);
      setAmount(val);
      setCustomAmountStr(val.toLocaleString('fa-IR'));
      setFeedback(null);
    } catch (err) {
      console.warn('handleSelectQuick error:', err);
    }
  };

  // Handle typing manually in custom amount input with 3-digit comma separation
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const rawInput = e.target.value;
      const { raw, formatted } = formatInputAmount(rawInput);
      
      setAmount(raw);
      setCustomAmountStr(formatted);
      setSelectedQuick(quickAmounts.includes(raw) ? raw : null);
      setFeedback(null);
    } catch (err) {
      console.warn('handleCustomChange error:', err);
    }
  };

  // Check profile completion for withdrawal
  const profileCheck = useMemo(() => {
    if (type !== 'withdraw' || !currentUser) {
      return { isValid: true, missingFields: [], message: '' };
    }
    return store.validateProfileForWithdrawal(currentUser);
  }, [type, currentUser]);

  const handleExecuteWithdrawalConfirmed = () => {
    setIsWithdrawConfirmOpen(false);
    if (!amount || amount < 100000) {
      setFeedback({ status: 'error', message: 'حداقل مبلغ برداشت ۱۰۰,۰۰۰ تومان میباشد' });
      sound.playAlert();
      return;
    }

    const check = store.validateProfileForWithdrawal(currentUser);
    if (!check.isValid) {
      setFeedback({ status: 'error', message: check.message });
      sound.playAlert();
      return;
    }

    let targetIban = currentUser?.iban || '';
    if (!targetIban || targetIban.length < 10) {
      const cleanDigits = ibanDigits.trim().replace(/\D/g, '');
      targetIban = 'IR' + cleanDigits;
      store.updateProfile({ iban: targetIban });
    }

    const res = store.requestWithdrawal(amount, targetIban);
    if (res && res.success) {
      setLastTxTrackingCode(res.tx?.trackingCode || ('WTH-' + Math.floor(100000 + Math.random() * 900000)));
      setWithdrawSuccessMsg('درخواست شما ثبت شد، در چند روز آینده مبلغ درخواستی به کارت شما واریز خواهد شد');
      setShowWithdrawSuccessModal(true);
      sound.playSuccess();
    } else {
      setFeedback({ status: 'error', message: res?.message || 'خطا در ثبت درخواست برداشت.' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      sound.playClick();
      setFeedback(null);

      if (!amount || amount <= 0) {
        setFeedback({ status: 'error', message: 'لطفاً مبلغ مورد نظر را وارد نمایید.' });
        return;
      }

      if (!currentUser || currentUser.isGuest) {
        onRequireAuth();
        return;
      }

      if (type === 'deposit') {
        if (!amount || amount < 100000) {
          setFeedback({ status: 'error', message: 'حداقل مبلغ شارژ حساب ۱۰۰,۰۰۰ تومان میباشد' });
          sound.playAlert();
          return;
        }
        const persianDate = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const currentTime = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
        const numericId = currentUser?.numericId || 10842;
        const formattedAmount = `${amount.toLocaleString('fa-IR')} تومان`;

        const telegramText = `درخواست افزایش اعتبار

مبلغ : ${formattedAmount}
شناسه کاربر : ${numericId}
تاریخ : ${persianDate}
ساعت درخواست : ${currentTime}


نکته ۱ : درصورت ارسال رسید فیک، یا هرگونه مشکوک بودن رسید ارسالی، حساب شما به صورت دائم مسدود خواهد شد

نکته ۲: هرگونه ویرایش یا تغییر اطلاعات در این پیام، عواقب آن نظیر شارژ اشتباه حساب، رد شدن درخوست، به عهده خود کاربر ویرایش دهنده خواهد بود و «سایکو» هیچ مسوولیتی در قبال این موضوع ندارد`;

        // 1. Copy to clipboard
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(telegramText).catch(() => {});
          }
        } catch (clipErr) {
          console.warn('Clipboard write error:', clipErr);
        }

        // 2. Register transaction in store and Supabase
        const res = store.requestDeposit(amount);

        // 3. Open Telegram deep-link
        const telegramUrl = `https://t.me/SAYKODELIVER?text=${encodeURIComponent(telegramText)}`;
        try {
          window.open(telegramUrl, '_blank');
        } catch (winErr) {
          console.warn('Window open error:', winErr);
        }

        if (res && res.success) {
          setFeedback({ 
            status: 'success', 
            message: 'درخواست افزایش اعتبار ثبت شد و به پشتیبانی تلگرام متصل شدید. متن درخواست نیز در کلیپ‌بورد کپی شد.' 
          });
          setTimeout(() => {
            onClose();
          }, 2200);
        } else {
          setFeedback({ status: 'error', message: res?.message || 'خطا در ثبت درخواست واریز.' });
        }
      } else {
        // WITHDRAWAL FLOW
        const check = store.validateProfileForWithdrawal(currentUser);
        if (!check.isValid) {
          setFeedback({ status: 'error', message: check.message });
          sound.playAlert();
          return;
        }

        const withdrawStatus = store.getWithdrawalStatus();
        if (!withdrawStatus.allowed) {
          setFeedback({
            status: 'error',
            message: withdrawStatus.reason || 'تسویه بسته هست. تسویه حساب فقط از روز شنبه تا چهارشنبه امکانپذیر است.',
          });
          sound.playAlert();
          return;
        }

        // Strict Minimum Withdrawal Limit: 100,000 Tomans
        if (!amount || amount < 100000) {
          setFeedback({ status: 'error', message: 'حداقل مبلغ برداشت ۱۰۰,۰۰۰ تومان میباشد' });
          sound.playAlert();
          return;
        }

        const currentBal = currentUser?.balanceTomans ?? 0;
        if (amount > currentBal) {
          setFeedback({ status: 'error', message: 'موجودی شما کمتر از مبلغ درخواستی است' });
          sound.playAlert();
          return;
        }

        let targetIban = currentUser?.iban || '';
        if (!targetIban || targetIban.length < 10) {
          const cleanDigits = ibanDigits.trim().replace(/\D/g, '');
          if (cleanDigits.length < 24) {
            setFeedback({ status: 'error', message: 'لطفاً شماره شبای ۲۴ رقمی را به صورت کامل پس از IR وارد نمایید.' });
            sound.playAlert();
            return;
          }
        }

        // Open withdrawal confirmation dialog (Requirement 1.3)
        sound.playClick();
        setIsWithdrawConfirmOpen(true);
      }
    } catch (submitErr) {
      console.warn('handleSubmit unexpected error in WalletModal:', submitErr);
      setFeedback({ status: 'error', message: 'خطای غیرمنتظره. لطفاً مجدداً تلاش نمایید.' });
    }
  };

  // IF NOT OPEN, RETURN NOTHING SAFELY AFTER ALL HOOKS HAVE BEEN EXECUTED
  if (!isOpen) return null;

  // IF USER IS NOT LOGGED IN OR IS GUEST, RENDER AUTH REQUIRED PROMPT MODAL
  if (!currentUser || currentUser.isGuest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" dir="rtl">
        <div 
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 text-center shadow-2xl border border-slate-200 dark:border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">نیاز به ورود به حساب</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
            برای انجام تراکنش‌های مالی و مدیریت موجودی کیف پول، ابتدا باید وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { sound.playClick(); onClose(); onRequireAuth(); }}
              className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20"
            >
              ورود / ثبت‌نام
            </button>
            <button
              onClick={() => { sound.playClick(); onClose(); }}
              className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    );
  }

  // IF WITHDRAWAL REQUESTED BUT PROFILE IS INCOMPLETE, SHOW PROMINENT WARNING & GUIDANCE VIEW
  if (type === 'withdraw' && !profileCheck.isValid) {
    const isNameValid = Boolean(currentUser.fullName && currentUser.fullName.trim().length >= 3 && currentUser.fullName !== 'کاربر مهمان');
    const isCardValid = (currentUser.cardNumber || '').replace(/\D/g, '').length === 16;
    const isIbanValid = (currentUser.iban || '').replace(/[^0-9]/g, '').length === 24;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" dir="rtl">
        <div 
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center mb-3 border border-rose-500/20">
            <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
          </div>

          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white text-center mb-1">
            تکمیل مشخصات حساب کاربری الزامی است
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 leading-relaxed px-2">
            جهت ثبت هرگونه درخواست تسویه و واریز وجه، باید اطلاعات هویتی و بانکی شما به صورت کامل ثبت و تایید شده باشد.
          </p>

          {/* Checklist of required items */}
          <div className="space-y-2.5 mb-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
            {/* 1. Full Name */}
            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">نام و نام خانوادگی:</span>
              </div>
              {isNameValid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentUser.fullName}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>ثبت نشده (الزامی)</span>
                </span>
              )}
            </div>

            {/* 2. Bank Card Number */}
            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">شماره کارت بانکی:</span>
              </div>
              {isCardValid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono" dir="ltr">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentUser.cardNumber}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>۱۶ رقم ثبت نشده (الزامی)</span>
                </span>
              )}
            </div>

            {/* 3. IBAN / Sheba */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">شماره شبا بانکی (IR):</span>
              </div>
              {isIbanValid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono" dir="ltr">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentUser.iban}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>۲۴ رقم ثبت نشده (الزامی)</span>
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl mb-5 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed text-right flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              طبق قوانین سیستم بانکی، واریز وجه منحصراً به حسابی انجام می‌گیرد که نام و نام خانوادگی، شماره کارت و شماره شبای آن یکسان و متعلق به صاحب حساب کاربری باشد.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
                if (onNavigateToAccount) {
                  onNavigateToAccount();
                }
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>تکمیل اطلاعات در حساب کاربری</span>
            </button>
            <button
              type="button"
              onClick={() => { sound.playClick(); onClose(); }}
              className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDepositValid = amount >= 100000;
  const isWithdrawValid = amount >= 100000 && amount <= (currentUser.balanceTomans ?? 0);
  const currentBalanceSafe = currentUser.balanceTomans ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" dir="rtl">
        <div 
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              type === 'deposit' 
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50' 
                : 'bg-emerald-500 text-white'
            }`}>
              {type === 'deposit' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {type === 'deposit' ? 'افزایش موجودی حساب' : 'برداشت از موجودی (تسویه)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                موجودی حساب شما: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{currentBalanceSafe.toLocaleString('fa-IR')} تومان</span>
              </p>
            </div>
          </div>

          {feedback && (
            <div className={`mb-4 p-3 rounded-2xl text-xs flex items-center gap-2 ${
              feedback.status === 'success' 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}>
              {feedback.status === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Minimum Deposit Notice Banner (Requirement 2) */}
          {type === 'deposit' && (
            <div className="mb-3 p-2.5 rounded-2xl text-xs flex items-center justify-between border bg-sky-50 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-800/40 text-sky-800 dark:text-sky-300">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <span>حداقل مبلغ شارژ حساب:</span>
              </div>
              <span className="font-bold text-[11px] font-mono text-sky-700 dark:text-sky-300">
                ۱۰۰,۰۰۰ تومان
              </span>
            </div>
          )}

          {/* Minimum Withdrawal Notice Banner */}
          {type === 'withdraw' && (
            <div className="mb-3 p-2.5 rounded-2xl text-xs flex items-center justify-between border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>حداقل مبلغ برداشت:</span>
              </div>
              <span className="font-bold text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                ۱۰۰,۰۰۰ تومان
              </span>
            </div>
          )}

          {type === 'withdraw' && (
            <div className={`mb-3 p-2.5 rounded-2xl text-xs flex items-center justify-between border ${
              store.getWithdrawalStatus().allowed
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>برنامه تسویه حساب:</span>
              </div>
              <span className="font-bold text-[11px]">
                {store.getWithdrawalStatus().allowed
                  ? 'شنبه تا چهارشنبه (فعال)'
                  : store.getWithdrawalStatus().reason}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pre-set amount buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                مبالغ پیش‌فرض (تومان):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((q) => {
                  const isSelected = selectedQuick === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSelectQuick(q)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-500/40'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {q.toLocaleString('fa-IR')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount input field with automatic 3-digit comma separation */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                مبلغ دلخواه (تومان):
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customAmountStr}
                  onChange={handleCustomChange}
                  placeholder="حداقل ۱۰۰,۰۰۰ تومان..."
                  className="w-full h-12 pr-4 pl-14 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-base font-black text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
                <span className="absolute left-3.5 top-3.5 text-xs text-slate-400 font-medium">تومان</span>
              </div>
              {amount > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  مبلغ انتخابی: <strong className="text-slate-700 dark:text-slate-200">{formatSmartAmountFa(amount)}</strong>
                </p>
              )}
              {type === 'deposit' && amount > 0 && amount < 100000 && (
                <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>حداقل مبلغ شارژ حساب ۱۰۰,۰۰۰ تومان میباشد</span>
                </p>
              )}
              {type === 'withdraw' && amount > 0 && amount < 100000 && (
                <p className="text-[11px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>حداقل مبلغ برداشت ۱۰۰,۰۰۰ تومان میباشد</span>
                </p>
              )}
            </div>

            {type === 'withdraw' && (
              <div className="space-y-3">
                {/* 1. Orange Status Indicator if withdrawal is currently closed */}
                {!store.getWithdrawalStatus().allowed && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/50 text-amber-800 dark:text-amber-300 space-y-1 text-right">
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>تسویه بسته هست</span>
                    </div>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-relaxed pr-6">
                      {store.getWithdrawalStatus().reason || 'امکان تسویه و برداشت وجه در حال حاضر غیرفعال است.'}
                    </p>
                  </div>
                )}

                {/* 2. Fixed IBAN field */}
                {currentUser?.iban && currentUser.iban.length >= 10 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        شماره شبا مقصد ثبت‌شده:
                      </label>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Lock className="w-3 h-3" />
                        قفل و ذخیره شده
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={currentUser.iban}
                        readOnly
                        disabled
                        dir="ltr"
                        className="w-full h-11 pr-3 pl-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider uppercase text-slate-800 dark:text-slate-200 cursor-not-allowed select-all"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                    <p className="text-[10px] text-slate-400">شماره شبا به دلایل امنیتی برای همیشه قفل و غیرقابل تغییر یا حذف است.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      شماره شبا مقصد (IR):
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:border-emerald-500" dir="ltr">
                      <span className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-mono font-black text-sm select-none border-r border-slate-300 dark:border-slate-600">
                        IR
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ibanDigits}
                        maxLength={24}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 24);
                          setIbanDigits(val);
                        }}
                        placeholder="000000000000000000000000"
                        dir="ltr"
                        className="flex-1 h-11 px-3 bg-transparent font-mono text-sm tracking-wider text-slate-900 dark:text-white focus:outline-none"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">توجه: پس از ثبت اولیه، شماره شبا برای همیشه قفل و غیرقابل تغییر خواهد شد.</p>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Pay/Withdraw action button */}
            <div className="pt-2">
              {type === 'deposit' ? (
                <button
                  type="submit"
                  disabled={!isDepositValid}
                  className={`w-full h-12 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    !isDepositValid
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white shadow-sky-600/20 cursor-pointer'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>
                    {amount > 0
                      ? `ادامه مراحل افزایش اعتبار (${formatSmartAmountFa(amount)})`
                      : 'ادامه مراحل افزایش اعتبار'}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isWithdrawValid || !store.getWithdrawalStatus().allowed}
                  className={`w-full h-12 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    !isWithdrawValid || !store.getWithdrawalStatus().allowed
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-[#10B981] hover:bg-emerald-600 active:scale-[0.99] text-white shadow-emerald-500/20 cursor-pointer'
                  }`}
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>
                    {!store.getWithdrawalStatus().allowed
                      ? 'تسویه بسته هست'
                      : amount > 0
                      ? `ثبت درخواست واریز به حساب (${formatSmartAmountFa(amount)})`
                      : 'مبلغ مورد نظر را وارد نمایید'}
                  </span>
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>تضمین امنیتی و تسویه فوری سامانه سایکو</span>
          </div>
        </div>
      </div>

            {/* WITHDRAWAL CONFIRMATION DIALOG (Requirement 1.3) */}
      {isWithdrawConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              تأیید درخواست برداشت وجه
            </h3>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">مبلغ برداشت:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                  {formatSmartAmountFa(amount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-right">
                این مبلغ بلافاصله از موجودی در دسترس شما کسر خواهد شد و پس از بررسی واحد مالی، واریز بانکی ثبت و نهایی می‌گردد. در صورت رد، وجه به کیف پول عودت داده می‌شود.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsWithdrawConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleExecuteWithdrawalConfirmed}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                تأیید و کسر از موجودی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP MODAL FOR WITHDRAWAL WITH COPY BUTTONS (Requirement 1.2) */}
      {showWithdrawSuccessModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150" dir="rtl">
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              عملیات با موفقیت انجام شد
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {withdrawSuccessMsg}
            </p>

            {/* Copyable Details Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs space-y-2 text-right">
              {/* Tracking Code with Copy */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">کد پیگیری:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{lastTxTrackingCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(lastTxTrackingCode, 'tracking')}
                    className="p-1 rounded-md text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer flex items-center gap-0.5 text-[10px]"
                    title="کپی کد پیگیری"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === 'tracking' ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>

              {/* User ID with Copy */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">شناسه کاربر:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">#{currentUser?.numericId || 10842}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(currentUser?.numericId || 10842), 'userId')}
                    className="p-1 rounded-md text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer flex items-center gap-0.5 text-[10px]"
                    title="کپی شناسه کاربر"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === 'userId' ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowWithdrawSuccessModal(false);
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};