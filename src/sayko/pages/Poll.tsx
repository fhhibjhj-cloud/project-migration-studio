// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Vote,
  Lock,
  AlertCircle,
  Info
} from 'lucide-react';
import { store, PredictionWeek, UserProfile, Horse } from '../lib/store';
import { sound } from '../lib/audio';
import { JockeySilkIcon } from '../components/JockeySilkIcon';

interface PollProps {
  currentUser: UserProfile | null;
  activeWeek: PredictionWeek;
  onBackToHome: () => void;
  onOpenAuth: () => void;
}

export const Poll: React.FC<PollProps> = ({
  currentUser,
  activeWeek,
  onOpenAuth,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  // Subscribe to live store updates for dynamic synchronization with Six-Pareh changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = store.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // 1. DYNAMIC COURSES SYNCHRONIZATION WITH SIX-PAREH
  const coursesList = useMemo(() => {
    if (activeWeek?.courses && activeWeek.courses.length > 0) {
      return activeWeek.courses;
    }
    return [];
  }, [activeWeek]);

  const [selectedCourseNumber, setSelectedCourseNumber] = useState<number>(() => {
    return coursesList[0]?.number || 1;
  });

  // Ensure selected course is valid if admin removes or modifies courses
  const selectedCourse = useMemo(() => {
    return coursesList.find((c) => c.number === selectedCourseNumber) || coursesList[0];
  }, [coursesList, selectedCourseNumber]);

  // Current course horses dynamically sourced directly from Six-Pareh state
  const currentCourseHorses: Horse[] = useMemo(() => {
    if (!selectedCourse?.horses) return [];
    // Display all active (non-scratched) horses in this course
    return selectedCourse.horses.filter((h) => !h.isScratched);
  }, [selectedCourse]);

  // User vote state for the selected course
  const userId = currentUser && !currentUser.isGuest ? currentUser.id : 'guest_anonymous';
  const hasVotedInCourse = store.hasUserVotedInPoll(userId, selectedCourse?.number || selectedCourseNumber);
  const userVote = store.getUserPollVote(userId, selectedCourse?.number || selectedCourseNumber);

  // 2. AUTHENTIC REAL PERCENTAGE CALCULATION
  const { horseStats, totalCourseVotes } = useMemo(() => {
    const totalVotes = currentCourseHorses.reduce((sum, h) => {
      return sum + (store.pollVotes[h.id] || 0);
    }, 0);

    const stats = currentCourseHorses.map((h) => {
      const votes = store.pollVotes[h.id] || 0;
      // Real percentage calculation strictly based on genuine votes
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      const isVoted = userVote?.horseId === h.id || userVote?.horseName === h.name;

      // Color coding rules:
      // High probabilities (>= 70%) -> Emerald
      // Medium probabilities (30% - 69%) -> Amber
      // Low probabilities (< 30%) -> Rose
      let barBgClass = 'bg-rose-500';
      let textClass = 'text-white';

      if (percentage >= 70) {
        barBgClass = 'bg-emerald-500';
        textClass = 'text-white';
      } else if (percentage >= 30) {
        barBgClass = 'bg-amber-400';
        textClass = 'text-slate-950 font-black';
      } else {
        barBgClass = 'bg-rose-500';
        textClass = 'text-white';
      }

      return {
        ...h,
        votes,
        percentage,
        barBgClass,
        textClass,
        isVoted,
      };
    });

    return { horseStats: stats, totalCourseVotes: totalVotes };
  }, [currentCourseHorses, userVote, store.pollVotes]);

  // 3. SMOOTH 1-SECOND FILL ANIMATION STATE
  const [animatedPercentages, setAnimatedPercentages] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    if (hasVotedInCourse) {
      // Start from 0 and smoothly animate to target percentages over 1 second (1000ms)
      const timer = setTimeout(() => {
        const next: { [id: string]: number } = {};
        horseStats.forEach((h) => {
          next[h.id] = h.percentage;
        });
        setAnimatedPercentages(next);
      }, 40);
      return () => clearTimeout(timer);
    } else {
      setAnimatedPercentages({});
    }
  }, [hasVotedInCourse, selectedCourseNumber, totalCourseVotes]);

  // 4. INSTANT VOTE REGISTRATION (NO CONFIRMATION MODAL)
  const handleRowClick = (horse: Horse) => {
    if (!currentUser || currentUser.isGuest) {
      sound.playAlert();
      onOpenAuth();
      return;
    }

    if (hasVotedInCourse) {
      sound.playAlert();
      setFeedback(`شما قبلاً در نظرسنجی کورس ${selectedCourse?.number} رأی خود را ثبت کرده‌اید.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    // Cast vote instantly!
    sound.playSuccess();
    const res = store.castPollVote(
      currentUser.id,
      currentUser.fullName || currentUser.username,
      horse.id,
      selectedCourse?.number || selectedCourseNumber,
      horse.name
    );

    if (res.success) {
      setFeedback(`رأی شما با موفقیت برای اسب «${horse.name}» ثبت شد!`);
      setTimeout(() => setFeedback(null), 3500);
    } else {
      sound.playAlert();
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#070d18] text-slate-900 dark:text-slate-100 flex flex-col select-none transition-colors duration-200">
      
      {/* Floating feedback toast */}
      {feedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-[92%] sm:max-w-md w-max animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/55 dark:bg-white/10 text-white border border-white/20 ring-1 ring-emerald-500/40 shadow-2xl backdrop-blur-xl backdrop-saturate-150 text-xs font-bold" dir="rtl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        </div>
      )}

      {/* ========================================================
          1. COURSE SELECTOR TABS (Synchronized with Six-Pareh)
          ======================================================== */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-1" dir="rtl">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {coursesList.map((course) => {
            const isSelected = course.number === (selectedCourse?.number || selectedCourseNumber);
            const isVoted = store.hasUserVotedInPoll(userId, course.number);
            return (
              <button
                key={course.number}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedCourseNumber(course.number);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/30'
                    : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <span>کورس {course.number}</span>
                {isVoted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="رأی ثبت شده" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          2. SUBTITLE: "جدول احتمال برد" & LIVE VOTING STATUS
          ======================================================== */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-1 pb-2 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {!hasVotedInCourse ? (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 animate-pulse">
              <Vote className="w-3.5 h-3.5" />
              برای مشاهده درصدهای زنده، روی اسب مورد نظر رأی دهید
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              رأی شما ثبت شد • نتایج زنده کورس {selectedCourse?.number} (مجموع {totalCourseVotes} رأی)
            </span>
          )}
        </div>
        <h2 className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
          جدول احتمال برد
        </h2>
      </div>

      {/* ========================================================
          POLL INFORMATIONAL-ONLY NOTICE (Requirement 1)
          ======================================================== */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pb-2.5" dir="rtl">
        <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/25 text-blue-900 dark:text-blue-200 text-xs leading-relaxed flex items-start gap-2.5 shadow-xs">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs leading-relaxed font-medium">
            <strong className="font-extrabold text-blue-800 dark:text-blue-300">اطلاعیه مهم:</strong> بخش نظرسنجی صرفاً برای اطلاعرسانی و پیشبینی آماری است و هیچگونه نقشی در ثبت برگه اصلی مسابقات، نتیجه مسابقه یا تغییر اعتبار و موجودی کاربران ندارد.
          </p>
        </div>
      </div>

      {/* ========================================================
          3. HORSE ROWS LIST
          - Left: Dynamic Progress Capsule (Empty before vote, filled with real % after vote)
          - Right: FAR RIGHT = Numbered Jockey Silk Icon | LEFT OF JOCKEY = Horse Name
          ======================================================== */}
      <main className="w-full max-w-2xl mx-auto px-3 sm:px-6 flex-1 space-y-2 sm:space-y-2.5">
        {horseStats.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p>اسبی برای این کورس در شش‌پره ثبت نشده است.</p>
          </div>
        ) : (
          horseStats.map((horse) => {
            const currentFillWidth = animatedPercentages[horse.id] ?? 0;

            return (
              <div
                key={horse.id}
                onClick={() => handleRowClick(horse)}
                className={`w-full flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-xl transition-all duration-500 select-none border ${
                  !hasVotedInCourse
                    ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/40 active:scale-[0.99]'
                    : 'cursor-default'
                } ${
                  horse.isVoted 
                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/40 dark:border-emerald-500/30 shadow-xs' 
                    : 'bg-white dark:bg-[#0c1424]/60 border-slate-200/80 dark:border-slate-800/40 shadow-xs'
                }`}
                dir="ltr"
              >
                {/* Left Side: Progress Capsule / Probability Bar */}
                <div className="flex-1 flex items-center justify-start min-w-0 pr-2">
                  {!hasVotedInCourse ? (
                    // Initial State: Interactive capsule before voting
                    <div className="w-full h-8 sm:h-9 rounded-full border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/30 hover:border-emerald-500/60 hover:bg-emerald-500/[0.04] transition-all flex items-center justify-between px-3 group">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5" dir="rtl">
                        <Vote className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        <span>کلیک جهت ثبت رأی</span>
                      </span>
                      {/* Clean Percentage Badge Pill in Unvoted State */}
                      <div className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/50 dark:border-slate-700/50 flex items-center justify-center min-w-[44px]">
                        <span className="font-mono text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
                          — %
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Voted State: Smooth 1-second animated fill bar with polished percentage pill badge
                    <div className="relative w-full h-8 sm:h-9 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 overflow-hidden flex items-center justify-between px-2 sm:px-2.5 shadow-inner">
                      {/* Smooth 1-second fill bar */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${horse.barBgClass} opacity-85 shadow-xs`}
                        style={{
                          width: `${currentFillWidth}%`,
                          transition: 'width 1000ms cubic-bezier(0.25, 1, 0.5, 1), background-color 1000ms ease',
                        }}
                      />

                      {/* 1. POLISHED PERCENTAGE BADGE PILL CONTAINER (Requirement 1) */}
                      <div className="relative z-10 shrink-0 px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-[#0c1626]/95 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex items-center justify-center min-w-[44px] sm:min-w-[48px]">
                        <span className="font-mono text-[11px] sm:text-xs font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                          {horse.percentage}%
                        </span>
                      </div>

                      {/* 2. Voted Badge ("رأی شما ✓") or subtle vote count */}
                      {horse.isVoted ? (
                        <span className="relative z-10 text-[10px] sm:text-[11px] font-black text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 dark:bg-emerald-500/25 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs animate-in fade-in duration-500" dir="rtl">
                          <span>رأی شما</span>
                          <span className="font-bold text-xs">✓</span>
                        </span>
                      ) : horse.votes > 0 ? (
                        <span className="relative z-10 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 shrink-0" dir="rtl">
                          {horse.votes.toLocaleString('fa-IR')} رأی
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Right Side: Far right = Numbered Jockey Silk Icon | Left of Jockey = Horse Name */}
                <div className="flex items-center gap-2.5 shrink-0" dir="rtl">
                  {/* 1. STRICTLY ON THE FAR RIGHT: Numbered Colored Jockey Icon */}
                  <div className="w-7 sm:w-8 h-8 sm:h-9 shrink-0 flex items-center justify-center">
                    <JockeySilkIcon number={horse.number} className="w-full h-full max-h-[34px] max-w-[28px]" />
                  </div>

                  {/* 2. TO THE LEFT OF JOCKEY ICON: Horse Name */}
                  <span className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap min-w-[70px] sm:min-w-[85px] text-right">
                    {horse.name}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </main>

      {/* ========================================================
          4. FOOTER NOTE
          ======================================================== */}
      <footer className="mt-auto pt-8 pb-7 text-center px-4">
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-500 font-mono tracking-wide select-none">
          نظرسنجی اسب های شرکت کننده در کورس های امروز تاریخ : ۱۴۰۵.۰۸.۰۷
        </p>
      </footer>

    </div>
  );
};
