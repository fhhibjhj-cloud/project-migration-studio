// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Lock, Eye, EyeOff, X, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { store } from '../lib/store';
import { sound } from '../lib/audio';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Security counter for failed attempts stored in sessionStorage
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('admin_failed_attempts');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const isBlocked = failedAttempts >= MAX_FAILED_ATTEMPTS;

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsShaking(false);
      try {
        const saved = sessionStorage.getItem('admin_failed_attempts');
        const attempts = saved ? parseInt(saved, 10) : 0;
        setFailedAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          setError('هشدار امنیتی: ۵ تلاش ناموفق. دسترسی موقت مسدود شد');
        } else {
          setError(null);
        }
      } catch {
        setError(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    try {
      const enteredPin = pin.trim();
      const validPin = (store.adminPin || '').trim();

      // Strict admin PIN authentication: only validate against the actual configured PIN
      if (validPin && enteredPin === validPin) {
        sound.playSuccess();
        setError(null);
        setFailedAttempts(0);
        try {
          sessionStorage.removeItem('admin_failed_attempts');
        } catch {
          // Ignore storage restrictions
        }
        store.loginAsAdmin();
        onSuccess();
        onClose();
        setPin('');
      } else {
        sound.playAlert();
        const nextCount = failedAttempts + 1;
        setFailedAttempts(nextCount);
        try {
          sessionStorage.setItem('admin_failed_attempts', String(nextCount));
        } catch {
          // Ignore
        }

        if (nextCount >= MAX_FAILED_ATTEMPTS) {
          setError('هشدار امنیتی: ۵ تلاش ناموفق. دسترسی موقت مسدود شد');
        } else {
          setError(`پین امنیتی نادرست است. (${MAX_FAILED_ATTEMPTS - nextCount} تلاش باقی‌مانده)`);
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }
      }
    } catch (err) {
      console.warn('AdminPinModal submit error:', err);
    }
  };

  return (
    <AnimatePresence>
      <div key="admin-pin-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0
          }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[360px] sm:max-w-md my-auto rounded-[28px] bg-white dark:bg-[#0c1626] border border-blue-100/90 dark:border-[#1e2f47] p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-white overflow-hidden"
          dir="rtl"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => { sound.playClick(); onClose(); setPin(''); }}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Icon and Header */}
          <div className="text-center mb-5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-3">
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>دسترسی محرمانه مدیریت</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              ورود امن به پنل مدیریت
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
              برای ورود به پنل مرکزی سایکو، پین امنیتی ادمین را وارد نمایید.
            </p>
          </div>

          {/* Persistent Brute-Force Block Warning */}
          {isBlocked && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-black text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>هشدار امنیتی: ۵ تلاش ناموفق. دسترسی موقت مسدود شد</span>
              </div>
              <p className="text-[10px] text-red-500/80 font-medium">
                به دلیل تلاش‌های مکرر ناموفق، فرم ورود مسدود شده است.
              </p>
            </div>
          )}

          {/* PIN Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                autoFocus={!isBlocked}
                disabled={isBlocked}
                value={pin}
                onChange={(e) => { setPin(e.target.value); if (!isBlocked) setError(null); }}
                placeholder="پین امنیتی مدیریت"
                className="w-full h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 px-10 text-center font-mono text-base font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <button
                type="button"
                disabled={isBlocked}
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Message (if not blocked) */}
            {error && !isBlocked && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-red-500 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBlocked || !pin.trim()}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تأیید و ورود به پنل مدیریت</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
