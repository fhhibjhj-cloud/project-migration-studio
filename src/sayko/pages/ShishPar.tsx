// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Wallet, 
  Coins, 
  ChevronDown, 
  Trophy, 
  Ticket,
  Lock,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { store, PredictionWeek, UserProfile, Horse, PredictionSlip } from '../lib/store';
import { sound } from '../lib/audio';
import { JockeySilkIcon } from '../components/JockeySilkIcon';
import { SixPrConfirmationModal } from '../components/SixPrConfirmationModal';

export type HorseSelectionType = 'primary' | 'reserve';

interface ShishParProps {
  activeWeek: PredictionWeek;
  currentUser: UserProfile | null;
  onBackToHome: () => void;
  onNavigateToInbox?: () => void;
  onOpenAuth: () => void;
  onOpenDeposit: () => void;
}

// ========================================================
// MEMOIZED JOCKEY SILK BADGE (Zero Re-render on cell clicks)
// ========================================================
const JockeySilkBadge = React.memo<{ rowNum: number }>(({ rowNum }) => (
  <div className="w-6 sm:w-7 shrink-0 h-full flex items-center justify-center pointer-events-none">
    <JockeySilkIcon number={rowNum} className="h-full max-h-[22px] w-auto max-w-[24px]" />
  </div>
));
JockeySilkBadge.displayName = 'JockeySilkBadge';

// ========================================================
// MEMOIZED HORSE CELL (Ultra-smooth 60FPS, renders ONLY clicked cell)
// ========================================================
interface HorseCellProps {
  horse?: Horse;
  courseNumber: number;
  rowNum: number;
  selectionState?: HorseSelectionType;
  isLocked?: boolean;
  onToggle: (courseNumber: number, horse: Horse) => void;
}

const areHorseCellPropsEqual = (prev: HorseCellProps, next: HorseCellProps): boolean => {
  return (
    prev.selectionState === next.selectionState &&
    prev.courseNumber === next.courseNumber &&
    prev.rowNum === next.rowNum &&
    prev.isLocked === next.isLocked &&
    prev.horse?.id === next.horse?.id &&
    prev.horse?.isScratched === next.horse?.isScratched &&
    prev.onToggle === next.onToggle
  );
};

// Helper to format horse name sizing (medium names full without ellipsis, extreme names truncated)
export const formatHorseNameDisplay = (rawName: string) => {
  const name = (rawName || '').trim();
  const len = name.length;
  if (len <= 8) {
    return { text: name, fontClass: 'text-[10px] sm:text-[11px] md:text-[11.5px] font-extrabold' };
  } else if (len <= 14) {
    return { text: name, fontClass: 'text-[8.5px] sm:text-[9.5px] md:text-[10px] font-bold tracking-tighter' };
  } else {
    return { text: `${name.slice(0, 12)}...`, fontClass: 'text-[8px] sm:text-[9px] md:text-[9.5px] font-bold tracking-tight' };
  }
};

