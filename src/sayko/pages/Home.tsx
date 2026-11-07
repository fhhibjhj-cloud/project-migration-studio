// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  LayoutGrid, 
  Radio, 
  Headphones, 
  User, 
  Wallet, 
  ArrowUp, 
  ChevronDown, 
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { store, UserProfile, PredictionWeek } from '../lib/store';
import { sound } from '../lib/audio';

interface HomeProps {
  currentUser: UserProfile | null;
  activeWeek: PredictionWeek;
  onNavigateToShishPar: () => void;
  onNavigateToAccount: () => void;
  onNavigateToPoll: () => void;
  onNavigateToAdmin?: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenLiveStream: () => void;
  onOpenSupport: () => void;
  onOpenAuth: () => void;
}

export const Home: React.FC<HomeProps> = ({
  currentUser,
  activeWeek,
  onNavigateToShishPar,
  onNavigateToAccount,
  onNavigateToPoll,
  onNavigateToAdmin,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenLiveStream,
  onOpenSupport,
  onOpenAuth,
}) => {
  // Real-time Countdown calculation for Card 1
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 2, hours: 14, minutes: 28, seconds: 45 });

  useEffect(() => {
    const calculateTime = () => {
      const diff = Math.max(0, activeWeek.countdownEndTimestamp - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [activeWeek.countdownEndTimestamp]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 space-y-3.5 pb-6 gpu-layer">

      {/* ========================================================
          CARD 1: Race Status & Countdown (کارت مسابقه)
          Outer Card: Rounded white container (border-radius: 24px)
          Top Header: Green dot + "در حال برگزاری" + subtitle
          Countdown: 4 horizontally arranged capsules (روز، ساعت، دقیقه، ثانیه)
          ======================================================== */}
      <section 
        className="bg-white dark:bg-[#151d2a] rounded-[24px] p-5 shadow-xs border border-slate-100 dark:border-slate-800/80 transition-all hover:shadow-md"
        aria-label="وضعیت مسابقه و زمان باقی‌مانده"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Top Header (Right Aligned in RTL) */}
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                زمان باقی مانده ثبت برگه
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
              {' — '}
              {new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}
            </span>
          </div>

          {/* Countdown Section (Left Aligned in RTL, horizontally arranged 4 capsules) */}
          <div className="flex items-center justify-center sm:justify-end gap-2 direction-ltr" dir="ltr">
            {/* روز */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-xs">
                <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">روز</span>
            </div>

            <span className="text-slate-300 dark:text-slate-600 font-bold -mt-4">:</span>

            {/* ساعت */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-xs">
                <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">ساعت</span>
            </div>

            <span className="text-slate-300 dark:text-slate-600 font-bold -mt-4">:</span>

            {/* دقیقه */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-xs">
                <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">دقیقه</span>
            </div>

            <span className="text-slate-300 dark:text-slate-600 font-bold -mt-4">:</span>

            {/* ثانیه */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
                <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">ثانیه</span>
            </div>
          </div>

        </div>
      </section>


      {/* ========================================================
          CARD 2: Main Feature Card (شش پره)
          Large white feature card (border-radius: 24px)
          Centered 4-square green grid icon (<svg>) at top,
          bold heading "شش پره", inner pill container with subtext "پیشبینی مسابقات اسبدوانی"
          ======================================================== */}
      <section
        onClick={() => { sound.playClick(); onNavigateToShishPar(); }}
        className="group relative cursor-pointer bg-white dark:bg-[#151d2a] rounded-[24px] p-7 shadow-xs border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-lg transition-all duration-200 flex flex-col items-center text-center overflow-hidden"
        role="button"
        tabIndex={0}
        aria-label="ورود به داشبورد پیش‌بینی شش پره"
      >
        {/* Subtle background glow */}
        <div className="absolute -top-12 inset-x-0 h-28 bg-emerald-500/10 dark:bg-emerald-500/5 blur-2xl pointer-events-none" />

        {/* Centered 4-square green grid icon (<svg>) at top */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round text-[#10B981]"
          >
            <rect width="7" height="7" x="3" y="3" rx="2" />
            <rect width="7" height="7" x="14" y="3" rx="2" />
            <rect width="7" height="7" x="14" y="14" rx="2" />
            <rect width="7" height="7" x="3" y="14" rx="2" />
          </svg>
        </div>

        {/* Bold heading "شش پره" */}
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          شش پره
        </h2>

        {/* Inner pill container with subtext "پیشبینی مسابقات اسبدوانی" */}
        <div className="rounded-full px-5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold tracking-wide border border-slate-200/60 dark:border-slate-700/60 shadow-2xs group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-colors">
          پیش‌بینی مسابقات اسب‌دوانی
        </div>

        {/* Pool Stat preview badge */}
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span>صندوق کل جایزه:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {activeWeek.totalPoolTomans.toLocaleString('fa-IR')} تومان
          </span>
        </div>
      </section>


      {/* ========================================================
          CARD 3: Two-Column Quick Actions (پخش زنده & پشتیبانی)
          Equal width 2-column grid:
          Left Card: "پخش زنده" - soft light-pink/purple border outline,
                     subtle light-pink gradient background tint,
                     circular pink live pulse icon badge, title "پخش زنده",
                     subtext "تماشای مسابقات به‌صورت زنده"
          Right Card: "پشتیبانی" - soft light-blue background tint,
                      circular blue headset icon badge, title "پشتیبانی",
                      subtext "ارتباط با تیم پشتیبانی"
          ======================================================== */}
      <section className="grid grid-cols-2 gap-3">
        
        {/* Left Card ("پخش زنده") */}
        <div
          onClick={() => { sound.playClick(); onOpenLiveStream(); }}
          className="group cursor-pointer rounded-[24px] p-4 border border-pink-200/80 dark:border-pink-900/40 bg-gradient-to-br from-pink-50/80 via-white to-pink-50/30 dark:from-pink-950/20 dark:via-slate-900 dark:to-pink-950/10 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-pink-500 text-white">
              HD
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              پخش زنده
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              تماشای مسابقات به‌صورت زنده
            </p>
          </div>
        </div>

        {/* Right Card ("پشتیبانی") */}
        <div
          onClick={() => { sound.playClick(); onOpenSupport(); }}
          className="group cursor-pointer rounded-[24px] p-4 border border-sky-200/80 dark:border-sky-900/40 bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 dark:from-sky-950/20 dark:via-slate-900 dark:to-sky-950/10 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              پشتیبانی
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              ارتباط با تیم پشتیبانی
            </p>
          </div>
        </div>

      </section>


      {/* ========================================================
          CARD 4: Side-by-Side Dual Widget: "حساب کاربری" & "نظرسنجی" (Requirement 1)
          Placing User Account and Poll widgets side-by-side cleanly
          ======================================================== */}
      <section className="grid grid-cols-2 gap-3" aria-label="بخش حساب کاربری و نظرسنجی">
        
        {/* Right Widget (RTL): User Account (حساب کاربری) */}
        <div
          onClick={() => { sound.playClick(); onNavigateToAccount(); }}
          className="group cursor-pointer bg-white dark:bg-[#151d2a] rounded-[22px] p-3.5 sm:p-4 shadow-xs border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#10B981] flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/40">
              <User className="w-5 h-5" />
            </div>
            <div className="text-slate-400 group-hover:text-emerald-500 group-hover:-translate-x-1 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              حساب کاربری
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {currentUser && !currentUser.isGuest 
                ? (currentUser.fullName || `@${currentUser.username}`)
                : 'مشاهده مشخصات'}
            </p>
          </div>
        </div>

        {/* Left Widget (RTL): Poll/Survey (نظرسنجی شش پره) */}
        <div
          onClick={() => { sound.playClick(); onNavigateToPoll(); }}
          className="group cursor-pointer bg-white dark:bg-[#151d2a] rounded-[22px] p-3.5 sm:p-4 shadow-xs border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="text-slate-400 group-hover:text-amber-500 group-hover:-translate-x-1 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors flex items-center gap-1">
              <span>نظرسنجی</span>
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              پیش‌بینی شانس اسب‌ها
            </p>
          </div>
        </div>

      </section>


      {/* ========================================================
          CARD 6: Bottom Dual Action Buttons (افزایش موجودی & برداشت موجودی)
          Right Button: "افزایش موجودی" - soft light-blue card with upward arrow icon (^),
                        text "افزایش موجودی", and credit card icon
          Left Button: "برداشت موجودی" - solid vibrant green background fill (#10B981),
                       bold white text "برداشت موجودی" with dropdown arrow (v),
                       and wallet icon
          ======================================================== */}
      <section className="grid grid-cols-2 gap-3 pt-1">
        
        {/* Left Button ("برداشت موجودی") - In RTL this renders on left side */}
        <button
          onClick={() => { sound.playClick(); onOpenWithdraw(); }}
          className="h-14 rounded-2xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-between px-4"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 shrink-0" />
            <span className="font-extrabold text-sm tracking-tight">برداشت موجودی</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-80" />
        </button>

        {/* Right Button ("افزایش موجودی") - In RTL this renders on right side */}
        <button
          onClick={() => { sound.playClick(); onOpenDeposit(); }}
          className="h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 font-bold text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-between px-4"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="font-extrabold text-sm tracking-tight">افزایش موجودی</span>
          </div>
          <ArrowUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </button>

      </section>

      {/* ========================================================
          CARD 5: Static Informative Balance Display Box (فقط نمایشی)
          Requirement 1: Strictly static/informative, clicking does nothing, displays balance clearly
          ======================================================== */}
      <section
        className="bg-white dark:bg-[#151d2a] rounded-[22px] p-4 shadow-xs border border-slate-100 dark:border-slate-800/80 select-none cursor-default"
        aria-label="موجودی کیف پول (فقط نمایشی)"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  موجودی کیف پول شما
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                موجودی در دسترس جهت ثبت برگه در مسابقات
              </p>
            </div>
          </div>

          <div className="text-left font-mono">
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums block">
              {(currentUser?.balanceTomans ?? 0).toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">تومان</span>
          </div>
        </div>
      </section>

      {/* Guest Mode helper note if in guest mode */}
      {currentUser?.isGuest && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <span>شما در حالت مهمان هستید. برای ثبت فرم و تراکنش ثبت‌نام کنید.</span>
          <button 
            onClick={onOpenAuth}
            className="px-3 py-1 bg-amber-500 text-white rounded-xl font-bold text-[11px]"
          >
            ثبت‌نام
          </button>
        </div>
      )}

    </div>
  );
};
