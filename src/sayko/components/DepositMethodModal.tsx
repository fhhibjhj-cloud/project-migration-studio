// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Upload, AlertTriangle, Clock, Send, CreditCard, Loader2 } from 'lucide-react';
import { store } from '../lib/store';
import { sound } from '../lib/audio';

export const DESTINATION_CARDS = [
  { bank: 'بانک سامان', number: '6219861493774722', holder: 'متین توماج' },
  { bank: 'بانک ملی', number: '6037991749826701', holder: 'متین توماج' },
];

/** Shrinks a photo to a small JPEG data URL so receipts stay light in the database. */
async function compressImage(file: File, maxSide = 1000, quality = 0.7): Promise<string> {
  const dataUrl: string = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.onerror = fail; r.readAsDataURL(file); });
  const img: HTMLImageElement = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = dataUrl; });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

interface Props { isOpen: boolean; amount: number; onClose: () => void; onTelegram: () => void; onDone: () => void; }

export const DepositMethodModal: React.FC<Props> = ({ isOpen, amount, onClose, onTelegram, onDone }) => {
  const [step, setStep] = useState<'choose' | 'instant'>('choose');
  const [copied, setCopied] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ date: string; time: string } | null>(null);
  const [queue, setQueue] = useState<{ pending: number; limit: number; mine: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const user = store.currentUser;

  useEffect(() => { if (isOpen) { setStep('choose'); setImage(''); setError(''); setSent(null); } }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== 'instant') return;
    const load = () => fetch('/api/deposits/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
      .then(r => r.json()).then(d => d.success && setQueue(d)).catch(() => {});
    load(); const t = setInterval(load, 5000); return () => clearInterval(t);
  }, [isOpen, step]);

  if (!isOpen) return null;
  const queueFull = !!queue && queue.pending >= queue.limit && !queue.mine && !sent;

  const copy = (text: string, key: string) => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(key); sound.playSuccess(); setTimeout(() => setCopied(''), 1800); };

  const pick = async (f?: File) => {
    if (!f) return; setError('');
    try { setImage(await compressImage(f)); } catch { setError('تصویر قابل خواندن نیست؛ عکس دیگری انتخاب کنید.'); }
  };

  const submit = async () => {
    if (!image || !user) return; setBusy(true); setError('');
    try {
      const res = store.requestDeposit(amount, 'instant');
      if (!res.success || !res.tx) { setError(res.message); setBusy(false); return; }
      const r = await fetch('/api/deposits/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        txId: res.tx.id, userId: user.id, userNumericId: user.numericId, userName: user.fullName, username: user.username,
        phone: user.phone, cardNumber: user.cardNumber, iban: user.iban, amountTomans: amount, trackingCode: res.tx.trackingCode, image,
      }) }).then(x => x.json());
      if (!r.success) { setError(r.message || 'ارسال رسید ناموفق بود.'); store.deleteTransactionPermanently(res.tx.id); setBusy(false); return; }
      const now = new Date();
      setSent({ date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(now), time: new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(now) });
      sound.playSuccess();
    } catch { setError('خطا در ارسال رسید؛ دوباره تلاش کنید.'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[28px] bg-white dark:bg-[#111c2e] border border-slate-200 dark:border-slate-700/60 p-4 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{step === 'choose' ? 'روش پرداخت را انتخاب کنید' : 'کارت به کارت فوری'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        {step === 'choose' ? (
          <>
            <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <p className="font-black text-sm text-slate-900 dark:text-white"><span className="text-slate-400">روش اول : </span>کارت به کارت از طریق تلگرام</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 rounded-2xl bg-white dark:bg-slate-900/60 p-3 leading-6">ممکن است عملیات افزایش اعتبار بیش از حد معمول طول بکشد<br /><span className="text-emerald-600 dark:text-emerald-400 font-bold">مزایا: بدون صف انتظار</span></p>
              <button onClick={onTelegram} className="w-full h-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm flex items-center justify-center gap-2"><Send className="w-4 h-4" />ادامه پرداخت ( تلگرام )</button>
            </div>
            <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <p className="font-black text-sm text-slate-900 dark:text-white"><span className="text-slate-400">روش دوم : </span>کارت به کارت فوری</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 rounded-2xl bg-white dark:bg-slate-900/60 p-3 leading-6">با استفاده از شماره کارت همین قسمت می‌توانید کارت به کارت انجام بدید و رسید ارسال کنید<br />
                <span className="text-rose-500 font-bold">⚠ هشدار: در صورت مشاهده و ارسال رسید فیک، بی چون و چرا حساب کاربری شما بطور دائم حذف می‌شود</span><br />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">مزایا: واریز ۵ دقیقه الی ۱ ساعت</span></p>
              <button onClick={() => { sound.playClick(); setStep('instant'); }} className="w-full h-12 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" />ادامه پرداخت ( سایت )</button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center text-xs font-bold text-slate-500">مبلغ واریز: <span className="text-slate-900 dark:text-white font-black">{amount.toLocaleString('fa-IR')} تومان</span></div>
            {sent ? <p className="text-center text-amber-500 font-black text-sm">در انتظار تایید نهایی...</p> : queueFull ? (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/50 p-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2"><Clock className="w-4 h-4 shrink-0" />صف کارت‌به‌کارت فوری پر است ({queue!.pending.toLocaleString('fa-IR')} درخواست در حال بررسی). به محض آزاد شدن صف، می‌توانید رسید ارسال کنید یا از روش تلگرام استفاده کنید.</div>
            ) : null}

            {DESTINATION_CARDS.map(c => (
              <div key={c.number} className="space-y-1.5">
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{c.bank}</p>
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/70 px-3 py-3">
                  <span className="text-sm font-black text-slate-800 dark:text-white shrink-0">{c.holder}</span>
                  <span dir="ltr" className="font-mono font-black text-base sm:text-lg tracking-wide text-slate-700 dark:text-slate-200 tabular-nums">{c.number}</span>
                  <button onClick={() => copy(c.number, c.number)} className="p-2 rounded-xl text-sky-600 hover:bg-white dark:hover:bg-slate-700 shrink-0" title="کپی شماره کارت">
                    {copied === c.number ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="border-t border-slate-200 dark:border-slate-700/60 pt-3 space-y-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
              {image ? (
                <button type="button" disabled={!!sent} onClick={() => fileRef.current?.click()} className="w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700"><img src={image} alt="رسید واریز" className="w-full max-h-64 object-contain bg-slate-50 dark:bg-slate-900" /></button>
              ) : (
                <button type="button" disabled={queueFull} onClick={() => fileRef.current?.click()} className="w-full h-28 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1.5 text-slate-500 disabled:opacity-50"><Upload className="w-6 h-6" /><span className="text-xs font-bold">آپلود تصویر رسید کارت به کارت</span></button>
              )}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-6">
                <div>
                  <div>شناسه کاربری شما: <b className="text-slate-800 dark:text-slate-200">{(user?.numericId || '').toLocaleString?.('fa-IR', { useGrouping: false }) ?? user?.numericId}</b></div>
                  {sent && <div>تاریخ ارسال رسید: <b>{sent.date}</b></div>}
                  {sent && <div>ساعت ارسال: <b>{sent.time}</b></div>}
                  <div>شماره کارت شما: <b dir="ltr" className="font-mono">{user?.cardNumber || 'ثبت نشده'}</b></div>
                </div>
                <div>{sent ? 'رسید شما با موفقیت ارسال شد و پس از تایید نهایی مدیریت، حساب شما شارژ خواهد شد.' : 'پس از واریز، تصویر رسید را بارگذاری و ارسال کنید.'}</div>
              </div>
              {error && <p className="text-xs text-rose-500 font-bold flex gap-1"><AlertTriangle className="w-4 h-4" />{error}</p>}
              <button disabled={!image || busy || !!sent || queueFull} onClick={sent ? onDone : submit}
                className="w-full h-14 rounded-3xl font-black text-base bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-5 h-5 animate-spin" />}{sent ? 'رسید ارسال شد' : 'ارسال رسید'}
              </button>
              {sent && <button onClick={onDone} className="w-full text-xs font-bold text-sky-600">بستن</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
