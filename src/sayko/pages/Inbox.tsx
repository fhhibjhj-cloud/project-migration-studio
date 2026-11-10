// @ts-nocheck
import { evaluateSlipCourses } from '../lib/evaluate';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail, 
  Check, 
  X, 
  Clock, 
  Trophy, 
  FileText,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  Lock,
  Copy,
  ChevronDown
} from 'lucide-react';
import { store, PredictionSlip, Course, Transaction } from '../lib/store';
import { sound } from '../lib/audio';

interface InboxProps {
  onBackToHome?: () => void;
  onNavigateToAdmin?: () => void;
}

type FilterTab = 'pending' | 'won' | 'failed';
type ItemTypeFilter = 'all' | 'tx' | 'receipt';

// Persian numerals conversion helper
function toEnglishDigits(str: string): string {
  const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[۰-۹]/g, (w) => String(faDigits.indexOf(w)));
}

// Converts Jalali year, month, day to Gregorian Date
function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  jy += 1595;
  let days = -355668 + (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (; gm < 13 && days >= sal_a[gm]; gm++) days -= sal_a[gm];
  const gd = days + 1;
  return new Date(gy, gm - 1, gd);
}

// Resolves Persian day of week (شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه)
function getPersianDayOfWeek(dateStr?: string, timestamp?: number): string {
  if (timestamp && !isNaN(timestamp) && timestamp > 0) {
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(d);
      }
    } catch {}
  }
  if (dateStr) {
    try {
      const normalized = toEnglishDigits(dateStr);
      const match = normalized.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (match) {
        const jy = parseInt(match[1], 10);
        const jm = parseInt(match[2], 10);
        const jd = parseInt(match[3], 10);
        const gDate = jalaliToGregorian(jy, jm, jd);
        return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(gDate);
      }
    } catch {}
  }
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(new Date());
}

// Formats date string with Persian day of week (e.g., "سه‌شنبه ۱۴۰۴/۰۶/۱۸ ۱۴:۳۳")
function formatDateWithPersianDay(dateStr?: string, timestamp?: number): string {
  const cleanDate = dateStr || '۱۴۰۴/۰۶/۱۸ ۱۴:۳۳';
  const day = getPersianDayOfWeek(dateStr, timestamp);
  const persianDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'پنجشنبه', 'جمعه'];
  const alreadyHasDay = persianDays.some(d => cleanDate.includes(d));
  if (alreadyHasDay) return cleanDate;
  return `${day} ${cleanDate}`;
}

