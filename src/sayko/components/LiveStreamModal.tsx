// @ts-nocheck
import React, { useState } from 'react';
import { X, Radio, MessageSquare, Send } from 'lucide-react';
import { store } from '../lib/store';
import { StreamPlayer } from './StreamPlayer';

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({ isOpen, onClose }) => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatList, setChatList] = useState([
    { id: 1, user: 'ترکمن_صحرا', text: 'کورس چهارم تروبرد واقعاً دیدنیه!', time: 'لحظاتی پیش' },
    { id: 2, user: 'گنبد_رِیسر', text: 'اسب شماره ۱ کورس ۶ فانتوم جت بخت اوله', time: '۱ دقیقه پیش' },
    { id: 3, user: 'آراز_توماج', text: 'گزارشگر عالیه دمش گرم', time: '۲ دقیقه پیش' },
  ]);

  if (!isOpen) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const current = store.currentUser?.fullName || 'کاربر سایکو';
    setChatList((prev) => [
      ...prev,
      { id: Date.now(), user: current, text: chatMessage.trim(), time: 'هم‌اکنون' },
    ]);
    setChatMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Stream Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  زنده (LIVE)
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  پخش مستقیم پیست اسب‌دوانی گنبد کاووس
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">کیفیت پخش 1080p Full HD با صدای استریو</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real Embedded Video Player with Aparat & Direct Stream Support */}
        <div className="relative bg-black flex items-center justify-center">
          <StreamPlayer
            streamUrl={store.liveStreamUrl || 'https://www.aparat.com/Asbdavani_app/live'}
            title="پخش مستقیم پیست اسب‌دوانی گنبد کاووس"
            className="w-full aspect-video rounded-none"
          />
        </div>

        {/* Live Race Chat */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 flex-1 flex flex-col min-h-[160px]">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <span>گفتگوی زنده تماشاگران و پیش‌بینان</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[120px] pr-1">
            {chatList.map((c) => (
              <div key={c.id} className="text-xs bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <strong className="text-emerald-600 dark:text-emerald-400 ml-1.5">{c.user}:</strong>
                  <span className="text-slate-700 dark:text-slate-200">{c.text}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 mr-2">{c.time}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="ارسال پیام به اتاق چت زنده..."
              className="flex-1 h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!chatMessage.trim()}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5 rotate-180" />
              <span>ارسال</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
