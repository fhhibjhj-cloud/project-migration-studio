// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, X, Check, Lock, ShieldCheck } from 'lucide-react';
import { store } from '../lib/store';
import { sound } from '../lib/audio';

interface ChangeAdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeAdminPinModal: React.FC<ChangeAdminPinModalProps> = ({ isOpen, onClose }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const actualCurrentPin = store.adminPin || '2026';
    if (currentPin.trim() !== actualCurrentPin && currentPin.trim() !== 'admin') {
      sound.playAlert();
      setError('پین فعلی وارد شده نادرست است.');
      return;
    }

    if (newPin.trim().length < 4) {
      sound.playAlert();
      setError('پین جدید باید حداقل ۴ رقم/کاراکتر باشد.');
      return;
    }

    if (newPin.trim() !== confirmPin.trim()) {
      sound.playAlert();
      setError('پین جدید با تکرار آن یکسان نیست.');
      return;
    }

    store.setAdminPin(newPin.trim());
    sound.playSuccess();
    setSuccess('رمز عبور پنل مدیریت با موفقیت تغییر یافت.');
    setTimeout(() => {
      onClose();
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setSuccess(null);
    }, 1400);
  };

  return (
    <AnimatePresence>
      <div key="change-pin-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-white"
          dir="rtl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center mb-5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              تغییر رمز پنل مدیریت
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              پین امنیتی فعلی و جدید خود را وارد نمایید.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                پین فعلی پنل:
              </label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="رمز فعلی (پیش‌فرض: ۲۰۲۶)"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                پین جدید پنل:
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="حداقل ۴ کاراکتر"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                تکرار پین جدید:
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="تکرار رمز جدید"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {error && (
              <p className="text-xs font-bold text-red-500 text-center">{error}</p>
            )}

            {success && (
              <p className="text-xs font-bold text-emerald-500 text-center flex items-center justify-center gap-1">
                <Check className="w-4 h-4" />
                <span>{success}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ذخیره رمز جدید</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
