// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Header, NotificationsModal, PageRoute } from './components/Header';
import { Home } from './pages/Home';
import { ShishPar } from './pages/ShishPar';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { Live } from './pages/Live';
import { Support } from './pages/Support';
import { Inbox } from './pages/Inbox';
import { Poll } from './pages/Poll';

import { AuthModal } from './components/AuthModal';
import { WalletModal } from './components/WalletModal';
import { LiveStreamModal } from './components/LiveStreamModal';
import { SupportModal } from './components/SupportModal';
import { AdminPinModal } from './components/AdminPinModal';
import { GlassmorphicNavBar } from './components/GlassmorphicNavBar';
import ConnectionBanner from './components/ConnectionBanner';

import { store, UserProfile, PredictionWeek, Transaction, NotificationItem } from './lib/store';
import { getInitialTheme, applyTheme, persistTheme, Theme } from './lib/theme';
import { sound } from './lib/audio';
import { haptics } from './lib/haptics';
import { PullToRefresh } from './components/PullToRefresh';
import { ErrorBoundary } from './components/ErrorBoundary';

const getRouteFromLocation = (): PageRoute => {
  try {
    const rawPath = (window.location.pathname || '').replace(/^\//, '').toLowerCase();
    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
    const seg = rawPath.split('/')[0] || rawHash.split('/')[0] || '';
    if (seg === 'shishpar' || seg === 'shish-par' || seg === 'race') return 'shishpar';
    if (seg === 'account' || seg === 'profile') return 'account';
    if (seg === 'admin') return 'admin';
    if (seg === 'live' || seg === 'stream') return 'live';
    if (seg === 'support') return 'support';
    if (seg === 'messages' || seg === 'inbox') return 'messages';
    if (seg === 'poll' || seg === 'survey') return 'poll';
  } catch (e) {
    // fallback safely
  }
  return 'home';
};

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<Theme>('dark');

  // Navigation route: 'home' | 'shishpar' | 'account' | 'admin' | 'live' | 'support' | 'messages'
  const [currentPage, setCurrentPage] = useState<PageRoute>(getRouteFromLocation);

  const navigateTo = (route: PageRoute) => {
    setCurrentPage(route);
    try {
      const url = route === 'home' ? '/' : `/${route}`;
      if (window.location.pathname !== url) {
        window.history.pushState({ page: route }, '', url);
      }
    } catch {
      // Safe fallback if history API is restricted in sandboxes
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getRouteFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authActionPrompt, setAuthActionPrompt] = useState<string | undefined>();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletType, setWalletType] = useState<'deposit' | 'withdraw'>('deposit');
  const [isLiveStreamModalOpen, setIsLiveStreamModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);

  // Secret Easter Egg Trigger: EXACTLY 3 rapid taps on "2026"
  const [secretTaps, setSecretTaps] = useState(0);
  const secretTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    // Only the signed-in main admin account can trigger the admin PIN prompt.
    const cu = store.currentUser;
    const isMainAdmin = !!cu && !cu.isGuest && cu.role === 'admin' && (cu.id === 'user_admin' || cu.username?.toLowerCase() === 'admin');
    if (!isMainAdmin) return;
    try {
      sound.playClick();
      setSecretTaps((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          sound.playSuccess();
          setIsAdminPinOpen(true);
          return 0;
        }
        return next;
      });

      if (secretTimerRef.current) clearTimeout(secretTimerRef.current);
      secretTimerRef.current = setTimeout(() => {
        setSecretTaps(0);
      }, 3500);
    } catch (err) {
      console.warn('handleSecretTap error:', err);
    }
  };

  // Store subscription state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(store.currentUser);
  const [activeWeek, setActiveWeek] = useState<PredictionWeek>(store.activeWeek);
  const [transactions, setTransactions] = useState<Transaction[]>(store.transactions);
  const [notifications, setNotifications] = useState<NotificationItem[]>(store.notifications);
  const [isNavBarEnabled, setIsNavBarEnabled] = useState<boolean>(store.isNavBarEnabled);

  // 1. Initialize Theme according to Section 1.2
  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);

    // Listen to OS theme changes if user has no saved preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme') && !localStorage.getItem('sayko_theme_preference')) {
        const next = e.matches ? 'dark' : 'light';
        setTheme(next);
        applyTheme(next);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, []);

  // Global click event listener for UI audio feedback
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ensure AudioContext is initialized/resumed on user interaction
      sound.initContext();

      // Check if clicked element or its parent is interactive
      const isInteractive = target.closest(
        'button, a, input, select, textarea, [role="button"], [role="switch"], [role="tab"], [tabindex="0"], .cursor-pointer, .card, .capsule, .tab-item, .scratched-horse-capsule'
      );

      if (isInteractive) {
        sound.playClick();
        haptics.tap();
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  const handleToggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  // 2. Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setCurrentUser(store.currentUser ? { ...store.currentUser } : null);
      setActiveWeek({ ...store.activeWeek });
      setTransactions([...store.transactions]);
      setNotifications([...store.notifications]);
      setIsNavBarEnabled(store.isNavBarEnabled);
    });
    return unsubscribe;
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadNotifs = unreadNotifications.length;
  const hasUnreadWin =
    unreadNotifications.some((n) => n.title.includes('برنده شدید') || n.message.includes('برنده شدید')) ||
    store.hasRecentWinnerBadge;
  const hasUnreadDefeat =
    !hasUnreadWin &&
    (unreadNotifications.some((n) => n.title.includes('شکست') || n.message.includes('شکست')) ||
      store.hasRecentDefeatBadge);
  const bellBadgeType = hasUnreadWin ? 'win' : hasUnreadDefeat ? 'defeat' : unreadNotifs > 0 ? 'standard' : null;

  const handleOpenAuthWithPrompt = (msg?: string) => {
    setAuthActionPrompt(msg);
    setIsAuthOpen(true);
  };

  const showNavBar = isNavBarEnabled && currentPage !== 'shishpar' && currentPage !== 'admin';

  return (
    <div className="min-h-screen w-full bg-slate-950 flex justify-center items-start overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-400">
      <PullToRefresh />
      <ConnectionBanner />
      {/* Mobile Frame Container: Centered on desktop/desktop-mode, 100% full width on mobile */}
      <div 
        className={`max-w-md w-full mx-auto min-h-screen ${
          currentPage === 'shishpar' ? 'h-screen max-h-screen overflow-hidden' : ''
        } relative shadow-2xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200 border-x border-slate-200/40 dark:border-slate-800/60`}
      >
        {/* Top Header Bar (.app-header) with Page-Specific Dynamic Navigation */}
        <Header
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
        unreadNotificationsCount={unreadNotifs}
        bellBadgeType={bellBadgeType}
        onOpenNotifications={() => {
          store.hasRecentWinnerBadge = false;
          store.hasRecentDefeatBadge = false;
          store.markAllNotificationsAsRead();
          navigateTo('messages');
        }}
        currentPage={currentPage}
        onNavigateHome={() => navigateTo('home')}
      />

      {/* Main Content Area wrapped in ErrorBoundary to prevent blank screen crashes */}
      <ErrorBoundary onReset={() => navigateTo('home')}>
        <main 
          className={`flex-1 w-full overflow-x-hidden relative flex flex-col ${
            currentPage === 'shishpar' 
              ? 'h-[calc(100dvh-58px)] max-h-[calc(100dvh-58px)] overflow-hidden pb-0' 
              : showNavBar ? 'pb-24 sm:pb-28' : 'pb-6'
          }`}
          style={
            currentPage === 'shishpar' 
              ? undefined 
              : { paddingBottom: showNavBar ? 'calc(env(safe-area-inset-bottom, 16px) + 72px)' : 'env(safe-area-inset-bottom, 20px)' }
          }
        >
          <AnimatePresence mode="wait">
            {/* Fallback to Home if unknown or home */}
            {(currentPage === 'home' || !['shishpar', 'account', 'admin', 'live', 'support', 'messages', 'poll'].includes(currentPage)) && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Home
                  currentUser={currentUser}
                  activeWeek={activeWeek}
                  onNavigateToShishPar={() => navigateTo('shishpar')}
                  onNavigateToAccount={() => navigateTo('account')}
                  onNavigateToAdmin={() => navigateTo('admin')}
                  onNavigateToPoll={() => navigateTo('poll')}
                  onOpenDeposit={() => {
                    setWalletType('deposit');
                    setIsWalletOpen(true);
                  }}
                  onOpenWithdraw={() => {
                    setWalletType('withdraw');
                    setIsWalletOpen(true);
                  }}
                  onOpenLiveStream={() => navigateTo('live')}
                  onOpenSupport={() => navigateTo('support')}
                  onOpenAuth={() => handleOpenAuthWithPrompt()}
                />
              </motion.div>
            )}

            {currentPage === 'shishpar' && (
              <motion.div
                key="shishpar"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="h-full w-full flex flex-col overflow-hidden"
              >
                <ShishPar
                  activeWeek={activeWeek}
                  currentUser={currentUser}
                  onBackToHome={() => navigateTo('home')}
                  onNavigateToInbox={() => navigateTo('messages')}
                  onOpenAuth={() => handleOpenAuthWithPrompt('برای ثبت فرم پیش‌بینی، ابتدا وارد حساب کاربری خود شوید.')}
                  onOpenDeposit={() => {
                    setWalletType('deposit');
                    setIsWalletOpen(true);
                  }}
                />
              </motion.div>
            )}

            {currentPage === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Account
                  currentUser={currentUser}
                  predictions={store.predictions}
                  transactions={transactions}
                  onBackToHome={() => navigateTo('home')}
                  onNavigateToAdmin={() => navigateTo('admin')}
                  onNavigateToMessages={() => navigateTo('messages')}
                  onOpenAuth={() => handleOpenAuthWithPrompt()}
                  onOpenDeposit={() => {
                    setWalletType('deposit');
                    setIsWalletOpen(true);
                  }}
                  onOpenWithdraw={() => {
                    setWalletType('withdraw');
                    setIsWalletOpen(true);
                  }}
                />
              </motion.div>
            )}

            {currentPage === 'admin' && currentUser?.role === 'admin' && !currentUser?.isGuest && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="fixed top-3 left-3 z-[60] px-4 py-2 rounded-full text-xs font-extrabold bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 text-slate-800 dark:text-slate-100 shadow-lg"
                >
                  بازگشت به سایت ←
                </button>
                <Admin
                  currentUser={currentUser}
                  activeWeek={activeWeek}
                  transactions={transactions}
                  onBackToHome={() => navigateTo('home')}
                  onOpenAuth={() => handleOpenAuthWithPrompt('برای ورود به پنل مدیریت با حساب admin وارد شوید.')}
                />
              </motion.div>
            )}
            {currentPage === 'admin' && !(currentUser?.role === 'admin' && !currentUser?.isGuest) && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6" dir="rtl">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">دسترسی به این بخش فقط برای مدیر سایت مجاز است.</p>
                <button type="button" onClick={() => navigateTo('home')} className="px-5 py-2.5 rounded-2xl bg-sky-600 text-white text-sm font-bold">بازگشت به صفحه اصلی</button>
              </div>
            )}

            {currentPage === 'live' && (
              <motion.div
                key="live"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Live
                  onBackToHome={() => navigateTo('home')}
                  onNavigateToShishPar={() => navigateTo('shishpar')}
                />
              </motion.div>
            )}

            {currentPage === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Support
                  onBackToHome={() => navigateTo('home')}
                  onOpenAuth={() => handleOpenAuthWithPrompt('برای گفتگو با پشتیبانی، لطفاً وارد حساب خود شوید.')}
                />
              </motion.div>
            )}

            {currentPage === 'messages' && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex-1 w-full min-h-full flex flex-col"
              >
                <Inbox
                  onBackToHome={() => navigateTo('home')}
                  onNavigateToAdmin={() => navigateTo('admin')}
                />
              </motion.div>
            )}

            {currentPage === 'poll' && (
              <motion.div
                key="poll"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex-1 w-full min-h-full flex flex-col"
              >
                <Poll
                  currentUser={currentUser}
                  activeWeek={activeWeek}
                  onBackToHome={() => navigateTo('home')}
                  onOpenAuth={() => handleOpenAuthWithPrompt('برای ثبت رأی در نظرسنجی وارد شوید.')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </ErrorBoundary>

      {/* ========================================================
          1. SECRET ACCESS TRIGGER: HIDDEN FOOTER ENTRY (HOMEPAGE ONLY)
          Low-opacity, subtle text at the absolute bottom:
          "SAYKO ANALYSIS 2026 HORSE"
          3 rapid taps on "2026" triggers PIN Entry Modal
          ======================================================== */}
      {currentPage === 'home' && (
        <footer className="w-full py-3 pb-6 text-center select-none z-20 pointer-events-auto">
          <p className="text-[11px] tracking-widest text-slate-400/40 dark:text-slate-600/40 font-mono transition-colors">
            <span>SAYKO ANALYSIS </span>
            <button
              type="button"
              onClick={handleSecretTap}
              className="cursor-pointer font-bold hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition-all inline-block px-1.5 py-0.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 touch-manipulation focus:outline-hidden"
              title="2026"
            >
              2026
            </button>
            <span> HORSE</span>
          </p>
        </footer>
      )}

      {/* GLASSO-MORPHIC BOTTOM NAVIGATION BAR */}
      {showNavBar && (
        <GlassmorphicNavBar
          currentPage={currentPage}
          onNavigate={navigateTo}
          unreadCount={unreadNotifs}
        />
      )}

      </div>

      {/* MODALS */}
      <ErrorBoundary onReset={() => setIsAdminPinOpen(false)}>
        <AdminPinModal
          isOpen={isAdminPinOpen}
          onClose={() => setIsAdminPinOpen(false)}
          onSuccess={() => {
            navigateTo('admin');
          }}
        />
      </ErrorBoundary>
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        actionPromptMessage={authActionPrompt}
      />

      <ErrorBoundary onReset={() => setIsWalletOpen(false)}>
        <WalletModal
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
          type={walletType}
          currentUser={currentUser}
          onRequireAuth={() => handleOpenAuthWithPrompt('برای انجام تراکنش وارد حساب خود شوید.')}
          onNavigateToAccount={() => {
            setIsWalletOpen(false);
            navigateTo('account');
          }}
        />
      </ErrorBoundary>

      <LiveStreamModal
        isOpen={isLiveStreamModalOpen}
        onClose={() => setIsLiveStreamModalOpen(false)}
      />

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
      />

    </div>
  );
}
