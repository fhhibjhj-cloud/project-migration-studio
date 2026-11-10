import { motion, AnimatePresence } from 'motion/react';
import { X, Percent, RotateCcw, Trophy } from 'lucide-react';

const rows = [
  { pct: '۱۴٪', title: 'کارمزد سایت', desc: 'هنگام ثبت برگه کسر می‌شود و با ابطال برگه کامل برمی‌گردد.', Icon: Percent, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  { pct: '۱۵٪', title: 'عودت به برگه‌های شکست‌خورده', desc: 'پس از اعلام نتیجه، ۱۵٪ مبلغ هر برگهٔ بازندهٔ بالای ۹۹٬۰۰۰ تومان به کیف پولش برمی‌گردد. برگه‌های ۹۹٬۰۰۰ تومان و کمتر عودت ندارند.', Icon: RotateCcw, tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
  { pct: '۷۱٪', title: 'صندوق نهایی برندگان', desc: 'باقی‌ماندهٔ صندوق به‌طور مساوی بین برگه‌های برنده تقسیم می‌شود.', Icon: Trophy, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
];

export function PoolInfoModal({ open, onClose, pool }: { open: boolean; onClose: () => void; pool: number }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div dir="rtl" className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div onClick={e => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0b1524] border border-slate-200 dark:border-[#192538] shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">شفاف‌سازی مالی صندوق کل</h3>
              <button onClick={onClose} aria-label="بستن" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#132036] flex items-center justify-center text-slate-500 dark:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-2xl bg-[#f0f7ff] dark:bg-[#07101c] border border-[#d8e8f8] dark:border-[#192538] p-3 mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">صندوق فعلی (پس از کسر کارمزد)</span>
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-[#00E676]">{pool.toLocaleString('fa-IR')} تومان</span>
            </div>
            <div className="space-y-2">
              {rows.map(({ pct, title, desc, Icon, tone }) => (
                <div key={pct} className="flex gap-3 items-start rounded-2xl border border-slate-100 dark:border-[#192538] p-3">
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
                      <span className={`text-sm font-black ${tone.split(' bg-')[0]}`}>{pct}</span>
                    </div>
                    <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400 mt-3">
              مثال: برگهٔ ۵۰۰٬۰۰۰ تومانی → ۷۰٬۰۰۰ کارمزد، ۴۳۰٬۰۰۰ به صندوق. اگر بازنده شود ۷۵٬۰۰۰ تومان (۱۵٪) به کیف پول برمی‌گردد.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
