import { store } from '../lib/store';
// @ts-nocheck
import React from 'react';
import { 
  Home, 
  Trophy, 
  Radio, 
  Mail, 
  Headphones, 
  User 
} from 'lucide-react';
import { PageRoute } from './Header';
import { sound } from '../lib/audio';

interface GlassmorphicNavBarProps {
  currentPage: PageRoute;
  onNavigate: (route: PageRoute) => void;
  unreadCount?: number;
}

interface NavItem {
  id: PageRoute;
  label: string;
  icon: React.ElementType;
  badge?: number;
  isLive?: boolean;
}

export const GlassmorphicNavBar: React.FC<GlassmorphicNavBarProps> = ({
  currentPage,
  onNavigate,
  unreadCount = 0,
}) => {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => store.subscribe(force), []);
  const me = store.currentUser;
  const seenKey = `sayko_support_seen_${me?.id || ''}`;
  const lastAdminReply = me ? Math.max(0, ...store.supportTickets.filter(t => t.userId === me.id).flatMap(t => t.messages || []).filter(m => m.sender === 'support').map(m => Number(m.timestamp) || 0)) : 0;
  const seenAt = typeof window !== 'undefined' ? Number(localStorage.getItem(seenKey) || 0) : 0;
  const hasNewSupport = !!me && lastAdminReply > seenAt && currentPage !== 'support';
  React.useEffect(() => {
    if (me && currentPage === 'support' && lastAdminReply > seenAt) localStorage.setItem(seenKey, String(Date.now()));
  }, [currentPage, lastAdminReply, me?.id]);
  const navItems: NavItem[] = [
    { id: 'home', label: 'خانه', icon: Home },
    { id: 'shishpar', label: 'شش پره', icon: Trophy },
    { id: 'live', label: 'پخش زنده', icon: Radio, isLive: true },
    { id: 'messages', label: 'صندوق پیام', icon: Mail, badge: unreadCount },
    { id: 'support', label: 'پشتیبانی', icon: Headphones },
    { id: 'account', label: 'حساب من', icon: User },
  ];

  return (
    <nav
      aria-label="منوی اصلی و دسترسی سریع"
      dir="rtl"
      className="fixed bottom-3 left-0 right-0 max-w-md mx-auto px-3 z-40 pointer-events-none select-none transition-all duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Frosted Glass Bar Container */}
      <div className="pointer-events-auto w-full px-2 py-1.5 rounded-[22px] sm:rounded-[26px] bg-white/80 dark:bg-[#07111e]/85 backdrop-blur-xl sm:backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_45px_-5px_rgba(0,0,0,0.65)] ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300">
        <ul className="flex items-center justify-around gap-1 p-0 m-0 list-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <li key={item.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onNavigate(item.id);
                  }}
                  className={`relative w-full py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer touch-manipulation group ${
                    isActive
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-[#00E676] font-black'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Icon Wrapper with Badge / Live indicator */}
                  <div className="relative flex items-center justify-center">
                    <Icon
                      className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-transform duration-200 ${
                        isActive
                          ? 'scale-110 stroke-[2.5]'
                          : 'stroke-[1.8] group-hover:scale-105'
                      }`}
                    />

                    {/* Unread Messages Badge */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-red-500 text-white text-[9px] font-mono font-black rounded-full flex items-center justify-center shadow-xs animate-pulse">
                        {item.badge > 9 ? '۹+' : item.badge}
                      </span>
                    )}

                    {item.id === 'support' && hasNewSupport && (
                      <span className="absolute -top-1.5 -right-3 px-1 h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center shadow-xs animate-pulse">NEW</span>
                    )}

                    {/* Live Stream Pulsing Indicator */}
                    {item.isLive && (
                      <span className="absolute -top-0.5 -left-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                  </div>

                  {/* Label Text */}
                  <span
                    className={`text-[9.5px] sm:text-[10px] tracking-tight truncate max-w-full leading-tight transition-colors ${
                      isActive
                        ? 'text-emerald-700 dark:text-[#00E676]'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Active Bottom Glow Line */}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-emerald-500 dark:bg-[#00E676] shadow-xs" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
