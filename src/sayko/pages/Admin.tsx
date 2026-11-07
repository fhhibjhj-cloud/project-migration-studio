// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import { 
  Users, 
  Trophy, 
  Coins, 
  Settings, 
  Check, 
  X, 
  Plus, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  ShieldCheck, 
  ArrowUpDown, 
  ChevronRight, 
  ChevronLeft,
  Lock, 
  Unlock, 
  Edit3, 
  Video, 
  BellRing,
  RotateCcw,
  Sparkles,
  KeyRound,
  Trash2,
  Save,
  Search,
  Copy,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
  Play,
  Square,
  MessageSquare,
  Mail,
  Smartphone,
  LogOut,
  Sliders,
  Radio,
  FileText,
  Clock,
  Send,
  UserCheck,
  TrendingUp,
  Activity,
  Layers,
  HelpCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { store, PredictionWeek, UserProfile, Course, Horse, Transaction, SupportTicket } from '../lib/store';
import { sound } from '../lib/audio';
import { formatSmartAmountFa } from '../lib/format';
import { sendAdminDirectMessageInDb } from '../lib/supabase';
import { ChangeAdminPinModal } from '../components/ChangeAdminPinModal';
import { StreamPlayer } from '../components/StreamPlayer';

interface AdminProps {
  currentUser: UserProfile | null;
  activeWeek: PredictionWeek;
  transactions: Transaction[];
  onBackToHome: () => void;
  onOpenAuth: () => void;
}

export type AdminTab = 'profit' | 'transactions' | 'races' | 'users' | 'live' | 'messages' | 'settings';

