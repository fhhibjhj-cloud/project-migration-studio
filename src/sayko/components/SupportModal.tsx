// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { X, Headphones, Send, PhoneCall, CheckCircle2, MessageCircle, CheckCheck } from 'lucide-react';
import { store } from '../lib/store';
import { sound } from '../lib/audio';
import {
  fetchSupportMessagesFromDb,
  insertSupportMessageToDb,
  subscribeToSupportMessages,
  SupabaseChatMessage,
} from '../lib/supabase';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DisplayMessage {
  id: string | number;
  sender: 'user' | 'support';
  text: string;
  time: string;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const currentUser = store.currentUser || { id: 'user_sample', fullName: 'آرش گلستانی' };

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'default_welcome',
      sender: 'support',
      text: 'سلام! به سامانه پشتیبانی سایکو آنالیز خوش آمدید. کارشناسان ما آماده پاسخگویی به سوالات شما درباره پیش‌بینی شش پره، تسویه‌ها و مسابقات هستند.',
      time: 'پشتیبانی آنلاین',
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadHistory() {
      try {
        const dbMsgs = await fetchSupportMessagesFromDb(currentUser.id);
        if (isMounted && dbMsgs && dbMsgs.length > 0) {
          const formatted: DisplayMessage[] = dbMsgs.map((m) => ({
            id: m.id || Math.random(),
            sender: m.sender,
            text: m.text,
            time: m.created_at
              ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.created_at))
              : 'هم‌اکنون',
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.warn('Error loading support modal messages:', err);
      }
    }

    loadHistory();

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
          },
        ];
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, currentUser.id]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sound.playClick();
    const textToSend = message.trim();
    const tempId = Date.now();

    const userMsg: DisplayMessage = {
      id: tempId,
      sender: 'user',
      text: textToSend,
      time: 'هم‌اکنون',
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');

    // Insert directly into Supabase messages table
    await insertSupportMessageToDb({
      userId: currentUser.id,
      userName: currentUser.fullName,
      sender: 'user',
      text: textToSend,
    });

    // Simulate smart auto-reply
    setTimeout(async () => {
      const replyText =
        'پیام شما دریافت و در سامانه پشتیبانی ثبت شد. همکاران ما در بخش پشتیبانی فنی و مالی در حال بررسی هستند و ظرف حداکثر ۱۰ دقیقه پاسخ شما را ارسال می‌کنند.';
      const supportMsg: DisplayMessage = {
        id: Date.now() + 1,
        sender: 'support',
        text: replyText,
        time: 'پشتیبانی فنی سایکو',
      };
      setMessages((prev) => [...prev, supportMsg]);

      await insertSupportMessageToDb({
        userId: currentUser.id,
        userName: currentUser.fullName,
        sender: 'support',
        text: replyText,
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Support Header */}
        <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border-b border-sky-100 dark:border-sky-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-sm">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">پشتیبانی ۲۴ ساعته سایکو</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                متصل به دیتابیس آنلاین
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Support Direct Contacts */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-around text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <PhoneCall className="w-3.5 h-3.5 text-sky-500" />
            <span>تماس اضطراری: ۰۱۷-۳۳۲۲۰۰۰۰</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>تلگرام: @SaykoSupport</span>
          </div>
        </div>

        {/* Chat message history */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[220px]">
          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-emerald-500 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
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
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="w-10 h-10 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
