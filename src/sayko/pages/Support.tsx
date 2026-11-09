// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  Send, 
  HelpCircle,
  CheckCheck,
  User,
  ArrowRight
} from 'lucide-react';
import { store } from '../lib/store';
import { sound } from '../lib/audio';
import { 
  fetchSupportMessagesFromDb, 
  insertSupportMessageToDb, 
  subscribeToSupportMessages,
  SupabaseChatMessage 
} from '../lib/supabase';

interface SupportProps {
  onBackToHome: () => void;
  onOpenAuth?: () => void;
}

interface DisplayMessage {
  id: string | number;
  sender: 'user' | 'support';
  text: string;
  time: string;
  timestamp?: number;
}

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export const Support: React.FC<SupportProps> = ({ onBackToHome, onOpenAuth }) => {
  const [message, setMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const currentUser = store.currentUser;
  const [isAdminOnline, setIsAdminOnline] = useState<boolean>(store.isAdminOnline());
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  // Function to load and format messages for current user from store and Supabase
  const loadMessagesFromStore = () => {
    if (!currentUser) return;
    store.cleanupExpiredSupportMessages();
    const ticket = store.supportTickets.find((t) => t.userId === currentUser.id);
    if (ticket && ticket.messages && ticket.messages.length > 0) {
      const now = Date.now();
      const validMsgs: DisplayMessage[] = ticket.messages
        .filter((m) => !m.timestamp || (now - m.timestamp < TEN_DAYS_MS))
        .map((m) => ({
          id: m.id || `msg_${Date.now()}_${Math.random()}`,
          sender: m.sender,
          text: m.text,
          time: m.time,
          timestamp: m.timestamp,
        }));
      setMessages(validMsgs);
    } else {
      setMessages([]);
    }
  };

  useEffect(() => {
    return store.subscribe(() => {
      setIsAdminOnline(store.isAdminOnline());
      loadMessagesFromStore();
    });
  }, [currentUser?.id]);

  // Fetch persistent chat history from Supabase on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;
    let isMounted = true;

    loadMessagesFromStore();

    async function loadHistory() {
      try {
        const dbMsgs = await fetchSupportMessagesFromDb(userId);
        if (isMounted && dbMsgs && dbMsgs.length > 0) {
          const now = Date.now();
          const formatted: DisplayMessage[] = dbMsgs
            .filter((m) => {
              if (!m.created_at) return true;
              const msgTime = new Date(m.created_at).getTime();
              return now - msgTime < TEN_DAYS_MS;
            })
            .map((m) => ({
              id: m.id || Math.random(),
              sender: m.sender,
              text: m.text,
              time: m.created_at
                ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.created_at))
                : 'هم‌اکنون',
              timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
            }));

          setMessages((prev) => {
            const combined = [...prev];
            formatted.forEach((f) => {
              if (!combined.some((c) => c.text === f.text && c.sender === f.sender)) {
                combined.push(f);
              }
            });
            return combined;
          });
        }
      } catch (err) {
        console.warn('Could not load messages from Supabase:', err);
      }
    }

    loadHistory();

    // Real-time subscription to new messages from Supabase
    const unsubscribe = subscribeToSupportMessages(currentUser.id, (newMsg: SupabaseChatMessage) => {
      setMessages((prev) => {
        if (prev.some((p) => p.text === newMsg.text && p.sender === newMsg.sender)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: newMsg.id || Date.now(),
            sender: newMsg.sender,
            text: newMsg.text,
            time: newMsg.created_at
              ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(newMsg.created_at))
              : 'هم‌اکنون',
            timestamp: newMsg.created_at ? new Date(newMsg.created_at).getTime() : Date.now(),
          },
        ];
      });
      sound.playClick();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Zero-state if user is not logged in (Guarantees no session leakage)
  if (!currentUser || currentUser.isGuest) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 text-center space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-500 mx-auto flex items-center justify-center">
          <Headphones className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">پشتیبانی آنلاین سایکو</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          برای ارسال پیام به پشتیبانی، ثبت تیکت و پیگیری پیام‌ها، لطفاً ابتدا وارد حساب کاربری خود شوید یا ثبت‌نام کنید.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>ورود یا ثبت‌نام</span>
            </button>
          )}
          <button
            onClick={onBackToHome}
            className="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>بازگشت به خانه</span>
          </button>
        </div>
      </div>
    );
  }

  // Send message handler inserting directly into store and Supabase
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sound.playClick();
    const textToSend = message.trim();
    setMessage('');

    // 1. Add to AppStore (this creates or appends to user's ticket in store.supportTickets & notifies admin)
    store.addSupportMessage(currentUser.id, currentUser.fullName, textToSend, 'user');

    // 2. Also insert directly into Supabase messages table
    await insertSupportMessageToDb({
      userId: currentUser.id,
      userName: currentUser.fullName,
      sender: 'user',
      text: textToSend,
    });

    // 3. Automated support response with exact required text
    setTimeout(async () => {
      const replyText =
        'پیام شما با موفقیت به پشتیبانی ارسال شد، طی چند ساعت آینده به شما جواب داده خواهد شد';

      store.addSupportMessage(currentUser.id, currentUser.fullName, replyText, 'support');

      await insertSupportMessageToDb({
        userId: currentUser.id,
        userName: currentUser.fullName,
        sender: 'support',
        text: replyText,
      });
    }, 700);
  };

  const handleQuickQuestion = (q: string) => {
    sound.playClick();
    setMessage(q);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-3 space-y-3 pb-4 gpu-layer flex-1 flex flex-col min-h-0" dir="rtl">
      
      {/* Support Status & Overview Card */}
      <div className="bg-white dark:bg-[#151d2a] rounded-[22px] p-4 shadow-xs border border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-800/40">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                پشتیبانی آنلاین سایکو
              </h2>
              {isAdminOnline ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  آنلاین
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  آفلاین
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              کاربر: <span className="font-bold text-slate-600 dark:text-slate-300">{currentUser.fullName}</span> (شناسه: #{currentUser.numericId || 10842})
            </div>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end text-xs text-slate-400">
          <span className="font-bold text-slate-700 dark:text-slate-300">میانگین پاسخ:</span>
          <span>کمتر از ۵ دقیقه</span>
        </div>
      </div>

      {/* Quick FAQ Pills */}
      <div className="space-y-1 shrink-0">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pr-1 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>پرسش‌های متداول و سریع:</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            'قوانین انتخاب اسب‌های جایگزین چیست؟',
            'تسویه جوایز برندگان چقدر زمان می‌برد؟',
            'نحوه افزایش موجودی با کارت به کارت چگونه است؟',
          ].map((faq, i) => (
            <button
              key={i}
              onClick={() => handleQuickQuestion(faq)}
              className="text-[10.5px] bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            >
              {faq}
            </button>
          ))}
        </div>
      </div>

      {/* Support Conversation Box */}
      <div className="bg-white dark:bg-[#151d2a] rounded-[24px] p-3.5 sm:p-4 shadow-xs border border-slate-100 dark:border-slate-800/80 flex flex-col flex-1 min-h-[300px] max-h-[calc(100dvh-260px)] sm:max-h-none sm:h-[450px]">
        
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Headphones className="w-10 h-10 opacity-30" />
              <p className="text-xs font-bold">هنوز پیامی ارسال نکرده‌اید.</p>
              <p className="text-[11px] max-w-xs leading-relaxed opacity-75">
                سوال یا درخواست خود را در کادر زیر بنویسید؛ پیام شما مستقیماً برای مدیر ارسال خواهد شد.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-emerald-500 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                    <span>{m.time}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیام یا سوال خود را بنویسید..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            aria-label="ارسال پیام"
          >
            <Send className="w-4 h-4 -scale-x-100" />
          </button>
        </form>

      </div>

    </div>
  );
};