export const Admin: React.FC<AdminProps> = ({
  currentUser,
  activeWeek,
  transactions,
  onBackToHome,
  onOpenAuth,
}) => {
  // Navigation tab state: 'profit' | 'transactions' | 'races' | 'users' | 'live' | 'messages' | 'settings'
  const [activeTab, setActiveTab] = useState<AdminTab>('races');

  // Modals state
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isResetProfitModalOpen, setIsResetProfitModalOpen] = useState(false);
  const [selectedUserForInspection, setSelectedUserForInspection] = useState<UserProfile | null>(null);
  const [selectedTicketForReply, setSelectedTicketForReply] = useState<SupportTicket | null>(null);
  const [replyMessageText, setReplyMessageText] = useState('');
  const [adjustBalanceUserId, setAdjustBalanceUserId] = useState<string | null>(null);
  const [adjustBalanceAmount, setAdjustBalanceAmount] = useState<number>(500000);
  const [depositApprovalTx, setDepositApprovalTx] = useState<Transaction | null>(null);
  const [depositApprovedAmountInput, setDepositApprovedAmountInput] = useState<number>(0);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [, setStoreUpdateTick] = useState<number>(0);

  // Profit & Analytics
  const [selectedRefundRate, setSelectedRefundRate] = useState<number>(store.refundRate);
  const profitData = store.getProfitAnalytics();

  const handleConfirmResetProfit = () => {
    sound.playSuccess();
    store.resetTodayProfit();
    setIsResetProfitModalOpen(false);
    showToast('سود امروز و مبالغ صندوق با موفقیت روی ۰ تومان ریست گردید.');
  };

  // Admin Config Toggles & Timer
  const [unitPriceSetting, setUnitPriceSetting] = useState<1000 | 2000>(
    store.activeWeek.unitPriceTomans === 1000 ? 1000 : 2000
  );
  const [countdownDaysInput, setCountdownDaysInput] = useState<number>(() => {
    const diff = Math.max(0, store.activeWeek.countdownEndTimestamp - Date.now());
    return Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)));
  });
  const [isLiveChatEnabledState, setIsLiveChatEnabledState] = useState<boolean>(store.isLiveChatEnabled);
  const [isSupportNotificationsEnabledState, setIsSupportNotificationsEnabledState] = useState<boolean>(store.isSupportNotificationsEnabled);

  // Six-Pareh Ticket Countdown Timer & Automatic Lock State (Requirement 1)
  const [timerHoursInput, setTimerHoursInput] = useState<number>(12);
  const [timerMinutesInput, setTimerMinutesInput] = useState<number>(0);
  const [adminCountdownText, setAdminCountdownText] = useState<string>('');
  const [adminCountdownSecondsRemaining, setAdminCountdownSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const updateAdminCountdown = () => {
      const endTimestamp = store.activeWeek.countdownEndTimestamp || 0;
      const diff = Math.max(0, endTimestamp - Date.now());
      setAdminCountdownSecondsRemaining(Math.floor(diff / 1000));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const toFa = (num: number) => num.toLocaleString('fa-IR');
      const padFa = (num: number) => num.toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });

      if (diff <= 0) {
        setAdminCountdownText('۰۰:۰۰:۰۰ (زمان پایان یافته)');
      } else if (days > 0) {
        setAdminCountdownText(`${toFa(days)} روز و ${padFa(hours)}:${padFa(minutes)}:${padFa(seconds)}`);
      } else {
        setAdminCountdownText(`${padFa(hours)}:${padFa(minutes)}:${padFa(seconds)}`);
      }
    };

    updateAdminCountdown();
    const interval = setInterval(updateAdminCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApplyTimerPreset = (hours: number, minutes: number = 0) => {
    sound.playSuccess();
    const durationMs = (hours * 3600 + minutes * 60) * 1000;
    const newTimestamp = Date.now() + durationMs;
    store.updateWeekSettings({ countdownEndTimestamp: newTimestamp });
    fetch('/api/admin/countdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countdownEndTimestamp: newTimestamp }),
    }).catch(() => {});

    if (hours === 0 && minutes === 0) {
      showToast('تایمر صفر شد و ثبت برگه شش‌پره فوراً به صورت خودکار قفل گردید.');
    } else {
      showToast(`تایمر شش‌پره با موفقیت روی ${hours > 0 ? `${hours} ساعت` : ''} ${minutes > 0 ? `${minutes} دقیقه` : ''} تنظیم گردید.`);
    }
  };

  // Races State (Course 1 to Course 7)
  const [selectedCourseNum, setSelectedCourseNum] = useState<number>(1);
  const [newHorseName, setNewHorseName] = useState('');
  const [newHorseSilk, setNewHorseSilk] = useState('#10b981');
  const [editingHorse, setEditingHorse] = useState<{ horseId: string; courseNumber: number; name: string; number: number } | null>(null);

  // Users State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>(store.users);

  // Subscribe to store updates for users, tickets, refund rate, and settings
  useEffect(() => {
    const unsub = store.subscribe(() => {
      setUsersList([...store.users]);
      setTicketsList([...store.supportTickets]);
      setSelectedRefundRate(store.refundRate);
      setUnitPriceSetting(store.activeWeek.unitPriceTomans === 1000 ? 1000 : 2000);
      setIsLiveChatEnabledState(store.isLiveChatEnabled);
      setIsSupportNotificationsEnabledState(store.isSupportNotificationsEnabled);
      setIsWithdrawalActive(store.isWithdrawalEnabled);
      setStoreUpdateTick((t) => t + 1);
    });
    return unsub;
  }, []);

  // Transactions State
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [directMsgTx, setDirectMsgTx] = useState<Transaction | null>(null);
  const [directMsgText, setDirectMsgText] = useState<string>('');
  const [directMsgSending, setDirectMsgSending] = useState<boolean>(false);
  const [txCustomAmount, setTxCustomAmount] = useState<number>(500000);
  const [showActiveUserBalance, setShowActiveUserBalance] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [txPage, setTxPage] = useState<number>(1);
  const [txFilter, setTxFilter] = useState<'all' | 'pending' | 'deposit' | 'withdraw'>('all');

  // Live Stream State
  const [streamUrlInput, setStreamUrlInput] = useState<string>(store.liveStreamUrl);
  const [liveIsActive, setLiveIsActive] = useState<boolean>(store.liveStreamIsActive);
  const [announcementText, setAnnouncementText] = useState<string>(store.liveAnnouncementText);
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(store.isAnnouncementVisible);

  // Messages / Tickets State
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'new' | 'pending' | 'answered' | 'closed'>('all');
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>(store.supportTickets);

  // Settings State
  const [alertNewRequests, setAlertNewRequests] = useState(store.adminAlerts.newRequests);
  const [alertNewMessages, setAlertNewMessages] = useState(store.adminAlerts.newMessages);
  const [alertHighValueTx, setAlertHighValueTx] = useState(store.adminAlerts.highValueTx);
  const [twoFactorAuth, setTwoFactorAuth] = useState(store.admin2FA);
  const [sensitiveAlerts, setSensitiveAlerts] = useState(store.adminSensitiveAlerts);
  const [isWithdrawalActive, setIsWithdrawalActive] = useState<boolean>(store.isWithdrawalEnabled);
  const [selectedPalette, setSelectedPalette] = useState<'emerald' | 'blue' | 'purple'>('emerald');

  const showToast = (msg: string) => {
    setSaveSuccessToast(msg);
    setTimeout(() => setSaveSuccessToast(null), 3000);
  };

  const handleCopy = (text: string) => {
    sound.playClick();
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Selected course object
  const courses = (activeWeek && Array.isArray(activeWeek.courses) && activeWeek.courses.length > 0)
    ? activeWeek.courses
    : (store.activeWeek?.courses || []);
  const selectedCourse = courses.find((c) => c.number === selectedCourseNum) || courses[0];

  // Course management handlers
  const handleToggleHorseScratched = (horseId: string) => {
    sound.playClick();
    store.toggleHorseScratched(selectedCourseNum, horseId);
  };

  const handleToggleHorseWinner = (horseNumber: number) => {
    sound.playClick();
    const nextWinner = selectedCourse?.winningHorseNumber === horseNumber ? undefined : horseNumber;
    store.setCourseWinningHorse(selectedCourseNum, nextWinner);
  };

  const handleAddHorse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorseName.trim()) return;
    sound.playSuccess();
    const currentHorsesCount = selectedCourse?.horses.length || 0;
    store.addHorseToCourse(selectedCourseNum, {
      number: currentHorsesCount + 1,
      name: newHorseName.trim(),
      jockey: '',
      trainer: '',
      pedigree: '',
      silkColor: newHorseSilk,
      silkPattern: 'solid',
      rating: 85,
      odds: 2.5,
      isScratched: false,
      isReplacement: false,
    });
    setNewHorseName('');
    showToast(`اسب «${newHorseName.trim()}» به کورس ${selectedCourseNum} اضافه شد.`);
  };

  const handleClearAllHorses = () => {
    sound.playAlert();
    store.clearAllHorses();
    setIsClearAllConfirmOpen(false);
    showToast('تمامی اسب‌ها حذف شدند و صندوق کل روی ۰ ریست گردید.');
  };

  const handlePublishConfig = () => {
    sound.playSuccess();
    store.publishCourseConfig();
    showToast('پیکربندی کورس‌ها ثبت و در تمامی صفحات پیش‌بینی منتشر شد.');
  };

  // Dynamic Live Analytics (100% Real Live Data - Requirement 3)
  const totalUsersCount = usersList.length;
  const activeUsersCount = useMemo(() => {
    return usersList.filter(u => u.isOnline).length;
  }, [usersList]);
  const bannedUsersCount = useMemo(() => {
    return usersList.filter(u => u.isBanned).length;
  }, [usersList]);
  const totalUsersBalance = useMemo(() => {
    return usersList.reduce((sum, u) => sum + (u.balanceTomans || 0), 0);
  }, [usersList]);

  // Real Dynamic Transaction Analytics (100% Real Data & Reset Support - Requirement 3)
  const { todayDepositsTomans, todayWithdrawalsTomans } = useMemo(() => {
    const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date());
    const resetTime = store.todayStatsResetTimestamp || 0;
    let tDep = 0;
    let tWth = 0;

    transactions.forEach(t => {
      if (t.status === 'approved') {
        let txTimestamp = 0;
        if (t.id && t.id.startsWith('tx_')) {
          const numPart = parseInt(t.id.replace('tx_', ''), 10);
          if (!isNaN(numPart)) txTimestamp = numPart;
        }

        const isAfterReset = resetTime > 0 ? (txTimestamp > resetTime) : true;
        const isToday = !t.date || t.date.includes(nowFa) || t.date.includes('امروز') || t.date.includes('هم‌اکنون');

        if (isAfterReset && isToday) {
          if (t.type === 'deposit') {
            tDep += (t.amountTomans || 0);
          } else if (t.type === 'withdraw') {
            tWth += (t.amountTomans || 0);
          }
        }
      }
    });

    return {
      todayDepositsTomans: tDep,
      todayWithdrawalsTomans: tWth,
    };
  }, [transactions, store.todayStatsResetTimestamp]);

  // Reset page when filter or search changes (Requirement 4)
  useEffect(() => {
    setTxPage(1);
  }, [txFilter, txSearchQuery]);



  // Live Support Tickets Dynamic Analytics (Requirement 1)
  const newTicketsCount = useMemo(() => ticketsList.filter(t => t.status === 'new').length, [ticketsList]);
  const pendingTicketsCount = useMemo(() => ticketsList.filter(t => t.status === 'pending').length, [ticketsList]);
  const answeredTicketsCount = useMemo(() => ticketsList.filter(t => t.status === 'answered').length, [ticketsList]);
  const closedTicketsCount = useMemo(() => ticketsList.filter(t => t.status === 'closed').length, [ticketsList]);

  // User Management
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (!userSearchQuery.trim()) return true;
      const q = userSearchQuery.trim().toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.numericId && u.numericId.toString().includes(q)) ||
        (u.phone && u.phone.includes(q))
      );
    });
  }, [userSearchQuery, usersList]);

  // Transactions Filtering & Pending
  const pendingTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === 'pending');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txFilter === 'pending' && t.status !== 'pending') return false;
      if (txFilter === 'deposit' && t.type !== 'deposit') return false;
      if (txFilter === 'withdraw' && t.type !== 'withdraw') return false;
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.trim().toLowerCase();
        const user = usersList.find((u) => u.id === t.userId);
        const matchTracking = (t.trackingCode || '').toLowerCase().includes(q);
        const matchUserId = (t.userId || '').toLowerCase().includes(q);
        const matchUserNum = String(t.userNumericId || user?.numericId || '').includes(q);
        const matchUserName = (t.userName || '').toLowerCase().includes(q);
        if (!matchTracking && !matchUserId && !matchUserNum && !matchUserName) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, txFilter, txSearchQuery, usersList]);

  // Compact pagination (5 items per page - Requirement 4)
  const TX_PER_PAGE = 5;
  const totalTxPages = Math.max(1, Math.ceil(filteredTransactions.length / TX_PER_PAGE));
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * TX_PER_PAGE;
    return filteredTransactions.slice(start, start + TX_PER_PAGE);
  }, [filteredTransactions, txPage]);

  // Official PDF Report Generator using jsPDF
  const handleDownloadPdfReport = () => {
    try {
      sound.playSuccess();
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const reportCode = `SAYKO-REP-${Date.now().toString().slice(-6)}`;
      const raceDate = activeWeek.startDatePersian || '۱۴۰۵/۰۷/۱۷';
      const grossFund = profitData.grossFund;
      const platformShare = profitData.adminProfit;
      const winnersPool = profitData.winnersPayout;
      const unitPrice = profitData.unitPriceTomans || 2000;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('SAYKO RACING INTELLIGENCE', 105, 18, { align: 'center' });
      doc.setFontSize(11);
      doc.text('OFFICIAL RACE PROFIT & WINNERS DISTRIBUTION REPORT', 105, 26, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Verification Code: ${reportCode}  |  Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, 105, 34, { align: 'center' });

      // Section 1: Race Metadata Card
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 48, 180, 36, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text('RACE SUMMARY & FINANCIAL AUDIT', 20, 56);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Race Title: ${activeWeek.title || 'Weekly Championship Gonbad'}`, 20, 64);
      doc.text(`Race Date: ${raceDate}`, 20, 71);
      doc.text(`Ticket Base Unit Price: ${unitPrice.toLocaleString()} Tomans`, 110, 64);
      doc.text(`Total Tickets Registered: ${(profitData.sixPrTotalSlips + profitData.fivePrTotalSlips).toLocaleString()} Slips`, 110, 71);
      doc.text(`Status: Official Audit Finalized`, 20, 78);

      // Section 2: Fund Allocation Breakdown (14% Platform Fee & 86% Winner Pool)
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(15, 90, 180, 52, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(11);
      doc.text('FUND ALLOCATION & DISTRIBUTION (14% / 86% STRICT MODEL)', 20, 99);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`1. Total Collected Pool (Gross Fund):`, 20, 109);
      doc.text(`${grossFund.toLocaleString()} Tomans (100%)`, 130, 109);

      doc.text(`2. Platform Fee Share (14% Margin):`, 20, 118);
      doc.text(`${platformShare.toLocaleString()} Tomans (14%)`, 130, 118);

      doc.text(`3. Total Winners Payout Pool (86% Allocation):`, 20, 127);
      doc.text(`${winnersPool.toLocaleString()} Tomans (86%)`, 130, 127);

      doc.text(`4. Automatic Distribution Status:`, 20, 136);
      doc.text(`AUDITED & CREDITED AUTOMATICALLY`, 130, 136);

      // Section 3: 6-Pehre and 5-Pehre Winners Breakdown
      doc.setFillColor(239, 246, 255); // blue-50
      doc.roundedRect(15, 148, 180, 50, 3, 3, 'FD');
      doc.setTextColor(29, 78, 216);
      doc.setFontSize(11);
      doc.text('CATEGORY BREAKDOWN (SIX-PEHRE & FIVE-PEHRE)', 20, 157);

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Category', 22, 166);
      doc.text('Allocated Pool', 65, 166);
      doc.text('Total Slips', 115, 166);
      doc.text('Winners Count', 145, 166);
      doc.text('Payout / Winner', 170, 166);

      doc.setDrawColor(203, 213, 225);
      doc.line(20, 169, 190, 169);

      // Six-Pehre row
      doc.text('Six-Pehre (6-Pr)', 22, 177);
      doc.text(`${profitData.sixPrFund.toLocaleString()} T`, 65, 177);
      doc.text(`${profitData.sixPrTotalSlips}`, 115, 177);
      doc.text(`${profitData.sixPrWinnersCount}`, 145, 177);
      doc.text(`${profitData.sixPrReceiptPrize.toLocaleString()} T`, 170, 177);

      // Five-Pehre row
      doc.text('Five-Pehre (5-Pr)', 22, 187);
      doc.text(`${profitData.fivePrFund.toLocaleString()} T`, 65, 187);
      doc.text(`${profitData.fivePrTotalSlips}`, 115, 187);
      doc.text(`${profitData.fivePrWinnersCount}`, 145, 187);
      doc.text(`${profitData.fivePrReceiptPrize.toLocaleString()} T`, 170, 187);

      // Section 4: Official Stamp & Integrity Note
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 206, 180, 48, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text('TRANSPARENCY & INTEGRITY STATEMENT', 20, 216);
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('This document serves as an immutable official report generated directly from the SAYKO Central', 20, 223);
      doc.text('Database and Supabase persistent ledger. All winnings have been calculated in compliance with', 20, 229);
      doc.text('the standard 14% platform margin and 86% total winner prize pool distribution algorithm.', 20, 235);
      doc.text('No manual alterations or arbitrary prize entries are permitted by the system architecture.', 20, 241);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('SAYKO Racing Intelligence Platform  |  Official Audit Report  |  All Rights Reserved', 105, 280, { align: 'center' });

      doc.save(`SAYKO_Official_Report_${reportCode}.pdf`);
      showToast('گزارش رسمی PDF با موفقیت دانلود شد.');
    } catch (err) {
      console.warn('PDF Generation error:', err);
      showToast('خطا در تولید فایل PDF.');
    }
  };

  // Messages / Tickets
  const filteredTickets = useMemo(() => {
    return ticketsList.filter((t) => {
      const matchFilter = ticketStatusFilter === 'all' ? true : t.status === ticketStatusFilter;
      if (!matchFilter) return false;
      if (!ticketSearchQuery.trim()) return true;
      const q = ticketSearchQuery.trim().toLowerCase();
      return (
        t.userName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.summary && t.summary.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q))
      );
    });
  }, [ticketSearchQuery, ticketStatusFilter, ticketsList]);

  const handleSendTicketReply = () => {
    if (!selectedTicketForReply || !replyMessageText.trim()) return;
    sound.playSuccess();
    const sentText = replyMessageText.trim();
    store.replyToTicket(selectedTicketForReply.id, sentText, 'answered');
    const updatedTicket = store.supportTickets.find((t) => t.id === selectedTicketForReply.id);
    if (updatedTicket) {
      setSelectedTicketForReply({ ...updatedTicket });
    }
    setReplyMessageText('');
    showToast('پاسخ به تیکت کاربر با موفقیت ارسال شد.');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#070e18] text-slate-900 dark:text-slate-100 pb-28 pt-2 select-none transition-colors duration-200">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {saveSuccessToast && (
          <motion.div
            key="save-success-toast"
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-16 left-1/2 z-50 px-5 py-2.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 border border-emerald-400/40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xl mx-auto px-3 sm:px-4 space-y-4">

        {/* Dynamic Pending Requests Red Notification Banner (Requirement 1) */}
        {pendingTransactions.length > 0 && activeTab !== 'transactions' && (
          <div 
            onClick={() => { sound.playClick(); setActiveTab('transactions'); }}
            className="p-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all hover:brightness-105 animate-in fade-in slide-in-from-top-1"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <div>
                <div className="text-xs font-black flex items-center gap-1.5">
                  <span>درخواست‌های جدید در انتظار بررسی مدیریت</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-black text-[10px]">
                    {pendingTransactions.length} درخواست
                  </span>
                </div>
                <p className="text-[10.5px] text-white/80 mt-0.5">
                  جهت بررسی فوری و تأیید واریزها و برداشت‌ها کلیک کنید
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors shrink-0">
              <span>بررسی</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: نمودار سود (ADMIN PROFIT ANALYTICS & DASHBOARD)
            ======================================================== */}
        {activeTab === 'profit' && (
          <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
            
            {/* Header info bar */}
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    نمودار سود و توزیع صندوق
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    محاسبه هوشمند بر مبنای کارمزد ۱۴٪ سامانه و سهم برندگان
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsResetProfitModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="ریست کردن سود امروز و مبالغ صندوق به صفر"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  <span>ریست سود امروز</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdfReport}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>دانلود گزارش رسمی PDF</span>
                </button>
              </div>
            </div>

            {/* 1. TOP CARD - PROFIT & FUND DISTRIBUTION ("سود و توزیع صندوق") */}
            <div className="rounded-[24px] bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  <span>سود و توزیع صندوق</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">کارمزد پلتفرم: ۱۴٪</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {/* کل صندوق جمع‌آوری شده */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 space-y-1">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 block font-bold leading-tight">
                    کل صندوق جمع‌آوری شده
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white block tabular-nums">
                    {profitData.grossFund.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[9px] text-slate-400">تومان</span>
                </div>

                {/* پرداختی برندگان */}
                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-1">
                  <span className="text-[10px] sm:text-[11px] text-sky-700 dark:text-sky-300 block font-bold leading-tight">
                    پرداختی برندگان
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-sky-600 dark:text-sky-400 block tabular-nums">
                    {profitData.winnersPayout.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {profitData.totalWinnersCount > 0 ? 'تومان (۸۶٪)' : 'تومان (۰ برنده)'}
                  </span>
                </div>

                {/* سود شما */}
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 space-y-1 ring-1 ring-emerald-500/30">
                  <span className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 block font-black leading-tight">
                    سود شما
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block tabular-nums">
                    {profitData.adminProfit.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-bold">
                    {profitData.totalWinnersCount > 0
                      ? 'تومان (۱۴٪)'
                      : (store.refundRate > 0
                          ? `تومان (${100 - store.refundRate}٪ سود سامانه)`
                          : 'تومان (۱۰۰٪ سود سامانه)')}
                  </span>
                </div>
              </div>

              {/* No-winner refund summary banner if applicable */}
              {profitData.totalWinnersCount === 0 && store.refundRate > 0 && profitData.totalRefundTomans > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      عودت به کاربران به دلیل عدم وجود برنده ({store.refundRate}٪):
                    </span>
                  </div>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {profitData.totalRefundTomans.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              )}
            </div>

            {/* 2. MIDDLE CARD - PRIZE PER RECEIPT ("ارزش هر قبض") */}
            <div className="rounded-[24px] bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>ارزش هر قبض (مبلغ جایزه هر برنده)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {profitData.totalWinnersCount > 0
                    ? `تعداد کل برندگان: ${profitData.totalWinnersCount.toLocaleString('fa-IR')} برنده`
                    : 'بدون برنده (۰ برنده)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* هر قبض ۶ پره */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/25 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 block">
                      هر قبض ۶ پره
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {profitData.sixPrWinnersCount > 0
                        ? `${profitData.sixPrWinnersCount.toLocaleString('fa-IR')} قبض برنده`
                        : 'بدون برنده (۰)'}
                    </span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 block tabular-nums">
                      {profitData.sixPrWinnersCount > 0 ? profitData.sixPrReceiptPrize.toLocaleString('fa-IR') : '۰'}
                    </span>
                    <span className="text-[9px] text-slate-400">تومان</span>
                  </div>
                </div>

                {/* هر قبض ۵ پره */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/25 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 block">
                      هر قبض ۵ پره
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {profitData.fivePrWinnersCount > 0
                        ? `${profitData.fivePrWinnersCount.toLocaleString('fa-IR')} قبض برنده`
                        : 'بدون برنده (۰)'}
                    </span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 block tabular-nums">
                      {profitData.fivePrWinnersCount > 0 ? profitData.fivePrReceiptPrize.toLocaleString('fa-IR') : '۰'}
                    </span>
                    <span className="text-[9px] text-slate-400">تومان</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BOTTOM GRID - DETAILED BREAKDOWN FOR 6-PR & 5-PR */}
            <div className="grid grid-cols-2 gap-3">
              {/* Six-Pr Card (شش پره) */}
              <div className="rounded-[24px] bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-black text-slate-900 dark:text-white">شش پره</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    حسابداری مستقل
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">صندوق جمع شده:</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-[11px] tabular-nums">
                      {profitData.sixPrGrossFund.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">سود سامانه:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[11px] tabular-nums">
                      {profitData.sixPrAdminProfit.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">سهم برندگان:</span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-[11px] tabular-nums">
                      {profitData.sixPrWinnersPayout.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 text-[11px]">تعداد کل ثبت:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {profitData.sixPrTotalSlips.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">قبض</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">برندگان شش پره:</span>
                    <span className="font-mono font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {profitData.sixPrWinnersCount.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">قبض</span>
                    </span>
                  </div>
                  {/* SPECIFIC WINNER AMOUNT DISPLAY */}
                  <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">مبلغ جایزه هر برنده:</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs tabular-nums">
                      {profitData.sixPrWinnersCount > 0 ? profitData.sixPrReceiptPrize.toLocaleString('fa-IR') : '۰'} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  {profitData.sixPrWinnersCount === 0 && profitData.sixPrRefundTomans > 0 && (
                    <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                      <span>مبلغ عودت ({store.refundRate}٪):</span>
                      <span className="font-mono font-bold tabular-nums">
                        {profitData.sixPrRefundTomans.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Five-Pr Card (پنج پره) */}
              <div className="rounded-[24px] bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-black text-slate-900 dark:text-white">پنج پره</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                    حسابداری مستقل
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">صندوق جمع شده:</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-[11px] tabular-nums">
                      {profitData.fivePrGrossFund.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">سود سامانه:</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-[11px] tabular-nums">
                      {profitData.fivePrAdminProfit.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">سهم برندگان:</span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-[11px] tabular-nums">
                      {profitData.fivePrWinnersPayout.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 text-[11px]">تعداد کل ثبت:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {profitData.fivePrTotalSlips.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">قبض</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">برندگان پنج پره:</span>
                    <span className="font-mono font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {profitData.fivePrWinnersCount.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">قبض</span>
                    </span>
                  </div>
                  {/* SPECIFIC WINNER AMOUNT DISPLAY */}
                  <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-blue-800 dark:text-blue-300 text-[11px] font-bold">مبلغ جایزه هر برنده:</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs tabular-nums">
                      {profitData.fivePrWinnersCount > 0 ? profitData.fivePrReceiptPrize.toLocaleString('fa-IR') : '۰'} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                    </span>
                  </div>
                  {profitData.fivePrWinnersCount === 0 && profitData.fivePrRefundTomans > 0 && (
                    <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                      <span>مبلغ عودت ({store.refundRate}٪):</span>
                      <span className="font-mono font-bold tabular-nums">
                        {profitData.fivePrRefundTomans.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. NO-WINNER REFUND POLICY & EXECUTION CARD */}
            <div className="rounded-[24px] bg-white dark:bg-[#0c1626] border border-amber-200/80 dark:border-amber-900/40 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/30 pb-2.5">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>قانون عودت در صورت عدم وجود برنده (شش‌پره و پنج‌پره)</span>
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                  درصد عودت فعال: {store.refundRate}٪
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                در صورتی که هیچ برنده‌ای در کل برگه‌های شش‌پره و پنج‌پره وجود نداشته باشد (۰ برنده)، به میزان <span className="font-black text-amber-600 dark:text-amber-400">{store.refundRate} درصد</span> از مبلغ پرداختی رسیدها به کیف پول هر کاربر برگشت داده شده و پیام تراکنش با عنوان «تراکنش / برگشت» و متن «برگشت {store.refundRate} درصد مبلغ پرداختی شما برای ثبت رسید به شما برگشت داده شد» به صندوق پیام ارسال می‌شود. مابقی صندوق به عنوان سود قطعی سامانه محاسبه می‌گردد.
              </p>
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${profitData.totalWinnersCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span>
                    وضعیت فعلی مسابقه: {profitData.totalWinnersCount > 0 ? `${profitData.totalWinnersCount.toLocaleString('fa-IR')} برنده ثبت شده` : 'بدون برنده (۰ برنده)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    const res = store.executeNoWinnerRefunds();
                    showToast(res.message);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>اجرای فوری عودت عدم برنده ({store.refundRate}٪)</span>
                </button>
              </div>
            </div>

            {/* 5. AUTOMATED POOL & WINNER SETTLEMENT STATUS */}
            <div className="rounded-[24px] bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>تفکیک و حسابداری مستقل صندوق‌های شش‌پره و پنج‌پره (۱۴٪ / ۸۶٪)</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  حسابداری مستقل واقعی
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                کلیه محاسبات مالی، جذب مبالغ، کارمزد پلتفرم (۱۴٪) و جوایز برندگان (۸۶٪) برای برگه‌های «شش‌پره» و «پنج‌پره» به صورت کاملاً تفکیک‌شده و بر مبنای داده‌های واقعی برگه‌های ثبت‌شده محاسبه می‌شوند.
              </p>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: مسابقات (RACES MANAGEMENT & EVALUATION) [Ref Image 24]
            ======================================================== */}
        {activeTab === 'races' && (
          <div className="space-y-4" dir="rtl">
            {/* Header Controls */}
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                  ثبت شش پره
                </h1>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Left Capsule Button: "تغییر رمز پنل" */}
                <button
                  onClick={() => { sound.playClick(); setIsChangePinOpen(true); }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تغییر رمز پنل</span>
                </button>

                {/* Solid Red Button: "حذف همه" */}
                <button
                  onClick={() => { sound.playClick(); setIsClearAllConfirmOpen(true); }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف همه</span>
                </button>

                {/* Solid Green Button: "ثبت و ذخیره" */}
                <button
                  onClick={handlePublishConfig}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ثبت و ذخیره</span>
                </button>
              </div>
            </div>

            {/* Master Six-Pore Switch Card */}
            <div className="p-3.5 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeWeek.isShishParEnabled !== false
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400'
                }`}>
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
                      قفل کردن ششپره
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      activeWeek.isShishParEnabled !== false
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      {activeWeek.isShishParEnabled !== false ? 'فعال (ثبت باز است)' : 'غیرفعال (قفل سراسری)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeWeek.isShishParEnabled !== false
                      ? 'کاربران در حال حاضر می‌توانند اسب‌ها را انتخاب و برگه‌های خود را ثبت نمایند.'
                      : 'انتخاب اسب‌ها و ثبت هرگونه فرم شش‌پره در تمام دستگاه‌ها متوقف و قفل شده است.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  const nextState = activeWeek.isShishParEnabled === false ? true : false;
                  store.setShishParEnabled(nextState);
                  showToast(nextState ? 'سوئیچ شش‌پره فعال شد (ثبت فرم باز شد).' : 'سوئیچ شش‌پره غیرفعال شد (ثبت فرم قفل گردید).');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                  activeWeek.isShishParEnabled !== false
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {activeWeek.isShishParEnabled !== false ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>قفل کردن شش‌پره</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>فعال‌سازی شش‌پره</span>
                  </>
                )}
              </button>
            </div>

            {/* ========================================================
                SIX-PAREH TICKET COUNTDOWN TIMER & AUTO-LOCK CONFIGURATION (Requirement 1)
                ======================================================== */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      تنظیم تایمر شمارش معکوس و قفل خودکار شش‌پره
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      زمان باقی‌مانده ثبت برگه برای کاربران • با اتمام زمان، ثبت فرم به طور خودکار قفل می‌شود
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 ${
                  adminCountdownSecondsRemaining > 0 && activeWeek.isShishParEnabled !== false
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                }`}>
                  {adminCountdownSecondsRemaining > 0 && activeWeek.isShishParEnabled !== false ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>ثبت برگه باز است</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>مهلت تمام شد (قفل خودکار)</span>
                    </>
                  )}
                </span>
              </div>

              {/* Dynamic Real-Time Live Clock Display */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-between border border-slate-200/70 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">زمان واقعی باقی‌مانده روی صفحه مسابقه:</span>
                </div>
                <div className="text-center font-mono">
                  <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-wider tabular-nums block" dir="ltr">
                    {adminCountdownText}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons (e.g., 12 hours, 24 hours, etc.) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  انتخاب سریع مدت زمان اعتبار ثبت برگه:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { label: '۱۲ ساعت', hours: 12, minutes: 0 },
                    { label: '۲۴ ساعت', hours: 24, minutes: 0 },
                    { label: '۶ ساعت', hours: 6, minutes: 0 },
                    { label: '۲ ساعت', hours: 2, minutes: 0 },
                    { label: '۳۰ دقیقه', hours: 0, minutes: 30 },
                    { label: 'قفل آنی (۰)', hours: 0, minutes: 0, isRed: true },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTimerPreset(preset.hours, preset.minutes)}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 ${
                        preset.isRed
                          ? 'bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-500/30'
                          : 'bg-slate-100 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 hover:text-white dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80'
                      }`}
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Duration Input (ساعت و دقیقه دلخواه) */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  تنظیم مدت زمان دلخواه:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                    <span className="text-xs text-slate-500">ساعت:</span>
                    <input
                      type="number"
                      min="0"
                      max="168"
                      value={timerHoursInput}
                      onChange={(e) => setTimerHoursInput(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                    <span className="text-xs text-slate-500">دقیقه:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timerMinutesInput}
                      onChange={(e) => setTimerMinutesInput(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyTimerPreset(timerHoursInput, timerMinutesInput)}
                    className="px-4 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    اعمال و شروع شمارش معکوس
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================
                BASE TICKET PRICE SWITCH (1,000T / 2,000T) (Requirement 3)
                ======================================================== */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      تنظیم نرخ پایه هر ترکیب برگه (قیمت پایه)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      انتخاب نرخ پایه برای محاسبه مبلغ نهایی برگه بر اساس فرمول: نرخ پایه × ضرب تعداد انتخاب‌های کورس‌ها
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
                  {/* Button 2,000 Tomans */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      store.setUnitPriceTomans(2000);
                      setUnitPriceSetting(2000);
                      showToast('نرخ پایه هر ترکیب برگه روی ۲,۰۰۰ تومان تنظیم شد.');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      (store.activeWeek.unitPriceTomans || 2000) === 2000
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ۲,۰۰۰ تومان
                  </button>

                  {/* Button 1,000 Tomans */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      store.setUnitPriceTomans(1000);
                      setUnitPriceSetting(1000);
                      showToast('نرخ پایه هر ترکیب برگه روی ۱,۰۰۰ تومان تنظیم شد.');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      store.activeWeek.unitPriceTomans === 1000
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ۱,۰۰۰ تومان
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>نرخ فعال در سیستم محاسبات:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {store.activeWeek.unitPriceTomans === 1000 ? '۱,۰۰۰ تومان' : '۲,۰۰۰ تومان'}
                </span>
              </div>
            </div>

            {/* Course Selector Buttons (Course 1 to Course 7) */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-xs">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const isSelected = selectedCourseNum === num;
                const cObj = activeWeek.courses.find(c => c.number === num);
                const isCourseLocked = Boolean(cObj?.isLocked);
                return (
                  <button
                    key={num}
                    onClick={() => { sound.playClick(); setSelectedCourseNum(num); }}
                    className={`relative flex-1 min-w-[66px] py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs border border-emerald-600'
                        : isCourseLocked
                          ? 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600/60 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>کورس {num}</span>
                    {isCourseLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Course Status & Independent Lock/Unlock Control */}
            <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  selectedCourse?.isLocked ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                }`}>
                  {selectedCourse?.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      وضعیت {selectedCourse?.title || `کورس ${selectedCourseNum}`}:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedCourse?.isLocked
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedCourse?.isLocked ? 'بسته / قفل شده' : 'باز / قابل انتخاب'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {selectedCourse?.isLocked
                      ? 'انتخاب اسب‌های این کورس در صفحه شش‌پره کاربران قفل و غیرفعال است.'
                      : 'کاربران می‌توانند اسب‌های این کورس را انتخاب و در برگه خود ثبت نمایند.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  store.toggleCourseLock(selectedCourseNum);
                  showToast(selectedCourse?.isLocked ? `کورس ${selectedCourseNum} باز شد.` : `کورس ${selectedCourseNum} قفل و بسته شد.`);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  selectedCourse?.isLocked
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {selectedCourse?.isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>بازگشایی این کورس</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>بستن و قفل این کورس</span>
                  </>
                )}
              </button>
            </div>

            {/* Selected Course Horse Addition Form */}
            <form onSubmit={handleAddHorse} className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  افزودن اسب به کورس {selectedCourseNum}
                </span>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  تعداد اسب‌ها: {selectedCourse?.horses.length || 0}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newHorseName}
                  onChange={(e) => setNewHorseName(e.target.value)}
                  placeholder="نام اسب"
                  className="flex-1 h-10 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {/* Green circular add button (+) */}
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                  title="افزودن اسب"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </form>

            {/* Horses List for Selected Course */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  اسب‌های شرکت‌کننده و تعیین وضعیت / ویرایش
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  قرمز: حذفی | سبز: برنده رسمی
                </span>
              </div>

              {selectedCourse && selectedCourse.horses.length > 0 ? (
                <div className="space-y-2">
                  {selectedCourse.horses.map((horse, hIdx) => {
                    const isWinner = selectedCourse.winningHorseNumber === horse.number;
                    const isScratched = horse.isScratched;

                    return (
                      <div
                        key={horse.id ? `horse_${horse.id}` : `course_${selectedCourseNum}_h_${horse.number}_${hIdx}`}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          isScratched
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
                            : isWinner
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 shadow-xs'
                        }`}
                      >
                        {/* Horse Info (Cleaned from unnecessary labels) */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            {horse.number}
                          </span>
                          <div className="min-w-0">
                            <h4 className={`text-xs sm:text-sm font-black truncate ${
                              isScratched ? 'line-through text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'
                            }`}>
                              {horse.name}
                            </h4>
                          </div>
                        </div>

                        {/* Horse Control Toggles & Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {/* EDIT BUTTON (ویرایش) */}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setEditingHorse({
                                horseId: horse.id,
                                courseNumber: selectedCourseNum,
                                name: horse.name,
                                number: horse.number,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            title="ویرایش مشخصات اسب"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>ویرایش</span>
                          </button>

                          {/* RED TOGGLE (Scratched / Withdrawn) */}
                          <button
                            type="button"
                            onClick={() => handleToggleHorseScratched(horse.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                              isScratched
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40'
                            }`}
                            title="علامت‌گذاری اسب حذفی (خط خورده)"
                          >
                            <Ban className="w-3 h-3" />
                            <span>{isScratched ? 'حذفی' : 'عادی'}</span>
                          </button>

                          {/* GREEN TOGGLE (Official Winner) */}
                          <button
                            type="button"
                            onClick={() => handleToggleHorseWinner(horse.number)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                              isWinner
                                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title="علامت‌گذاری به عنوان اسب برنده کورس"
                          >
                            <Trophy className="w-3 h-3" />
                            <span>{isWinner ? 'مقام اول' : 'تعیین برنده'}</span>
                          </button>

                          {/* DELETE HORSE BUTTON */}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playAlert();
                              store.removeHorseFromCourse(selectedCourseNum, horse.id);
                              showToast(`اسب «${horse.name}» از کورس ${selectedCourseNum} حذف شد.`);
                            }}
                            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            title="حذف این اسب از کورس"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                  هیچ اسبی برای این کورس ثبت نشده است. نام اسب را وارد کرده و دکمه + را بزنید.
                </div>
              )}
            </div>

            {/* EDIT HORSE MODAL */}
            {editingHorse && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
                onClick={() => setEditingHorse(null)}
              >
                <div 
                  className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-white space-y-4"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black">ویرایش مشخصات اسب</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingHorse(null)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        شماره اسب:
                      </label>
                      <input
                        type="number"
                        value={editingHorse.number}
                        onChange={(e) => setEditingHorse({ ...editingHorse, number: Number(e.target.value) || 1 })}
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        نام اسب:
                      </label>
                      <input
                        type="text"
                        value={editingHorse.name}
                        onChange={(e) => setEditingHorse({ ...editingHorse, name: e.target.value })}
                        placeholder="نام اسب"
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingHorse(null)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingHorse.name.trim()) return;
                        sound.playSuccess();
                        store.updateHorseInCourse(editingHorse.courseNumber, editingHorse.horseId, {
                          name: editingHorse.name.trim(),
                          number: editingHorse.number,
                        });
                        showToast('مشخصات اسب با موفقیت به‌روزرسانی شد.');
                        setEditingHorse(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      ذخیره تغییرات
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: مدیریت کاربران (USER MANAGEMENT) [Ref Image 22]
            ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4" dir="rtl">
            {/* Top KPI Summary Cards (Real Live Dynamic Data - Requirement 3) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">کاربران فعال</span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {activeUsersCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">کاربران مسدود</span>
                <span className="text-base sm:text-lg font-black font-mono text-red-500">
                  {bannedUsersCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">کل کاربران</span>
                <span className="text-base sm:text-lg font-black font-mono text-blue-500">
                  {totalUsersCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">موجودی کل کاربران</span>
                <span className="text-xs sm:text-sm font-black font-mono text-amber-500">
                  {totalUsersBalance.toLocaleString('fa-IR')} <span className="text-[9px]">تومان</span>
                </span>
              </div>
            </div>

            {/* Note: DO NOT render "افزودن کاربر جدید" button as strictly requested in prompt! */}

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="جستجو با شناسه کاربر، نام یا شماره تماس..."
                className="w-full h-11 pr-10 pl-4 rounded-2xl bg-white dark:bg-[#0c1626] border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* User List & 360-Degree Inspector Trigger */}
            <div className="space-y-2.5">
              {filteredUsers.map((user, uIdx) => (
                <div
                  key={user.id ? `usr_${user.id}` : `usr_idx_${uIdx}`}
                  onClick={() => { sound.playClick(); setSelectedUserForInspection(user); }}
                  className="p-3.5 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        {user.fullName.charAt(0)}
                      </div>
                      <span className={`w-3 h-3 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-[#0c1626] ${
                        user.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                          {user.fullName}
                        </h4>
                        {user.role === 'admin' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 text-[9px] font-bold">
                            مدیر
                          </span>
                        )}
                        {user.isBanned && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-600 text-[9px] font-bold">
                            مسدود
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        شناسه عددی: <span className="font-bold text-blue-500">#{user.numericId || 10842}</span> • نام کاربری: @{user.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                        {user.balanceTomans.toLocaleString('fa-IR')}
                      </span>
                      <span className="text-[9px] text-slate-400">تومان</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:-translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 1: تراکنش‌ها (TRANSACTIONS MANAGEMENT) [Ref Image 20]
            ======================================================== */}
        {activeTab === 'transactions' && (
          <div className="space-y-4" dir="rtl">
            {/* Top Financial KPIs Header with Reset Button (Requirement 3) */}
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white">
                  خلاصه آمار مالی و کاربران (زنده و واقعی)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  store.resetTodayFinancialStats();
                  showToast('مبالغ مالی امروز با موفقیت صفر (۰ تومان) گردید.');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
                title="صفر کردن مبالغ مالی امروز جهت شروع دوره جدید"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                <span>صفر کردن آمار امروز (۰ تومان)</span>
              </button>
            </div>

            {/* Top Financial KPIs Grid (Real Live Dynamic Data - Requirement 3) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">واریزهای امروز</span>
                <span className="text-xs sm:text-sm font-black font-mono text-emerald-500">
                  {todayDepositsTomans.toLocaleString('fa-IR')} <span className="text-[9px]">تومان</span>
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">برداشت‌های امروز</span>
                <span className="text-xs sm:text-sm font-black font-mono text-red-500">
                  {todayWithdrawalsTomans.toLocaleString('fa-IR')} <span className="text-[9px]">تومان</span>
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">کاربران فعال</span>
                <span className="text-base sm:text-lg font-black font-mono text-blue-500">
                  {activeUsersCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">کل کاربران</span>
                <span className="text-base sm:text-lg font-black font-mono text-slate-700 dark:text-slate-300">
                  {totalUsersCount.toLocaleString('fa-IR')}
                </span>
              </div>
            </div>

            {/* Pending Requests Section (Deposit & Withdrawal) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${pendingTransactions.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    درخواست‌های در انتظار بررسی ({pendingTransactions.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  نیازمند تأیید یا رد مدیر سیستم
                </span>
              </div>

              {pendingTransactions.length === 0 ? (
                <div className="p-6 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2 shadow-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    هیچ درخواست واریز یا برداشت در حال انتظاری وجود ندارد.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    تمامی درخواست‌های ثبت‌شده توسط کاربران تعیین تکلیف شده‌اند.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTransactions.map((tx, pIdx) => {
                    const user = usersList.find((u) => u.id === tx.userId);
                    const userNumId = tx.userNumericId || user?.numericId || 10842;
                    const userIban = tx.iban || user?.iban || 'ثبت نشده';
                    const isCardRegistered = Boolean(tx.cardNumber && tx.cardNumber !== 'ثبت نشده') || Boolean(user?.cardNumber && user?.cardNumber !== 'ثبت نشده');
                    const userCard = isCardRegistered ? (tx.cardNumber && tx.cardNumber !== 'ثبت نشده' ? tx.cardNumber : user!.cardNumber) : 'ثبت نشده';
                    const isDeposit = tx.type === 'deposit';

                    return (
                      <div
                        key={tx.id ? `pend_tx_${tx.id}` : `pend_idx_${pIdx}`}
                        className="p-4 sm:p-5 bg-white dark:bg-[#0c1626] rounded-3xl border border-blue-100/90 dark:border-[#1e2f47] shadow-md space-y-4"
                      >
                        {/* User Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-xs ${
                              isDeposit 
                                ? 'bg-gradient-to-tr from-emerald-500 to-teal-500' 
                                : 'bg-gradient-to-tr from-amber-500 to-orange-500'
                            }`}>
                              {tx.userName ? tx.userName.charAt(0) : 'ک'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                                  {tx.userName}
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  isDeposit 
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {isDeposit ? 'افزایش اعتبار (واریز)' : 'برداشت از حساب'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                                <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { sound.playClick(); setDirectMsgTx(tx); }}
                            className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                            title="ارسال پیام به کاربر"
                          >
                            <Mail className="w-3 h-3" />
                            <span>ارسال پیام به کاربر</span>
                          </button>
                                  <span>شناسه عددی کاربر:</span>
                                  <span className="font-mono font-bold text-blue-500">#{userNumId}</span>
                                  <button 
                                    onClick={() => handleCopy(String(userNumId))}
                                    className="hover:text-blue-500 cursor-pointer p-0.5"
                                    title="کپی شناسه عددی"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 font-mono text-slate-400">
                                  <span>•</span>
                                  <span>شناسه رسید:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(tx.trackingCode)}
                                    className="hover:text-blue-500 cursor-pointer font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
                                    title="کپی شناسه رسید"
                                  >
                                    <span>{tx.trackingCode}</span>
                                    {copiedText === tx.trackingCode ? (
                                      <span className="text-[8px] text-emerald-500 font-sans mr-0.5">کپی شد</span>
                                    ) : (
                                      <Copy className="w-2.5 h-2.5 text-slate-400" />
                                    )}
                                  </button>
                                </div>
                                <span>• تاریخ: {tx.date}</span>
                              </div>
                            </div>
                          </div>

                          {/* Balance display with eye toggle */}
                          <div className="text-left flex items-center gap-1.5">
                            <div>
                              <span className="text-[10px] text-slate-400 block">موجودی فعلی کاربر</span>
                              <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {showActiveUserBalance ? `${(user?.balanceTomans ?? 0).toLocaleString('fa-IR')} تومان` : '••••••••'}
                              </span>
                            </div>
                            <button 
                              onClick={() => setShowActiveUserBalance(!showActiveUserBalance)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {showActiveUserBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Bank Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Sheba IR Number */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Wallet className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="text-slate-600 dark:text-slate-300 shrink-0">شماره شبا:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white truncate" dir="ltr">
                                {userIban}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleCopy(userIban)}
                              className="text-blue-500 hover:text-blue-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedText === userIban ? 'کپی شد' : 'کپی'}</span>
                            </button>
                          </div>

                          {/* Card Number - Prominent Red Warning for Unregistered Cards (Requirement 2) */}
                          <div className={`p-3 rounded-2xl flex items-center justify-between transition-colors ${
                            !isCardRegistered
                              ? 'bg-red-500/10 dark:bg-red-950/40 border border-red-500/30'
                              : 'bg-slate-50 dark:bg-slate-900/60'
                          }`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <CreditCard className={`w-4 h-4 shrink-0 ${!isCardRegistered ? 'text-red-500' : 'text-emerald-500'}`} />
                              <span className={`shrink-0 font-bold ${!isCardRegistered ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                شماره کارت:
                              </span>
                              {!isCardRegistered ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-[11px] font-black tracking-wide shadow-xs animate-pulse">
                                  <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                  ثبت نشده
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-slate-900 dark:text-white truncate" dir="ltr">
                                  {userCard}
                                </span>
                              )}
                            </div>
                            {isCardRegistered && userCard && (
                              <button 
                                onClick={() => handleCopy(userCard)}
                                className="text-blue-500 hover:text-blue-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedText === userCard ? 'کپی شد' : 'کپی'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Decision Area */}
                        <div className={`p-4 rounded-2xl space-y-3 border ${
                          isDeposit 
                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                            : 'bg-amber-500/10 border-amber-500/20'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {isDeposit ? 'مبلغ درخواستی افزایش اعتبار:' : 'مبلغ درخواستی برداشت وجه:'}
                            </span>
                            <span className={`text-base font-black font-mono ${
                              isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {tx.amountTomans.toLocaleString('fa-IR')} تومان
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {isDeposit 
                              ? 'با تأیید، مبلغ درخواستی بلافاصله به کیف پول کاربر در سیستم و دیتابیس افزوده می‌شود و وضعیت به «تایید شد» تغییر خواهد کرد.' 
                              : 'مبلغ این درخواست قبلاً هنگام ثبت از موجودی کاربر کسر گردیده است. با تأیید، واریز به شبای کاربر ثبت نهایی می‌گردد و در صورت رد، وجه به کیف پول کاربر عودت داده می‌شود.'}
                          </p>

                          <div className="flex items-center gap-2 pt-1">
                            {/* Solid Red "رد درخواست" Button */}
                            <button
                              onClick={async () => {
                                sound.playAlert();
                                if (isDeposit) {
                                  const res = await store.rejectDepositRequest(tx.id);
                                  showToast(res.message);
                                } else {
                                  store.updateTransactionStatus(tx.id, 'rejected');
                                  showToast('درخواست برداشت رد شد و مبلغ به کیف پول کاربر عودت داده شد.');
                                }
                              }}
                              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-4 h-4 stroke-[2.5]" />
                              <span>رد درخواست</span>
                            </button>

                            {/* Direct Message Button: Requirement 1.5 "ارسال پیام به کاربر" */}
                            <button
                              type="button"
                              onClick={() => { sound.playClick(); setDirectMsgTx(tx); }}
                              className="px-3 h-10 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs border border-blue-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="ارسال پیام به کاربر"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ارسال پیام به کاربر</span>
                              <span className="sm:hidden">پیام</span>
                            </button>

                            {/* Solid Green Action Button */}
                            {isDeposit ? (
                              <button
                                onClick={() => {
                                  sound.playClick();
                                  setDepositApprovalTx(tx);
                                  setDepositApprovedAmountInput(tx.amountTomans);
                                }}
                                className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>افزایش اعتبار کاربر</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  sound.playSuccess();
                                  store.updateTransactionStatus(tx.id, 'approved');
                                  showToast(`درخواست برداشت مبلغ ${tx.amountTomans.toLocaleString('fa-IR')} تومان با موفقیت تایید شد.`);
                                }}
                                className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>تأیید و ثبت واریز بانکی</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transactions Table & Pagination */}
            <div className="bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    تاریخچه کلیه تراکنش‌ها
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({filteredTransactions.length} تراکنش)
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={() => setTxFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      txFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    همه
                  </button>
                  <button
                    onClick={() => setTxFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      txFilter === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    در انتظار ({pendingTransactions.length})
                  </button>
                  <button
                    onClick={() => setTxFilter('deposit')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      txFilter === 'deposit'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    واریزها
                  </button>
                  <button
                    onClick={() => setTxFilter('withdraw')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      txFilter === 'withdraw'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    برداشت‌ها
                  </button>
                </div>
              </div>

              {/* Search Bar with live search and clear button */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  placeholder="جستجوی تراکنش بر اساس کد پیگیری، نام کاربر، شناسه عددی..."
                  className="w-full pr-9 pl-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {txSearchQuery && (
                  <button
                    onClick={() => setTxSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title="پاک کردن جستجو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Compact Transaction History List (Requirement 4: Optimized Compact Design) */}
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-0.5">
                {paginatedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    تراکنشی با مشخصات جستجو یافت نشد.
                  </div>
                ) : (
                  paginatedTransactions.map((tx, fIdx) => {
                    const user = usersList.find((u) => u.id === tx.userId);
                    const userNumId = tx.userNumericId || user?.numericId || 10842;
                    const userIban = tx.iban || user?.iban;

                    return (
                      <div 
                        key={tx.id ? `hist_tx_${tx.id}` : `hist_idx_${fIdx}`}
                        className="py-2 px-3 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between text-xs gap-2 flex-wrap"
                      >
                        {/* Right Details (RTL) */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md font-black text-[9.5px] shrink-0 ${
                            tx.type === 'deposit' 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : tx.type === 'withdraw'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          }`}>
                            {tx.type === 'deposit' ? 'واریز' : tx.type === 'withdraw' ? 'برداشت' : 'پیش‌بینی'}
                          </span>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate">
                                {tx.userName}
                              </span>
                              <span className="text-[10px] text-blue-500 font-mono font-bold">
                                #{userNumId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span>شناسه رسید:</span>
                              <span className="font-bold text-slate-600 dark:text-slate-300">{tx.trackingCode}</span>
                              <button
                                onClick={() => handleCopy(tx.trackingCode)}
                                className="hover:text-blue-500 cursor-pointer p-0.5 inline-flex items-center text-slate-400"
                                title="کپی شناسه رسید"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                {copiedText === tx.trackingCode && <span className="text-[8px] text-emerald-500 font-sans mr-0.5">کپی شد</span>}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Left Details & Status */}
                        <div className="text-left flex items-center gap-2.5 shrink-0">
                          <div className="text-left">
                            <span className={`font-mono font-black text-xs block tabular-nums ${
                              tx.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                            }`}>
                              {tx.type === 'deposit' ? '+' : '-'}{tx.amountTomans.toLocaleString('fa-IR')}
                            </span>
                            <span className="text-[9px] text-slate-400 block -mt-0.5">تومان</span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                            tx.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : tx.status === 'rejected'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {tx.status === 'approved' ? 'تأیید شده' : tx.status === 'rejected' ? 'رد شده' : 'در انتظار'}
                          </span>

                          {/* Quick Actions if pending */}
                          {tx.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  sound.playSuccess();
                                  store.updateTransactionStatus(tx.id, 'approved');
                                  showToast('درخواست تایید شد.');
                                }}
                                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9.5px] cursor-pointer"
                                title="تأیید سریع"
                              >
                                تأیید
                              </button>
                              <button
                                onClick={() => {
                                  sound.playAlert();
                                  store.updateTransactionStatus(tx.id, 'rejected');
                                  showToast('درخواست رد شد.');
                                }}
                                className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[9.5px] cursor-pointer"
                                title="رد سریع"
                              >
                                رد
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dynamic Compact Pagination Controls */}
              {totalTxPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => { sound.playClick(); setTxPage(Math.max(1, txPage - 1)); }}
                    disabled={txPage <= 1}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 cursor-pointer"
                  >
                    قبلی
                  </button>
                  <span className="font-bold text-slate-500 text-[11px] font-mono">
                    صفحه {txPage.toLocaleString('fa-IR')} از {totalTxPages.toLocaleString('fa-IR')}
                  </span>
                  <button
                    onClick={() => { sound.playClick(); setTxPage(Math.min(totalTxPages, txPage + 1)); }}
                    disabled={txPage >= totalTxPages}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 cursor-pointer"
                  >
                    بعدی
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: پخش زنده (LIVE STREAM MANAGEMENT) [Ref Image 23]
            ======================================================== */}
        {activeTab === 'live' && (
          <div className="space-y-4" dir="rtl">
            {/* Status Controls */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      وضعیت پخش زنده پیست:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>فعال</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    زمان شروع مخابره: {store.broadcastStartTime}
                  </span>
                </div>
              </div>

              {/* "توقف پخش" Toggle Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setLiveIsActive(!liveIsActive);
                  store.updateLiveStreamSettings({ isActive: !liveIsActive });
                  showToast(liveIsActive ? 'پخش زنده موقتاً متوقف شد.' : 'پخش زنده فعال گردید.');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  liveIsActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {liveIsActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{liveIsActive ? 'توقف پخش' : 'شروع پخش'}</span>
              </button>
            </div>

            {/* Video Player Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 shadow-lg group">
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-md pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>● پیش‌نمایش استریم</span>
              </div>
              <StreamPlayer
                streamUrl={streamUrlInput}
                title="SAYKO Live Stream Preview"
                className="w-full h-full"
              />
            </div>

            {/* Stream URL Input */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-800 dark:text-white">
                آدرس مستقیم استریم ویدیویی (.m3u8 / .mp4 / YouTube):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={streamUrlInput}
                  onChange={(e) => setStreamUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    sound.playSuccess();
                    store.updateLiveStreamSettings({ url: streamUrlInput });
                    showToast('آدرس پخش زنده با موفقیت ذخیره شد.');
                  }}
                  className="px-4 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  ذخیره لینک
                </button>
              </div>
            </div>

            {/* Sub-Video Announcement Textarea */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                  اعلان زیر ویدیوی پخش زنده:
                </span>
                {/* Toggle for "نمایش پیام" */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[11px] text-slate-400">نمایش پیام</span>
                  <input
                    type="checkbox"
                    checked={showAnnouncement}
                    onChange={(e) => setShowAnnouncement(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
              </div>

              <textarea
                value={announcementText}
                maxLength={200}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={3}
                placeholder="متن پیام و اطلاع‌رسانی برای بینندگان پخش زنده..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{announcementText.length} / ۲۰۰ کاراکتر</span>
                <button
                  onClick={() => {
                    sound.playSuccess();
                    store.updateLiveStreamSettings({
                      announcement: announcementText,
                      isAnnouncementVisible: showAnnouncement,
                    });
                    showToast('پیام زیر ویدیو با موفقیت ذخیره و به‌روزرسانی شد.');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  ذخیره اعلان
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: پیام‌ها (USER MESSAGES & TICKETS) [Ref Image 19]
            ======================================================== */}
        {activeTab === 'messages' && (
          <div className="space-y-4" dir="rtl">
            {/* Summary Cards (Real Live Dynamic Data - Requirement 1) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">پیام‌های جدید</span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-500">
                  {newTicketsCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">در انتظار پاسخ</span>
                <span className="text-base sm:text-lg font-black font-mono text-amber-500">
                  {pendingTicketsCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">پاسخ داده شده</span>
                <span className="text-base sm:text-lg font-black font-mono text-blue-500">
                  {answeredTicketsCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">بسته شده</span>
                <span className="text-base sm:text-lg font-black font-mono text-slate-400">
                  {closedTicketsCount.toLocaleString('fa-IR')}
                </span>
              </div>
            </div>

            {/* Tickets List Controls: Search & Dropdown Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={ticketSearchQuery}
                  onChange={(e) => setTicketSearchQuery(e.target.value)}
                  placeholder="جستجو در موضوع، متن یا شماره تماس..."
                  className="w-full h-10 pr-9 pl-3 rounded-xl bg-white dark:bg-[#0c1626] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-white dark:bg-[#0c1626] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="new">جدید</option>
                <option value="pending">در انتظار پاسخ</option>
                <option value="answered">پاسخ داده شد</option>
                <option value="closed">بسته شده</option>
              </select>
            </div>

            {store.supportTickets.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (window.confirm('همه پیام‌های کاربران برای همیشه حذف شوند؟')) {
                      store.deleteTickets();
                      showToast('همه پیام‌ها حذف شدند.');
                    }
                  }}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-red-500/10 text-red-600 text-[11px] font-extrabold border border-red-500/20 active:scale-95 transition-transform cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف همه پیام‌ها
                </button>
              </div>
            )}

            {/* Tickets List Cards */}
            <div className="space-y-2.5">
              {filteredTickets.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 font-bold">پیامی وجود ندارد.</div>
              )}
              {filteredTickets.map((t, tIdx) => (
                <div
                  key={t.id ? `tkt_${t.id}` : `tkt_idx_${tIdx}`}
                  onClick={() => { sound.playClick(); setSelectedTicketForReply(t); }}
                  className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {t.userName}
                      </span>
                      {/* Masked Phone Number */}
                      <span className="text-[11px] font-mono text-slate-400">
                        {t.phone || '0912***2233'}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      t.status === 'new'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : t.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-600'
                        : t.status === 'answered'
                        ? 'bg-blue-500/15 text-blue-600'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {t.status === 'new' && 'جدید'}
                      {t.status === 'pending' && 'در حال پاسخ'}
                      {t.status === 'answered' && 'پاسخ داده شد'}
                      {t.status === 'closed' && 'بسته شده'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-0.5">
                      {t.subject}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {t.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>زمان ثبت: {t.createdAt}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('این پیام حذف شود؟')) {
                          store.deleteTickets([t.id]);
                          showToast('پیام حذف شد.');
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                    <span className="text-blue-500 font-bold flex items-center gap-0.5">
                      <span>پاسخ / مدیریت</span>
                      <ChevronLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: تنظیمات (ADMIN SETTINGS) [Ref Image 21]
            ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-4" dir="rtl">
            {/* Account Info Section */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                حساب کاربری مدیریت
              </h3>

              <div className="space-y-2 text-xs">
                {/* تغییر رمز عبور */}
                <button
                  onClick={() => setIsChangePinOpen(true)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">تغییر رمز عبور و پین ورود</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>

                {/* اطلاعات شخصی */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">مدیر ارشد: متین توماج</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">admin@sayko</span>
                </div>

                {/* تاریخچه ورودها */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 space-y-2">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                    تاریخچه ورودها و نشست‌های فعال:
                  </span>
                  <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
                    {store.loginSessions.map((s, sIdx) => (
                      <div key={s.id ? `sess_${s.id}` : `sess_idx_${sIdx}`} className="flex items-center justify-between">
                        <span>{s.device} ({s.ip})</span>
                        <span className={s.current ? 'text-emerald-500 font-bold' : ''}>{s.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Toggles */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                هشدارهای بلادرنگ سیستم
              </h3>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 dark:text-slate-200 font-bold">هشدار درخواست‌های جدید واریز و برداشت</span>
                  <input
                    type="checkbox"
                    checked={alertNewRequests}
                    onChange={(e) => {
                      setAlertNewRequests(e.target.checked);
                      store.updateAdminSecurity({ alerts: { ...store.adminAlerts, newRequests: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 dark:text-slate-200 font-bold">هشدار تیکت‌ها و پیام‌های جدید کاربران</span>
                  <input
                    type="checkbox"
                    checked={alertNewMessages}
                    onChange={(e) => {
                      setAlertNewMessages(e.target.checked);
                      store.updateAdminSecurity({ alerts: { ...store.adminAlerts, newMessages: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 dark:text-slate-200 font-bold">هشدار تراکنش‌های مبالغ بالا (بالای ۱۰ میلیون)</span>
                  <input
                    type="checkbox"
                    checked={alertHighValueTx}
                    onChange={(e) => {
                      setAlertHighValueTx(e.target.checked);
                      store.updateAdminSecurity({ alerts: { ...store.adminAlerts, highValueTx: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
              </div>
            </div>

            {/* Master Financial Control: Withdrawal Schedule & Master Toggle */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Wallet className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      مدیریت و کنترل تسویه مالی
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      تنظیم دسترسی کاربران به برداشت و واریز جوایز
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isWithdrawalActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                }`}>
                  {isWithdrawalActive ? 'سرویس فعال' : 'سرویس متوقف'}
                </span>
              </div>

              {/* Toggle switch: "فعال/غیرفعالسازی تسویه و برداشت وجه" */}
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    فعال/غیرفعالسازی تسویه و برداشت وجه
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                    در صورت غیرفعال بودن، دکمه تسویه حساب برای کلیه کاربران با پیام سیستمی مسدود می‌شود.
                  </span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer mr-3">
                  <input
                    type="checkbox"
                    checked={isWithdrawalActive}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIsWithdrawalActive(next);
                      store.setWithdrawalEnabled(next);
                      sound.playClick();
                      showToast(next ? 'تسویه و برداشت وجه با موفقیت فعال شد.' : 'تسویه و برداشت وجه سراسری غیرفعال شد.');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                </div>
              </label>

              {/* Status info bar */}
              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-[#111c2e] text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex justify-between items-center">
                  <span>برنامه خودکار هفتگی:</span>
                  <span className="font-bold text-slate-900 dark:text-white">شنبه تا چهارشنبه</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>وضعیت امروز:</span>
                  <span className={`font-bold ${store.getWithdrawalStatus().allowed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                    {store.getWithdrawalStatus().allowed ? 'در بازه مجاز (فعال)' : store.getWithdrawalStatus().reason}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Refund Rate Setting: درصد عودت برگه شکست‌خورده */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      درصد عودت برگه شکست‌خورده
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      میزان بازگشت وجه به کیف پول کاربران در صورت عدم تحقق برندگان
                    </p>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {selectedRefundRate === 0 ? 'غیرفعال' : `${selectedRefundRate}٪ فعال`}
                </span>
              </div>

              {/* Selector options: [غیرفعال (0%), 9%, 12%, 15%] */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: 'غیرفعال (0%)', value: 0 },
                  { label: '۹ درصد', value: 9 },
                  { label: '۱۲ درصد', value: 12 },
                  { label: '۱۵ درصد', value: 15 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedRefundRate(opt.value);
                      store.setRefundRate(opt.value);
                      sound.playClick();
                      showToast(`درصد عودت برگه شکست‌خورده به ${opt.label} تغییر یافت.`);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedRefundRate === opt.value
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111c2e] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>کارمزد ثابت پلتفرم:</span>
                <span className="font-bold text-slate-900 dark:text-white">۱۴٪ (پیش از محاسبه جوایز کسر می‌گردد)</span>
              </div>
            </div>

            {/* Security Settings: 2FA & Sensitive Alerts */}
            <div className="p-4 bg-white dark:bg-[#0c1626] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                امنیت و کنترل دسترسی
              </h3>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-slate-800 dark:text-slate-200 font-bold block">احراز هویت دو مرحله‌ای (2FA)</span>
                    <span className="text-[10px] text-slate-400">ارسال کد پیامکی هنگام ورود از دستگاه جدید</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactorAuth}
                    onChange={(e) => {
                      setTwoFactorAuth(e.target.checked);
                      store.updateAdminSecurity({ twoFactor: e.target.checked });
                    }}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-slate-800 dark:text-slate-200 font-bold block">هشدار تغییرات حساس کورس‌ها و صندوق</span>
                    <span className="text-[10px] text-slate-400">ثبت لاگ و اطلاع‌رسانی پیامکی</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sensitiveAlerts}
                    onChange={(e) => {
                      setSensitiveAlerts(e.target.checked);
                      store.updateAdminSecurity({ sensitiveAlerts: e.target.checked });
                    }}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </label>
              </div>
            </div>

            {/* Bottom Logout Button: Solid Red Floating */}
            <div className="pt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  store.logout();
                  onBackToHome();
                }}
                className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm shadow-md shadow-red-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>خروج از حساب کاربری مدیریت</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          8. PERSISTENT BOTTOM ADMIN NAVIGATION BAR
          - Order (Right to Left):
            [تنظیمات] | [پیام‌ها] | [پخش زنده] | [کاربران] | [مسابقات] | [تراکنش‌ها (با آیکون کیف پول)]
          ======================================================== */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#091322]/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-[#1e2f47] py-2 px-2 shadow-2xl safe-area-bottom"
        dir="rtl"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          {/* 1. تنظیمات (Rightmost in RTL) */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('settings'); }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] tracking-tight">تنظیمات</span>
          </button>

          {/* 2. پیام‌ها (with red notification badge '3') */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('messages'); }}
            className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className="relative">
              <Mail className="w-5 h-5 stroke-[2.2]" />
              {(newTicketsCount + pendingTicketsCount) > 0 && (
                <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white font-mono text-[9px] font-black flex items-center justify-center absolute -top-1.5 -right-2.5 shadow-md shadow-red-600/40 animate-pulse border-2 border-white dark:border-[#091322]">
                  {(newTicketsCount + pendingTicketsCount) > 9 ? '۹+' : (newTicketsCount + pendingTicketsCount)}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">پیام‌ها</span>
          </button>

          {/* 3. نمودار سود */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('profit'); }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profit'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] tracking-tight whitespace-nowrap">نمودار سود</span>
          </button>

          {/* 4. پخش زنده */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('live'); }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <Radio className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] tracking-tight">پخش زنده</span>
          </button>

          {/* 4. کاربران */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('users'); }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <Users className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] tracking-tight">کاربران</span>
          </button>

          {/* 5. مسابقات */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('races'); }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'races'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <Trophy className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[10px] tracking-tight">مسابقات</span>
          </button>

          {/* 6. تراکنش‌ها (با آیکون کیف پول Wallet & نشانگر قرمز اعلان - Requirement 1) */}
          <button
            onClick={() => { sound.playClick(); setActiveTab('transactions'); }}
            className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'text-emerald-500 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className="relative">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
              {pendingTransactions.length > 0 && (
                <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white font-mono text-[9px] font-black flex items-center justify-center absolute -top-1.5 -right-2.5 shadow-md shadow-red-600/40 animate-pulse border-2 border-white dark:border-[#091322]">
                  {pendingTransactions.length > 9 ? '۹+' : pendingTransactions.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">تراکنش‌ها</span>
          </button>

        </div>
      </nav>

      {/* ========================================================
          MODAL: 360-Degree Deep User Inspector Modal
          ======================================================== */}
      {selectedUserForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0c1626] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-white space-y-4"
            dir="rtl"
          >
            <button
              onClick={() => setSelectedUserForInspection(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-lg">
                {selectedUserForInspection.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  پرونده جامع ۳۶۰ درجه: {selectedUserForInspection.fullName}
                </h3>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span>شناسه عددی: <b className="text-blue-500 font-bold">#{selectedUserForInspection.numericId || 10842}</b></span>
                  <button
                    onClick={() => handleCopy(String(selectedUserForInspection.numericId || 10842))}
                    className="hover:text-blue-500 cursor-pointer"
                    title="کپی شناسه عددی"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <span>• {selectedUserForInspection.id}</span>
                </p>
              </div>
            </div>

            {/* 1. Personal Data */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs">
              <h4 className="font-extrabold text-blue-500 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                ۱. اطلاعات هویتی و بانکی:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-slate-400">شناسه عددی:</span> <b className="font-mono text-blue-500">#{selectedUserForInspection.numericId || 10842}</b></div>
                <div><span className="text-slate-400">نام کامل:</span> <b>{selectedUserForInspection.fullName}</b></div>
                <div><span className="text-slate-400">نام کاربری:</span> <b className="font-mono">{selectedUserForInspection.username}</b></div>
                <div>
                  <span className="text-slate-400">شماره کارت:</span>{' '}
                  {(!selectedUserForInspection.cardNumber || selectedUserForInspection.cardNumber === 'ثبت نشده') ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-black text-[10px]">
                      ثبت نشده
                    </span>
                  ) : (
                    <b className="font-mono">{selectedUserForInspection.cardNumber}</b>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">شماره شبا:</span> <b className="font-mono" dir="ltr">{selectedUserForInspection.iban || 'ثبت نشده'}</b>
                  </div>
                  {selectedUserForInspection.iban && (
                    <button
                      onClick={() => handleCopy(selectedUserForInspection.iban!)}
                      className="text-blue-500 hover:text-blue-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedText === selectedUserForInspection.iban ? 'کپی شد' : 'کپی شبا'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Online Activity */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs">
              <h4 className="font-extrabold text-emerald-500 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                ۲. وضعیت فعالیت آنلاین:
              </h4>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedUserForInspection.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span>وضعیت فعلی: {selectedUserForInspection.isOnline ? 'آنلاین' : 'آفلاین'}</span>
                </div>
                <span>آخرین ورود: {selectedUserForInspection.lastLogin || '۱۰ دقیقه پیش'}</span>
              </div>
            </div>

            {/* 3. Financial History */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs">
              <h4 className="font-extrabold text-amber-500 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                ۳. تاریخچه و تراکنش‌های مالی:
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">موجودی</span>
                  <span className="font-bold font-mono text-emerald-500">{selectedUserForInspection.balanceTomans.toLocaleString('fa-IR')}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">واریزها</span>
                  <span className="font-bold font-mono">{selectedUserForInspection.depositCount || 12} بار</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">برداشت‌ها</span>
                  <span className="font-bold font-mono">{selectedUserForInspection.withdrawalCount || 4} بار</span>
                </div>
              </div>
            </div>

            {/* 4. Betting History */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs">
              <h4 className="font-extrabold text-purple-500 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                ۴. آمار و سوابق پیش‌بینی:
              </h4>
              <div className="flex items-center justify-around text-center text-[11px]">
                <div><span className="text-slate-400 block">تعداد بردها</span><b className="text-emerald-500 font-mono text-sm">{selectedUserForInspection.winsCount || 3}</b></div>
                <div><span className="text-slate-400 block">تعداد باخت‌ها</span><b className="text-red-500 font-mono text-sm">{selectedUserForInspection.lossCount || 5}</b></div>
                <div><span className="text-slate-400 block">کل فرم‌های ثبت‌شده</span><b className="font-mono text-sm">{selectedUserForInspection.totalGames || 124}</b></div>
              </div>
            </div>

            {/* Action Buttons: Ban/Unban & Adjust Balance */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  sound.playAlert();
                  store.toggleBanUser(selectedUserForInspection.id);
                  setSelectedUserForInspection({
                    ...selectedUserForInspection,
                    isBanned: !selectedUserForInspection.isBanned
                  });
                  showToast(selectedUserForInspection.isBanned ? 'کاربر از حالت مسدود خارج شد.' : 'کاربر مسدود گردید.');
                }}
                className={`flex-1 h-10 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  selectedUserForInspection.isBanned
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {selectedUserForInspection.isBanned ? 'رفع مسدودی کاربر' : 'مسدود کردن کاربر'}
              </button>

              <button
                onClick={() => {
                  setAdjustBalanceUserId(selectedUserForInspection.id);
                }}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer"
              >
                تغییر موجودی کاربر
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Adjust Balance Direct Sub-Modal */}
      {adjustBalanceUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-xs p-5 bg-white dark:bg-[#0c1626] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3" dir="rtl">
            <h3 className="text-xs font-black text-slate-900 dark:text-white">تغییر دستی موجودی کاربر</h3>
            <input
              type="number"
              value={adjustBalanceAmount}
              onChange={(e) => setAdjustBalanceAmount(Number(e.target.value))}
              placeholder="مبلغ به تومان"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  sound.playSuccess();
                  store.adjustUserBalance(adjustBalanceUserId, Math.abs(adjustBalanceAmount));
                  setAdjustBalanceUserId(null);
                  showToast('موجودی با موفقیت افزایش یافت.');
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                + افزایش
              </button>
              <button
                onClick={() => {
                  sound.playAlert();
                  store.adjustUserBalance(adjustBalanceUserId, -Math.abs(adjustBalanceAmount));
                  setAdjustBalanceUserId(null);
                  showToast('موجودی با موفقیت کسر شد.');
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                - کاهش
              </button>
            </div>
            <button
              onClick={() => setAdjustBalanceUserId(null)}
              className="w-full py-1.5 text-xs text-slate-400"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* Interactive Reply to Support Ticket Modal */}
      {selectedTicketForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-5 bg-white dark:bg-[#0c1626] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xl flex flex-col max-h-[90vh]" dir="rtl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    گفتگو با {selectedTicketForReply.userName}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    #{selectedTicketForReply.id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-bold">
                  موضوع: {selectedTicketForReply.subject}
                </p>
              </div>

              <button
                onClick={() => setSelectedTicketForReply(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation History Thread */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#070e18] border border-slate-200/60 dark:border-slate-800/80 max-h-[300px]">
              {selectedTicketForReply.messages && selectedTicketForReply.messages.length > 0 ? (
                selectedTicketForReply.messages.map((msg, mIdx) => {
                  const isManager = msg.sender === 'support';
                  return (
                    <div
                      key={msg.id ? `msg_${msg.id}` : `msg_idx_${mIdx}_${msg.timestamp || Date.now()}`}
                      className={`flex flex-col ${isManager ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl overflow-hidden border shadow-xs ${
                          isManager
                            ? 'border-blue-500/30 bg-blue-50 dark:bg-blue-950/40 rounded-bl-xs'
                            : 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 rounded-br-xs'
                        }`}
                      >
                        <div className={`px-3 py-1.5 text-[10px] font-black flex items-center gap-1.5 ${
                          isManager ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {isManager ? 'پاسخ مدیریت:' : `پیام کاربر: ${selectedTicketForReply.userName}`}
                        </div>
                        <div className="px-3 py-2 text-xs leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {msg.text}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                        {msg.time}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-slate-400 mb-0.5 px-1 font-bold">
                    {selectedTicketForReply.userName}
                  </div>
                  <div className="max-w-[85%] rounded-2xl p-2.5 text-xs leading-relaxed bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/80 dark:border-slate-700 rounded-br-xs shadow-xs">
                    {selectedTicketForReply.summary}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                    {selectedTicketForReply.createdAt}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Response Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                'درخواست شما بررسی و تایید شد.',
                'واریز به شماره شبای شما با موفقیت انجام گردید.',
                'لطفاً مشخصات حساب بانکی خود را بررسی فرمایید.'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReplyMessageText(chip)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Manager Reply Input Form */}
            <div className="space-y-2">
              <textarea
                rows={3}
                value={replyMessageText}
                onChange={(e) => setReplyMessageText(e.target.value)}
                placeholder="متن پاسخ رسمی مدیریت به این کاربر..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendTicketReply}
                  disabled={!replyMessageText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  ارسال پاسخ مدیریت
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTicketForReply(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Admin Deposit Approval Modal («افزایش اعتبار کاربر») */}
      {depositApprovalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-white dark:bg-[#0c1626] rounded-3xl border border-emerald-500/30 space-y-4 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    افزایش اعتبار کاربر
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    تأیید و شارژ مستقیم حساب در دیتابیس
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDepositApprovalTx(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">نام کاربر:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {depositApprovalTx.userName} (شناسه: #{depositApprovalTx.userNumericId || '۱۰۸۴۲'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">شناسه رسید:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{depositApprovalTx.trackingCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">تاریخ و زمان:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{depositApprovalTx.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">شماره کارت:</span>
                {(!depositApprovalTx.cardNumber || depositApprovalTx.cardNumber === 'ثبت نشده') ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-[11px] font-black tracking-wide shadow-xs animate-pulse">
                    <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                    ثبت نشده
                  </span>
                ) : (
                  <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                    {depositApprovalTx.cardNumber}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">مبلغ درخواستی کاربر:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {depositApprovalTx.amountTomans.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>

            {/* Admin Input for final approved amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                مبلغ نهایی تأیید شده جهت افزایش اعتبار (تومان):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={depositApprovedAmountInput}
                  onChange={(e) => setDepositApprovedAmountInput(Number(e.target.value))}
                  className="w-full h-11 px-3.5 pl-14 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                  تومان
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              با تأیید، مبلغ درخواستی بلافاصله در دیتابیس مرکزی به موجودی کاربر منظور گردیده و اعلان رسمی به صندوق پیام کاربر ارسال می‌گردد.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (!depositApprovalTx) return;
                  sound.playSuccess();
                  const res = await store.approveDepositRequest(depositApprovalTx.id, depositApprovedAmountInput);
                  setDepositApprovalTx(null);
                  showToast(res.message);
                }}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>تأیید افزایش اعتبار کاربر</span>
              </button>
              <button
                type="button"
                onClick={() => setDepositApprovalTx(null)}
                className="px-4 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-[#0c1626] rounded-3xl border border-red-500/30 text-center space-y-4" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              آیا از حذف کلیه اسب‌ها اطمینان دارید؟
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              با تایید این عملیات، تمامی اسب‌های وارد شده در تمامی کورس‌های ۱ تا ۷ پاک شده و صندوق کل نیز به ۰ ریست خواهد شد.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleClearAllHorses}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                بله، همه را حذف کن
              </button>
              <button
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Profit Confirmation Modal */}
      {isResetProfitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-[#0c1626] rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              آیا از ریست کردن سود امروز اطمینان دارید؟
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              با تأیید این عملیات، کلیه سودها، مبالغ صندوق و محاسبات شش‌پره و پنج‌پره امروز روی ۰ تومان قرار می‌گیرند تا بتوانید محاسبات را مجدداً از نو و از صفر شروع نمایید.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmResetProfit}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                بله، ریست سود انجام شود
              </button>
              <button
                type="button"
                onClick={() => setIsResetProfitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Admin PIN Modal */}
      <ChangeAdminPinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
      />

      {/* DIRECT ADMIN MESSAGE MODAL */}
      {directMsgTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-[#0f1b2d] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">ارسال پیام به کاربر</h3>
                  <p className="text-[11px] text-slate-400">کاربر: {directMsgTx.userName} (شناسه رسید: {directMsgTx.trackingCode})</p>
                </div>
              </div>
              <button
                onClick={() => { setDirectMsgTx(null); setDirectMsgText(''); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                متن پیام برای کاربر:
              </label>
              <textarea
                rows={4}
                value={directMsgText}
                onChange={(e) => setDirectMsgText(e.target.value)}
                placeholder="پیام در خصوص این تراکنش را اینجا وارد نمایید..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400">
                پیام با فرمت «در خصوص تراکنش: ...» مستقیماً در صندوق کاربر و Supabase ثبت می‌شود.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setDirectMsgTx(null); setDirectMsgText(''); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!directMsgText.trim() || directMsgSending}
                onClick={async () => {
                  if (!directMsgText.trim()) return;
                  setDirectMsgSending(true);
                  sound.playSuccess();
                  await sendAdminDirectMessageInDb(directMsgTx.userId, directMsgTx.userName, directMsgText.trim(), directMsgTx.trackingCode);
                  store.sendAdminDirectMessage(directMsgTx.userId, directMsgTx.userName, directMsgText.trim(), directMsgTx.trackingCode);
                  showToast('پیام با موفقیت به صندوق کاربر ارسال شد.');
                  setDirectMsgSending(false);
                  setDirectMsgTx(null);
                  setDirectMsgText('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال پیام</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
