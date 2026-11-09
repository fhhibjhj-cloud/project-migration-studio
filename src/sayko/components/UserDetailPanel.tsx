import React, { useState } from 'react';
import { store, UserProfile } from '../lib/store';
import { isBanActive, isOnlineNow } from '../lib/userStatus';

const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');
const txLabel: Record<string, string> = { deposit: 'واریز', withdraw: 'برداشت', prediction_fee: 'ثبت برگه', prediction_win: 'جایزه', refund: 'عودت' };
const stLabel: Record<string, string> = { approved: 'تایید شده', pending: 'در انتظار', rejected: 'رد شده', won: 'برد', lost: 'باخت' };

export function UserDetailPanel({ user, onClose, onAdjust, toast }: { user: UserProfile; onClose: () => void; onAdjust: () => void; toast: (m: string) => void }) {
  const [open, setOpen] = useState<'tx' | 'slips' | null>(null);
  const [slipId, setSlipId] = useState<string | null>(null);
  const [days, setDays] = useState(20);
  const [confirmDel, setConfirmDel] = useState(false);
  const live = store.users.find(u => u.id === user.id) || user;
  const online = live.isOnline || isOnlineNow(live.lastSeenAt);
  const txs = store.transactions.filter(t => t.userId === user.id).filter(t => t.type === 'deposit' || t.type === 'withdraw');
  const slips = store.predictions.filter(p => p.userId === user.id);
  const wins = slips.filter(s => s.status === 'won').length;
  const losses = slips.filter(s => s.status === 'lost').length;
  const banned = isBanActive(live);
  const box = 'p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs';
  return (
    <>
      <div className={box}>
        <h4 className="font-extrabold text-emerald-500">۲. وضعیت آنلاین</h4>
        <div className="flex justify-between text-[11px]">
          <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />{online ? 'آنلاین' : 'آفلاین'}</span>
          <span>آخرین فعالیت: {live.lastSeenAt ? new Date(live.lastSeenAt).toLocaleString('fa-IR') : 'نامشخص'}</span>
        </div>
      </div>
      <div className={box}>
        <button onClick={() => setOpen(open === 'tx' ? null : 'tx')} className="w-full flex justify-between font-extrabold text-amber-500">
          <span>۳. تاریخچه واریز و برداشت ({fa(txs.length)})</span><span>{open === 'tx' ? '▲' : '▼'}</span>
        </button>
        <div className="text-[11px]">موجودی: <b className="text-emerald-500">{fa(live.balanceTomans)} تومان</b></div>
        {open === 'tx' && (txs.length === 0 ? <p className="text-slate-400">تراکنشی ثبت نشده.</p> :
          <div className="max-h-60 overflow-y-auto space-y-1.5">{txs.map(t => (
            <div key={t.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl flex justify-between text-[11px]">
              <span className={t.type === 'deposit' ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>{txLabel[t.type]} • {stLabel[t.status]}</span>
              <span className="font-mono">{fa(t.approvedAmountTomans ?? t.amountTomans)} ت</span>
              <span className="text-slate-400">{t.date}</span>
            </div>))}</div>)}
      </div>
      <div className={box}>
        <button onClick={() => setOpen(open === 'slips' ? null : 'slips')} className="w-full flex justify-between font-extrabold text-purple-500">
          <span>۴. سوابق پیش‌بینی ({fa(slips.length)})</span><span>{open === 'slips' ? '▲' : '▼'}</span>
        </button>
        <div className="flex justify-around text-[11px]"><span>برد: <b className="text-emerald-500">{fa(wins)}</b></span><span>باخت: <b className="text-red-500">{fa(losses)}</b></span><span>در انتظار: <b>{fa(slips.length - wins - losses)}</b></span></div>
        {open === 'slips' && (slips.length === 0 ? <p className="text-slate-400">رسیدی ثبت نشده.</p> :
          <div className="max-h-72 overflow-y-auto space-y-1.5">{slips.map(s => (
            <div key={s.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl text-[11px]">
              <button onClick={() => setSlipId(slipId === s.id ? null : s.id)} className="w-full flex justify-between">
                <span className={s.status === 'won' ? 'text-emerald-500 font-bold' : s.status === 'lost' ? 'text-red-500 font-bold' : 'font-bold'}>{stLabel[s.status] || 'در انتظار'}</span>
                <span className="font-mono">{fa(s.totalCostTomans)} ت</span><span className="text-slate-400">{s.submittedAt}</span>
              </button>
              {slipId === s.id && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <div>شناسه: <span className="font-mono">{s.id}</span> • ترکیب‌ها: {fa(s.combinationsCount)}</div>
                  {Object.entries(s.selections || {}).map(([c, h]) => (
                    <div key={c}>کورس {c}: [{(h as number[]).join('.')}]{(s.replacementSelections?.[Number(c)] ?? []).length ? ` رزرو: ${(s.replacementSelections?.[Number(c)] ?? []).join('.')}` : ''}</div>))}
                  {!!s.payoutTomans && <div className="text-emerald-500">جایزه: {fa(s.payoutTomans)} ت</div>}
                  {!!s.refundedAmountTomans && <div className="text-emerald-500">عودت: {fa(s.refundedAmountTomans)} ت</div>}
                </div>)}
            </div>))}</div>)}
      </div>
      <div className={box}>
        <h4 className="font-extrabold text-red-500">۵. مسدودسازی و حذف</h4>
        {banned ? (
          <div className="flex items-center justify-between gap-2">
            <span>مسدود {live.bannedUntil ? `تا ${new Date(live.bannedUntil).toLocaleDateString('fa-IR')}` : 'دائم'}</span>
            <button onClick={() => { store.unbanUser(user.id); toast('مسدودی برداشته شد.'); }} className="px-3 h-9 rounded-xl bg-emerald-600 text-white font-bold">رفع مسدودی</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))} className="w-20 h-9 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono" />
            <span>روز</span>
            <button onClick={() => { if (days < 1) return; store.banUserForDays(user.id, days); toast(`کاربر برای ${fa(days)} روز مسدود شد.`); }} className="flex-1 h-9 rounded-xl bg-red-600 text-white font-bold">تایید مسدودسازی</button>
          </div>
        )}
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} className="w-full h-9 rounded-xl border border-red-500 text-red-500 font-bold">حذف دائمی کاربر</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={async () => { await store.deleteUserPermanently(user.id); toast('کاربر برای همیشه حذف شد.'); onClose(); }} className="flex-1 h-9 rounded-xl bg-red-700 text-white font-bold">بله، حذف شود</button>
            <button onClick={() => setConfirmDel(false)} className="flex-1 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold">انصراف</button>
          </div>
        )}
      </div>
      <button onClick={onAdjust} className="w-full h-10 rounded-xl bg-blue-600 text-white font-black text-xs">تغییر موجودی کاربر</button>
    </>
  );
}