export const HorseCell = React.memo<HorseCellProps>(
  ({ horse, courseNumber, selectionState, isLocked, onToggle }) => {
    // 1. EMPTY SLOT CAPSULE
    if (!horse) {
      return (
        <div
          className="flex-1 min-w-0 h-full max-h-[26px] min-h-[16px] rounded-full border border-dashed border-[#d2e4f7] dark:border-[#1c2c42] bg-[#edf4fc]/40 dark:bg-[#030b14]/50 pointer-events-none"
          style={{ borderRadius: '9999px' }}
        />
      );
    }

    const handleClick = () => {
      onToggle(courseNumber, horse);
    };
    const { text: displayName, fontClass } = formatHorseNameDisplay(horse.name);

    // Common ellipsis text style for clean truncation without letter/dot clipping
    const textEllipsisStyle: React.CSSProperties = {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      direction: 'rtl',
      lineHeight: 1.25,
      touchAction: 'manipulation',
    };

    // 2. LOCKED COURSE CAPSULE
    if (isLocked) {
      return (
        <button
          type="button"
          onClick={handleClick}
          style={{ borderRadius: '9999px', padding: '0 6px' }}
          className="horse-capsule-cell flex-1 min-w-0 h-full max-h-[26px] min-h-[16px] rounded-full border flex items-center justify-center cursor-not-allowed overflow-hidden bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60"
          title={`${horse.name} (کورس بسته شد)`}
        >
          <span className={`w-full text-center block pointer-events-none ${fontClass}`} style={textEllipsisStyle}>{displayName}</span>
        </button>
      );
    }

    // 3. SCRATCHED / WITHDRAWN HORSE CAPSULE
    if (horse.isScratched) {
      return (
        <button
          type="button"
          onClick={handleClick}
          style={{ borderRadius: '9999px', padding: '0 6px' }}
          className="horse-capsule-cell flex-1 min-w-0 h-full max-h-[26px] min-h-[16px] rounded-full border flex items-center justify-center cursor-not-allowed overflow-hidden bg-[#F5E5E8] dark:bg-[#280610] border-[#F7B1B1] dark:border-[#5C0A1C] text-[#C94141] dark:text-[#AB273F]"
          title="اسب حذفی"
        >
          <span className={`w-full text-center block line-through decoration-[#C94141] dark:decoration-[#AB273F] decoration-2 pointer-events-none ${fontClass}`} style={textEllipsisStyle}>{displayName}</span>
        </button>
      );
    }

    // 3. 1ST CLICK -> SELECTED PRIMARY (Solid Vibrant Green #00E676 / #10B981)
    if (selectionState === 'primary') {
      return (
        <button
          type="button"
          onClick={handleClick}
          style={{ borderRadius: '9999px', padding: '0 6px' }}
          className="horse-capsule-cell flex-1 min-w-0 h-full max-h-[26px] min-h-[16px] rounded-full flex items-center justify-center cursor-pointer overflow-hidden bg-[#00E676] dark:bg-[#00E676] border border-[#00C853] text-[#000000]"
          title={`${horse.name} (انتخاب اول - اصلی)`}
        >
          <span className={`w-full text-center block pointer-events-none text-[#000000] ${fontClass}`} style={textEllipsisStyle}>{displayName}</span>
        </button>
      );
    }

    // 4. 2ND CLICK -> REPLACEMENT / RESERVE HORSE (Solid Blue #3B82F6 / #2563EB with SOLID WHITE #FFFFFF text)
    if (selectionState === 'reserve') {
      return (
        <button
          type="button"
          onClick={handleClick}
          style={{ borderRadius: '9999px', padding: '0 6px' }}
          className="horse-capsule-cell flex-1 min-w-0 h-full max-h-[26px] min-h-[16px] rounded-full flex items-center justify-center cursor-pointer overflow-hidden bg-[#2563EB] dark:bg-[#3B82F6] border border-[#1D4ED8] dark:border-[#60A5FA] text-[#FFFFFF]"
          title={`${horse.name} (انتخاب دوم - رزرو)`}
        >
          <span className={`w-full text-center block text-white pointer-events-none ${fontClass}`} style={textEllipsisStyle}>{displayName}</span>
        </button>
      );
    }

    // 5. 3RD CLICK / NORMAL UNSELECTED HORSE CAPSULE
    return (
      <button
        type="button"
        onClick={handleClick}
        style={{ borderRadius: '9999px', padding: '0 6px' }}
        className="horse-capsule-cell flex-1 min-w-0 h-full max-h-[26px] min-h-[16px] rounded-full flex items-center justify-center cursor-pointer overflow-hidden bg-[#F9FAFE] dark:bg-[#091523] border border-[#EBEFF8] dark:border-[#293952] text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-slate-600"
        title={horse.name}
      >
        <span className={`w-full text-center block pointer-events-none text-slate-800 dark:text-white ${fontClass}`} style={textEllipsisStyle}>{displayName}</span>
      </button>
    );
  },
  areHorseCellPropsEqual
);
HorseCell.displayName = 'HorseCell';

