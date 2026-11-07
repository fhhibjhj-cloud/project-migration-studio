// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, Horse } from '../lib/store';
import { JockeySilkIcon } from './JockeySilkIcon';

export type HorseSelectionType = 'primary' | 'reserve';

interface SixPrConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalCostTomans: number;
  courses: Course[];
  horseSelections: { [courseNumber: number]: { [horseNumber: number]: HorseSelectionType } };
  isSubmitting?: boolean;
}

export const SixPrConfirmationModal: React.FC<SixPrConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalCostTomans,
  courses,
  horseSelections,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  // Order active courses
  const displayCourses = [...courses].sort((a, b) => a.number - b.number);
  const gridColsClass = displayCourses.length === 7
    ? 'grid-cols-7'
    : displayCourses.length === 5
    ? 'grid-cols-5'
    : 'grid-cols-6';

  return (
    <AnimatePresence>
      <div 
        key="sixpr-confirm-backdrop"
        className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md flex flex-col my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ========================================================
              1. MAIN COURSE TABLE CARD
              ======================================================== */}
          <div className="w-full rounded-[28px] bg-white dark:bg-[#0f1724] border border-slate-200/90 dark:border-slate-700/60 p-4 sm:p-5 shadow-2xl overflow-hidden transition-colors">
            
            {/* Header Title */}
            <h3 className="text-center text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight" dir="rtl">
              تایید نهایی برگه {displayCourses.length === 5 ? 'پنج پره' : 'شش پره'} {displayCourses[0]?.number > 1 ? `(کورس ${displayCourses[0]?.number.toLocaleString('fa-IR')} تا ${displayCourses[displayCourses.length - 1]?.number.toLocaleString('fa-IR')})` : ''} به مبلغ [ {totalCostTomans.toLocaleString('fa-IR')} ] تومان
            </h3>

            {/* Subtle Horizontal Divider */}
            <div className="h-px bg-slate-200 dark:bg-slate-800/90 my-3 sm:my-3.5 w-full" />

            {/* Dynamic Grid Layout (RTL) */}
            <div className={`grid ${gridColsClass} divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800/80 text-center`} dir="rtl">
              {displayCourses.map((course) => {
                const picks = horseSelections[course.number] || {};
                const primaryHorses = course.horses
                  .filter((h) => picks[h.number] === 'primary')
                  .sort((a, b) => a.number - b.number);

                return (
                  <div key={course.number} className="px-1 first:pr-0 last:pl-0 flex flex-col items-center">
                    {/* Course Column Header */}
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 pb-2 sm:pb-2.5 block text-center">
                      کورس{course.number.toLocaleString('fa-IR')}
                    </span>

                    {/* Primary Horses Vertical List */}
                    <div className="w-full space-y-1.5 sm:space-y-2">
                      {primaryHorses.map((horse) => (
                        <div
                          key={horse.id}
                          className="w-full flex items-center justify-end gap-1 sm:gap-1.5"
                          dir="ltr"
                        >
                          <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate text-right">
                            {horse.name}
                          </span>
                          <JockeySilkIcon
                            number={horse.number}
                            className="w-3.5 h-4.5 sm:w-4 sm:h-5 shrink-0"
                          />
                        </div>
                      ))}

                      {primaryHorses.length === 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono block text-center">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================
              2. REPLACEMENTS CAPSULE CARD ("جایگزین های انتخاب شده")
              ======================================================== */}
          <div className="w-full rounded-[28px] bg-slate-100/90 dark:bg-[#222b39] border border-slate-200/90 dark:border-slate-700/50 p-3.5 sm:p-4 mt-3 sm:mt-3.5 shadow-xl transition-colors">
            {/* Header Title */}
            <h4 className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 sm:mb-2.5 text-center">
              جایگزین های انتخاب شده
            </h4>

            {/* Horizontal Flex Row (RTL) */}
            <div 
              className="flex items-center justify-between gap-1 sm:gap-2 px-1 overflow-x-auto no-scrollbar"
              dir="rtl"
            >
              {displayCourses.map((course) => {
                const picks = horseSelections[course.number] || {};
                const reserveHorse = course.horses.find(
                  (h) => picks[h.number] === 'reserve'
                );

                if (!reserveHorse) {
                  return (
                    <div key={course.number} className="flex flex-col items-center gap-0.5 shrink-0 px-1">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">کورس {course.number.toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">-</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={course.number}
                    className="flex items-center gap-1 sm:gap-1.5 shrink-0"
                    dir="ltr"
                  >
                    <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {reserveHorse.name}
                    </span>
                    <JockeySilkIcon
                      number={reserveHorse.number}
                      className="w-3.5 h-4.5 sm:w-4 sm:h-5 shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================
              3. BOTTOM ACTION BUTTONS (FIXED FOOTER)
              - Primary Button: "ثبت رسید" (Right in RTL, Green)
              - Secondary Button: "انصراف" (Left in RTL, Adaptive Light/Dark)
              ======================================================== */}
          <div className="grid grid-cols-2 gap-3 w-full mt-4 sm:mt-5" dir="rtl">
            {/* Primary Submit Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className={`h-12 sm:h-14 rounded-full bg-[#00E676] hover:bg-[#00c853] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-[#00E676]/25 active:scale-[0.98] ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'در حال ثبت رسید...' : 'ثبت رسید'}
            </button>

            {/* Secondary Cancel Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-12 sm:h-14 rounded-full bg-slate-200 dark:bg-[#202b38] hover:bg-slate-300 dark:hover:bg-[#2c3a4c] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold text-sm sm:text-base flex items-center justify-center transition-all cursor-pointer border border-slate-300/80 dark:border-slate-700/60 shadow-md active:scale-[0.98]"
            >
              انصراف
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
