// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  MessageSquare, 
  Send,
  Trophy,
  Clock,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { store } from '../lib/store';
import { sound } from '../lib/audio';
import { StreamPlayer } from '../components/StreamPlayer';
import { fetchLiveChatFromDb, insertLiveChatMessageToDb, isSupabaseConfigured } from '../lib/supabase';

interface LiveProps {
  onBackToHome: () => void;
  onNavigateToShishPar?: () => void;
}

interface ChatMessage {
  id: number | string;
  user: string;
  text: string;
  time: string;
}

export const Live: React.FC<LiveProps> = ({ onBackToHome, onNavigateToShishPar }) => {
  const [streamUrl, setStreamUrl] = useState(store.liveStreamUrl);
  const [chatMessage, setChatMessage] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [chatList, setChatList] = useState<ChatMessage[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 15-Second Cooldown Timer countdown effect
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Fetch live chat from Supabase (if connected) or centralized server DB
  const fetchLiveChat = async () => {
    try {
      if (isSupabaseConfigured) {
        const dbMsgs = await fetchLiveChatFromDb();
        if (Array.isArray(dbMsgs)) setChatList(dbMsgs);
        return;
      }

      const res = await fetch('/api/chat/live');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setChatList(data.messages);
        }
      }
    } catch {
      // Ignore background sync errors
    }
  };

  useEffect(() => {
    fetchLiveChat();
    const interval = setInterval(fetchLiveChat, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return store.subscribe(() => {
      setStreamUrl(store.liveStreamUrl);
    });
  }, []);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatList.length]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Strict 15-Second Cooldown Verification
    if (cooldownRemaining > 0) {
      sound.playAlert();
      return;
    }

    const current = store.currentUser?.fullName || 'کاربر سایکو';
    const textToSend = chatMessage.trim();
    sound.playClick();

    // Start 15-second cooldown immediately
    setCooldownRemaining(15);

    const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      user: current,
      text: textToSend,
      time: timeFa,
    };
    setChatList((prev) => [...prev, optimisticMsg]);
    setChatMessage('');

    try {
      // 1. Send to Supabase if configured
      if (isSupabaseConfigured) {
        await insertLiveChatMessageToDb({ user: current, text: textToSend });
      }

      // 2. Fallback only when no database is configured
      if (!isSupabaseConfigured) await fetch('/api/chat/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: current, text: textToSend }),
      });
      fetchLiveChat();
    } catch {
      // Handled optimistically
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-3 space-y-4 pb-6 gpu-layer" dir="rtl">
      
      {/* Video Broadcast Player Card */}
      <div className="relative rounded-[24px] overflow-hidden shadow-2xl border border-slate-800 bg-black">
        {/* Stream Status Overlay Badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white shadow-lg animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />
            زنده (LIVE)
          </span>
          <span className="bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
            Full HD
          </span>
        </div>

        {/* Real Embedded Stream Player with Aparat & Direct Stream Support */}
        <StreamPlayer 
          streamUrl={streamUrl || 'https://www.aparat.com/Asbdavani_app/live'} 
          title="پخش زنده مسابقات اسب‌دوانی گنبد کاووس"
          className="w-full rounded-[24px]"
        />
      </div>

      {/* ShishPar Quick Banner */}
      {onNavigateToShishPar && (
        <div 
          onClick={() => { sound.playClick(); onNavigateToShishPar(); }}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[20px] p-3.5 text-white flex items-center justify-between cursor-pointer hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="font-extrabold text-xs">پیش‌بینی شش پره این هفته</p>
              <p className="text-[11px] text-white/80">هم‌زمان با پخش، فرم خود را ثبت یا ویرایش کنید</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white text-emerald-700 px-3 py-1 rounded-xl shadow-xs">
            ثبت فرم
          </span>
        </div>
      )}

      {/* Live Chat & Fan Reaction Room */}
      <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-4 shadow-xs border border-slate-100 dark:border-slate-800/80 flex flex-col h-[360px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">گفتگوی زنده تماشاگران</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>پاک‌سازی خودکار ۲۴ ساعته</span>
          </div>
        </div>

        {/* Message Feed */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {chatList.map((chat) => (
            <div key={chat.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                  {chat.user}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{chat.time}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed">
                {chat.text}
              </p>
            </div>
          ))}
        </div>

        {/* Cooldown Status Pill */}
        {cooldownRemaining > 0 && (
          <div className="py-1 px-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-1 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>مهلت ارسال پیام بعدی:</span>
            </span>
            <span className="font-mono text-xs">{cooldownRemaining.toLocaleString('fa-IR')} ثانیه</span>
          </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSendChat} className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            disabled={cooldownRemaining > 0}
            placeholder={cooldownRemaining > 0 ? `لطفاً ${cooldownRemaining} ثانیه صبر کنید...` : "دیدگاه خود را درباره کورس بنویسید..."}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-60 transition-all"
          />
          <button
            type="submit"
            disabled={!chatMessage.trim() || cooldownRemaining > 0}
            className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
          >
            {cooldownRemaining > 0 ? (
              <span className="font-mono text-[11px]">{cooldownRemaining}s</span>
            ) : (
              <Send className="w-4 h-4 rotate-180" />
            )}
          </button>
        </form>
      </div>

    </div>
  );
};
