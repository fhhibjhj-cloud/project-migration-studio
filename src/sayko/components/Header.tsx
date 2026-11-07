// @ts-nocheck
import React from 'react';
import { Sun, Moon, Bell, ChevronLeft, CheckCheck, X } from 'lucide-react';
import { SaykoLogo } from './SaykoLogo';
import { store, NotificationItem } from '../lib/store';
import { Theme } from '../lib/theme';
import { sound } from '../lib/audio';

export type PageRoute = 'home' | 'shishpar' | 'account' | 'admin' | 'live' | 'support' | 'messages' | 'poll';

export type BellBadgeType = 'win' | 'defeat' | 'standard' | null;

interface HeaderProps {
  currentTheme: Theme;
  onToggleTheme: () => void;
  unreadNotificationsCount: number;
  bellBadgeType?: BellBadgeType;
  onOpenNotifications: () => void;
  currentPage: PageRoute;
  onNavigateHome: () => void;
  pageTitle?: string;
}

const PAGE_TITLES: Record<PageRoute, string> = {
  home: 'سایکو آنالیز',
  shishpar: 'شش پره',
  live: 'پخش زنده',
  support: 'پشتیبانی',
  account: 'حساب کاربری',
  admin: 'مدیریت',
  messages: 'صندوق پیام',
  poll: 'نظرسنجی شش پره',
};

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  onToggleTheme,
  unreadNotificationsCount,
  bellBadgeType,
  onOpenNotifications,
  currentPage,
  onNavigateHome,
  pageTitle,
}) => {
  const isHome = currentPage === 'home';
  const activeTitle = pageTitle || PAGE_TITLES[currentPage] || 'سایکو';

  return (
    <header className="app-header sticky top-0 z-40 w-full bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2 transition-colors duration-200">
      {/* Explicit LTR flex row so:
          - Child 1: FAR LEFT (Theme Toggle on Home / Clean Back Arrow Button (<) on Internal Pages)
          - Child 2: DEAD CENTER (Official SAYKO Horse Logo on Home / Exact Page Title on Internal Pages)
          - Child 3: FAR RIGHT (Notification Bell with dynamic win/defeat status badge)
      */}
      <div className="max-w-xl mx-auto flex items-center justify-between min-h-[44px]" dir="ltr">
        
        {/* FAR LEFT: Theme Mode Toggle on Home / Clean Back Arrow Button (<) on Internal Pages */}
        <div className="flex items-center justify-start min-w-[44px]">
          {isHome ? (
            <button
              onClick={() => { sound.playClick(); onToggleTheme(); }}
              aria-label="تغییر حالت شب و روز"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400 stroke-[2.2]" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700 stroke-[2.2]" />
              )}
            </button>
          ) : (
            <button
              onClick={() => { sound.playClick(); onNavigateHome(); }}
              aria-label="بازگشت به خانه"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.4]" />
            </button>
          )}
        </div>

        {/* DEAD CENTER: Official SAYKO Horse Logo on Home / Exact Page Title on Internal Pages */}
        <div className="flex items-center justify-center flex-1 px-2 text-center" dir="rtl">
          {isHome ? (
            <div className="flex items-center justify-center -mt-1 -translate-y-0.5 bg-transparent border-0 shadow-none">
              <SaykoLogo size="md" />
            </div>
          ) : (
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              {activeTitle}
            </h1>
          )}
        </div>

        {/* FAR RIGHT: Notification Bell with Dynamic Badges:
            - Small solid green circle for Win ("برنده شدید")
            - Small solid red circle for Defeat ("شکست")
            - Standard counter badge for other unread messages
        */}
        <div className="flex items-center justify-end min-w-[44px]">
          <button
            onClick={() => { sound.playClick(); onOpenNotifications(); }}
            aria-label="اعلان‌ها"
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer"
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {bellBadgeType === 'win' ? (
              <span 
                title="برنده شدید!"
                className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#00E676] rounded-full border-2 border-white dark:border-[#111827] shadow-xs animate-pulse ring-2 ring-emerald-400/40" 
              />
            ) : bellBadgeType === 'defeat' ? (
              <span 
                title="شکست"
                className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white dark:border-[#111827] shadow-xs ring-2 ring-red-400/40" 
              />
            ) : unreadNotificationsCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#111827] animate-pulse">
                {unreadNotificationsCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
}) => {
  if (!isOpen) return null;

  const handleMarkAll = () => {
    store.markAllNotificationsAsRead();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">اعلان‌های سیستم سایکو</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              title="علامت همه به عنوان خوانده شده"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>خواندن همه</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto py-3 space-y-2.5 flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">اعلانی برای نمایش وجود ندارد.</p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => store.markNotificationAsRead(item.id)}
                className={`pt-2.5 first:pt-0 cursor-pointer rounded-xl p-2 transition-colors ${
                  !item.read ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {!item.read && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    {item.title}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{item.time}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed selectable-text">
                  {item.message}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