export const Inbox: React.FC<InboxProps> = ({ onBackToHome, onNavigateToAdmin }) => {
  const [predictions, setPredictions] = useState<PredictionSlip[]>(store.predictions);
  const [courses, setCourses] = useState<Course[]>(store.activeWeek.courses);
  const [transactions, setTransactions] = useState<Transaction[]>(store.transactions);

  // Active filter tab: 'pending' (Tab 1) | 'won' (Tab 2) | 'failed' (Tab 3)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('pending');
  // Item type filter: 'all' (همه) | 'tx' (تراکنش) | 'receipt' (رسید)
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all');
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState<boolean>(false);

  const [cancelSlipModal, setCancelSlipModal] = useState<PredictionSlip | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyTrackingCode = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      sound.playClick();
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    }).catch(() => {});
  };

  // Real-time subscription to central store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setPredictions([...store.predictions]);
      setCourses([...store.activeWeek.courses]);
      setTransactions([...store.transactions]);
    });
    return unsubscribe;
  }, []);

  // Evaluation engine for any ticket
  const evaluateSlip = (slip: PredictionSlip) => {
    const selectedCourseNumbers = Object.keys(slip.selections)
      .map(Number)
      .filter((n) => (slip.selections[n] || []).length > 0)
      .sort((a, b) => a - b);

    const activeCourseNums = selectedCourseNumbers.length > 0
      ? selectedCourseNumbers
      : (slip.selections[1] !== undefined ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6]);

    const result = evaluateSlipCourses(slip, courses, store.activeWeek.id);
    const rowByNum = new Map(result.rows.map(r => [r.courseNum, r]));
    const failedCourseIds: string[] = [];
    let hasFailedCourse = false;
    let hasPendingCourse = false;

    const rows = activeCourseNums.map((cNum) => {
      const primaryChoices = slip.selections[cNum] || [];
      const replacementChoices = slip.replacementSelections?.[cNum] || [];
      const r = rowByNum.get(cNum);
      const status: 'passed' | 'failed' | 'pending' = r?.status || 'pending';
      if (status === 'failed') { hasFailedCourse = true; failedCourseIds.push(`C${cNum}`); }
      if (status === 'pending') hasPendingCourse = true;
      const srcCourses = (slip.snapshotCourses && slip.snapshotCourses.length ? slip.snapshotCourses : courses) as Course[];
      const course = srcCourses.find((c: any) => c.number === cNum) || (srcCourses as any[])[cNum - 1];
      const scratched = new Set<number>((course?.horses || []).filter((h: any) => h.isScratched).map((h: any) => h.number));
      return {
        courseNum: cNum,
        primaryChoices,
        replacementChoices,
        scratched,
        substituteActivated: !!r?.substituteActivated,
        courseIdStr: `C${cNum}`,
        primaryStr: primaryChoices.length > 0 ? `[${primaryChoices.join('.')}]` : '[-]',
        replacementStr: replacementChoices.length > 0
          ? `(${replacementChoices.join('.')})${r?.substituteActivated ? ' ✓' : ''}`
          : '(-)',
        winner: r?.winner ?? undefined,
        status,
      };
    });
    const allCoursesPassed = !hasFailedCourse && !hasPendingCourse;

    // Overall State Classification:
    // Tab 3: "شکست" (Failed) -> At least one failed course or slip marked lost
    // Tab 2: "موفقیت" (Won) -> All courses passed and won
    // Tab 1: "انتظار" (Pending) -> Incomplete course evaluation
    let state: FilterTab = 'pending';
    if (hasFailedCourse || slip.status === 'lost') {
      state = 'failed';
    } else if (allCoursesPassed && !hasPendingCourse && slip.status === 'won') {
      state = 'won';
    } else {
      state = 'pending';
    }

    return {
      rows,
      state,
      failedCourseIds,
      hasPending: hasPendingCourse || state === 'pending',
    };
  };

  // Evaluate slips in store (Persistent retention: all user receipts are kept permanently)
  const evaluatedSlips = useMemo(() => {
    const currentUserId = store.currentUser?.id;
    if (!currentUserId) return [];

    return predictions
      .filter((slip) => slip.userId === currentUserId)
      .map((slip) => {
        const evalData = evaluateSlip(slip);
        return {
          slip,
          ...evalData,
        };
      });
  }, [predictions, courses]);

  // Filter user's deposit & refund transactions strictly by current user
  const userDeposits = useMemo(() => {
    const uid = store.currentUser?.id;
    if (!uid) return [];
    return transactions.filter((t) => (t.type === 'deposit' || t.type === 'refund' || t.type === 'withdraw') && t.userId === uid);
  }, [transactions]);

  // Counts for each filter tab badge (dynamically scoped by typeFilter)
  const counts = useMemo(() => {
    const res = { pending: 0, won: 0, failed: 0 };
    if (typeFilter === 'all' || typeFilter === 'receipt') {
      evaluatedSlips.forEach((item) => {
        if (item.state === 'pending') res.pending += 1;
        else if (item.state === 'won') res.won += 1;
        else if (item.state === 'failed') res.failed += 1;
      });
    }

    if (typeFilter === 'all' || typeFilter === 'tx') {
      userDeposits.forEach((dep) => {
        if (dep.status === 'pending') res.pending += 1;
        else if (dep.status === 'approved') res.won += 1;
        else if (dep.status === 'rejected') res.failed += 1;
      });
    }

    return res;
  }, [evaluatedSlips, userDeposits, typeFilter]);

  // Filtered and sorted chronologically from NEWEST to OLDEST (latest submitted at top)
  const filteredSlips = useMemo(() => {
    if (typeFilter === 'tx') return [];
    return evaluatedSlips
      .filter((item) => item.state === activeFilter)
      .sort((a, b) => {
        const timeA = a.slip.createdAtTimestamp || 0;
        const timeB = b.slip.createdAtTimestamp || 0;
        return timeB - timeA;
      });
  }, [evaluatedSlips, activeFilter, typeFilter]);

  // Filtered deposit notices corresponding to active tab
  const filteredDeposits = useMemo(() => {
    if (typeFilter === 'receipt') return [];
    if (activeFilter === 'pending') return userDeposits.filter((d) => d.status === 'pending');
    if (activeFilter === 'won') return userDeposits.filter((d) => d.status === 'approved');
    if (activeFilter === 'failed') return userDeposits.filter((d) => d.status === 'rejected');
    return [];
  }, [userDeposits, activeFilter, typeFilter]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex-1 w-full py-4 px-3 sm:px-4 bg-gradient-to-b from-[#e8f1fc] via-[#edf4fd] to-[#dbe9f9] dark:from-[#07111e] dark:via-[#0a1526] dark:to-[#07101c] flex flex-col items-center justify-start select-none transition-colors duration-200 pb-12">
      
      {/* ========================================================
          1 & 2. REAL-TIME STATUS FILTERING TABS & COMPACT TYPE FILTER
          - Right Side: Compact "فیلتر" button with dropdown menu («همه»، «تراکنش»، «رسید»)
          - Left Side: Real-time filter tabs ("انتظار", "موفقیت", "شکست")
          ======================================================== */}
      <div 
        className="w-full max-w-sm sm:max-w-md mb-4 p-2 rounded-2xl bg-white/85 dark:bg-[#0c1626]/85 border border-slate-200/90 dark:border-[#1e2f47] backdrop-blur-md shadow-xs flex items-center justify-between gap-1.5 relative z-20"
        dir="rtl"
      >
        {/* RIGHT SIDE: Compact Filter Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsTypeFilterOpen((prev) => !prev);
            }}
            className="flex items-center gap-1.5 h-8 sm:h-8.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-black transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80 select-none active:scale-95"
            title="فیلتر نوع آیتم‌ها (همه، تراکنش، رسید)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>فیلتر</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40">
              {typeFilter === 'all' ? 'همه' : typeFilter === 'tx' ? 'تراکنش' : 'رسید'}
            </span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isTypeFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU */}
          {isTypeFilterOpen && (
            <>
              {/* Click-outside backdrop */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsTypeFilterOpen(false)} 
              />
              
              <div 
                className="absolute right-0 top-full mt-1.5 w-36 py-1.5 bg-white dark:bg-[#0f1b2d] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/80 z-40 animate-in fade-in zoom-in-95 duration-150"
                dir="rtl"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  نمایش بر اساس:
                </div>

                {/* Option 1: «همه» (All) */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTypeFilter('all');
                    setIsTypeFilterOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-right flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                    typeFilter === 'all' 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>همه</span>
                  {typeFilter === 'all' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2.5]" />}
                </button>

                {/* Option 2: «تراکنش» (Transactions) */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTypeFilter('tx');
                    setIsTypeFilterOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-right flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                    typeFilter === 'tx' 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>تراکنش</span>
                  {typeFilter === 'tx' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2.5]" />}
                </button>

                {/* Option 3: «رسید» (Receipts) */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTypeFilter('receipt');
                    setIsTypeFilterOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-right flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                    typeFilter === 'receipt' 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>رسید</span>
                  {typeFilter === 'receipt' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[2.5]" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* LEFT SIDE: Filter Tabs (انتظار | موفقیت | شکست) - Uniform Capsule Style */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          
          {/* Tab 1: "انتظار" (Pending) */}
          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveFilter('pending'); }}
            className={`min-w-[66px] sm:min-w-[76px] h-8 sm:h-8.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 select-none ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="برگه‌های در حال بررسی که ارزیابی کورس‌های آن‌ها هنوز کامل نشده است"
          >
            <span>انتظار</span>
            {counts.pending > 0 && (
              <span className={`text-[10px] min-w-[16px] h-4 px-1 rounded-full font-mono font-bold flex items-center justify-center leading-none ${
                activeFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {counts.pending.toLocaleString('fa-IR')}
              </span>
            )}
          </button>

          {/* Tab 2: "موفقیت" (Won) */}
          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveFilter('won'); }}
            className={`min-w-[66px] sm:min-w-[76px] h-8 sm:h-8.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 select-none ${
              activeFilter === 'won'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="برگه‌های موفق که تمامی کورس‌ها را درست حدس زده‌اند"
          >
            <span>موفقیت</span>
            {counts.won > 0 && (
              <span className={`text-[10px] min-w-[16px] h-4 px-1 rounded-full font-mono font-bold flex items-center justify-center leading-none ${
                activeFilter === 'won' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {counts.won.toLocaleString('fa-IR')}
              </span>
            )}
          </button>

          {/* Tab 3: "شکست" (Failed) */}
          <button
            type="button"
            onClick={() => { sound.playClick(); setActiveFilter('failed'); }}
            className={`min-w-[66px] sm:min-w-[76px] h-8 sm:h-8.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 select-none ${
              activeFilter === 'failed'
                ? 'bg-red-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="برگه‌های ناموفق که در یک یا چند کورس باخته‌اند"
          >
            <span>شکست</span>
            {counts.failed > 0 && (
              <span className={`text-[10px] min-w-[16px] h-4 px-1 rounded-full font-mono font-bold flex items-center justify-center leading-none ${
                activeFilter === 'failed' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {counts.failed.toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          3. DYNAMIC STACKED VERTICAL LIST OF ALL MATCHING RECEIPTS
          - Sorted chronologically from NEWEST to OLDEST (latest at top)
          - No hardcoded demo pills ("رسید ۱", "رسید ۲", etc.)
          ======================================================== */}
      {/* ========================================================
          3. DYNAMIC STACKED VERTICAL LIST OF ALL MATCHING NOTICES & RECEIPTS
          - Sorted chronologically from NEWEST to OLDEST (latest at top)
          - Shows Deposit Tracking notices ("افزایش اعتبار") & Prediction slips
          ======================================================== */}
      {(filteredSlips.length > 0 || filteredDeposits.length > 0) ? (
        <div className="w-full flex flex-col items-center space-y-4">
          
          {/* DEPOSIT & REFUND NOTICES SECTION */}
          {filteredDeposits.map((dep) => {
            const isRefund = dep.type === 'refund' || dep.trackingCode?.startsWith('REF') || dep.id.includes('ref') || dep.title?.includes('برگشت');
            return (
              <div 
                key={dep.id}
                className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-[#0c1626]/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-[0_20px_45px_-10px_rgba(37,99,235,0.14),0_10px_20px_-5px_rgba(0,0,0,0.06)] border border-sky-100/90 dark:border-[#1e2f47] transition-all"
                dir="rtl"
              >
                {/* Transaction Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isRefund ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    }`}>
                      {isRefund ? <RotateCcw className="w-4 h-4 stroke-[2.2]" /> : <Wallet className="w-4 h-4 stroke-[2.2]" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {isRefund ? (dep.title || 'تراکنش / برگشت') : dep.type === 'withdraw' ? 'برداشت از موجودی' : 'افزایش اعتبار'}
                      </h3>
                      <span className="text-[10.5px] text-slate-400 font-mono">
                        {formatDateWithPersianDay(dep.date, dep.id.startsWith('tx_') ? parseInt(dep.id.replace('tx_', ''), 10) : undefined)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    isRefund
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : dep.status === 'pending'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : dep.status === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}>
                    {isRefund ? 'برگشت واریز شد' : dep.status === 'pending' ? 'در حال بررسی' : dep.status === 'approved' ? 'تایید شد' : 'رد شد'}
                  </span>
                </div>

                {/* Transaction Body Info */}
                <div className="my-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isRefund ? 'مبلغ برگشت به کیف پول:' : 'مبلغ درخواست:'}
                    </span>
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {dep.type === 'withdraw' ? '-' : '+'}{dep.amountTomans.toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-400 px-1">
                    <span className="font-medium text-slate-400 dark:text-slate-400">شناسه رسید:</span>
                    {(() => {
                      const code = dep.trackingCode || (dep.id.startsWith('ID_') ? dep.id : `ID_${dep.id.replace(/\D/g, '').slice(-4) || '8890'}`);
                      const isCopied = copiedId === code;
                      return (
                        <button
                          type="button"
                          onClick={(e) => handleCopyTrackingCode(code, e)}
                          className="font-mono font-medium text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer select-none group"
                          title="جهت کپی شناسه رسید کلیک کنید"
                        >
                          <span>{code}</span>
                          {isCopied ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500 font-sans font-bold animate-in fade-in duration-150">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              کپی شد
                            </span>
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400/60 group-hover:text-slate-400 transition-opacity" />
                          )}
                        </button>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
                    <span>شناسه کاربر:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{dep.userNumericId || store.currentUser?.numericId || 10842}</span>
                  </div>
                </div>

                {/* Explanation Note */}
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {isRefund
                    ? (dep.description || `برگشت ${store.refundRate} درصد مبلغ پرداختی شما برای ثبت رسید به شما برگشت داده شد`)
                    : dep.status === 'pending'
                    ? 'درخواست افزایش اعتبار شما در سیستم ثبت شده و در حال بررسی توسط پشتیبان مالی است.'
                    : dep.status === 'approved'
                    ? 'درخواست افزایش اعتبار شما توسط مدیریت تایید و مبلغ به موجودی کیف پول واریز گردید.'
                    : 'درخواست افزایش اعتبار توسط مدیریت تایید نگردید. جهت پیگیری با پشتیبانی در تماس باشید.'}
                </p>
              </div>
            );
          })}

          {/* PREDICTION SLIPS SECTION */}
          {filteredSlips.map(({ slip, rows, state, failedCourseIds, hasPending }) => (
            <div 
              key={slip.id}
              className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-[#0c1626]/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-[0_20px_45px_-10px_rgba(37,99,235,0.14),0_10px_20px_-5px_rgba(0,0,0,0.06)] border border-blue-100/90 dark:border-[#1e2f47] transition-all"
              dir="ltr"
            >
              {/* 1. RECEIPT CARD HEADER ROW */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                {/* Left: Timestamp with Persian Day */}
                <span className="text-xs sm:text-[13px] font-mono font-medium text-slate-400 dark:text-slate-400 tracking-wide">
                  {formatDateWithPersianDay(slip.submittedAt, slip.createdAtTimestamp)}
                </span>

                {/* Right: Blue message icon badge + Title "رسید شش پره" */}
                <div className="flex items-center gap-2" dir="rtl">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Mail className="w-4 h-4 text-white stroke-[2.2]" />
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    رسید شش پره
                  </h2>
                </div>
              </div>

              {/* 1. CONFIRMATION SUB-HEADER */}
              <div className="text-center my-4" dir="rtl">
                <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white tracking-tight">
                  رسید شما به مبلغ {slip.totalCostTomans.toLocaleString('fa-IR')} تومان ثبت شد
                </h3>
              </div>

              {/* 2. COURSE MATRIX ROWS FORMATTING */}
              <div className="space-y-3.5 my-4 divide-y divide-slate-50 dark:divide-slate-800/40">
                {rows.map((row) => (
                  <div 
                    key={row.courseNum}
                    className="pt-3.5 first:pt-0 flex items-center justify-between text-sm sm:text-base"
                  >
                    {/* Left side: [Course ID] • [Primary Choices] • (Replacement Choices) */}
                    <div className="flex items-center gap-2.5 sm:gap-3.5 font-sans">
                      <span className="font-bold text-[#2563EB] dark:text-[#3B82F6] min-w-[28px] text-sm sm:text-base">
                        {row.courseIdStr}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-black text-xs select-none">
                        •
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white tracking-wider text-sm sm:text-base">
                        [{row.primaryChoices.length === 0 ? '-' : row.primaryChoices.map((n: number, i: number) => (
                          <React.Fragment key={n}>{i > 0 && '.'}<span className={row.scratched.has(n) ? 'text-red-500 line-through decoration-2' : ''}>{n}</span></React.Fragment>
                        ))}]
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-black text-xs select-none">
                        •
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 tracking-wide text-sm sm:text-base">
                        ({row.replacementChoices.length === 0 ? '-' : row.replacementChoices.join('.')})
                        {row.substituteActivated && <RotateCcw className="inline w-4 h-4 mr-1 text-blue-500 stroke-[2.6]" />}
                      </span>
                    </div>

                    {/* Right side: [Status Icon] */}
                    <div className="flex items-center justify-center shrink-0 min-w-[28px]">
                      {row.status === 'passed' && (
                        <div className="text-[#10B981] dark:text-[#00E676] animate-in zoom-in-75 duration-200">
                          <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                        </div>
                      )}

                      {row.status === 'failed' && (
                        <div className="text-[#EF4444] animate-in zoom-in-75 duration-200">
                          <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                        </div>
                      )}

                      {row.status === 'pending' && (
                        <div className="text-slate-300 dark:text-slate-600">
                          <Clock className="w-4 h-4 text-amber-400/80 stroke-[2.2]" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* STATUS CONTAINERS */}
              {state === 'failed' && (
                <div 
                  className="mt-5 rounded-2xl p-4 transition-all"
                  style={{
                    backgroundColor: 'var(--broken-bg, #F5E5E8)',
                    border: '1.5px solid var(--broken-border, #F7B1B1)',
                  }}
                  dir="rtl"
                >
                  <style>{`
                    :root {
                      --broken-bg: #F5E5E8;
                      --broken-border: #F7B1B1;
                    }
                    .dark {
                      --broken-bg: #280610;
                      --broken-border: #5C0A1C;
                    }
                  `}</style>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                      <X className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3] text-[#EF4444]" />
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-black text-[#EF4444] tracking-tight">
                        برگه شما شکسته شد
                      </h4>
                      <p className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-red-200/90 mt-0.5">
                        در کورس {failedCourseIds.length > 0 ? failedCourseIds.join('، ') : 'C3'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const amt = slip.refundedAmountTomans || (slip.isRefunded ? Math.round(slip.totalCostTomans * 0.2) : 0);
                    if (!(slip.totalCostTomans > 99000 && amt > 0)) return null;
                    return (
                      <div className="mt-2.5 pt-2.5 border-t border-red-200/60 dark:border-red-900/40 flex items-center justify-between text-xs font-bold">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">+{amt.toLocaleString('fa-IR')}</span>
                        <span className="text-emerald-700 dark:text-emerald-300">۱۵٪ هزینه ثبت برگه برگشت داده شد</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {state === 'won' && (() => {
                const winAmount = slip.payoutTomans && slip.payoutTomans > 0
                  ? slip.payoutTomans
                  : (store.customWinningPrize || 23000000);
                const formattedWinAmount = winAmount.toLocaleString('fa-IR');

                return (
                  <div 
                    className="mt-5 rounded-2xl p-4 bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500/30 dark:border-emerald-600/50 shadow-md shadow-emerald-500/5 transition-all space-y-3"
                    dir="rtl"
                  >
                    {/* Top Row: Trophy Icon 🏆 + Status Text "برنده" */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                          برنده
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                        واریز مستقیم
                      </span>
                    </div>

                    {/* Main Winning Amount with "+" sign in green */}
                    <div className="text-center py-1">
                      <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight drop-shadow-xs">
                        +{formattedWinAmount} تومان
                      </div>
                    </div>

                    {/* Subtext: "تبریک! مبلغ [Winning Amount] به حساب شما اضافه شد" */}
                    <div className="text-center pt-2 border-t border-emerald-500/20 dark:border-emerald-500/30">
                      <p className="text-xs sm:text-[13px] font-extrabold text-emerald-800 dark:text-emerald-200">
                        تبریک! مبلغ {formattedWinAmount} تومان به حساب شما اضافه شد
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* TICKET RECEIPT CARD FOOTER */}
              {(() => {
                const isRaceLocked = store.isRaceSubmissionLocked() || slip.isResultFinalized;
                return (
                  <div className="w-full flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 px-1" dir="rtl">
                    {/* Right Side: Slip tracking identifier (شناسه رسید) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-400 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-400">شناسه رسید:</span>
                      {(() => {
                        const code = slip.id.startsWith('ID_') ? slip.id : `ID_${slip.id.replace(/\D/g, '').slice(-4) || '8890'}`;
                        const isCopied = copiedId === code;
                        return (
                          <button
                            type="button"
                            onClick={(e) => handleCopyTrackingCode(code, e)}
                            className="font-mono font-medium text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer select-none group"
                            title="جهت کپی شناسه رسید کلیک کنید"
                          >
                            <span>{code}</span>
                            {isCopied ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500 font-sans font-bold animate-in fade-in duration-150">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                کپی شد
                              </span>
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400/60 group-hover:text-slate-400 transition-opacity" />
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Left Side: "ابطال رسید" Button with lock/disable logic */}
                    <div>
                      {isRaceLocked ? (
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs border border-slate-200 dark:border-slate-700/80 flex items-center gap-1.5 cursor-not-allowed select-none opacity-80"
                          title="زمان ثبت مسابقه به پایان رسیده و این رسید قفل شده است"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>ابطال رسید (قفل شده)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { sound.playClick(); setCancelSlipModal(slip); }}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="ابطال رسید و بازگشت آنی وجه به کیف پول"
                        >
                          <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>ابطال رسید</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="w-full max-w-sm sm:max-w-md bg-white/90 dark:bg-[#0c1626]/90 backdrop-blur-md rounded-3xl p-8 text-center border border-blue-100/80 dark:border-[#1e2f47] shadow-sm my-4">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">
            موردی در این وضعیت یافت نشد
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {typeFilter === 'tx'
              ? (activeFilter === 'pending' ? 'هیچ تراکنش افزایش اعتباری در انتظار بررسی نیست.' : activeFilter === 'won' ? 'هیچ تراکنش افزایش اعتبار تاییدشده‌ای ثبت نشده است.' : 'هیچ تراکنش ردشده‌ای یافت نشد.')
              : typeFilter === 'receipt'
              ? (activeFilter === 'pending' ? 'در حال حاضر هیچ برگه مسابقه‌ای در انتظار بررسی نیست.' : activeFilter === 'won' ? 'هنوز برگه برنده مسابقه‌ای ثبت نشده است.' : 'هیچ برگه مسابقه باخته‌ای یافت نشد.')
              : (activeFilter === 'pending' ? 'در حال حاضر هیچ برگه یا درخواست شارژی در انتظار بررسی نیست.' : activeFilter === 'won' ? 'هنوز برگه برنده یا واریز تاییدشده‌ای ثبت نشده است.' : 'هیچ برگه شکست‌خورده یا تراکنش ردشده‌ای یافت نشد.')
            }
          </p>
        </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancelSlipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f1b2d] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">لغو برگه و عودت وجه</h3>
                <p className="text-[11px] text-slate-400 font-mono">شناسه: {cancelSlipModal.id}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">مبلغ بازگشتی به کیف پول:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  +{cancelSlipModal.totalCostTomans.toLocaleString('fa-IR')} تومان
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                با لغو برگه، این رسید باطل شده و مبلغ آن فوراً به موجودی حساب شما افزوده خواهد شد.
              </p>
            </div>

            {cancelFeedback && (
              <div className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                cancelFeedback.success ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'
              }`}>
                {cancelFeedback.message}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCancelSlipModal(null);
                  setCancelFeedback(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playSuccess();
                  const res = store.cancelPredictionSlip(cancelSlipModal.id);
                  if (res.success) {
                    setCancelFeedback({ success: true, message: 'برگه با موفقیت لغو شد و وجه عودت داده شد.' });
                    setTimeout(() => {
                      setCancelSlipModal(null);
                      setCancelFeedback(null);
                    }, 1200);
                  } else {
                    sound.playAlert();
                    setCancelFeedback({ success: false, message: res.message });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                تأیید لغو و بازگشت وجه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