// ========================================================
// MAIN SHISHPAR COMPONENT
// ========================================================
export const ShishPar: React.FC<ShishParProps> = ({
  activeWeek,
  currentUser,
  onBackToHome,
  onNavigateToInbox,
  onOpenAuth,
  onOpenDeposit,
}) => {
  // Game Mode: 'shishpar' (courses 1-6) or 'panjpar' (courses 2-6)
  const [gameMode, setGameMode] = useState<'shishpar' | 'panjpar'>(activeWeek.type || 'shishpar');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Six-Pr Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundRate, setRefundRate] = useState<number>(store.refundRate);

  useEffect(() => {
    return store.subscribe(() => {
      setRefundRate(store.refundRate);
    });
  }, []);

  // Three-stage selections state:
  // { [courseNumber: number]: { [horseNumber: number]: 'primary' | 'reserve' } }
  // Initialized empty so 0 horses selected displays 0, and updates on VERY FIRST click
  const [horseSelections, setHorseSelections] = useState<{
    [courseNumber: number]: { [horseNumber: number]: HorseSelectionType };
  }>({});

  // Animated Floating Toast Notification State (Auto-dismisses after EXACTLY 3 seconds, manual close)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }, []);

  const handleCloseToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToastMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const [submissionSuccessModal, setSubmissionSuccessModal] = useState<PredictionSlip | null>(null);

  // Close mode dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Real-time digital countdown (e.g. ۱ ۰۶:۵۹:۳۷)
  const [countdownText, setCountdownText] = useState('۱ ۰۶:۵۹:۳۷');

  useEffect(() => {
    const updateCountdown = () => {
      if (activeWeek.isShishParEnabled === false) {
        setCountdownText('۰۰:۰۰:۰۰');
        return;
      }
      const diff = Math.max(0, activeWeek.countdownEndTimestamp - Date.now());
      if (diff === 0) {
        setCountdownText('۰۰:۰۰:۰۰');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const toFa = (num: number) => num.toLocaleString('fa-IR');
      const padFa = (num: number) => num.toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });

      if (days > 0) {
        setCountdownText(`${toFa(days)} ${padFa(hours)}:${padFa(minutes)}:${padFa(seconds)}`);
      } else {
        setCountdownText(`${padFa(hours)}:${padFa(minutes)}:${padFa(seconds)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeWeek.countdownEndTimestamp, activeWeek.isShishParEnabled]);

  // Check if active race day has 7 courses configured
  const has7Courses = useMemo(() => {
    return activeWeek.courses.some((c) => c.number === 7 && c.horses.length > 0);
  }, [activeWeek.courses]);

  // All courses to display in the main matrix (Courses 1 to 7 when 7 exist, or 1 to 6)
  const displayCourses = useMemo(() => {
    if (has7Courses) {
      return activeWeek.courses.filter((c) => c.number >= 1 && c.number <= 7).sort((a, b) => a.number - b.number);
    }
    return activeWeek.courses.filter((c) => c.number >= 1 && c.number <= 6).sort((a, b) => a.number - b.number);
  }, [activeWeek.courses, has7Courses]);

  // Active Courses depending on Game Mode and 7-Course Structure:
  // When 7 courses exist:
  //   - ShishPar: covers Course 2 to Course 7 (کورس ۲ تا ۷)
  //   - PanjPar: covers Course 3 to Course 7 (کورس ۳ تا ۷)
  // When 6 courses exist:
  //   - ShishPar: covers Course 1 to Course 6 (کورس ۱ تا ۶)
  //   - PanjPar: covers Course 2 to Course 6 (کورس ۲ تا ۶)
  const activeCourses = useMemo(() => {
    if (has7Courses) {
      if (gameMode === 'panjpar') {
        return activeWeek.courses.filter((c) => c.number >= 3 && c.number <= 7).sort((a, b) => a.number - b.number);
      }
      return activeWeek.courses.filter((c) => c.number >= 2 && c.number <= 7).sort((a, b) => a.number - b.number);
    } else {
      if (gameMode === 'panjpar') {
        return activeWeek.courses.filter((c) => c.number >= 2 && c.number <= 6).sort((a, b) => a.number - b.number);
      }
      return activeWeek.courses.filter((c) => c.number >= 1 && c.number <= 6).sort((a, b) => a.number - b.number);
    }
  }, [activeWeek.courses, has7Courses, gameMode]);

  // Counts of selected primary horses per course
  const primaryCountsByCourse = useMemo(() => {
    const counts: { [courseNumber: number]: number } = {};
    activeCourses.forEach((c) => {
      const picks = horseSelections[c.number] || {};
      counts[c.number] = Object.values(picks).filter((t) => t === 'primary').length;
    });
    return counts;
  }, [activeCourses, horseSelections]);

  // Total selected horses count across active courses (primary + reserve)
  const totalSelectedHorses = useMemo(() => {
    let count = 0;
    activeCourses.forEach((c) => {
      const picks = horseSelections[c.number] || {};
      count += Object.keys(picks).length;
    });
    return count;
  }, [activeCourses, horseSelections]);

  // Total primary horses selected across all active courses
  const totalPrimaryHorses = useMemo(() => {
    return Object.values(primaryCountsByCourse).reduce((sum, n) => sum + n, 0);
  }, [primaryCountsByCourse]);

  // BASE TICKET PRICE: Configurable 1,000 or 2,000 Tomans
  const BASE_PRICE = activeWeek.unitPriceTomans === 1000 ? 1000 : 2000;

  // PRICE CALCULATION FORMULA & BASE PRICE:
  // - Multiplies the active base price by the number of selections across the active courses:
  // - Total Price = Base Price * (C1 * C2 * C3 * C4 * C5 * C6 * C7 across active courses)
  // - Dynamic Display: The price instantly updates upon the VERY FIRST horse click. If 0 horses are selected, total cost displays 0.
  const { totalCombinations, calculatedTotalCost } = useMemo(() => {
    if (totalPrimaryHorses === 0) {
      return { totalCombinations: 0, calculatedTotalCost: 0 };
    }

    const countsList = activeCourses.map((c) => primaryCountsByCourse[c.number] || 0);
    const nonZeroCounts = countsList.filter((cnt) => cnt > 0);

    const combs = nonZeroCounts.reduce((prod, cnt) => prod * cnt, 1);
    const cost = combs * BASE_PRICE;

    return { totalCombinations: combs, calculatedTotalCost: cost };
  }, [totalPrimaryHorses, activeCourses, primaryCountsByCourse, BASE_PRICE]);

  // ULTRA-LIGHTWEIGHT SELECTION STATE TOGGLE VIA FUNCTIONAL HOOK (useCallback with [])
  // 1st Click -> Selected Primary (Solid Green #00E676 / #10B981)
  // 2nd Click -> Replacement / Reserve Horse (Solid Blue #3B82F6 / #2563EB with Solid White #FFFFFF text)
  // 3rd Click -> Unselect / Reset to Normal State
  // STRICT LIMIT: Max ONE (1) backup horse per course column. Selecting a new backup auto-deselects the previous one.
  const handleToggleHorse = useCallback((courseNumber: number, horse: Horse) => {
    // 0. Check if this course is part of the active ticket
    const isTicketCourse = activeCourses.some((c) => c.number === courseNumber);
    if (!isTicketCourse) {
      sound.playAlert();
      showToast(
        has7Courses
          ? (gameMode === 'shishpar'
              ? `کورس شماره ${courseNumber.toLocaleString('fa-IR')} خارج از فرم شش‌پره (کورس ۲ تا ۷) است.`
              : `کورس شماره ${courseNumber.toLocaleString('fa-IR')} خارج از فرم پنج‌پره (کورس ۳ تا ۷) است.`)
          : `کورس شماره ${courseNumber.toLocaleString('fa-IR')} در این حالت فعال نیست.`
      );
      return;
    }

    // 1. Check Master Six-Pore Switch
    const isLockedNow = activeWeek.isShishParEnabled === false || (activeWeek.countdownEndTimestamp && Date.now() >= activeWeek.countdownEndTimestamp);
    if (isLockedNow) {
      sound.playAlert();
      showToast('مهلت ثبت به اتمام رسید! از این لحظه برگه ای ثبت نمیشود!');
      return;
    }

    // 2. Check if this specific course is locked by Admin
    const courseObj = activeWeek.courses.find(c => c.number === courseNumber);
    if (courseObj?.isLocked) {
      sound.playAlert();
      showToast(`کورس شماره ${courseNumber.toLocaleString('fa-IR')} بسته شده است و امکان انتخاب اسب در آن وجود ندارد.`);
      return;
    }

    if (horse.isScratched) {
      sound.playClick();
      showToast(`اسب شماره ${horse.number.toLocaleString('fa-IR')} (${horse.name}) حذفی اعلام شده است.`);
      return;
    }

    setHorseSelections((prev) => {
      const currentType = prev[courseNumber]?.[horse.number];
      let nextType: HorseSelectionType | null = null;

      if (!currentType) {
        // 1st Click -> Selected Primary
        nextType = 'primary';
        sound.playSelect();
      } else if (currentType === 'primary') {
        // 2nd Click -> Replacement / Reserve Horse
        nextType = 'reserve';
        sound.playClick();
      } else {
        // 3rd Click -> Unselect / Reset to Normal State
        nextType = null;
        sound.playClick();
      }

      const courseMap = { ...(prev[courseNumber] || {}) };
      if (nextType === 'reserve') {
        // Strict limit: Max ONE (1) backup horse per course.
        // Automatically deselect any previous backup horse in this course.
        Object.entries(courseMap).forEach(([hNum, type]) => {
          if (type === 'reserve' && Number(hNum) !== horse.number) {
            delete courseMap[Number(hNum)];
          }
        });
        courseMap[horse.number] = 'reserve';
      } else if (nextType === 'primary') {
        courseMap[horse.number] = 'primary';
      } else {
        delete courseMap[horse.number];
      }
      return { ...prev, [courseNumber]: courseMap };
    });
  }, [showToast, activeCourses, has7Courses, gameMode, activeWeek]);

  // Reset Selections
  const handleResetForm = useCallback(() => {
    sound.playClick();
    setHorseSelections({});
    handleCloseToast();
  }, [handleCloseToast]);

  // Switch Game Mode
  const handleSwitchMode = (mode: 'shishpar' | 'panjpar') => {
    sound.playClick();
    setGameMode(mode);
    setIsModeDropdownOpen(false);

    setHorseSelections((prev) => {
      const copy = { ...prev };
      if (has7Courses) {
        if (mode === 'shishpar') {
          delete copy[1];
        } else {
          delete copy[1];
          delete copy[2];
        }
      } else {
        if (mode === 'panjpar') {
          delete copy[1];
        }
      }
      return copy;
    });
  };

  // Submit Prediction with Mandatory Replacement Validation
  const handleSubmitSlip = () => {
    sound.playClick();
    if (!currentUser || currentUser.isGuest) {
      onOpenAuth();
      return;
    }

    // 0. Check Master Six-Pore Switch
    if (activeWeek.isShishParEnabled === false) {
      sound.playAlert();
      showToast('ثبت فرم شش‌پره در حال حاضر توسط مدیریت موقتاً مسدود شده است.');
      return;
    }

    // Check locked courses
    for (const course of activeCourses) {
      if (course.isLocked) {
        sound.playAlert();
        showToast(`کورس شماره ${course.number.toLocaleString('fa-IR')} بسته شده است و امکان ثبت آن وجود ندارد.`);
        return;
      }
    }

    // 1. Verify each active course has at least 1 Primary horse selected
    for (const course of activeCourses) {
      const primaryCount = primaryCountsByCourse[course.number] || 0;
      if (primaryCount === 0) {
        showToast(
          `لطفاً در دور ${course.number.toLocaleString('fa-IR')} حداقل یک اسب اصلی انتخاب نمایید.`
        );
        return;
      }
    }

    // 2. MANDATORY REPLACEMENT HORSE VALIDATION RULES:
    // - Each course MUST have at least ONE Replacement/Reserve horse (blue state) selected.
    // - Exception Rule: If ALL available/active non-scratched horses in a specific course are selected as Primary (green state),
    //   the replacement requirement for that specific course is WAIVED (not required).
    for (const course of activeCourses) {
      const picks = horseSelections[course.number] || {};
      const availableHorses = course.horses.filter((h) => !h.isScratched);

      const primaryCount = availableHorses.filter(
        (h) => picks[h.number] === 'primary'
      ).length;

      const isAllAvailablePrimary =
        availableHorses.length > 0 && primaryCount === availableHorses.length;

      // If NOT waived by the exception rule, check for at least ONE replacement
      if (!isAllAvailablePrimary) {
        const replacementCount = availableHorses.filter(
          (h) => picks[h.number] === 'reserve'
        ).length;

        if (replacementCount === 0) {
          // Trigger exact required notification and prevent submission
          showToast(
            `در دور ${course.number.toLocaleString('fa-IR')} جایگزینی انتخاب نشده! یک جایگزین انتخاب کنید.`
          );
          return;
        }
      }
    }

    // 3. Verify user wallet balance
    if (currentUser.balanceTomans < calculatedTotalCost) {
      showToast('موجودی کیف پول کافی نیست');
      return;
    }

    // 4. Open Final Confirmation Modal
    setIsConfirmModalOpen(true);
  };

  // Final Confirmation: User clicked "ثبت رسید" in SixPrConfirmationModal
  const handleConfirmSubmission = () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      sound.playSuccess();

      // Format primary & replacement selections for store
      const slipSelections: { [courseNumber: number]: number[] } = {};
      const replacementSelections: { [courseNumber: number]: number[] } = {};
      activeCourses.forEach((c) => {
        const picks = horseSelections[c.number] || {};
        slipSelections[c.number] = Object.entries(picks)
          .filter(([_, type]) => type === 'primary')
          .map(([num]) => Number(num))
          .sort((a, b) => a - b);
        replacementSelections[c.number] = Object.entries(picks)
          .filter(([_, type]) => type === 'reserve')
          .map(([num]) => Number(num))
          .sort((a, b) => a - b);
      });

      const res = store.submitPrediction(
        slipSelections,
        calculatedTotalCost,
        totalCombinations,
        replacementSelections,
        gameMode
      );

      if (!res.success) {
        showToast(res.message || 'خطا در ثبت فرم پیش‌بینی.');
        setIsSubmitting(false);
        return;
      }

      setIsConfirmModalOpen(false);
      setIsSubmitting(false);

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#00E676', '#10B981', '#38BDF8', '#FACC15'],
        });
      } catch (e) {}

      // Reset selections
      setHorseSelections({});

      // Direct navigation to Inbox page (`/messages` / صندوق پیام)
      if (onNavigateToInbox) {
        onNavigateToInbox();
      } else {
        onBackToHome();
      }
    } catch (err) {
      console.warn('handleConfirmSubmission error:', err);
      setIsSubmitting(false);
      showToast('خطای غیرمنتظره در ثبت رسید.');
    }
  };

  return (
    <div 
      className="relative w-full max-w-xl mx-auto px-2 sm:px-3 h-full max-h-full overflow-hidden flex flex-col justify-between select-none py-1 sm:py-1.5 gpu-layer"
      style={{ height: '100%', maxHeight: '100%', overflow: 'hidden', touchAction: 'manipulation' }}
    >
      
      {/* ========================================================
          ANIMATED FLOATING TOAST NOTIFICATION (PILL CAPSULE)
          - Position: Floating centered near top (top: 18%), overlapping smoothly above grid matrix
          - Capsule Style: Dark pill/capsule (background: #091523, border: 1.5px solid #293952, border-radius: 9999px)
          - Layout: Warning/Info Icon on one side, clean centered dynamic white text, close button ✕ on opposite side
          - Animation: Slide-down (translateY(-20px) -> translateY(0), opacity: 0 -> 1, 0.3s ease-out)
          - Auto Dismiss: EXACTLY 3 seconds auto-dismiss with fade-out
          - Manual Close: Clicking ✕ immediately closes toast
          ======================================================== */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute top-[18%] left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[94%] sm:max-w-md w-max"
            style={{ willChange: 'transform, opacity' }}
          >
            <div 
              className="flex items-center justify-between gap-2.5 px-4 py-2 sm:py-2.5 rounded-full backdrop-blur-xl bg-white/70 dark:bg-[#091523]/85 border-[1.5px] border-white/80 dark:border-[#293952] shadow-[0_12px_30px_-6px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.6)]"
              role="alert"
            >
              {/* Warning/Info Icon */}
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>

              {/* Clean Centered Dynamic White Text */}
              <span className="text-slate-800 dark:text-white text-[11px] sm:text-xs font-bold leading-normal text-center whitespace-nowrap overflow-hidden text-ellipsis px-1">
                {toastMessage}
              </span>

              {/* Close Button ✕ */}
              <button
                type="button"
                onClick={handleCloseToast}
                className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 active:scale-90 transition-all shrink-0 p-0.5 cursor-pointer ml-0.5"
                aria-label="بستن اعلان"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          SECTION 1: TOP STATS CARDS (2 Cards Side by Side)
          Right Card (RTL): زمان باقی‌مانده + Digital Countdown + امکان ثبت برگه
          Left Card (RTL): Wallet & Pool Stats with 2 fully-rounded pill capsules
          ======================================================== */}
      <section className="shrink-0 grid grid-cols-2 gap-2 mb-1">
        
        {/* RIGHT CARD (زمان باقی‌مانده) */}
        <div className="order-1 bg-white dark:bg-[#0a1322] rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 dark:border-[#17253b] shadow-xs flex flex-col justify-between min-h-[66px] sm:min-h-[72px]">
          {/* Title */}
          <div className="flex items-center justify-end gap-1 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300">
            <span>زمان باقی‌مانده</span>
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 dark:text-slate-400" />
          </div>

          {/* Digital Timer Countdown */}
          <div className="text-center my-0.5">
            <span 
              className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-widest font-mono tabular-nums inline-block leading-tight"
              dir="ltr"
            >
              {countdownText}
            </span>
          </div>

          {/* Status Checkmark / Strict Lock Message */}
          {activeWeek.isShishParEnabled === false || (activeWeek.countdownEndTimestamp && Date.now() >= activeWeek.countdownEndTimestamp) ? (
            <div className="flex items-center justify-center gap-1 text-[8.5px] sm:text-[9.5px] font-black text-red-500 animate-pulse text-center leading-tight">
              <span>مهلت ثبت به اتمام رسید! از این لحظه برگه ای ثبت نمیشود!</span>
              <Lock className="w-3 h-3 shrink-0 stroke-[2.5]" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1 text-[9.5px] sm:text-[10.5px] font-extrabold text-[#00E676]">
              <span>امکان ثبت برگه؛ وجود دارد</span>
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            </div>
          )}
        </div>

        {/* LEFT CARD (Wallet & Pool Stats with 2 distinct fully-rounded pills) */}
        <div className="order-2 bg-white dark:bg-[#0a1322] rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 dark:border-[#17253b] shadow-xs flex flex-col justify-center space-y-1.5 min-h-[66px] sm:min-h-[72px]">
          
          {/* Top Pill: موجودی کیف پول (fully-rounded pill capsule) */}
          <div
            onClick={onOpenDeposit}
            className="w-full rounded-full px-2.5 py-1 bg-[#f0f7ff] dark:bg-[#07101c] border border-[#d8e8f8] dark:border-[#192538] flex items-center justify-between cursor-pointer hover:border-emerald-500/60 transition-colors"
            style={{ borderRadius: '9999px' }}
            title="افزایش موجودی"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                موجودی کیف پول
              </span>
            </div>
            <div className="flex items-center gap-1">
              {currentUser && !currentUser.isGuest ? (
                <span className="font-mono font-black text-[10px] sm:text-[11px] text-[#00E676] tabular-nums">
                  {currentUser.balanceTomans.toLocaleString('fa-IR')}
                </span>
              ) : null}
              <Wallet className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </div>
          </div>

          {/* Bottom Pill: صندوق کل (fully-rounded pill capsule) */}
          <div
            className="w-full rounded-full px-2.5 py-1 bg-[#f0f7ff] dark:bg-[#07101c] border border-[#d8e8f8] dark:border-[#192538] flex items-center justify-between"
            style={{ borderRadius: '9999px' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                صندوق کل
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 tabular-nums">
                {activeWeek.totalPoolTomans.toLocaleString('fa-IR')}
              </span>
              <Coins className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </div>
          </div>

        </div>

      </section>



      {/* ========================================================
          SECTION 2: 6-COURSE GRID MATRIX (CORSE 1 TO CORSE 6)
          - Ultra-Smooth 60FPS with memoized HorseCell components
          - Single Viewport Responsive Grid: flex-1 min-h-0 flex flex-col justify-between
          - Header row: [CORSE 1] to [CORSE 6]
          - 14 Rows: Jockey Silk column on right, horse capsules side-by-side
          - Three-stage toggle:
              1st Click -> Selected Primary (Solid Green #10B981 / #00E676)
              2nd Click -> Replacement / Reserve Horse (Solid Blue #3B82F6 / #2563EB + White text)
              3rd Click -> Unselect / Reset to Normal State
          ======================================================== */}
      <section 
        className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden my-0.5 select-none"
        aria-label="ماتریس پیش‌بینی کورس‌ها"
      >
        <div className="w-full h-full flex flex-col justify-between">
          
          {/* HEADER ROW: Course Pill Titles */}
          <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 h-6 sm:h-7 mb-0.5">
            {/* Jockey Silk Column Spacer (Far Right in RTL) */}
            <div className="w-6 sm:w-7 shrink-0 flex items-center justify-center" />

            {/* Courses Capsules */}
            {displayCourses.map((course) => {
              const isInTicket = activeCourses.some((ac) => ac.number === course.number);
              return (
                <div
                  key={course.id}
                  style={{ borderRadius: '9999px', padding: '0 4px' }}
                  className={`flex-1 min-w-0 h-full rounded-full border flex items-center justify-center text-center shadow-xs overflow-hidden transition-all ${
                    course.isLocked
                      ? 'bg-amber-500/20 dark:bg-amber-950/50 border-amber-500/40 text-amber-600 dark:text-amber-400'
                      : !isInTicket
                      ? 'bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60'
                      : 'bg-[#e3eefc] dark:bg-[#203147] border-[#cddff5] dark:border-[#2b3e59] text-slate-800 dark:text-white'
                  }`}
                  title={
                    course.isLocked
                      ? `کورس شماره ${course.number} بسته شد`
                      : !isInTicket
                      ? `کورس شماره ${course.number} خارج از فرم برگه فعال است`
                      : `کورس ${course.number}`
                  }
                >
                  <span 
                    className="w-full text-center font-mono font-black text-[8px] sm:text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-0.5 leading-tight"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {course.isLocked && <Lock className="w-2.5 h-2.5 shrink-0 text-amber-500" />}
                    <span>CORSE {course.number}</span>
                    {!isInTicket && <span className="text-[7.5px] text-amber-500 dark:text-amber-400 font-sans font-bold">(خارج)</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 14 MATRIX ROWS: Dynamic flex-1 sizing to fit 100vh perfectly without scrolling */}
          <div className="flex-1 min-h-0 flex flex-col justify-between">
            {Array.from({ length: 14 }, (_, i) => i + 1).map((rowNum) => (
              <div 
                key={rowNum} 
                className="flex-1 min-h-0 flex items-center gap-1 sm:gap-1.5 py-[1px]"
              >
                {/* JOCKEY SILKS BADGE (Memoized) */}
                <JockeySilkBadge rowNum={rowNum} />

                {/* HORSE CAPSULES FOR EACH ACTIVE COURSE (Memoized HorseCell for 60FPS) */}
                {displayCourses.map((course) => {
                  const isInTicket = activeCourses.some((ac) => ac.number === course.number);
                  const horse = course.horses.find((h) => h.number === rowNum);
                  const selectionState = horseSelections[course.number]?.[rowNum];

                  return (
                    <HorseCell
                      key={`${course.number}-${rowNum}`}
                      horse={horse}
                      courseNumber={course.number}
                      rowNum={rowNum}
                      selectionState={selectionState}
                      isLocked={course.isLocked || !isInTicket}
                      onToggle={handleToggleHorse}
                    />
                  );
                })}

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTNOTE DISCLAIMER: DYNAMIC BASED ON ADMIN REFUND RATE */}
      {refundRate > 0 && (
        <div className="shrink-0 text-center py-0.5">
          <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
            اگر هیچ پرداختی وجود نداشته باشد، {refundRate.toLocaleString('fa-IR')}٪ هزینه برگه به کیف پول شما بازگردانده می‌شود.
          </p>
        </div>
      )}

      {/* ========================================================
          SECTION 3: BOTTOM FLOATING PREDICTION BAR
          - Row 1: "تعداد کل انتخاب : X" | Mode Selector Dropdown | "مبلغ کل : X,XXX تومان"
          - Row 2: Fully Rounded Pill Capsule Buttons:
              * "پاک کردن انتخاب" (border-radius: 9999px;)
              * "ثبت پیش‌بینی" (Solid Green #00E676, border-radius: 9999px;)
          ======================================================== */}
      <div 
        className="shrink-0 bg-white dark:bg-[#070e1a] border border-slate-200/90 dark:border-[#17253b] rounded-2xl p-2 sm:p-2.5 shadow-lg transition-colors space-y-1.5"
      >
        {/* TOP ROW STATS & MODE SELECTOR */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 relative">
          
          {/* RIGHT SIDE (RTL): تعداد کل انتخاب */}
          <div className="flex items-center gap-1 min-w-[80px]">
            <span className="text-[10px] sm:text-xs">تعداد کل انتخاب:</span>
            <span className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {totalSelectedHorses.toLocaleString('fa-IR')}
            </span>
          </div>

          {/* CENTER: GAME MODE SELECTOR DROPDOWN ("شش پره" / "پنج پره") */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => { sound.playClick(); setIsModeDropdownOpen(!isModeDropdownOpen); }}
              className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 dark:bg-[#152338] hover:bg-slate-200 dark:hover:bg-[#1b2f4c] text-slate-900 dark:text-white text-[10.5px] sm:text-xs font-bold border border-slate-200 dark:border-[#2a3f5f] flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
              style={{ borderRadius: '9999px' }}
              aria-haspopup="listbox"
              aria-expanded={isModeDropdownOpen}
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
              <span>
                {gameMode === 'shishpar'
                  ? (has7Courses ? 'شش پره (کورس ۲ تا ۷)' : 'شش پره')
                  : (has7Courses ? 'پنج پره (کورس ۳ تا ۷)' : 'پنج پره')}
              </span>
            </button>

            {/* Mode Dropdown Popover */}
            {isModeDropdownOpen && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-44 bg-white dark:bg-[#0f1b2d] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('shishpar')}
                  className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    gameMode === 'shishpar'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {has7Courses ? 'شش پره (کورس ۲ تا ۷)' : 'شش پره (کورس ۱ تا ۶)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('panjpar')}
                  className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    gameMode === 'panjpar'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {has7Courses ? 'پنج پره (کورس ۳ تا ۷)' : 'پنج پره (کورس ۲ تا ۶)'}
                </button>
              </div>
            )}
          </div>

          {/* LEFT SIDE (RTL): مبلغ کل (Never shows 0 when horses selected) */}
          <div className="flex items-center gap-1 justify-end min-w-[95px]">
            <span className="text-[10px] sm:text-xs">مبلغ کل:</span>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-[#00E676] tabular-nums">
              {calculatedTotalCost.toLocaleString('fa-IR')}
            </span>
            <span className="text-[9px] text-slate-400 font-normal">تومان</span>
          </div>

        </div>

        {/* BOTTOM ROW ACTION BUTTONS: BOTH FULLY ROUNDED PILL CAPSULE SHAPE */}
        <div className="grid grid-cols-2 gap-2">
          
          {/* RIGHT BUTTON (RTL): پاک کردن انتخاب (Pill Capsule Shape) */}
          <button
            type="button"
            onClick={handleResetForm}
            className="h-10 sm:h-11 rounded-full bg-[#EBF3FC] dark:bg-[#121e31] hover:bg-[#dbe9fa] dark:hover:bg-[#182740] text-slate-800 dark:text-white border border-[#D2E2F5] dark:border-[#1f304b] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
            style={{ borderRadius: '9999px' }}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
            <span>پاک کردن انتخاب</span>
          </button>

          {/* LEFT BUTTON (RTL): ثبت پیش‌بینی (Solid Vibrant Green Pill Capsule Shape) */}
          <button
            type="button"
            onClick={handleSubmitSlip}
            disabled={activeWeek.isShishParEnabled === false}
            className={`h-10 sm:h-11 rounded-full font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md ${
              activeWeek.isShishParEnabled === false
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-[#00E676] hover:bg-[#00c853] text-slate-950 active:scale-[0.98] cursor-pointer shadow-emerald-500/20'
            }`}
            style={{ borderRadius: '9999px' }}
          >
            {activeWeek.isShishParEnabled === false ? (
              <>
                <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>ثبت فرم مسدود است</span>
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>ثبت پیش‌بینی</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* ========================================================
          SIX-PR FINAL CONFIRMATION MODAL (MATCHING EXACT SCREENSHOT)
          ======================================================== */}
      <SixPrConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmission}
        totalCostTomans={calculatedTotalCost}
        courses={activeCourses}
        horseSelections={horseSelections}
        isSubmitting={isSubmitting}
      />

    </div>
  );
};
