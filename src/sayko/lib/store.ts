// @ts-nocheck
/**
 * SAYKO RACING INTELLIGENCE - Central Application Store
 * Manages authentication, racing data, predictions, admin settings, and financial ledger.
 */
import { isOnlineNow, isBanActive, banEndFor } from './userStatus';
import { netPoolShare, loserRefund, SITE_COMMISSION_RATE } from './poolFormula';
import { evaluateSlipCourses, isBoundToLive, type LockedCourseResult } from './evaluate';

import {
  syncUserBalanceToDb,
  patchUserDataInDb,
  deleteUserFromDb,
  isRemovedRow,
  insertPredictionToDb,
  deletePredictionFromDb,
  insertTransactionToDb,
  fetchUserFromDb,
  fetchPredictionsFromDb,
  fetchTransactionsFromDb,
  updateTransactionStatusInDb,
  cleanupExpiredPredictionsFromDb,
  syncUserProfileToDb,
  insertSupportMessageToDb,
  sendAdminDirectMessageInDb,
  syncAdminSettingToDb,
  fetchAdminSettingsFromDb,
  subscribeToAdminSettings,
  updateUserBanStatusInDb,
  upsertUserToDb,
  fetchAllUsersRaw,
  upsertNotificationToDb,
  fetchNotificationsForUser,
  upsertSupportTicketToDb,
  deleteSupportTicketsFromDb,
  fetchSupportTicketsFromDb,
  updatePredictionInDb,
  recentBalanceWrites,
  sha256,
  supabase,
  isSupabaseConfigured,
  pruneExpiredData,
  deleteTransactionFromDb,
} from './supabase';

export interface Horse {
  id: string;
  number: number;
  name: string;
  jockey: string;
  trainer: string;
  pedigree: string; // پدر x مادر
  silkColor: string; // hex
  silkPattern: 'solid' | 'stripes' | 'stars' | 'sash';
  silkSecondaryColor?: string;
  rating: number; // 1-100 rating
  odds: number; // e.g. 2.4
  isScratched: boolean; // اسب حذفی
  isReplacement: boolean; // اسب جایگزین / رزرو
  replacementForNumber?: number; // جایگزین شماره چند
}

export interface Course {
  id: string;
  number: number; // 1 to 6
  title: string; // مثلاً کورس اول - هندیکپ کلاس ۴
  distance: string; // مثلاً ۱۰۰۰ متر
  trackType: string; // خاک نرم / چمن
  prizePool: number; // جایزه کورس
  horses: Horse[];
  winningHorseNumber?: number; // شماره اسب برنده پس از پایان
  isLocked?: boolean; // بستن/قفل اختصاصی هر کورس توسط ادمین
}

export interface PredictionWeek {
  id: string;
  code: string; // مثلاً W5-GONBAD
  title: string; // هفته ۵ مسابقات اسب‌دوانی پاییزه گنبد کاووس
  trackName: string; // مجتمع سوارکاری گنبد کاووس
  type: 'shishpar' | 'panjpar'; // شش پره یا پنج پره
  startDatePersian: string; // ۱۴۰۵/۰۷/۱۷
  countdownEndTimestamp: number; // timestamp in ms
  status: 'active' | 'live' | 'completed' | 'locked';
  totalPoolTomans: number; // صندوق کل واقعی و پویا
  unitPriceTomans: number; // قیمت هر ترکیب (مثلاً ۱۰,۰۰۰ تومان)
  courses: Course[];
  winningCombination?: number[]; // e.g. [3, 1, 5, 2, 7, 4]
  isShishParEnabled?: boolean; // سوئیچ اصلی روشن/خاموش شش‌پره توسط ادمین
}

export interface PredictionSlip {
  id: string;
  userId: string;
  userName: string;
  weekId: string;
  ticketType?: 'shishpar' | 'panjpar';
  selections: { [courseNumber: number]: number[] }; // course 1-6 / 2-7 -> primary horse numbers
  replacementSelections?: { [courseNumber: number]: number[] }; // course 1-6 / 2-7 -> replacement horse numbers
  combinationsCount: number;
  totalCostTomans: number;
  submittedAt: string;
  createdAtTimestamp?: number;
  status: 'pending' | 'won' | 'lost';
  payoutTomans?: number;
  snapshotCourses?: Course[]; // Immutable historical race snapshot
  isResultFinalized?: boolean; // Locked when race is settled
  isRefunded?: boolean;
  refundedAmountTomans?: number;
  refundPercentage?: number;
  lockedResults?: LockedCourseResult[]; // Immutable per-course outcome once finalized
}

export interface Transaction {
  id: string;
  userId: string;
  userNumericId?: number;
  userName: string;
  type: 'deposit' | 'withdraw' | 'prediction_fee' | 'prediction_win' | 'refund';
  amountTomans: number;
  approvedAmountTomans?: number;
  date: string;
  status: 'approved' | 'pending' | 'rejected';
  iban?: string;
  cardNumber?: string;
  trackingCode: string;
  title?: string;
  description?: string;
}

export interface SupportMessage {
  id?: string | number;
  sender: 'user' | 'support';
  text: string;
  time: string;
  timestamp: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  phone?: string;
  subject: string;
  summary?: string;
  status: 'new' | 'pending' | 'answered' | 'closed';
  messages: SupportMessage[];
  createdAt: string;
  createdAtTimestamp?: number;
}


export interface UserPollVote {
  userId: string;
  userName: string;
  horseId: string;
  courseNumber: number;
  horseName: string;
  votedAt: string;
  timestamp: number;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'race' | 'financial' | 'system';
}

export interface UserProfile {
  id: string;
  numericId: number;
  fullName: string;
  username: string;
  password?: string;
  role: 'user' | 'admin';
  balanceTomans: number;
  phone?: string;
  iban?: string;
  cardNumber?: string;
  avatarId?: number;
  isGuest?: boolean;
  isBanned?: boolean;
  isOnline?: boolean;
  lastSeenAt?: number;
  bannedUntil?: number;
  isFullNameLocked?: boolean;
  registeredAt?: string;
  lastLogin?: string;
  depositCount?: number;
  depositTotalTomans?: number;
  withdrawalCount?: number;
  withdrawalTotalTomans?: number;
  winsCount?: number;
  lossCount?: number;
  totalGames?: number;
  isNavBarEnabled?: boolean;
}

const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user_admin',
    numericId: 10001,
    fullName: 'متین توماج',
    username: 'admin',
    password: 'admin',
    role: 'admin',
    balanceTomans: 25000000,
    phone: '09113710000',
    iban: 'IR980120000000001234567890',
    cardNumber: '6037-9978-1122-3344',
    registeredAt: '۱۴۰۳/۰۱/۱۵',
    lastLogin: 'هم‌اکنون',
    isOnline: true,
    isBanned: false,
    isFullNameLocked: true,
    depositCount: 45,
    depositTotalTomans: 150000000,
    withdrawalCount: 12,
    withdrawalTotalTomans: 40000000,
    winsCount: 28,
    lossCount: 14,
    totalGames: 42,
  },
  {
    id: 'user_sample',
    numericId: 10842,
    fullName: 'آرش گلستانی',
    username: 'arash',
    password: '123',
    role: 'user',
    balanceTomans: 0,
    phone: '09121112233',
    iban: 'IR540170000000109876543210',
    cardNumber: '5022-2910-8844-9912',
    registeredAt: '۱۴۰۴/۰۲/۱۵',
    lastLogin: '۱۰ دقیقه پیش',
    isOnline: true,
    isBanned: false,
    isFullNameLocked: true,
    depositCount: 0,
    depositTotalTomans: 0,
    withdrawalCount: 0,
    withdrawalTotalTomans: 0,
    winsCount: 0,
    lossCount: 0,
    totalGames: 0,
  },
  {
    id: 'user_sara',
    numericId: 10843,
    fullName: 'سارا محمدی',
    username: 'sara_m',
    password: '123',
    role: 'user',
    balanceTomans: 0,
    phone: '09358889900',
    iban: 'IR120190000000304567890123',
    cardNumber: '5892-1012-7744-1234',
    registeredAt: '۱۴۰۴/۰۳/۲۰',
    lastLogin: '۱ ساعت پیش',
    isOnline: false,
    isBanned: false,
    isFullNameLocked: true,
    depositCount: 0,
    depositTotalTomans: 0,
    withdrawalCount: 0,
    withdrawalTotalTomans: 0,
    winsCount: 0,
    lossCount: 0,
    totalGames: 0,
  },
  {
    id: 'user_reza',
    numericId: 10844,
    fullName: 'رضا گرگانی',
    username: 'reza_gonbad',
    password: '123',
    role: 'user',
    balanceTomans: 0,
    phone: '09112704455',
    iban: 'IR650180000000009876543219',
    cardNumber: '6219-8610-3322-7711',
    registeredAt: '۱۴۰۴/۰۴/۰۱',
    lastLogin: 'دیروز ۱۸:۴۵',
    isOnline: false,
    isBanned: false,
    isFullNameLocked: true,
    depositCount: 0,
    depositTotalTomans: 0,
    withdrawalCount: 0,
    withdrawalTotalTomans: 0,
    winsCount: 0,
    lossCount: 4,
    totalGames: 35,
  },
  {
    id: 'user_kamran',
    numericId: 10845,
    fullName: 'کامران ایری',
    username: 'kamran_iri',
    password: '123',
    role: 'user',
    balanceTomans: 0,
    phone: '09113709988',
    iban: 'IR770560000000112233445566',
    cardNumber: '6104-3378-5566-7788',
    registeredAt: '۱۴۰۳/۱۱/۱۰',
    lastLogin: '۳ روز پیش',
    isOnline: false,
    isBanned: true,
    isFullNameLocked: true,
    depositCount: 3,
    depositTotalTomans: 2000000,
    withdrawalCount: 1,
    withdrawalTotalTomans: 1800000,
    winsCount: 0,
    lossCount: 3,
    totalGames: 12,
  },
];

// Demo/fake accounts that must never appear in the app
export const FAKE_USER_IDS = new Set(['user_sample', 'user_sara', 'user_reza', 'user_kamran']);

const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    number: 1,
    title: 'کورس اول: نژاد ترکمن ۲ ساله مبتدی و نبرده',
    distance: '۱۰۰۰ متر',
    trackType: 'خاک نرم - پیست اصلی',
    prizePool: 85000000,
    winningHorseNumber: 3,
    horses: [
      { id: 'h1_1', number: 1, name: 'نوران', jockey: 'کمال دالیجه عطا', trainer: 'آیدین دالیجه', pedigree: 'شاهین سیاه x گل‌صحرا', silkColor: '#10b981', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 92, odds: 2.2, isScratched: false, isReplacement: false },
      { id: 'h1_2', number: 2, name: 'پایان‌مهر', jockey: 'بنیامین جرجانی', trainer: 'سلیمان بهلکه', pedigree: 'آریا x درنا', silkColor: '#ef4444', silkPattern: 'solid', rating: 75, odds: 4.5, isScratched: true, isReplacement: false },
      { id: 'h1_3', number: 3, name: 'کوتیز توزیران', jockey: 'رامین قهرمانی', trainer: 'جبار یارعلی', pedigree: 'طوفان صحرا x مارال', silkColor: '#3b82f6', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 84, odds: 3.1, isScratched: false, isReplacement: false },
      { id: 'h1_4', number: 4, name: 'بادرخشان', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#f59e0b', silkPattern: 'sash', silkSecondaryColor: '#000000', rating: 89, odds: 2.4, isScratched: false, isReplacement: false },
      { id: 'h1_5', number: 5, name: 'قره داغ یل...', jockey: 'میلاد پایدار', trainer: 'حمید گوگ‌نژاد', pedigree: 'گوهر صحرا x سارای', silkColor: '#8b5cf6', silkPattern: 'solid', rating: 81, odds: 3.8, isScratched: false, isReplacement: false },
      { id: 'h1_6', number: 6, name: 'هریکن اوفل', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x مون لایت', silkColor: '#06b6d4', silkPattern: 'solid', rating: 79, odds: 4.2, isScratched: false, isReplacement: false },
      { id: 'h1_7', number: 7, name: 'داتیس', jockey: 'نادر صالح‌پور', trainer: 'میکائیل ایری', pedigree: 'سردار x مروارید', silkColor: '#ec4899', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 76, odds: 5.0, isScratched: false, isReplacement: false },
      { id: 'h1_8', number: 8, name: 'تهنا', jockey: 'یونس اورمز', trainer: 'عطا رحمانی', pedigree: 'المپیک x آیدا', silkColor: '#84cc16', silkPattern: 'solid', rating: 77, odds: 4.8, isScratched: false, isReplacement: false },
      { id: 'h1_9', number: 9, name: 'زمزما وحیدی', jockey: 'قربان محمد ارازپور', trainer: 'طاهر گوکلانی', pedigree: 'ردسان x شعله', silkColor: '#0ea5e9', silkPattern: 'sash', silkSecondaryColor: '#ffffff', rating: 72, odds: 6.2, isScratched: false, isReplacement: false },
      { id: 'h1_10', number: 10, name: 'نگاه ایران مهر', jockey: 'جواد توماج', trainer: 'صالح ارازپور', pedigree: 'گلدن برد x نغمه', silkColor: '#a855f7', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 83, odds: 2.9, isScratched: false, isReplacement: false },
      { id: 'h1_11', number: 11, name: 'ایمان خان صحرا', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'سامی x رکسانا', silkColor: '#f97316', silkPattern: 'stars', silkSecondaryColor: '#000000', rating: 74, odds: 5.5, isScratched: false, isReplacement: false },
      { id: 'h1_12', number: 12, name: 'بازار دشت ناز', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'بومبا x صحرا گل', silkColor: '#1e293b', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 78, odds: 4.0, isScratched: false, isReplacement: false },
      { id: 'h1_13', number: 13, name: 'میلی چهر', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#ec4899', silkPattern: 'solid', rating: 60, odds: 9.0, isScratched: true, isReplacement: false },
      { id: 'h1_14', number: 14, name: 'رامان پسندی', jockey: 'جواد آشورپور', trainer: 'حمید روشندل', pedigree: 'کوروش کبیر x تارا', silkColor: '#6366f1', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 86, odds: 2.6, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c2',
    number: 2,
    title: 'کورس دوم: دوخون ۳ تا ۴ ساله هندیکپ کلاس ۵',
    distance: '۱۲۰۰ متر',
    trackType: 'خاک - پیست استاندارد',
    prizePool: 95000000,
    winningHorseNumber: 4,
    horses: [
      { id: 'h2_1', number: 1, name: 'اوچورولد', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x مون لایت', silkColor: '#06b6d4', silkPattern: 'solid', rating: 88, odds: 2.1, isScratched: false, isReplacement: false },
      { id: 'h2_2', number: 2, name: 'کشمیر', jockey: 'نادر صالح‌پور', trainer: 'میکائیل ایری', pedigree: 'سردار x مروارید', silkColor: '#ec4899', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 83, odds: 3.0, isScratched: false, isReplacement: false },
      { id: 'h2_3', number: 3, name: 'والسا', jockey: 'یونس اورمز', trainer: 'عطا رحمانی', pedigree: 'المپیک x آیدا', silkColor: '#84cc16', silkPattern: 'solid', rating: 85, odds: 2.7, isScratched: false, isReplacement: false },
      { id: 'h2_4', number: 4, name: 'آب', jockey: 'قربان محمد ارازپور', trainer: 'طاهر گوکلانی', pedigree: 'ردسان x شعله', silkColor: '#e11d48', silkPattern: 'sash', silkSecondaryColor: '#ffffff', rating: 80, odds: 3.5, isScratched: false, isReplacement: false },
      { id: 'h2_5', number: 5, name: 'آلپ', jockey: 'جواد توماج', trainer: 'صالح ارازپور', pedigree: 'گلدن برد x نغمه', silkColor: '#3b82f6', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 87, odds: 2.4, isScratched: false, isReplacement: true, replacementForNumber: 4 },
      { id: 'h2_6', number: 6, name: 'دار جمهور', jockey: 'کمال دالیجه عطا', trainer: 'آیدین دالیجه', pedigree: 'شاهین سیاه x گل‌صحرا', silkColor: '#10b981', silkPattern: 'solid', rating: 82, odds: 3.2, isScratched: false, isReplacement: false },
      { id: 'h2_7', number: 7, name: 'سون آتون', jockey: 'بنیامین جرجانی', trainer: 'سلیمان بهلکه', pedigree: 'آریا x درنا', silkColor: '#3b82f6', silkPattern: 'solid', rating: 78, odds: 4.1, isScratched: false, isReplacement: false },
      { id: 'h2_8', number: 8, name: 'کارادیس', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'بومبا x صحرا گل', silkColor: '#65a30d', silkPattern: 'solid', rating: 79, odds: 3.9, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c3',
    number: 3,
    title: 'کورس سوم: تروبرد ۳ ساله هندیکپ کلاس ۲',
    distance: '۱۴۰۰ متر',
    trackType: 'خاک استاندارد بین‌المللی',
    prizePool: 130000000,
    winningHorseNumber: 5,
    horses: [
      { id: 'h3_1', number: 1, name: 'تی‌تیک', jockey: 'جواد آشورپور', trainer: 'حمید روشندل', pedigree: 'کینگ گلد x ملکه صحرا', silkColor: '#6366f1', silkPattern: 'solid', rating: 65, odds: 8.0, isScratched: true, isReplacement: false },
      { id: 'h3_2', number: 2, name: 'اورانوس', jockey: 'بهروز قرنجیک', trainer: 'یوسف گرگانلی', pedigree: 'ریو سان x آلما', silkColor: '#14b8a6', silkPattern: 'stripes', silkSecondaryColor: '#000000', rating: 85, odds: 2.8, isScratched: false, isReplacement: false },
      { id: 'h3_3', number: 3, name: 'فنوکیس سرا', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'تندیس x سحر', silkColor: '#10b981', silkPattern: 'solid', rating: 94, odds: 1.7, isScratched: false, isReplacement: false },
      { id: 'h3_4', number: 4, name: 'فلادر پند', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'البرز x کتی', silkColor: '#00e676', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 91, odds: 2.0, isScratched: false, isReplacement: false },
      { id: 'h3_5', number: 5, name: 'آتیشین', jockey: 'میلاد پایدار', trainer: 'حمید گوگ‌نژاد', pedigree: 'گوهر صحرا x سارای', silkColor: '#f59e0b', silkPattern: 'solid', rating: 83, odds: 3.2, isScratched: false, isReplacement: false },
      { id: 'h3_6', number: 6, name: 'سی‌چهره', jockey: 'رامین قهرمانی', trainer: 'جبار یارعلی', pedigree: 'طوفان صحرا x مارال', silkColor: '#e11d48', silkPattern: 'solid', rating: 62, odds: 9.5, isScratched: true, isReplacement: false },
      { id: 'h3_7', number: 7, name: 'کندن ققنوس', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#a855f7', silkPattern: 'solid', rating: 79, odds: 4.0, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c4',
    number: 4,
    title: 'کورس چهارم: دوخون ۴ تا ۶ ساله هندیکپ کلاس ۱',
    distance: '۱۶۰۰ متر',
    trackType: 'خاک نرم - استقامت',
    prizePool: 160000000,
    winningHorseNumber: 8,
    horses: [
      { id: 'h4_1', number: 1, name: 'تی‌تیک', jockey: 'کمال دالیجه عطا', trainer: 'امان دردی پور', pedigree: 'ریو مجیک x استارلایت', silkColor: '#dc2626', silkPattern: 'solid', rating: 64, odds: 8.5, isScratched: true, isReplacement: false },
      { id: 'h4_2', number: 2, name: 'حاجی‌برورد', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'بومبا x صحرا گل', silkColor: '#b91c1c', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 61, odds: 9.0, isScratched: true, isReplacement: false },
      { id: 'h4_3', number: 3, name: 'فشفشه', jockey: 'بنیامین جرجانی', trainer: 'مسعود کم', pedigree: 'سفیر x صبا', silkColor: '#0284c7', silkPattern: 'solid', rating: 86, odds: 2.5, isScratched: false, isReplacement: false },
      { id: 'h4_4', number: 4, name: 'دربی لیدر', jockey: 'رامین قهرمانی', trainer: 'طاهر جرجانی', pedigree: 'تندر x مایا', silkColor: '#eab308', silkPattern: 'sash', silkSecondaryColor: '#000000', rating: 89, odds: 2.2, isScratched: false, isReplacement: false },
      { id: 'h4_5', number: 5, name: 'ریو فوکوس', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#8b5cf6', silkPattern: 'solid', rating: 84, odds: 3.1, isScratched: false, isReplacement: false },
      { id: 'h4_6', number: 6, name: 'پهلوان بندر', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x مون لایت', silkColor: '#2563eb', silkPattern: 'solid', rating: 82, odds: 3.6, isScratched: false, isReplacement: false },
      { id: 'h4_7', number: 7, name: 'مسلنرسمیا', jockey: 'نادر صالح‌پور', trainer: 'میکائیل ایری', pedigree: 'سردار x مروارید', silkColor: '#991b1b', silkPattern: 'solid', rating: 59, odds: 11.0, isScratched: true, isReplacement: false },
      { id: 'h4_8', number: 8, name: 'طوفان آسیا گل', jockey: 'یونس اورمز', trainer: 'عطا رحمانی', pedigree: 'المپیک x آیدا', silkColor: '#65a30d', silkPattern: 'solid', rating: 87, odds: 2.6, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c5',
    number: 5,
    title: 'کورس پنجم: تروبرد وارداتی ۳ سال به بالا کلاس برتر',
    distance: '۱۰۰۰ متر',
    trackType: 'خاک - سرعت انفجاری',
    prizePool: 220000000,
    winningHorseNumber: 6,
    horses: [
      { id: 'h5_1', number: 1, name: 'تایتاتیک', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'اسکای واکر x جت بال', silkColor: '#4f46e5', silkPattern: 'solid', rating: 91, odds: 1.9, isScratched: false, isReplacement: false },
      { id: 'h5_2', number: 2, name: 'تکتاز گل', jockey: 'جواد آشورپور', trainer: 'حمید روشندل', pedigree: 'کوروش کبیر x تارا', silkColor: '#059669', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 88, odds: 2.5, isScratched: false, isReplacement: false },
      { id: 'h5_3', number: 3, name: 'آمارون', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#dc2626', silkPattern: 'solid', rating: 85, odds: 2.9, isScratched: false, isReplacement: false },
      { id: 'h5_4', number: 4, name: 'بابا امان', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'سامی x رکسانا', silkColor: '#ca8a04', silkPattern: 'stars', silkSecondaryColor: '#000000', rating: 83, odds: 3.3, isScratched: false, isReplacement: false },
      { id: 'h5_5', number: 5, name: 'النورا', jockey: 'میلاد پایدار', trainer: 'حمید گوگ‌نژاد', pedigree: 'گوهر صحرا x سارای', silkColor: '#f472b6', silkPattern: 'solid', rating: 80, odds: 3.8, isScratched: false, isReplacement: false },
      { id: 'h5_6', number: 6, name: 'سورینو', jockey: 'بنیامین جرجانی', trainer: 'سلیمان بهلکه', pedigree: 'آریا x درنا', silkColor: '#3b82f6', silkPattern: 'solid', rating: 78, odds: 4.4, isScratched: false, isReplacement: false },
      { id: 'h5_7', number: 7, name: 'توپ', jockey: 'رامین قهرمانی', trainer: 'جبار یارعلی', pedigree: 'طوفان صحرا x مارال', silkColor: '#b91c1c', silkPattern: 'solid', rating: 58, odds: 12.0, isScratched: true, isReplacement: false },
      { id: 'h5_8', number: 8, name: 'چانتان', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#65a30d', silkPattern: 'solid', rating: 84, odds: 3.0, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c6',
    number: 6,
    title: 'کورس ششم (کورس طلایی): اسب‌های قهرمان قهرمانان دور نهایی',
    distance: '۱۵۵۰ متر',
    trackType: 'خاک پیست اصلی گنبد',
    prizePool: 300000000,
    winningHorseNumber: 3,
    horses: [
      { id: 'h6_1', number: 1, name: 'ناسیونال', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'تکخال صحرا x سایکو کوئین', silkColor: '#10b981', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 95, odds: 1.5, isScratched: false, isReplacement: false },
      { id: 'h6_2', number: 2, name: 'ریو میکیک', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'دارک هورس x دایموند', silkColor: '#18181b', silkPattern: 'sash', silkSecondaryColor: '#10b981', rating: 89, odds: 2.3, isScratched: false, isReplacement: false },
      { id: 'h6_3', number: 3, name: 'ماهور', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'اترک خان x گزل', silkColor: '#2563eb', silkPattern: 'solid', rating: 86, odds: 2.8, isScratched: false, isReplacement: false },
      { id: 'h6_4', number: 4, name: 'تریعوف', jockey: 'جواد توماج', trainer: 'طاهر ارازپور', pedigree: 'فایتر x نگین', silkColor: '#eab308', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 82, odds: 3.5, isScratched: false, isReplacement: false },
      { id: 'h6_5', number: 5, name: 'شاهکار', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'اسکای واکر x جت بال', silkColor: '#f472b6', silkPattern: 'solid', rating: 84, odds: 3.2, isScratched: false, isReplacement: false },
      { id: 'h6_6', number: 6, name: 'بادمینا', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#3b82f6', silkPattern: 'solid', rating: 79, odds: 4.2, isScratched: false, isReplacement: false },
      { id: 'h6_7', number: 7, name: 'تیوان آی تپه', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'سامی x رکسانا', silkColor: '#854d0e', silkPattern: 'stars', silkSecondaryColor: '#000000', rating: 77, odds: 4.8, isScratched: false, isReplacement: false },
      { id: 'h6_8', number: 8, name: 'تاواناپا', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#65a30d', silkPattern: 'solid', rating: 81, odds: 3.8, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c7',
    number: 7,
    title: 'کورس هفتم: تروبرد هندیکپ ویژه قهرمانان دور نهایی',
    distance: '۱۷۰۰ متر',
    trackType: 'خاک - پیست اصلی',
    prizePool: 350000000,
    winningHorseNumber: 2,
    horses: [
      { id: 'h7_1', number: 1, name: 'سردار صحرا', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'شاهین سیاه x دایموند', silkColor: '#10b981', silkPattern: 'solid', rating: 94, odds: 1.8, isScratched: false, isReplacement: false },
      { id: 'h7_2', number: 2, name: 'یلدوز خان', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x درنا', silkColor: '#3b82f6', silkPattern: 'solid', rating: 90, odds: 2.2, isScratched: false, isReplacement: false },
      { id: 'h7_3', number: 3, name: 'گوهر گنبد', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'تندر x مایا', silkColor: '#eab308', silkPattern: 'solid', rating: 88, odds: 2.7, isScratched: false, isReplacement: false },
      { id: 'h7_4', number: 4, name: 'دلیران خزر', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'المپیک x آیدا', silkColor: '#ec4899', silkPattern: 'solid', rating: 82, odds: 3.5, isScratched: true, isReplacement: false },
      { id: 'h7_5', number: 5, name: 'قیام صحرا', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#06b6d4', silkPattern: 'solid', rating: 85, odds: 3.0, isScratched: false, isReplacement: false },
      { id: 'h7_6', number: 6, name: 'رعد ترکمن', jockey: 'رامین قهرمانی', trainer: 'طاهر جرجانی', pedigree: 'شاهوار x رخساره', silkColor: '#8b5cf6', silkPattern: 'solid', rating: 79, odds: 4.1, isScratched: false, isReplacement: false },
    ],
  },
];

const INITIAL_WEEK: PredictionWeek = {
  id: 'w5_gonbad_1405',
  code: 'W5-GONBAD',
  title: 'هفته ۵ مسابقات اسب‌دوانی پاییزه گنبد کاووس',
  trackName: 'مجتمع سوارکاری بین‌المللی گنبد کاووس',
  type: 'shishpar',
  startDatePersian: '۱۴۰۵/۰۷/۱۷',
  // Countdown: 1 day, 6 hours, 59 mins, 37 secs from now
  countdownEndTimestamp: Date.now() + (1 * 86400 + 6 * 3600 + 59 * 60 + 37) * 1000,
  status: 'active',
  totalPoolTomans: 0, // صندوق کل کاملاً پویا و واقعی بر پایه مبالغ واریزی برگه‌ها
  unitPriceTomans: 2000, // ۲,۰۰۰ تومان نرخ پایه هر ترکیب برگه
  courses: INITIAL_COURSES,
  isShishParEnabled: true,
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'تغییر وضعیت اسب‌های حذفی کورس ۱ و ۲',
    message: 'اسب شماره ۳ تورقوز خان در کورس ۱ و اسب شماره ۴ صاعقه سرخ در کورس ۲ حذفی اعلام شدند و اسب‌های جایگزین مشخص گردیدند.',
    time: '۱۰ دقیقه پیش',
    read: false,
    type: 'race',
  },
  {
    id: 'n2',
    title: 'افزایش صندوق شش پره به ۴۸۵ میلیون تومان',
    message: 'با توجه به ثبت فرم‌های متعدد، صندوق کل جایزه مسابقه شش پره به رقم ۴۸۵,۰۰۰,۰۰۰ تومان رسید.',
    time: '۱ ساعت پیش',
    read: false,
    type: 'financial',
  },
  {
    id: 'n3',
    title: 'پخش زنده کورس‌ها با کیفیت HD',
    message: 'پخش مستقیم ویدیویی با گزارشگری اختصاصی از پیست گنبد فعال است.',
    time: '۳ ساعت پیش',
    read: true,
    type: 'system',
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_101',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    type: 'deposit',
    amountTomans: 1000000,
    date: '۱۴۰۵/۰۷/۱۶ - ۱۸:۳۰',
    status: 'approved',
    trackingCode: 'ID_9941',
  },
  {
    id: 'tx_102',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    type: 'prediction_fee',
    amountTomans: 160000,
    date: '۱۴۰۵/۰۷/۱۶ - ۱۹:۱۵',
    status: 'approved',
    trackingCode: 'ID_7721',
  },
  {
    id: 'tx_103',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    type: 'deposit',
    amountTomans: 500000,
    date: '۱۴۰۵/۰۷/۱۷ - ۰۹:۰۰',
    status: 'approved',
    trackingCode: 'ID_9988',
  },
];

const INITIAL_PREDICTIONS: PredictionSlip[] = [
  {
    id: 'ID_8890',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    weekId: 'w5_gonbad_1405',
    selections: {
      1: [2, 5],
      2: [1, 4],
      3: [4],
      4: [3, 6],
      5: [2],
      6: [1, 4],
    },
    replacementSelections: {
      1: [3],
      2: [2],
      3: [1],
      4: [5],
      5: [3],
      6: [2],
    },
    combinationsCount: 16,
    totalCostTomans: 32000,
    submittedAt: '1404/06/18 16:20',
    createdAtTimestamp: Date.now() - 2 * 3600 * 1000, // 2 hours ago
    status: 'pending',
    payoutTomans: 485000000,
    snapshotCourses: JSON.parse(JSON.stringify(INITIAL_COURSES)),
  },
  {
    id: 'ID_8891',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    weekId: 'w5_gonbad_1405',
    selections: {
      1: [3, 6],
      2: [1, 4],
      3: [7, 2],
      4: [5, 8],
      5: [6, 1],
      6: [9, 3],
    },
    replacementSelections: {
      1: [1],
      2: [5],
      3: [3],
      4: [2],
      5: [4],
      6: [7],
    },
    combinationsCount: 64,
    totalCostTomans: 500000,
    submittedAt: '1404/06/18 14:33',
    createdAtTimestamp: Date.now() - 24 * 3600 * 1000, // 1 day ago
    status: 'lost',
    payoutTomans: 485000000,
    snapshotCourses: JSON.parse(JSON.stringify(INITIAL_COURSES)),
  },
  {
    id: 'ID_8892',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    weekId: 'w5_gonbad_1405',
    selections: {
      1: [3],
      2: [4],
      3: [5, 7],
      4: [8],
      5: [6],
      6: [3],
    },
    replacementSelections: {
      1: [1],
      2: [5],
      3: [2],
      4: [2],
      5: [1],
      6: [1],
    },
    combinationsCount: 2,
    totalCostTomans: 32000,
    submittedAt: '1404/06/18 12:15',
    createdAtTimestamp: Date.now() - 48 * 3600 * 1000, // 2 days ago
    status: 'won',
    payoutTomans: 485000000,
    snapshotCourses: JSON.parse(JSON.stringify(INITIAL_COURSES)),
  },
  {
    id: 'ID_8893',
    userId: 'user_admin',
    userName: 'متین توماج',
    weekId: 'w5_gonbad_1405',
    selections: {
      1: [3, 6],
      2: [1, 4],
      3: [7, 2],
      4: [5, 8],
      5: [6, 1],
      6: [9, 3],
    },
    replacementSelections: {
      1: [1],
      2: [5],
      3: [3],
      4: [2],
      5: [4],
      6: [7],
    },
    combinationsCount: 64,
    totalCostTomans: 500000,
    submittedAt: '1404/06/18 14:33',
    createdAtTimestamp: Date.now() - 72 * 3600 * 1000, // 3 days ago
    status: 'lost',
    payoutTomans: 485000000,
    snapshotCourses: JSON.parse(JSON.stringify(INITIAL_COURSES)),
  },
];

const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_101',
    userId: 'user_sample',
    userName: 'آرش گلستانی',
    phone: '0912***2233',
    subject: 'درخواست بررسی واریز به کیف پول',
    summary: 'واریزی به مبلغ ۱,۰۰۰,۰۰۰ تومان از طریق درگاه انجام شد ولی بعد از ۱۰ دقیقه در موجودی کیف پول من شارژ نشده است. لطفاً پیگیری بفرمایید.',
    status: 'new',
    createdAt: '۱۰ دقیقه پیش',
    createdAtTimestamp: Date.now() - 10 * 60 * 1000,
    messages: [
      { id: 'msg_101_1', sender: 'user', text: 'سلام، واریزی من با شناسه تراکنش SAYKO-DEP-99412 هنوز اضافه نشده است.', time: '۱۰ دقیقه پیش', timestamp: Date.now() - 10 * 60 * 1000 }
    ]
  },
  {
    id: 'tkt_102',
    userId: 'user_sara',
    userName: 'سارا محمدی',
    phone: '0935***9900',
    subject: 'پرسش درباره اسب جایگزین کورس ۴',
    summary: 'اگر اسب انتخاب اول من در کورس ۴ خط بخورد و اسب جایگزین مقام اول را بیاورد، برگه من برنده اعلام می‌شود یا خیر؟',
    status: 'pending',
    createdAt: '۴۵ دقیقه پیش',
    createdAtTimestamp: Date.now() - 45 * 60 * 1000,
    messages: [
      { id: 'msg_102_1', sender: 'user', text: 'سلام وقت بخیر، قانون جایگزینی چطور محاسبه می‌شود؟', time: '۴۵ دقیقه پیش', timestamp: Date.now() - 45 * 60 * 1000 }
    ]
  },
  {
    id: 'tkt_103',
    userId: 'user_reza',
    userName: 'رضا گرگانی',
    phone: '0911***4455',
    subject: 'تغییر شماره شبای بانکی',
    summary: 'شماره شبای جدید من با نام بانک ملی ثبت شد؟ پیامک تایید را دریافت نکردم.',
    status: 'answered',
    createdAt: 'دیروز ۱۶:۲۰',
    createdAtTimestamp: Date.now() - 24 * 3600 * 1000,
    messages: [
      { id: 'msg_103_1', sender: 'user', text: 'سلام، شماره شبای بانک ملی من IR650180000000009876543219 تایید شده است؟', time: 'دیروز ۱۶:۲۰', timestamp: Date.now() - 24 * 3600 * 1000 },
      { id: 'msg_103_2', sender: 'support', text: 'با سلام، شماره شبای شما با موفقیت بررسی و تایید گردید.', time: 'دیروز ۱۷:۱۰', timestamp: Date.now() - 23 * 3600 * 1000 }
    ]
  },
  {
    id: 'tkt_104',
    userId: 'user_kamran',
    userName: 'کامران ایری',
    phone: '0911***9988',
    subject: 'استعلام حساب مسدود شده',
    summary: 'علت محدودیت تراکنش و مسدودی حساب کاربری من چیست؟ مدارک هویتی ارسال شد.',
    status: 'closed',
    createdAt: '۳ روز پیش',
    createdAtTimestamp: Date.now() - 3 * 24 * 3600 * 1000,
    messages: [
      { id: 'msg_104_1', sender: 'user', text: 'سلام، حساب من مسدود است لطفاً رفع مسدودی کنید.', time: '۳ روز پیش', timestamp: Date.now() - 3 * 24 * 3600 * 1000 },
      { id: 'msg_104_2', sender: 'support', text: 'کاربر گرامی، حساب شما به دلیل نقض قوانین تراکنش تا زمان احراز هویت تصویری مسدود شده بود.', time: '۳ روز پیش', timestamp: Date.now() - 3 * 24 * 3600 * 1000 }
    ]
  }
];

// Helper to access and write to localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`sayko_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`sayko_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage`, e);
  }
}


const INITIAL_POLL_VOTES: Record<string, number> = {};

export class AppStore {
  private static instance: AppStore;
  private listeners: Set<() => void> = new Set();

  public users: UserProfile[];
  public currentUser: UserProfile | null;
  public activeWeek: PredictionWeek;
  public predictions: PredictionSlip[];
  public transactions: Transaction[];
  public notifications: NotificationItem[];
  public supportTickets: SupportTicket[];
  public pollVotes: Record<string, number>;
  public userPollVotes: Record<string, UserPollVote>;
  public liveStreamUrl: string;
  public liveStreamIsActive: boolean;
  public liveAnnouncementText: string;
  public isAnnouncementVisible: boolean;
  public broadcastStartTime: string;
  public adminPin: string;
  public adminAlerts: { newRequests: boolean; newMessages: boolean; highValueTx: boolean };
  public admin2FA: boolean;
  public adminSensitiveAlerts: boolean;
  public isWithdrawalEnabled: boolean;
  public refundRate: number;
  public deletedIds: Set<string> = new Set();
  public bannedNotice: number | null = null;
  private lastPresencePing = 0;
  private seenRemoteIds = new Set<string>();
  public adminFeePercentage: number = 14;
  public isSettlementCompleted: boolean;
  public customWinningPrize: number = 23000000;
  public isNavBarEnabled: boolean = true;
  public isLiveChatEnabled: boolean = true;
  public isSupportNotificationsEnabled: boolean = true;
  public hasRecentWinnerBadge: boolean = false;
  public hasRecentDefeatBadge: boolean = false;
  public loginSessions: { id: string; device: string; browser: string; ip: string; time: string; current: boolean }[];
  public todayStatsResetTimestamp: number = 0;
  public todayProfitResetTimestamp: number = 0;

  private constructor() {
    this.todayStatsResetTimestamp = loadFromStorage('today_stats_reset_timestamp', 0);
    this.todayProfitResetTimestamp = loadFromStorage('admin_today_profit_reset', 0);
    this.deletedIds = new Set(loadFromStorage<string[]>('deleted_user_ids', []));
    if (typeof window !== 'undefined') {
      setTimeout(() => pruneExpiredData().catch(() => {}), 5000);
      setInterval(() => pruneExpiredData().catch(() => {}), 15 * 60e3);
    }
    this.users = loadFromStorage('users', DEFAULT_USERS).filter(u => !FAKE_USER_IDS.has(u.id) && !this.deletedIds.has(u.id));
    // Real Wallet & Zero Initial Balance: Ensure all non-admin users without approved transactions have strictly 0 Tomans
    this.users = this.users.map((u, idx) => {
      let balance = u.balanceTomans;
      if (u.role !== 'admin' && (!u.depositTotalTomans || u.depositTotalTomans === 0)) {
        balance = 0;
      }
      return {
        ...u,
        balanceTomans: balance,
        numericId: u.numericId || (DEFAULT_USERS[idx]?.numericId ?? (10800 + idx)),
        fullName: u.id === 'user_admin' ? 'متین توماج' : u.fullName,
      };
    });
    // Strict Session Isolation: Do NOT default to any sample account. Unauthenticated visitors must explicitly login/register.
    this.currentUser = loadFromStorage<UserProfile | null>('current_user', null);
    if (this.currentUser) {
      if (this.currentUser.role !== 'admin' && (!this.currentUser.depositTotalTomans || this.currentUser.depositTotalTomans === 0)) {
        this.currentUser.balanceTomans = 0;
      }
      this.currentUser = {
        ...this.currentUser,
        numericId: this.currentUser.numericId || 10842,
        fullName: this.currentUser.id === 'user_admin' ? 'متین توماج' : this.currentUser.fullName,
      };
    }
    this.activeWeek = loadFromStorage('active_week', INITIAL_WEEK);
    // Ensure Course 7 exists if present in INITIAL_COURSES
    if (this.activeWeek && this.activeWeek.courses) {
      const c7Template = INITIAL_COURSES.find(c => c.number === 7);
      if (c7Template && !this.activeWeek.courses.some(c => c.number === 7)) {
        this.activeWeek.courses.push(JSON.parse(JSON.stringify(c7Template)));
        this.activeWeek.courses.sort((a, b) => a.number - b.number);
        saveToStorage('active_week', this.activeWeek);
      }
    }
    // Persistent Tickets & Messages: NEVER auto-clear, purge, or expire predictions!
    const rawPredictions = loadFromStorage<PredictionSlip[]>('predictions', INITIAL_PREDICTIONS);
    const validPredictions = (rawPredictions && rawPredictions.length > 0)
      ? rawPredictions.map(p => ({
          ...p,
          snapshotCourses: p.snapshotCourses || JSON.parse(JSON.stringify(INITIAL_COURSES)),
        }))
      : INITIAL_PREDICTIONS.map(p => ({ ...p }));
    this.predictions = validPredictions.filter(p => !FAKE_USER_IDS.has(p.userId));
    saveToStorage('predictions', this.predictions);

    this.transactions = loadFromStorage('transactions', INITIAL_TRANSACTIONS).filter((x: any) => !FAKE_USER_IDS.has(x.userId));
    this.notifications = loadFromStorage('notifications', INITIAL_NOTIFICATIONS).filter((x: any) => !FAKE_USER_IDS.has(x.userId));
    this.supportTickets = loadFromStorage('support_tickets', INITIAL_SUPPORT_TICKETS).filter((x: any) => !FAKE_USER_IDS.has(x.userId));
    this.pollVotes = loadFromStorage('poll_votes_real_v1', INITIAL_POLL_VOTES);
    this.userPollVotes = loadFromStorage('user_poll_votes', {
      user_admin: {
        userId: 'user_admin',
        userName: 'متین توماج',
        horseId: 'h1_1',
        courseNumber: 1,
        horseName: 'فوکوس سرا',
        votedAt: '۱۴:۱۵ امروز',
        timestamp: Date.now() - 3600000,
      }
    });
    const savedStreamUrl = loadFromStorage<string>('live_stream_url', '') || 
      (typeof window !== 'undefined' ? (localStorage.getItem('sayko_live_stream_url') || '') : '') || 
      'https://www.aparat.com/Asbdavani_app/live';
    this.liveStreamUrl = savedStreamUrl;
    this.liveStreamIsActive = loadFromStorage('live_stream_is_active', true);
    this.liveAnnouncementText = loadFromStorage('live_announcement_text', 'به پخش زنده هفته پنجم مسابقات اسب‌دوانی پاییزه گنبد کاووس خوش آمدید. نتایج به صورت زنده تطبیق داده می‌شوند.');
    this.isAnnouncementVisible = loadFromStorage('live_announcement_visible', true);
    this.broadcastStartTime = loadFromStorage('live_broadcast_start_time', '۱۴:۳۰ امروز');
    this.adminPin = loadFromStorage('admin_pin', '2026');
    this.adminAlerts = loadFromStorage('admin_alerts', { newRequests: true, newMessages: true, highValueTx: true });
    this.admin2FA = loadFromStorage('admin_2fa', false);
    this.adminSensitiveAlerts = loadFromStorage('admin_sensitive_alerts', true);
    this.isWithdrawalEnabled = loadFromStorage('admin_withdrawal_enabled', true);
    this.refundRate = 15; // fixed automatic refund rate
    this.isSettlementCompleted = loadFromStorage('admin_settlement_completed', false);
    this.customWinningPrize = loadFromStorage('custom_winning_prize', 23000000);
    this.isNavBarEnabled = loadFromStorage('is_navbar_enabled', true);
    this.isLiveChatEnabled = loadFromStorage('is_live_chat_enabled', true);
    this.isSupportNotificationsEnabled = loadFromStorage('is_support_notifs_enabled', true);
    this.hasRecentWinnerBadge = loadFromStorage('has_recent_winner_badge', false);
    this.hasRecentDefeatBadge = loadFromStorage('has_recent_defeat_badge', false);
    this.loginSessions = loadFromStorage('admin_login_sessions', [
      { id: 'sess_1', device: 'Chrome on macOS (Sonoma)', browser: 'Chrome 128.0', ip: '5.122.84.112 (تهران)', time: 'هم‌اکنون', current: true },
      { id: 'sess_2', device: 'Safari on iPhone 15 Pro', browser: 'Safari Mobile', ip: '5.122.84.112 (تهران)', time: 'دیروز ۲۱:۱۴', current: false },
      { id: 'sess_3', device: 'Firefox on Windows 11', browser: 'Firefox 130.0', ip: '91.98.140.23 (گنبد)', time: '۳ روز پیش', current: false },
    ]);

    // Initial background sync with central database and Supabase tables
    this.initSupabaseSync();
    if (typeof window !== 'undefined') {
      this.syncWithCentralServer();
      this.pullCentralDb();
      setInterval(() => {
        this.syncWithCentralServer();
      }, 2500);
      setInterval(() => {
        this.pullCentralDb();
      }, 3000);
      this.pullSharedGameState();
      setInterval(() => {
        this.pullSharedGameState();
      }, 3000);
    }
  }

  public static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Generates a non-repeating, collision-free tracking ID (e.g. ID_8890) across transactions and slips
   */
  public generateUniqueTrackingId(prefix: string = 'ID'): string {
    const existingIds = new Set<string>();
    (this.predictions || []).forEach(p => {
      if (p.id) existingIds.add(p.id.toUpperCase());
    });
    (this.transactions || []).forEach(t => {
      if (t.id) existingIds.add(t.id.toUpperCase());
      if (t.trackingCode) existingIds.add(t.trackingCode.toUpperCase());
    });
    (this.notifications || []).forEach(n => {
      if (n.id) existingIds.add(n.id.toUpperCase());
    });

    for (let attempts = 0; attempts < 5000; attempts++) {
      const num = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${prefix}_${num}`;
      if (!existingIds.has(candidate.toUpperCase())) {
        return candidate;
      }
    }
    return `${prefix}_${Date.now().toString().slice(-4)}`;
  }

  private notify(): void {
    saveToStorage('users', this.users);
    saveToStorage('current_user', this.currentUser);
    saveToStorage('active_week', this.activeWeek);
    saveToStorage('predictions', this.predictions);
    saveToStorage('transactions', this.transactions);
    saveToStorage('notifications', this.notifications);
    saveToStorage('support_tickets', this.supportTickets);
    saveToStorage('poll_votes_real_v1', this.pollVotes);
    saveToStorage('user_poll_votes', this.userPollVotes);
    saveToStorage('live_stream_url', this.liveStreamUrl);
    saveToStorage('live_stream_is_active', this.liveStreamIsActive);
    saveToStorage('live_announcement_text', this.liveAnnouncementText);
    saveToStorage('live_announcement_visible', this.isAnnouncementVisible);
    saveToStorage('live_broadcast_start_time', this.broadcastStartTime);
    saveToStorage('admin_pin', this.adminPin);
    saveToStorage('admin_alerts', this.adminAlerts);
    saveToStorage('admin_2fa', this.admin2FA);
    saveToStorage('admin_sensitive_alerts', this.adminSensitiveAlerts);
    saveToStorage('admin_withdrawal_enabled', this.isWithdrawalEnabled);
    saveToStorage('admin_refund_rate', this.refundRate);
    saveToStorage('admin_settlement_completed', this.isSettlementCompleted);
    saveToStorage('custom_winning_prize', this.customWinningPrize);
    saveToStorage('is_navbar_enabled', this.isNavBarEnabled);
    saveToStorage('is_live_chat_enabled', this.isLiveChatEnabled);
    saveToStorage('is_support_notifs_enabled', this.isSupportNotificationsEnabled);
    saveToStorage('has_recent_winner_badge', this.hasRecentWinnerBadge);
    saveToStorage('has_recent_defeat_badge', this.hasRecentDefeatBadge);
    saveToStorage('admin_login_sessions', this.loginSessions);
    saveToStorage('today_stats_reset_timestamp', this.todayStatsResetTimestamp);
    saveToStorage('admin_today_profit_reset', this.todayProfitResetTimestamp);
    this.pushLocalChangesToDb();
    this.pushSharedGameState();
    this.pushCentralWeek();
    this.listeners.forEach((fn) => fn());
  }

  // ===== Shared Six-Pareh / poll state via admin_settings =====
  private lastSyncedWeek = '';
  private lastSyncedPoll = '';
  private sharedStateLoaded = false;
  private adminWeekEditedAt = 0;
  private withdrawalEditedAt = 0;

  private lastCentralWeekSig = '';
  private centralWeekPushedAt = 0;
  private centralWeekLoaded = false;
  private weekSig(): string {
    const { totalPoolTomans, ...rest } = this.activeWeek as any;
    return JSON.stringify(rest);
  }
  private pushCentralWeek(): void {
    if (typeof window === 'undefined' || this.currentUser?.role !== 'admin' || !this.centralWeekLoaded) return;
    const sig = this.weekSig();
    if (sig === this.lastCentralWeekSig) return;
    this.lastCentralWeekSig = sig;
    this.centralWeekPushedAt = Date.now();
    fetch('/api/admin/active-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeWeek: { ...JSON.parse(sig) } }),
    }).then(() => { this.centralWeekPushedAt = Date.now(); }).catch(() => { this.lastCentralWeekSig = ''; });
  }

  private pushSharedGameState(): void {
    if (!this.sharedStateLoaded) return;
    const weekStr = JSON.stringify(this.activeWeek);
    if (weekStr !== this.lastSyncedWeek && this.currentUser?.role === 'admin') {
      this.lastSyncedWeek = weekStr;
      syncAdminSettingToDb('active_week', this.activeWeek).catch(() => {});
    }
    const pollStr = JSON.stringify(this.pollVotes);
    if (pollStr !== this.lastSyncedPoll) {
      this.lastSyncedPoll = pollStr;
      syncAdminSettingToDb('poll_votes', this.pollVotes).catch(() => {});
    }
  }

  private applySharedGameState(key: string, value: any): boolean {
    if (key === 'active_week' && value && Array.isArray(value.courses) && false) {
      // Admin's device is the author of active_week: after the first load never let a stale DB copy overwrite its edits (e.g. a just-set winner)
      if (this.currentUser?.role === 'admin' && this.sharedStateLoaded) return false;
      const str = JSON.stringify(value);
      if (str !== this.lastSyncedWeek) {
        this.lastSyncedWeek = str;
        this.activeWeek = value;
        saveToStorage('active_week', this.activeWeek);
        return true;
      }
    }
    if (key === 'poll_votes' && value && typeof value === 'object') {
      const str = JSON.stringify(value);
      if (str !== this.lastSyncedPoll) {
        this.lastSyncedPoll = str;
        this.pollVotes = value;
        saveToStorage('poll_votes_real_v1', this.pollVotes);
        return true;
      }
    }
    return false;
  }

  private async pullSharedGameState(): Promise<void> {
    const settings = await fetchAdminSettingsFromDb();
    let changed = false;
    if (settings.active_week) changed = this.applySharedGameState('active_week', settings.active_week) || changed;
    if (settings.poll_votes) changed = this.applySharedGameState('poll_votes', settings.poll_votes) || changed;
    const wd = settings.withdrawal_enabled;
    if (wd && typeof wd.isEnabled === 'boolean' && wd.isEnabled !== this.isWithdrawalEnabled && Date.now() - this.withdrawalEditedAt > 8000) {
      this.isWithdrawalEnabled = wd.isEnabled;
      saveToStorage('admin_withdrawal_enabled', wd.isEnabled);
      changed = true;
    }
    const first = !this.sharedStateLoaded;
    this.sharedStateLoaded = true;
    if (first && !settings.active_week && this.currentUser?.role === 'admin') this.pushSharedGameState();
    if (changed) this.listeners.forEach((fn) => fn());
  }

  // ===== Central database sync (one shared admin panel for every device) =====
  private pushedNotifIds: Set<string> = new Set();
  private knownSig: Map<string, string> = new Map();
  private dbSyncBusy = false;

  private pushLocalChangesToDb(): void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return;
    try {
      // Notifications addressed to a specific user (approvals, rejections, replies)
      (this.notifications || []).slice(0, 50).forEach(n => {
        if (n.userId && !this.pushedNotifIds.has(n.id)) {
          this.pushedNotifIds.add(n.id);
          upsertNotificationToDb(n).catch(() => {});
        }
      });
      // Status / payout changes on transactions & slips made on this device
      (this.transactions || []).forEach(t => {
        const sig = `${t.status}|${t.amountTomans}`;
        const key = `tx:${t.id}`;
        const prev = this.knownSig.get(key);
        if (prev !== undefined && prev !== sig) updateTransactionStatusInDb(t.id, t.status as any, t.status === 'approved' ? t.amountTomans : undefined).catch(() => {});
        this.knownSig.set(key, sig);
      });
      (this.predictions || []).forEach(p => {
        const sig = `${p.status}|${p.payoutTomans || 0}|${p.isResultFinalized ? 1 : 0}|${p.lockedResults ? 1 : 0}`;
        const key = `pr:${p.id}`;
        const prev = this.knownSig.get(key);
        if (prev !== undefined && prev !== sig) updatePredictionInDb(p).catch(() => {});
        this.knownSig.set(key, sig);
      });
    } catch (e) {
      console.warn('[DB] push failed', e);
    }
  }

  /** Pulls every user's activity from the central database so the admin panel and users always see the same data. */
  public async pullCentralDb(): Promise<void> {
    if (!isSupabaseConfigured || this.dbSyncBusy) return;
    this.dbSyncBusy = true;
    try {
      const isAdmin = this.currentUser?.role === 'admin';
      const [rawUsers, txs, slips, tickets, notifs] = await Promise.all([
        fetchAllUsersRaw(),
        fetchTransactionsFromDb(isAdmin ? undefined : this.currentUser?.id),
        fetchPredictionsFromDb(),
        fetchSupportTicketsFromDb(isAdmin ? undefined : this.currentUser?.id),
        this.currentUser && !this.currentUser.isGuest ? fetchNotificationsForUser(this.currentUser.id) : Promise.resolve([]),
      ]);
      let changed = false;
      const now = Date.now();

      // Users
      rawUsers.forEach((r: any) => {
        const remote: any = {
          ...(r.data || {}),
          id: r.id, username: r.username, fullName: r.full_name, role: r.role || 'user',
          balanceTomans: Number(r.balance_tomans) || 0, phone: r.phone || '', iban: r.iban || '',
          cardNumber: r.card_number || '', isBanned: Boolean(r.is_banned),
          isFullNameLocked: Boolean(r.is_full_name_locked), passwordHash: r.password_hash || undefined,
          numericId: Number(r.numeric_id) || (r.data && r.data.numericId) || undefined,
        };
        const local = this.users.find(u => u.id === r.id);
        const balanceLocked = now - (recentBalanceWrites[r.id] || 0) < 6000;
        if (!local) {
          if (this.deletedIds.has(r.id)) return;
          this.users.push({ ...remote, password: undefined });
          changed = true;
        } else {
          const before = JSON.stringify([local.balanceTomans, local.isBanned, local.iban, local.cardNumber, local.fullName, local.passwordHash]);
          if (!balanceLocked) local.balanceTomans = remote.balanceTomans;
          local.isBanned = remote.isBanned;
          if (local.bannedUntil !== remote.bannedUntil || local.lastSeenAt !== remote.lastSeenAt) changed = true;
          local.bannedUntil = remote.bannedUntil;
          local.lastSeenAt = remote.lastSeenAt;
          local.iban = remote.iban || local.iban;
          local.cardNumber = remote.cardNumber || local.cardNumber;
          local.fullName = remote.fullName || local.fullName;
          local.passwordHash = remote.passwordHash || local.passwordHash;
          if (JSON.stringify([local.balanceTomans, local.isBanned, local.iban, local.cardNumber, local.fullName, local.passwordHash]) !== before) changed = true;
        }
        if (this.currentUser && this.currentUser.id === r.id && !balanceLocked && this.currentUser.balanceTomans !== remote.balanceTomans) {
          this.currentUser.balanceTomans = remote.balanceTomans;
          changed = true;
        }
      });
      // Real presence + enforce bans for the signed-in user
      this.users.forEach(u => { const on = u.role === 'admin' && u.id === this.currentUser?.id ? true : isOnlineNow(u.lastSeenAt, now); if (u.isOnline !== on) { u.isOnline = on; changed = true; } });
      if (this.currentUser) {
        const me = rawUsers.find((r: any) => r.id === this.currentUser!.id);
        if (me) this.seenRemoteIds.add(me.id);
        else if (rawUsers.length > 0 && this.currentUser.role !== 'admin' && this.seenRemoteIds.has(this.currentUser.id)) { this.logout(); return; }
        const meLocal = this.users.find(u => u.id === this.currentUser!.id);
        if (meLocal && meLocal.role !== 'admin' && isBanActive(meLocal, now)) { this.bannedNotice = meLocal.bannedUntil || null; this.logout(); return; }
        if (now - this.lastPresencePing > 20000 && !this.currentUser.isGuest) {
          this.lastPresencePing = now;
          patchUserDataInDb(this.currentUser.id, { lastSeenAt: now }).catch(() => {});
        }
      }
      // Upload users that exist only on this device (e.g. registered before central sync)
      this.users.forEach(u => {
        if (!u.isGuest && !u.id.startsWith('guest_') && !FAKE_USER_IDS.has(u.id) && !this.deletedIds.has(u.id) && !rawUsers.some((r: any) => r.id === u.id)) {
          upsertUserToDb(u).catch(() => {});
        }
      });

      // Transactions
      txs.forEach((rt: any) => {
        const local = this.transactions.find(t => t.id === rt.id);
        if (!local) { this.transactions.unshift(rt); changed = true; }
        else if (local.status !== rt.status) { local.status = rt.status; changed = true; }
        this.knownSig.set(`tx:${rt.id}`, `${(local || rt).status}|${(local || rt).amountTomans}`);
      });

      // Prediction slips
      slips.forEach((rp: any) => {
        if (rp.status === 'cancelled' || this.cancelledSlipIds.has(rp.id)) return;
        const local = this.predictions.find(p => p.id === rp.id);
        if (!local) {
          this.predictions.unshift({ ...rp, snapshotCourses: rp.snapshotCourses || JSON.parse(JSON.stringify(this.activeWeek.courses)) });
          changed = true;
        } else if (local.status !== rp.status || (local.payoutTomans || 0) !== (rp.payoutTomans || 0)) {
          local.status = rp.status;
          local.payoutTomans = rp.payoutTomans;
          if (rp.isResultFinalized) local.isResultFinalized = true;
          changed = true;
        }
        if (local && rp.lockedResults && !local.lockedResults) {
          local.lockedResults = rp.lockedResults;
          local.isResultFinalized = local.isResultFinalized || rp.isResultFinalized;
          changed = true;
        }
        const ref = local || rp;
        this.knownSig.set(`pr:${rp.id}`, `${ref.status}|${ref.payoutTomans || 0}|${ref.isResultFinalized ? 1 : 0}|${ref.lockedResults ? 1 : 0}`);
      });

      // Support tickets
      tickets.forEach((rt: any) => {
        if (this.isTicketHidden(rt)) return;
        const idx = this.supportTickets.findIndex(t => t.id === rt.id);
        const local = idx === -1 ? undefined : this.supportTickets[idx];
        if (!local) { this.supportTickets = [rt, ...this.supportTickets]; changed = true; }
        else if ((rt.messages || []).length > (local.messages || []).length || local.status !== rt.status) {
          const copy = [...this.supportTickets];
          copy[idx] = { ...local, messages: rt.messages, status: rt.status, summary: rt.summary };
          this.supportTickets = copy;
          changed = true;
        }
      });

      // Personal notifications
      notifs.forEach((n: any) => {
        if (n && !this.notifications.some(x => x.id === n.id)) {
          this.notifications.unshift(n);
          this.pushedNotifIds.add(n.id);
          changed = true;
        }
      });

      if (changed) this.notify();
    } catch (e) {
      console.warn('[DB] pull failed', e);
    } finally {
      this.dbSyncBusy = false;
    }
  }

  public resetTodayFinancialStats(): void {
    this.todayStatsResetTimestamp = Date.now();
    saveToStorage('today_stats_reset_timestamp', this.todayStatsResetTimestamp);
    this.notify();
  }

  public resetTodayProfit(): void {
    this.todayProfitResetTimestamp = Date.now();
    this.activeWeek.totalPoolTomans = 0;
    saveToStorage('active_week', this.activeWeek);
    saveToStorage('admin_today_profit_reset', this.todayProfitResetTimestamp);
    this.notify();
  }

  public setNavBarEnabled(enabled: boolean): void {
    this.isNavBarEnabled = enabled;
    saveToStorage('is_navbar_enabled', enabled);
    if (this.currentUser) {
      this.currentUser.isNavBarEnabled = enabled;
      const uIdx = this.users.findIndex(u => u.id === this.currentUser!.id);
      if (uIdx !== -1) {
        this.users[uIdx].isNavBarEnabled = enabled;
      }
      saveToStorage('users', this.users);
      saveToStorage('current_user', this.currentUser);
    }
    this.notify();
  }

  public setUnitPriceTomans(price: 1000 | 2000): void {
    this.activeWeek.unitPriceTomans = price;
    saveToStorage('active_week', this.activeWeek);
    fetch('/api/admin/unit-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitPrice: price }),
    }).catch(() => {});
    syncAdminSettingToDb('unit_price', { unitPriceTomans: price }).catch(() => {});
    this.notify();
  }

  public setRaceCountdownDays(days: number): void {
    const validDays = Math.max(0, Number(days) || 0);
    this.activeWeek.countdownEndTimestamp = Date.now() + validDays * 24 * 60 * 60 * 1000;
    saveToStorage('active_week', this.activeWeek);
    fetch('/api/admin/countdown-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remainingDays: validDays }),
    }).catch(() => {});
    this.notify();
  }

  public setLiveChatEnabled(enabled: boolean): void {
    this.isLiveChatEnabled = enabled;
    saveToStorage('is_live_chat_enabled', enabled);
    fetch('/api/admin/toggle-live-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: enabled }),
    }).catch(() => {});
    syncAdminSettingToDb('live_chat_status', { isEnabled: enabled }).catch(() => {});
    this.notify();
  }

  public setSupportNotificationsEnabled(enabled: boolean): void {
    this.isSupportNotificationsEnabled = enabled;
    saveToStorage('is_support_notifs_enabled', enabled);
    fetch('/api/admin/toggle-support-notifs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: enabled }),
    }).catch(() => {});
    syncAdminSettingToDb('support_notifs_status', { isEnabled: enabled }).catch(() => {});
    this.notify();
  }

  public dismissStatusBadges(): void {
    this.hasRecentWinnerBadge = false;
    this.hasRecentDefeatBadge = false;
    saveToStorage('has_recent_winner_badge', false);
    saveToStorage('has_recent_defeat_badge', false);
    this.notify();
  }

  public isRaceSubmissionLocked(): boolean {
    if (this.activeWeek.isShishParEnabled === false) return true;
    if (this.activeWeek.countdownEndTimestamp && Date.now() >= this.activeWeek.countdownEndTimestamp) return true;
    return false;
  }

  public cancelledSlipIds: Set<string> = new Set(loadFromStorage('cancelled_slip_ids', [] as string[]));

  public cancelPredictionSlip(slipId: string): { success: boolean; message: string } {
    const isLocked = this.activeWeek.isShishParEnabled === false || (this.activeWeek.countdownEndTimestamp - Date.now() <= 0);
    if (isLocked) {
      return { success: false, message: 'مهلت ثبت به اتمام رسید! از این لحظه برگه ای ثبت نمیشود!' };
    }
    if (this.cancelledSlipIds.has(slipId)) {
      return { success: false, message: 'این برگه قبلاً ابطال شده است.' };
    }
    const slipIdx = this.predictions.findIndex(s => s.id === slipId);
    if (slipIdx === -1) {
      return { success: false, message: 'برگه مورد نظر یافت نشد.' };
    }
    const slip = this.predictions[slipIdx];
    if (slip.status !== 'pending' || slip.isResultFinalized) {
      return { success: false, message: 'امکان ابطال این برگه وجود ندارد.' };
    }

    const refundAmount = slip.totalCostTomans;
    const user = this.users.find(u => u.id === slip.userId);
    if (user) {
      user.balanceTomans = (Number(user.balanceTomans) || 0) + refundAmount;
      syncUserBalanceToDb(user.id, user.balanceTomans).catch(() => {});
    }
    if (this.currentUser && this.currentUser.id === slip.userId) {
      this.currentUser.balanceTomans = (Number(this.currentUser.balanceTomans) || 0) + refundAmount;
    }
    this.activeWeek.totalPoolTomans = Math.max(0, (Number(this.activeWeek.totalPoolTomans) || 0) - netPoolShare(refundAmount));

    // Remember the cancellation permanently so background sync can never bring the slip back
    this.cancelledSlipIds.add(slipId);
    saveToStorage('cancelled_slip_ids', Array.from(this.cancelledSlipIds).slice(-2000));
    this.predictions.splice(slipIdx, 1);
    saveToStorage('predictions', this.predictions);
    saveToStorage('active_week', this.activeWeek);

    // Mark as cancelled in DB first (other devices skip it), then remove the row
    updatePredictionInDb({ ...slip, status: 'cancelled' as any })
      .catch(() => {})
      .finally(() => { deletePredictionFromDb(slipId).catch(() => {}); });
    fetch('/api/predictions/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slipId, userId: slip.userId, refundAmount }),
    }).catch(() => {});

    this.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      userId: slip.userId,
      title: 'ابطال برگه پیش‌بینی',
      message: `برگه شما با موفقیت ابطال شد و مبلغ ${refundAmount.toLocaleString('fa-IR')} تومان به کیف پول شما بازگشت.`,
      time: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
      read: false,
      type: 'financial',
    });

    this.notify();
    return { success: true, message: `برگه با موفقیت ابطال شد و مبلغ ${refundAmount.toLocaleString('fa-IR')} تومان به کیف پول شما بازگشت.` };
  }

  public async sendAdminDirectMessage(userId: string, userName: string, messageText: string, trackingCode?: string): Promise<{ success: boolean; message: string }> {
    const dateStr = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    const fullText = trackingCode
      ? `در خصوص تراکنش ${trackingCode}: ${messageText.trim()}`
      : `در خصوص تراکنش: ${messageText.trim()}`;

    this.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      userId,
      title: 'پیام مدیریت در خصوص تراکنش',
      message: `${fullText} (تاریخ: ${dateStr})`,
      time: dateStr,
      read: false,
      type: 'system',
    });

    sendAdminDirectMessageInDb(userId, userName, messageText.trim(), trackingCode).catch(() => {});
    fetch('/api/admin/direct-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, message: messageText.trim(), trackingCode }),
    }).catch(() => {});

    this.notify();
    return { success: true, message: 'پیام با موفقیت به صندوق پیام کاربر ارسال شد.' };
  }

  // --- AUTHENTICATION ---
  public login(username: string, password?: string): { success: boolean; message?: string } {
    const cleanUser = username.trim().toLowerCase();
    const found = this.users.find(u => u.username.toLowerCase() === cleanUser);
    if (!found) {
      return { success: false, message: 'کاربری با این نام کاربری یافت نشد.' };
    }
    const hashOk = found.passwordHash && password ? found.passwordHash === sha256(password) : false;
    if (password && !hashOk && (found.password ? found.password !== password : Boolean(found.passwordHash))) {
      return { success: false, message: 'رمز عبور وارد شده نادرست است.' };
    }
    this.currentUser = { ...found, isGuest: false };
    this.notify();
    return { success: true };
  }

  /** Login that verifies directly against the central database (live), falling back to local cache. */
  public async loginLive(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    const cleanUser = username.trim().toLowerCase();
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*').ilike('username', cleanUser).limit(1);
        const r: any = data && data[0];
        if (r) {
          if (isRemovedRow(r)) return { success: false, message: 'این حساب کاربری وجود ندارد.' };
          if (r.password_hash && r.password_hash !== sha256(password)) {
            return { success: false, message: 'رمز عبور وارد شده نادرست است.' };
          }
          const bu = r.data && r.data.bannedUntil;
          if (r.role !== 'admin' && isBanActive({ isBanned: r.is_banned, bannedUntil: bu })) {
            return { success: false, message: bu ? `حساب شما تا ${new Date(bu).toLocaleDateString('fa-IR')} مسدود است.` : 'حساب شما مسدود شده است.' };
          }
          const remote: any = {
            ...(r.data || {}),
            id: r.id, username: r.username, fullName: r.full_name, role: r.role || 'user',
            balanceTomans: Number(r.balance_tomans) || 0, phone: r.phone || '', iban: r.iban || '',
            cardNumber: r.card_number || '', isBanned: Boolean(r.is_banned),
            isFullNameLocked: Boolean(r.is_full_name_locked), passwordHash: r.password_hash || undefined,
            numericId: Number(r.numeric_id) || (r.data && r.data.numericId) || undefined,
            password: undefined,
          };
          const idx = this.users.findIndex(u => u.id === r.id);
          if (idx === -1) this.users.push(remote); else this.users[idx] = { ...this.users[idx], ...remote };
          this.currentUser = { ...remote, isGuest: false };
          this.notify();
          return { success: true };
        }
      } catch { /* fall back to local */ }
    }
    return this.login(username, password);
  }

  public register(fullName: string, username: string, password: string): { success: boolean; message?: string } {
    const cleanUser = username.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanUser;
    if (!cleanUser || !password.trim()) {
      return { success: false, message: 'لطفاً تمامی فیلدها را با دقت تکمیل کنید.' };
    }
    if (this.users.some(u => u.username.toLowerCase() === cleanUser)) {
      return { success: false, message: 'این نام کاربری قبلاً ثبت شده است. نام دیگری انتخاب کنید.' };
    }

    const assignedNumericId = Math.floor(10000 + Math.random() * 90000);

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      numericId: assignedNumericId,
      fullName: cleanName,
      username: cleanUser,
      password: password.trim(),
      role: 'user',
      balanceTomans: 0, // Fresh account starts with strictly 0 Tomans
      isGuest: false,
      isFullNameLocked: Boolean(fullName.trim()),
      registeredAt: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date()),
      lastLogin: 'هم‌اکنون',
      isOnline: true,
      isBanned: false,
      depositCount: 0,
      depositTotalTomans: 0,
      withdrawalCount: 0,
      withdrawalTotalTomans: 0,
      winsCount: 0,
      lossCount: 0,
      totalGames: 0,
    };

    this.users.push(newUser);
    upsertUserToDb(newUser).catch(() => {});
    // Instant Auto-Login for this specific browser session
    this.currentUser = newUser;
    this.notify();
    return { success: true };
  }

  public loginAsGuest(): void {
    this.currentUser = {
      id: `guest_${Date.now()}`,
      numericId: Math.floor(10000 + Math.random() * 90000),
      fullName: 'کاربر مهمان',
      username: 'guest',
      role: 'user',
      balanceTomans: 0,
      isGuest: true,
    };
    this.notify();
  }

  public loginAsAdmin(): void {
    const cu = this.currentUser;
    if (!cu || cu.isGuest || cu.role !== 'admin') return;
    const adminUser = this.users.find(u => u.id === 'user_admin') || this.users.find(u => u.role === 'admin') || {
      id: 'user_admin',
      numericId: 10001,
      fullName: 'متین توماج',
      username: 'admin',
      role: 'admin' as const,
      balanceTomans: 25000000,
      phone: '09113710000',
      iban: 'IR980120000000001234567890',
      isOnline: true,
      isFullNameLocked: true,
    };
    this.currentUser = { ...adminUser, isGuest: false };
    const uIdx = this.users.findIndex(u => u.id === 'user_admin');
    if (uIdx !== -1) {
      this.users[uIdx].isOnline = true;
    }
    this.notify();
  }

  public changePassword(oldPassword: string, newPassword: string): { success: boolean; message?: string } {
    if (!this.currentUser) return { success: false, message: 'کاربر وارد نشده است.' };
    const cuHash = this.currentUser.passwordHash;
    const oldOk = cuHash ? cuHash === sha256(oldPassword) : (!this.currentUser.password || this.currentUser.password === oldPassword);
    if (!oldOk) {
      return { success: false, message: 'رمز عبور فعلی نادرست است.' };
    }
    if (!newPassword || newPassword.length < 3) {
      return { success: false, message: 'رمز عبور جدید باید حداقل ۳ کاراکتر باشد.' };
    }
    this.currentUser.password = newPassword;
    const uIdx = this.users.findIndex(u => u.id === this.currentUser!.id);
    if (uIdx !== -1) {
      this.users[uIdx].password = newPassword;
    }
    const newHash = sha256(newPassword);
    this.currentUser.passwordHash = newHash;
    if (uIdx !== -1) this.users[uIdx].passwordHash = newHash;
    if (supabase) {
      supabase.from('users').update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', this.currentUser.id).then(({ error }) => { if (error) console.warn('[DB] password update failed:', error.message); });
    }
    this.notify();
    return { success: true, message: 'رمز عبور با موفقیت تغییر یافت.' };
  }

  public lockFullName(fullName: string): { success: boolean; message?: string } {
    if (!this.currentUser) return { success: false, message: 'کاربر وارد نشده است.' };
    if (this.currentUser.isFullNameLocked) {
      return { success: false, message: 'نام و نام خانوادگی قبلاً ثبت و قفل شده است.' };
    }
    if (!fullName.trim()) {
      return { success: false, message: 'لطفاً نام و نام خانوادگی را وارد کنید.' };
    }
    this.currentUser.fullName = fullName.trim();
    this.currentUser.isFullNameLocked = true;
    const uIdx = this.users.findIndex(u => u.id === this.currentUser!.id);
    if (uIdx !== -1) {
      this.users[uIdx].fullName = this.currentUser.fullName;
      this.users[uIdx].isFullNameLocked = true;
    }
    saveToStorage('users', this.users);
    saveToStorage('current_user', this.currentUser);
    syncUserProfileToDb(this.currentUser.id, {
      fullName: this.currentUser.fullName,
      isFullNameLocked: true,
    }).catch(() => {});
    this.notify();
    return { success: true, message: 'نام و نام خانوادگی با موفقیت ثبت و قفل گردید.' };
  }

  public isAdminOnline(): boolean {
    if (this.currentUser?.role === 'admin' || this.currentUser?.id === 'user_admin') {
      return true;
    }
    const adminUser = this.users.find(u => u.role === 'admin' || u.id === 'user_admin');
    return !!adminUser?.isOnline;
  }

  public logout(): void {
    if (this.currentUser?.role === 'admin' || this.currentUser?.id === 'user_admin') {
      const uIdx = this.users.findIndex(u => u.id === 'user_admin' || u.role === 'admin');
      if (uIdx !== -1) {
        this.users[uIdx].isOnline = false;
        saveToStorage('users', this.users);
      }
    }
    this.currentUser = null;
    saveToStorage('current_user', null);
    this.notify();
  }

  public deleteAccount(): void {
    if (!this.currentUser) return;
    const uid = this.currentUser.id;
    this.users = this.users.filter(u => u.id !== uid);
    this.predictions = this.predictions.filter(p => p.userId !== uid);
    this.transactions = this.transactions.filter(t => t.userId !== uid);
    this.currentUser = null;
    this.notify();
  }

  public updateProfile(data: Partial<UserProfile>): void {
    if (!this.currentUser) return;
    this.currentUser = { ...this.currentUser, ...data };
    const index = this.users.findIndex(u => u.id === this.currentUser!.id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...data };
    }
    saveToStorage('users', this.users);
    saveToStorage('current_user', this.currentUser);
    syncUserProfileToDb(this.currentUser.id, {
      fullName: this.currentUser.fullName,
      iban: this.currentUser.iban,
      cardNumber: this.currentUser.cardNumber,
      isFullNameLocked: this.currentUser.isFullNameLocked,
    }).catch(() => {});
    this.notify();
  }

  // --- PREDICTIONS (SHISHPAR) ---
  public submitPrediction(
    selections: { [courseNumber: number]: number[] },
    totalCostOverride?: number,
    combinationsCountOverride?: number,
    replacementSelections?: { [courseNumber: number]: number[] },
    ticketType?: 'shishpar' | 'panjpar'
  ): { success: boolean; message?: string; slip?: PredictionSlip } {
    if (!this.currentUser || this.currentUser.isGuest) {
      return { success: false, message: 'برای ثبت پیش‌بینی ابتدا باید وارد حساب کاربری خود شوید.' };
    }

    // 1. Check Master Six-Pore Switch & Countdown lockdown
    const isLocked = this.activeWeek.isShishParEnabled === false || (this.activeWeek.countdownEndTimestamp - Date.now() <= 0);
    if (isLocked) {
      return { success: false, message: 'مهلت ثبت به اتمام رسید! از این لحظه برگه ای ثبت نمیشود!' };
    }

    // Dynamic Course Range for 7 courses vs 6 courses:
    // When 7 courses exist:
    //   - Six-Pareh: covers courses 2 to 7 (or 1 to 7 if selected)
    //   - Five-Pareh: covers courses 3 to 7
    // When 6 courses exist:
    //   - Six-Pareh: covers courses 1 to 6
    //   - Five-Pareh: covers courses 2 to 6
    const has7Courses = this.activeWeek.courses.some(c => c.number === 7 && c.horses.length > 0);
    let activeCourseNums: number[];
    if (has7Courses) {
      if (selections[1] !== undefined && selections[7] !== undefined) {
        activeCourseNums = [1, 2, 3, 4, 5, 6, 7];
      } else if (selections[2] !== undefined) {
        activeCourseNums = [2, 3, 4, 5, 6, 7];
      } else if (selections[3] !== undefined) {
        activeCourseNums = [3, 4, 5, 6, 7];
      } else {
        activeCourseNums = Object.keys(selections).map(Number).sort((a, b) => a - b);
      }
    } else {
      activeCourseNums = selections[1] !== undefined ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6];
    }

    let combCount = 1;
    for (const cNum of activeCourseNums) {
      const picks = selections[cNum] || [];
      if (picks.length === 0) {
        return { success: false, message: `لطفاً در کورس شماره ${cNum} حداقل یک اسب را انتخاب کنید.` };
      }

      // 2. Check if individual course is locked by Admin
      const course = this.activeWeek.courses.find(c => c.number === cNum);
      if (course?.isLocked) {
        return { success: false, message: `کورس شماره ${cNum} بسته شده است و امکان ثبت آن وجود ندارد.` };
      }

      combCount *= picks.length;
    }

    if (combinationsCountOverride !== undefined) {
      combCount = combinationsCountOverride;
    }

    const unitPrice = this.activeWeek.unitPriceTomans === 1000 ? 1000 : 2000;
    const totalCost = totalCostOverride !== undefined ? totalCostOverride : combCount * unitPrice;
    if (this.currentUser.balanceTomans < totalCost) {
      return {
        success: false,
        message: `موجودی کیف پول شما کافی نیست. مبلغ مورد نیاز: ${totalCost.toLocaleString('fa-IR')} تومان (موجودی فعلی: ${this.currentUser.balanceTomans.toLocaleString('fa-IR')} تومان).`,
      };
    }

    // Deduct balance
    this.currentUser.balanceTomans -= totalCost;
    const userIndex = this.users.findIndex(u => u.id === this.currentUser!.id);
    if (userIndex !== -1) {
      this.users[userIndex].balanceTomans = this.currentUser.balanceTomans;
    }

    const uniqueId = this.generateUniqueTrackingId('ID');

    // Record transaction with non-repeating tracking ID
    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: this.currentUser.id,
      userName: this.currentUser.fullName,
      type: 'prediction_fee',
      amountTomans: totalCost,
      date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
      status: 'approved',
      trackingCode: uniqueId,
    };
    this.transactions.unshift(tx);

    // Real Dynamic Pool Accumulation: Accumulates real user payments directly into the central prize pool
    // 14% site commission is taken immediately; only the net 86% enters the total pool
    this.activeWeek.totalPoolTomans = (Number(this.activeWeek.totalPoolTomans) || 0) + netPoolShare(totalCost);

    const resolvedTicketType: 'shishpar' | 'panjpar' = ticketType || (Object.keys(selections).length >= 6 ? 'shishpar' : 'panjpar');

    // Create slip with immutable snapshot of the active courses and horses and unique ID
    const slip: PredictionSlip = {
      id: uniqueId,
      userId: this.currentUser.id,
      userName: this.currentUser.fullName,
      weekId: this.activeWeek.id,
      ticketType: resolvedTicketType,
      selections,
      replacementSelections: replacementSelections || {},
      combinationsCount: combCount,
      totalCostTomans: totalCost,
      submittedAt: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
      createdAtTimestamp: Date.now(),
      status: 'pending',
      payoutTomans: this.activeWeek.totalPoolTomans,
      snapshotCourses: (JSON.parse(JSON.stringify(this.activeWeek.courses)) as Course[]).map(c => ({ ...c, winningHorseNumber: undefined })),
      isResultFinalized: false,
    };
    this.predictions.unshift(slip);

    // Permanent retention: Predictions are never auto-cleared or deleted!
    saveToStorage('predictions', this.predictions);

    // Sync with central backend
    fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slip, userId: this.currentUser.id, totalCost }),
    }).catch(() => {});

    // Persist to Supabase in background
    insertPredictionToDb(slip).catch(() => {});
    syncUserBalanceToDb(this.currentUser.id, this.currentUser.balanceTomans).catch(() => {});
    insertTransactionToDb(tx).catch(() => {});

    this.notify();
    return { success: true, slip };
  }

  // --- WALLET ACTIONS ---
  public requestDeposit(amountTomans: number, method: 'telegram' | 'instant' = 'telegram'): { success: boolean; message: string; tx?: Transaction } {
    try {
      if (!this.currentUser || this.currentUser.isGuest) {
        return { success: false, message: 'لطفاً وارد حساب کاربری خود شوید.' };
      }
      if (amountTomans < 20000) {
        return { success: false, message: 'حداقل مبلغ شارژ حساب ۲۰,۰۰۰ تومان می‌باشد.' };
      }

      const uniqueId = this.generateUniqueTrackingId('ID');
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        userId: this.currentUser.id,
        userNumericId: this.currentUser.numericId || 10842,
        userName: this.currentUser.fullName || 'کاربر',
        type: 'deposit',
        amountTomans,
        cardNumber: this.currentUser.cardNumber || 'ثبت نشده',
        iban: this.currentUser.iban || 'ثبت نشده',
        date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
        status: 'pending',
        trackingCode: uniqueId,
        method,
      } as any;
      this.transactions.unshift(tx);

      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        userId: this.currentUser.id,
        title: 'افزایش اعتبار',
        message: `درخواست افزایش اعتبار به مبلغ ${amountTomans.toLocaleString('fa-IR')} تومان ثبت شد و در حال بررسی است.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'financial',
      });

      // Sync with central backend
      fetch('/api/transactions/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.currentUser.id,
          amountTomans,
          cardNumber: this.currentUser.cardNumber || 'ثبت نشده',
        }),
      }).catch(() => {});

      // Persist to Supabase safely without throwing
      try {
        insertTransactionToDb(tx).catch(() => {});
      } catch (dbErr) {
        console.warn('Supabase transaction insert warning:', dbErr);
      }

      this.notify();
      return { 
        success: true, 
        message: 'درخواست افزایش اعتبار ثبت گردید و در حال بررسی است.',
        tx 
      };
    } catch (err) {
      console.warn('requestDeposit error in store:', err);
      return { success: false, message: 'خطا در ثبت درخواست افزایش اعتبار.' };
    }
  }

  /** Removes a transaction (and its uploaded receipt) permanently. */
  public deleteTransactionPermanently(txId: string): void {
    this.transactions = this.transactions.filter(t => t.id !== txId);
    saveToStorage('transactions', this.transactions);
    deleteTransactionFromDb(txId).catch(() => {});
    fetch('/api/deposits/receipt-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txId }) }).catch(() => {});
    this.notify();
  }

  // --- WITHDRAWAL SCHEDULE & ADMIN CONTROLS ---
  public getWithdrawalStatus(): { allowed: boolean; reason?: string } {
    if (!this.isWithdrawalEnabled) {
      return {
        allowed: false,
        reason: 'امکان برداشت وجه در حال حاضر توسط پشتیبانی غیرفعال شده است.',
      };
    }

    // Admin switch has absolute priority: no weekday restriction.
    return { allowed: true };
  }

  public setWithdrawalEnabled(enabled: boolean): void {
    this.isWithdrawalEnabled = enabled;
    this.withdrawalEditedAt = Date.now();
    saveToStorage('admin_withdrawal_enabled', this.isWithdrawalEnabled);
    syncAdminSettingToDb('withdrawal_enabled', { isEnabled: enabled }).catch(() => {});
    this.notify();
  }

  // --- REFUND RATES & PROFIT ANALYTICS ---
  public setRefundRate(rate: number): void {
    this.refundRate = 15;
    saveToStorage('admin_refund_rate', this.refundRate);
    this.notify();
  }

  public setCustomWinningPrize(amount: number): void {
    this.customWinningPrize = amount;
    saveToStorage('custom_winning_prize', amount);
    this.predictions.forEach(p => {
      if (p.status === 'won') {
        p.payoutTomans = amount;
      }
    });
    saveToStorage('predictions', this.predictions);
    this.notify();
  }

  public executeNoWinnerRefunds(refundRateOverride?: number): { count: number; totalRefundTomans: number; message: string } {
    const rate = refundRateOverride !== undefined ? refundRateOverride : (Number(this.refundRate) || 0);

    const activeSlips = this.predictions.filter(p => {
      if (this.todayProfitResetTimestamp > 0 && (p.createdAtTimestamp || 0) < this.todayProfitResetTimestamp) {
        return false;
      }
      return true;
    });

    // Check if zero winners
    const hasAnyWinner = activeSlips.some(s => s.status === 'won');
    if (hasAnyWinner) {
      return { count: 0, totalRefundTomans: 0, message: 'مسابقات دارای برنده است و امکان عودت عدم برنده وجود ندارد.' };
    }

    if (rate <= 0) {
      // 0% refund configured: finalize without refund
      activeSlips.forEach(slip => {
        slip.isResultFinalized = true;
      });
      saveToStorage('predictions', this.predictions);
      this.notify();
      return { count: 0, totalRefundTomans: 0, message: 'درصد عودت روی ۰ تنظیم شده است.' };
    }

    let refundedCount = 0;
    let totalRefundTomans = 0;
    const rateFa = rate.toLocaleString('fa-IR');
    const dateFormatted = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

    activeSlips.forEach(slip => {
      if (slip.isRefunded) return;
      if ((Number(slip.totalCostTomans) || 0) <= 99000) return; // refund only above 99,000 Toman

      const refundAmount = Math.round((Number(slip.totalCostTomans) || 0) * (rate / 100));
      if (refundAmount <= 0) return;

      // 1. Credit wallet balance
      const user = this.users.find(u => u.id === slip.userId);
      if (user) {
        user.balanceTomans = (Number(user.balanceTomans) || 0) + refundAmount;
        syncUserBalanceToDb(user.id, user.balanceTomans).catch(() => {});
      }
      if (this.currentUser && this.currentUser.id === slip.userId) {
        this.currentUser.balanceTomans = (Number(this.currentUser.balanceTomans) || 0) + refundAmount;
      }

      // 2. Mark slip as refunded and finalized
      slip.isRefunded = true;
      slip.isResultFinalized = true;
      slip.refundedAmountTomans = refundAmount;
      slip.refundPercentage = rate;

      // 3. Record transaction with type refund/deposit
      const trackingCode = this.generateUniqueTrackingId('REF');
      const refundMessage = `برگشت ${rateFa} درصد مبلغ پرداختی شما برای ثبت رسید به شما برگشت داده شد`;
      const refundTx: Transaction = {
        id: `tx_ref_${Date.now()}_${slip.id}`,
        userId: slip.userId,
        userNumericId: user?.numericId,
        userName: slip.userName,
        type: 'refund',
        title: 'تراکنش / برگشت',
        description: refundMessage,
        amountTomans: refundAmount,
        date: dateFormatted,
        status: 'approved',
        trackingCode,
      };
      this.transactions.unshift(refundTx);
      insertTransactionToDb(refundTx).catch(() => {});

      // 4. Send official notification to user inbox
      this.notifications.unshift({
        id: `notif_ref_${Date.now()}_${slip.id}`,
        userId: slip.userId,
        title: 'تراکنش / برگشت',
        message: refundMessage,
        time: dateFormatted,
        read: false,
        type: 'financial',
      });

      refundedCount++;
      totalRefundTomans += refundAmount;
    });

    if (refundedCount > 0) {
      saveToStorage('predictions', this.predictions);
      saveToStorage('transactions', this.transactions);
      saveToStorage('notifications', this.notifications);
      saveToStorage('users', this.users);
      if (this.currentUser) saveToStorage('current_user', this.currentUser);
      this.notify();
    }

    return { 
      count: refundedCount, 
      totalRefundTomans, 
      message: `عودت ${rateFa}٪ برای ${refundedCount.toLocaleString('fa-IR')} برگه انجام شد و مابقی صندوق به سود سامانه اختصاص یافت.` 
    };
  }

  public settleAllUsers(overridePayoutTomans?: number): { success: boolean; message: string } {
    this.isSettlementCompleted = true;
    saveToStorage('admin_settlement_completed', true);

    const activeSlips = this.predictions.filter(p => {
      if (this.todayProfitResetTimestamp > 0 && (p.createdAtTimestamp || 0) < this.todayProfitResetTimestamp) {
        return false;
      }
      return true;
    });

    const activeWinners = activeSlips.filter(s => s.status === 'won');

    // SCENARIO: Zero (0) winners across both Six-Pareh and Five-Pareh
    if (activeWinners.length === 0) {
      const refundRes = this.executeNoWinnerRefunds();
      this.notify();
      return {
        success: true,
        message: refundRes.count > 0
          ? `هیچ برنده‌ای یافت نشد. بر اساس قانون مسابقات ${this.refundRate}٪ مبلغ به کیف پول کاربران برگشت داده شد و مابقی به عنوان سود سامانه منظور گردید.`
          : 'هیچ برنده‌ای یافت نشد و برگه‌های بدون برنده بررسی و تسویه شدند.',
      };
    }

    // SCENARIO: Winners exist
    const isSixPr = (p: PredictionSlip) => (p.ticketType === 'shishpar') || (!p.ticketType && Object.keys(p.selections || {}).length >= 6);
    const isFivePr = (p: PredictionSlip) => (p.ticketType === 'panjpar') || (!p.ticketType && Object.keys(p.selections || {}).length === 5);

    const sixPrWinners = activeWinners.filter(isSixPr);
    const fivePrWinners = activeWinners.filter(isFivePr);

    const analytics = this.getProfitAnalytics();

    // Six-Pareh Winners payout
    sixPrWinners.forEach(slip => {
      slip.isResultFinalized = true;
      slip.payoutTomans = overridePayoutTomans || analytics.sixPrReceiptPrize || this.customWinningPrize;
      const user = this.users.find(u => u.id === slip.userId);
      if (user && slip.payoutTomans) {
        user.balanceTomans = (Number(user.balanceTomans) || 0) + slip.payoutTomans;
        user.winsCount = (user.winsCount || 0) + 1;
        syncUserBalanceToDb(user.id, user.balanceTomans).catch(() => {});
      }
    });

    // Five-Pareh Winners payout
    fivePrWinners.forEach(slip => {
      slip.isResultFinalized = true;
      slip.payoutTomans = overridePayoutTomans || analytics.fivePrReceiptPrize || this.customWinningPrize;
      const user = this.users.find(u => u.id === slip.userId);
      if (user && slip.payoutTomans) {
        user.balanceTomans = (Number(user.balanceTomans) || 0) + slip.payoutTomans;
        user.winsCount = (user.winsCount || 0) + 1;
        syncUserBalanceToDb(user.id, user.balanceTomans).catch(() => {});
      }
    });

    // Lost slips finalized
    activeSlips.filter(s => s.status === 'lost').forEach(slip => {
      slip.isResultFinalized = true;
    });

    saveToStorage('predictions', this.predictions);
    saveToStorage('users', this.users);
    this.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title: 'تسویه جوایز هفته انجام شد',
      message: 'تسویه نهایی کلیه برگه‌های برنده انجام شد و مبالغ به کیف پول کاربران منظور گردید.',
      time: 'هم‌اکنون',
      read: false,
      type: 'financial',
    });
    this.notify();
    return { success: true, message: 'تسویه همه کاربران با موفقیت انجام شد و وجوه قفل گردید.' };
  }

  public getProfitAnalytics() {
    // 1. Filter out slips submitted before today's profit reset timestamp if active
    const activeSlips = this.predictions.filter(p => {
      if (this.todayProfitResetTimestamp > 0 && (p.createdAtTimestamp || 0) < this.todayProfitResetTimestamp) {
        return false;
      }
      return true;
    });

    const isSixPr = (p: PredictionSlip) => {
      if (p.ticketType === 'shishpar') return true;
      if (p.ticketType === 'panjpar') return false;
      return Object.keys(p.selections || {}).length >= 6;
    };

    const isFivePr = (p: PredictionSlip) => {
      if (p.ticketType === 'panjpar') return true;
      if (p.ticketType === 'shishpar') return false;
      return Object.keys(p.selections || {}).length === 5;
    };

    const sixPrSlips = activeSlips.filter(isSixPr);
    const fivePrSlips = activeSlips.filter(isFivePr);

    // 100% Real Database Collections: Real sum of user ticket costs
    const sixPrGrossFund = sixPrSlips.reduce((sum, p) => sum + (Number(p.totalCostTomans) || 0), 0);
    const fivePrGrossFund = fivePrSlips.reduce((sum, p) => sum + (Number(p.totalCostTomans) || 0), 0);

    const sixPrTotalSlips = sixPrSlips.length;
    const fivePrTotalSlips = fivePrSlips.length;

    const sixPrWinnersCount = sixPrSlips.filter(p => p.status === 'won').length;
    const fivePrWinnersCount = fivePrSlips.filter(p => p.status === 'won').length;
    const totalWinnersCount = sixPrWinnersCount + fivePrWinnersCount;


    // 14% site commission is always the platform's profit; 15% auto-refund for losing slips over 99k
    const sixPrAdminProfit = Math.round(sixPrGrossFund * SITE_COMMISSION_RATE);
    const sixPrRefundTomans = sixPrSlips.filter(p => p.status === 'lost').reduce((sum, p) => sum + loserRefund(Number(p.totalCostTomans) || 0), 0);
    const sixPrWinnersPayout = sixPrWinnersCount > 0 ? Math.max(0, sixPrGrossFund - sixPrAdminProfit - sixPrRefundTomans) : 0;
    const sixPrReceiptPrize = sixPrWinnersCount > 0 ? Math.round(sixPrWinnersPayout / sixPrWinnersCount) : 0;

    // 14% site commission is always the platform's profit; 15% auto-refund for losing slips over 99k
    const fivePrAdminProfit = Math.round(fivePrGrossFund * SITE_COMMISSION_RATE);
    const fivePrRefundTomans = fivePrSlips.filter(p => p.status === 'lost').reduce((sum, p) => sum + loserRefund(Number(p.totalCostTomans) || 0), 0);
    const fivePrWinnersPayout = fivePrWinnersCount > 0 ? Math.max(0, fivePrGrossFund - fivePrAdminProfit - fivePrRefundTomans) : 0;
    const fivePrReceiptPrize = fivePrWinnersCount > 0 ? Math.round(fivePrWinnersPayout / fivePrWinnersCount) : 0;

    // Combined Gross & Totals
    const grossFund = sixPrGrossFund + fivePrGrossFund;
    const totalRefundTomans = sixPrRefundTomans + fivePrRefundTomans;
    const winnersPayout = sixPrWinnersPayout + fivePrWinnersPayout;
    const adminProfit = sixPrAdminProfit + fivePrAdminProfit;

    return {
      grossFund,
      adminMarginPercentage: 14,
      adminProfit,
      winnersPayout,
      totalRefundTomans,
      totalWinnersCount,
      // Six-Pareh Independent Accounting
      sixPrGrossFund,
      sixPrAdminProfit,
      sixPrFund: sixPrWinnersPayout,
      sixPrWinnersPayout,
      sixPrReceiptPrize, // 0 if sixPrWinnersCount === 0
      sixPrWinnersCount,
      sixPrTotalSlips,
      sixPrRefundTomans,
      // Five-Pareh Independent Accounting
      fivePrGrossFund,
      fivePrAdminProfit,
      fivePrFund: fivePrWinnersPayout,
      fivePrWinnersPayout,
      fivePrReceiptPrize, // 0 if fivePrWinnersCount === 0
      fivePrWinnersCount,
      fivePrTotalSlips,
      fivePrRefundTomans,
      // Meta
      isSettled: this.isSettlementCompleted,
      refundRate: this.refundRate,
      unitPriceTomans: this.activeWeek.unitPriceTomans || 2000,
      todayProfitResetTimestamp: this.todayProfitResetTimestamp,
    };
  }

  public validateProfileForWithdrawal(user: UserProfile | null = this.currentUser): {
    isValid: boolean;
    missingFields: { key: 'fullName' | 'cardNumber' | 'iban'; label: string; currentVal?: string; required: string }[];
    message: string;
  } {
    if (!user || user.isGuest) {
      return {
        isValid: false,
        missingFields: [],
        message: 'برای ثبت درخواست تسویه و برداشت وجه ابتدا وارد حساب کاربری خود شوید.',
      };
    }

    const missingFields: { key: 'fullName' | 'cardNumber' | 'iban'; label: string; currentVal?: string; required: string }[] = [];

    // 1. Full Name check (نام و نام خانوادگی)
    const trimmedName = (user.fullName || '').trim();
    if (!trimmedName || trimmedName.length < 3 || trimmedName === 'کاربر مهمان') {
      missingFields.push({
        key: 'fullName',
        label: 'نام و نام خانوادگی',
        currentVal: trimmedName || undefined,
        required: 'نام و نام خانوادگی کامل مطابق با صاحب حساب بانکی',
      });
    }

    // 2. Bank Card Number check (شماره کارت بانکی ۱۶ رقمی)
    const cleanCard = (user.cardNumber || '').replace(/\D/g, '');
    if (cleanCard.length !== 16) {
      missingFields.push({
        key: 'cardNumber',
        label: 'شماره کارت بانکی',
        currentVal: user.cardNumber || undefined,
        required: 'شماره کارت بانکی ۱۶ رقمی معتبر',
      });
    }

    // 3. IBAN / Sheba check (شماره شبا بانکی ۲۴ رقمی)
    const cleanIban = (user.iban || '').replace(/[^0-9]/g, '');
    if (cleanIban.length !== 24) {
      missingFields.push({
        key: 'iban',
        label: 'شماره شبا بانکی',
        currentVal: user.iban || undefined,
        required: 'شماره شبای ۲۴ رقمی',
      });
    }

    const isValid = missingFields.length === 0;
    const missingLabels = missingFields.map(f => f.label).join('، ');
    const message = isValid
      ? 'اطلاعات پروفایل کامل است.'
      : `جهت ثبت درخواست برداشت وجه، تکمیل موارد روبرو در بخش تنظیمات حساب کاربری الزامی است: ${missingLabels}.`;

    return {
      isValid,
      missingFields,
      message,
    };
  }

  public requestWithdrawal(amountTomans: number, iban: string): { success: boolean; message: string; tx?: Transaction } {
    try {
      if (!this.currentUser || this.currentUser.isGuest) {
        return { success: false, message: 'لطفاً وارد حساب کاربری شوید.' };
      }

      // Mandatory Profile Completion Validation (Full Name, Card Number, IBAN)
      const profileCheck = this.validateProfileForWithdrawal(this.currentUser);
      if (!profileCheck.isValid) {
        return {
          success: false,
          message: profileCheck.message,
        };
      }

      // Check withdrawal schedule & admin master toggle
      const status = this.getWithdrawalStatus();
      if (!status.allowed) {
        return {
          success: false,
          message: status.reason || 'امکان تسویه حساب در حال حاضر وجود ندارد.',
        };
      }

      if (amountTomans < 20000) {
        return { success: false, message: 'حداقل مبلغ برداشت ۲۰,۰۰۰ تومان می‌باشد.' };
      }
      // Validation requirement: if requestedAmount > currentBalance, show error toast
      const curBalance = this.currentUser.balanceTomans ?? 0;
      if (amountTomans > curBalance) {
        return { success: false, message: 'موجودی شما کمتر از مبلغ درخواستی است' };
      }
      if (!iban || iban.length < 16) {
        return { success: false, message: 'لطفاً شماره شبای معتبر ۲۴ رقمی را وارد نمایید.' };
      }

      // Instantly deduct from balance
      this.currentUser.balanceTomans = Math.max(0, curBalance - amountTomans);
      const uIdx = this.users.findIndex(u => u.id === this.currentUser!.id);
      if (uIdx !== -1) this.users[uIdx].balanceTomans = this.currentUser.balanceTomans;

      const uniqueId = this.generateUniqueTrackingId('ID');
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        userId: this.currentUser.id,
        userNumericId: this.currentUser.numericId || 10842,
        userName: this.currentUser.fullName || 'کاربر',
        type: 'withdraw',
        amountTomans,
        cardNumber: this.currentUser.cardNumber || 'ثبت نشده',
        date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
        status: 'pending',
        iban,
        trackingCode: uniqueId,
      };
      this.transactions.unshift(tx);

      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        title: 'برداشت از موجودی',
        message: `درخواست برداشت مبلغ ${amountTomans.toLocaleString('fa-IR')} تومان ثبت شد، در چند روز آینده مبلغ درخواستی به کارت شما واریز خواهد شد.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'financial',
      });

      // Persist to Supabase safely without throwing
      try {
        syncUserBalanceToDb(this.currentUser.id, this.currentUser.balanceTomans).catch(() => {});
        insertTransactionToDb(tx).catch(() => {});
      } catch (dbErr) {
        console.warn('Supabase sync error on withdrawal:', dbErr);
      }

      this.notify();
      return { 
        success: true, 
        message: 'درخواست شما ثبت شد، در چند روز آینده مبلغ درخواستی به کارت شما واریز خواهد شد',
        tx 
      };
    } catch (err) {
      console.warn('requestWithdrawal error in store:', err);
      return { success: false, message: 'خطا در ثبت درخواست برداشت.' };
    }
  }

  // --- ADMIN METHODS ---
  public toggleHorseScratched(courseNumber: number, horseId: string): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    const horse = course.horses.find(h => h.id === horseId);
    if (!horse) return;
    horse.isScratched = !horse.isScratched;
    saveToStorage('active_week', this.activeWeek);
    this.evaluatePredictionSlips();
    this.notify();
  }

  public setReplacementHorse(courseNumber: number, horseId: string, isReplacement: boolean, replacementForNumber?: number): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    const horse = course.horses.find(h => h.id === horseId);
    if (!horse) return;
    horse.isReplacement = isReplacement;
    horse.replacementForNumber = isReplacement ? replacementForNumber : undefined;
    this.notify();
  }

  public addHorseToCourse(courseNumber: number, horse: Omit<Horse, 'id'>): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    const newHorse: Horse = {
      ...horse,
      id: `h_${courseNumber}_${Date.now()}`,
    };
    course.horses.push(newHorse);
    saveToStorage('active_week', this.activeWeek);
    this.notify();
  }

  public removeHorseFromCourse(courseNumber: number, horseId: string): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    course.horses = course.horses.filter(h => h.id !== horseId);
    if (this.pollVotes[horseId] !== undefined) {
      delete this.pollVotes[horseId];
      saveToStorage('poll_votes_real_v1', this.pollVotes);
    }
    saveToStorage('active_week', this.activeWeek);
    this.evaluatePredictionSlips();
    this.notify();
  }

  public updateHorseInCourse(courseNumber: number, horseId: string, updates: Partial<Horse>): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    const horse = course.horses.find(h => h.id === horseId);
    if (!horse) return;
    Object.assign(horse, updates);
    saveToStorage('active_week', this.activeWeek);
    this.notify();
  }

  public updateCourseInfo(courseNumber: number, updates: Partial<Course>): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    Object.assign(course, updates);
    this.notify();
  }

  public updateWeekSettings(settings: Partial<PredictionWeek>): void {
    Object.assign(this.activeWeek, settings);
    this.notify();
  }

  public setAdminPin(pin: string): void {
    this.adminPin = pin.trim();
    this.notify();
  }

  public clearAllHorses(): void {
    // Immutable Past Results: Snapshot current courses into any un-snapshotted slips and mark settled ones finalized
    this.predictions.forEach(slip => {
      if (!slip.snapshotCourses) {
        slip.snapshotCourses = JSON.parse(JSON.stringify(this.activeWeek.courses));
      }
      if (slip.weekId === this.activeWeek.id && !slip.lockedResults) {
        const r = evaluateSlipCourses(slip, this.activeWeek.courses, this.activeWeek.id);
        if (slip.snapshotCourses) {
          slip.snapshotCourses.forEach(sc => {
            const live = this.activeWeek.courses.find(c => c.number === sc.number);
            if (live) { sc.winningHorseNumber = live.winningHorseNumber; sc.horses = JSON.parse(JSON.stringify(live.horses)); }
          });
        }
        if (r.complete || r.hasFailed) slip.lockedResults = r.rows;
      }
      if (slip.status === 'won' || slip.status === 'lost') {
        slip.isResultFinalized = true;
      }
    });
    saveToStorage('predictions', this.predictions);

    // Start a brand-new event so new results never bind to old receipts
    this.activeWeek.id = `evt_${Date.now()}`;

    // Clear active week horses, unlock courses, and RESET dynamic prize pool to strictly 0!
    this.activeWeek.totalPoolTomans = 0;
    this.activeWeek.courses.forEach(c => {
      c.horses = [];
      c.winningHorseNumber = undefined;
      c.isLocked = false;
    });
    saveToStorage('active_week', this.activeWeek);

    // Sync with central backend
    fetch('/api/admin/clear-all', { method: 'POST' }).catch(() => {});

    this.notify();
  }

  public toggleCourseLock(courseNumber: number): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    course.isLocked = !course.isLocked;
    saveToStorage('active_week', this.activeWeek);

    fetch('/api/admin/course-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseNumber, isLocked: course.isLocked }),
    }).catch(() => {});

    this.notify();
  }

  public setShishParEnabled(enabled: boolean): void {
    this.activeWeek.isShishParEnabled = enabled;
    if (!enabled) {
      // INSTANT TIMER ZEROING UPON SIX-PAREH LOCK:
      // Countdown timer immediately drops to 0 (Date.now()) so Six-Pareh page instantly shows 00:00:00!
      this.activeWeek.countdownEndTimestamp = Date.now();
    }
    saveToStorage('active_week', this.activeWeek);

    fetch('/api/admin/shishpar-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isShishParEnabled: enabled,
        countdownEndTimestamp: this.activeWeek.countdownEndTimestamp,
      }),
    }).catch(() => {});

    this.notify();
  }

  public publishCourseConfig(): void {
    saveToStorage('active_week', this.activeWeek);
    this.notify();
  }

  public toggleBanUser(userId: string): void {
    const u = this.users.find(usr => usr.id === userId);
    if (!u) return;
    u.isBanned = !u.isBanned;
    u.bannedUntil = undefined;
    patchUserDataInDb(userId, { bannedUntil: null }, { is_banned: u.isBanned }).catch(() => {});
    this.notify();
  }

  /** Temporarily ban a user for N days: no login, slips or messages until it ends. */
  public banUserForDays(userId: string, days: number): number | null {
    const u = this.users.find(usr => usr.id === userId);
    if (!u) return null;
    const until = banEndFor(days);
    u.isBanned = true;
    u.bannedUntil = until;
    saveToStorage('users', this.users);
    patchUserDataInDb(userId, { bannedUntil: until, isBanned: true }, { is_banned: true }).catch(() => {});
    this.notify();
    return until;
  }

  public unbanUser(userId: string): void {
    const u = this.users.find(usr => usr.id === userId);
    if (!u) return;
    u.isBanned = false;
    u.bannedUntil = undefined;
    saveToStorage('users', this.users);
    patchUserDataInDb(userId, { bannedUntil: null, isBanned: false }, { is_banned: false }).catch(() => {});
    this.notify();
  }

  /** Permanently delete a user and all their records. */
  public async deleteUserPermanently(userId: string): Promise<boolean> {
    this.deletedIds.add(userId);
    saveToStorage('deleted_user_ids', [...this.deletedIds]);
    this.users = this.users.filter(u => u.id !== userId);
    this.predictions = this.predictions.filter(p => p.userId !== userId);
    this.transactions = this.transactions.filter(t => t.userId !== userId);
    this.supportTickets = this.supportTickets.filter((t: any) => t.userId !== userId);
    saveToStorage('users', this.users);
    saveToStorage('predictions', this.predictions);
    saveToStorage('transactions', this.transactions);
    this.notify();
    return deleteUserFromDb(userId);
  }

  public updateLiveStreamSettings(settings: {
    url?: string;
    isActive?: boolean;
    announcement?: string;
    isAnnouncementVisible?: boolean;
    broadcastStartTime?: string;
  }): void {
    if (settings.url !== undefined) {
      this.liveStreamUrl = settings.url;
      saveToStorage('live_stream_url', this.liveStreamUrl);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sayko_live_stream_url', this.liveStreamUrl);
      }
    }
    if (settings.isActive !== undefined) {
      this.liveStreamIsActive = settings.isActive;
      saveToStorage('live_stream_is_active', this.liveStreamIsActive);
    }
    if (settings.announcement !== undefined) {
      this.liveAnnouncementText = settings.announcement;
      saveToStorage('live_announcement_text', this.liveAnnouncementText);
    }
    if (settings.isAnnouncementVisible !== undefined) {
      this.isAnnouncementVisible = settings.isAnnouncementVisible;
      saveToStorage('live_announcement_visible', this.isAnnouncementVisible);
    }
    if (settings.broadcastStartTime !== undefined) {
      this.broadcastStartTime = settings.broadcastStartTime;
      saveToStorage('live_broadcast_start_time', this.broadcastStartTime);
    }
    this.notify();
  }

  // --- PERSISTENT SUPPORT CHAT & INBOX MESSAGES ---
  public cleanupExpiredSupportMessages(): void {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    let changed = false;
    this.supportTickets = this.supportTickets
      .map(t => {
        const msgs = (t.messages || []).filter(m => !m.timestamp || m.timestamp >= cutoff);
        if (msgs.length !== (t.messages || []).length) changed = true;
        return msgs.length === (t.messages || []).length ? t : { ...t, messages: msgs };
      })
      .filter(t => { const keep = (t.messages || []).length > 0; if (!keep) changed = true; return keep; });
    if (changed) saveToStorage('support_tickets', this.supportTickets);
  }

  public addSupportMessage(userId: string, userName: string, text: string, sender: 'user' | 'support' = 'user'): void {
    this.cleanupExpiredSupportMessages();
    let ticket = this.supportTickets.find(t => t.userId === userId && t.status !== 'closed');
    const nowTimestamp = Date.now();
    const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

    if (!ticket) {
      ticket = {
        id: `tkt_${Date.now()}`,
        userId,
        userName,
        subject: `گفتگو با کاربر: ${userName}`,
        summary: text.trim(),
        status: 'new',
        createdAt: 'هم‌اکنون',
        createdAtTimestamp: nowTimestamp,
        messages: [],
      };
      this.supportTickets.unshift(ticket);
    }

    ticket.summary = text.trim();
    // Auto-replies must not mark the ticket as answered; only a real admin reply does (replyToTicket)
    if (sender === 'user') ticket.status = 'new';
    this.deletedTicketMap.delete(ticket.id);
    this.deletedTicketIds.delete(ticket.id);
    ticket.messages.push({
      id: `msg_${nowTimestamp}_${Math.random().toString(36).substring(2, 6)}`,
      sender,
      text: text.trim(),
      time: timeFa,
      timestamp: nowTimestamp,
    });

    if (sender === 'user') {
      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        title: 'پیام پشتیبانی جدید',
        message: `پیام جدیدی از طرف ${userName} دریافت شد.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'system',
      });
    }

    insertSupportMessageToDb({
      userId,
      userName,
      sender,
      text: text.trim(),
      ticketId: ticket.id,
    }).catch(() => {});
    upsertSupportTicketToDb(ticket).catch(() => {});

    fetch('/api/support/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, text: text.trim(), sender }),
    }).catch(() => {});

    saveToStorage('support_tickets', this.supportTickets);
    this.notify();
  }


  /** Poll "round" for a course: changes whenever horse names are added, removed or renamed, which resets votes. */
  public getPollRoundId(courseNumber: number): string {
    const course = this.activeWeek?.courses?.find(c => c.number === courseNumber);
    const sig = (course?.horses || []).map(h => `${h.id}=${h.name}`).sort().join('|');
    let hash = 0;
    for (let i = 0; i < sig.length; i++) hash = (hash * 31 + sig.charCodeAt(i)) | 0;
    return `c${courseNumber}r${(hash >>> 0).toString(36)}`;
  }

  public getPollVoteKey(courseNumber: number, horseId: string): string {
    return `${this.getPollRoundId(courseNumber)}:${horseId}`;
  }

  public getPollVoteCount(courseNumber: number, horseId: string): number {
    return this.pollVotes[this.getPollVoteKey(courseNumber, horseId)] || 0;
  }

  private getUserPollLockKey(userId: string, courseNumber: number): string {
    return `${userId}_${this.getPollRoundId(courseNumber)}`;
  }

  public hasUserVotedInPoll(userId?: string, courseNumber?: number): boolean {
    return Boolean(this.getUserPollVote(userId, courseNumber));
  }

  public getUserPollVote(userId?: string, courseNumber?: number): UserPollVote | null {
    const uId = userId || this.currentUser?.id;
    if (!uId || courseNumber === undefined) return null;
    return this.userPollVotes[this.getUserPollLockKey(uId, courseNumber)] || null;
  }

  public castPollVote(
    userId: string,
    userName: string,
    horseId: string,
    courseNumber: number,
    horseName: string
  ): { success: boolean; message: string; userVote?: UserPollVote } {
    if (!userId || !horseId) {
      return { success: false, message: 'شناسه کاربر یا اسب نامعتبر است.' };
    }

    if (this.hasUserVotedInPoll(userId, courseNumber)) {
      return {
        success: false,
        message: 'شما قبلاً رأی خود را در این بخش ثبت کرده‌اید. بر اساس قوانین نظرسنجی، هر کاربر فقط مجاز به یک‌بار ثبت رأی می‌باشد.',
      };
    }

    const nowTimestamp = Date.now();
    const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

    const voteKey = this.getPollVoteKey(courseNumber, horseId);
    const lockKey = this.getUserPollLockKey(userId, courseNumber);
    this.pollVotes[voteKey] = (this.pollVotes[voteKey] || 0) + 1;
    const userVote: UserPollVote = {
      userId,
      userName: userName || 'کاربر',
      horseId,
      courseNumber,
      horseName,
      votedAt: timeFa,
      timestamp: nowTimestamp,
    };
    this.userPollVotes[lockKey] = userVote;
    saveToStorage('user_poll_votes', this.userPollVotes);
    saveToStorage('poll_votes_real_v1', this.pollVotes);

    // Persist to central server in background
    fetch('/api/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, horseId, courseNumber, horseName, voteKey, lockKey }),
    }).catch(err => console.warn('Sync poll vote error:', err));

    this.notify();
    return { success: true, message: 'رأی شما با موفقیت ثبت شد!', userVote };
  }

  // Legacy set (no timestamps) is dropped: it hid new messages forever. Deletions now remember when they happened.
  public deletedTicketIds: Set<string> = new Set();
  public deletedTicketMap: Map<string, number> = new Map(Object.entries(loadFromStorage('deleted_ticket_map_v2', {} as Record<string, number>)));

  /** True when a ticket was deleted by admin and has no newer message since the deletion. */
  public isTicketHidden(t: { id: string; messages?: { timestamp?: number }[] }): boolean {
    const at = this.deletedTicketMap.get(t.id);
    if (at === undefined) return false;
    const last = Math.max(0, ...(t.messages || []).map(m => Number(m.timestamp) || 0));
    if (last > at) {
      this.deletedTicketMap.delete(t.id);
      saveToStorage('deleted_ticket_map_v2', Object.fromEntries(this.deletedTicketMap));
      return false;
    }
    return true;
  }

  /** Admin: delete given tickets (or all when ids omitted) locally and in the database. */
  public deleteTickets(ids?: string[]): void {
    const targets = ids ?? this.supportTickets.map(t => t.id);
    if (targets.length === 0) return;
    const now = Date.now();
    targets.forEach(id => this.deletedTicketMap.set(id, now));
    saveToStorage('deleted_ticket_map_v2', Object.fromEntries(Array.from(this.deletedTicketMap).slice(-500)));
    const set = new Set(targets);
    this.supportTickets = this.supportTickets.filter(t => !set.has(t.id));
    saveToStorage('support_tickets', this.supportTickets);
    deleteSupportTicketsFromDb(targets).catch(() => {});
    this.notify();
  }

  public replyToTicket(ticketId: string, replyText: string, newStatus: 'new' | 'pending' | 'answered' | 'closed' = 'answered'): void {
    const t = this.supportTickets.find(item => item.id === ticketId);
    if (!t) return;
    const nowTimestamp = Date.now();
    const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

    t.messages.push({
      id: `msg_${nowTimestamp}`,
      sender: 'support',
      text: replyText.trim(),
      time: timeFa,
      timestamp: nowTimestamp,
    });
    t.status = newStatus;
    t.summary = replyText.trim();

    // Push notification directly to user active message inbox (Requirement 2)
    this.notifications.unshift({
      id: `notif_rep_${nowTimestamp}`,
      userId: t.userId,
      title: 'پاسخ جدید از پشتیبانی',
      message: replyText.trim(),
      time: 'هم‌اکنون',
      read: false,
      type: 'system',
    });
    saveToStorage('notifications', this.notifications);

    insertSupportMessageToDb({
      userId: t.userId,
      userName: t.userName,
      sender: 'support',
      text: replyText.trim(),
      ticketId: t.id,
    }).catch(() => {});
    upsertSupportTicketToDb(t).catch(() => {});

    fetch('/api/support/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, replyText: replyText.trim() }),
    }).catch(() => {});

    saveToStorage('support_tickets', this.supportTickets);
    this.notify();
  }

  public updateAdminSecurity(settings: {
    pin?: string;
    alerts?: { newRequests: boolean; newMessages: boolean; highValueTx: boolean };
    twoFactor?: boolean;
    sensitiveAlerts?: boolean;
  }): void {
    if (settings.pin) this.adminPin = settings.pin;
    if (settings.alerts) this.adminAlerts = settings.alerts;
    if (settings.twoFactor !== undefined) this.admin2FA = settings.twoFactor;
    if (settings.sensitiveAlerts !== undefined) this.adminSensitiveAlerts = settings.sensitiveAlerts;
    this.notify();
  }

  public updateTransactionStatus(txId: string, status: 'approved' | 'rejected'): void {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return;
    tx.status = status;
    updateTransactionStatusInDb(txId, status).catch(() => {});

    // If approved deposit, credit user balance!
    if (status === 'approved' && tx.type === 'deposit') {
      const u = this.users.find(usr => usr.id === tx.userId);
      if (u) {
        u.balanceTomans += tx.amountTomans;
        syncUserBalanceToDb(u.id, u.balanceTomans).catch(() => {});
      }
      if (this.currentUser && this.currentUser.id === tx.userId) {
        this.currentUser.balanceTomans += tx.amountTomans;
      }
      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        userId: tx.userId,
        title: 'شارژ حساب موفق',
        message: `شارژ حساب با موفقیت انجام شد. مبلغ ${tx.amountTomans.toLocaleString('fa-IR')} تومان به حساب شما نشست.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'financial',
      });
    } else if (status === 'rejected' && tx.type === 'deposit') {
      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        userId: tx.userId,
        title: 'رد درخواست افزایش اعتبار',
        message: `درخواست افزایش اعتبار شما به مبلغ ${tx.amountTomans.toLocaleString('fa-IR')} تومان رد شد.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'financial',
      });
    } else if (status === 'rejected' && tx.type === 'withdraw') {
      // If rejected withdraw, refund deducted balance
      const u = this.users.find(usr => usr.id === tx.userId);
      if (u) {
        u.balanceTomans += tx.amountTomans;
        syncUserBalanceToDb(u.id, u.balanceTomans).catch(() => {});
      }
      if (this.currentUser && this.currentUser.id === tx.userId) {
        this.currentUser.balanceTomans += tx.amountTomans;
      }
      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        userId: tx.userId,
        title: 'رد درخواست برداشت',
        message: `درخواست برداشت وجه شما به مبلغ ${tx.amountTomans.toLocaleString('fa-IR')} تومان رد شد و مبلغ به کیف پول شما بازگشت.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'financial',
      });
    } else if (status === 'approved' && tx.type === 'withdraw') {
      // PERMANENT DEDUCTION: The amount remains permanently deducted upon approval!
      this.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        userId: tx.userId,
        title: 'واریز بانکی موفق',
        message: `واریز بانکی به مبلغ ${tx.amountTomans.toLocaleString('fa-IR')} تومان با موفقیت به حساب شما ثبت و انجام شد.`,
        time: 'هم‌اکنون',
        read: false,
        type: 'financial',
      });
    }
    this.notify();
  }

  // --- ADMIN DEPOSIT APPROVAL WORKFLOW («افزایش اعتبار کاربر») ---
  public async approveDepositRequest(txId: string, approvedAmountTomans: number): Promise<{ success: boolean; message: string }> {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'تراکنش یافت نشد.' };

    const finalAmount = Number(approvedAmountTomans) > 0 ? Number(approvedAmountTomans) : tx.amountTomans;
    tx.status = 'approved';
    tx.amountTomans = finalAmount;
    tx.approvedAmountTomans = finalAmount;

    // a. The user's database account balance is instantly charged/increased by the approved amount.
    const u = this.users.find(usr => usr.id === tx.userId);
    if (u) {
      u.balanceTomans = (Number(u.balanceTomans) || 0) + finalAmount;
      u.depositTotalTomans = (u.depositTotalTomans || 0) + finalAmount;
      u.depositCount = (u.depositCount || 0) + 1;
      syncUserBalanceToDb(u.id, u.balanceTomans).catch(() => {});
    }
    if (this.currentUser && this.currentUser.id === tx.userId) {
      this.currentUser.balanceTomans = (Number(this.currentUser.balanceTomans) || 0) + finalAmount;
    }

    // b. An official notification is automatically sent to the user's Inbox:
    const formattedAmount = finalAmount.toLocaleString('fa-IR');
    const notifMessage = `شارژ حساب با موفقیت انجام شد. مبلغ ${formattedAmount} تومان به حساب شما نشست.`;

    this.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      userId: tx.userId,
      title: 'شارژ حساب موفق',
      message: notifMessage,
      time: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
      read: false,
      type: 'financial',
    });

    // c. Request status updates to approved/successful in both panels.
    fetch('/api/transactions/approve-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, approvedAmount: finalAmount }),
    }).catch(() => {});

    updateTransactionStatusInDb(txId, 'approved').catch(() => {});

    saveToStorage('transactions', this.transactions);
    saveToStorage('notifications', this.notifications);
    saveToStorage('users', this.users);
    this.notify();

    return { success: true, message: `اعتبار کاربر به مبلغ ${formattedAmount} تومان با موفقیت افزایش یافت.` };
  }

  public async rejectDepositRequest(txId: string): Promise<{ success: boolean; message: string }> {
    const tx = this.transactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'تراکنش یافت نشد.' };

    tx.status = 'rejected';
    const dateStr = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

    this.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      userId: tx.userId,
      title: 'رد درخواست افزایش اعتبار',
      message: `درخواست افزایش اعتبار شما به مبلغ ${tx.amountTomans.toLocaleString('fa-IR')} تومان رد شد. (تاریخ: ${dateStr})`,
      time: dateStr,
      read: false,
      type: 'financial',
    });

    fetch('/api/transactions/reject-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId }),
    }).catch(() => {});

    updateTransactionStatusInDb(txId, 'rejected').catch(() => {});

    saveToStorage('transactions', this.transactions);
    saveToStorage('notifications', this.notifications);
    this.notify();

    return { success: true, message: 'درخواست افزایش اعتبار با موفقیت رد شد.' };
  }

  /**
   * Syncs with Central Database (Express backend) for multi-device live persistence
   */
  public async syncWithCentralServer(): Promise<void> {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const state = data.state || data;
      let hasChanges = false;

      // 1. Sync Active Week
      if (state.activeWeek) {
        if (state.activeWeek.totalPoolTomans !== undefined && state.activeWeek.totalPoolTomans !== this.activeWeek.totalPoolTomans) {
          this.activeWeek.totalPoolTomans = state.activeWeek.totalPoolTomans;
          hasChanges = true;
        }
        if (state.activeWeek.isShishParEnabled !== undefined && state.activeWeek.isShishParEnabled !== this.activeWeek.isShishParEnabled) {
          this.activeWeek.isShishParEnabled = state.activeWeek.isShishParEnabled;
          hasChanges = true;
        }
        const adminEditing = this.currentUser?.role === 'admin' && Date.now() - this.centralWeekPushedAt < 6000;
        if (!adminEditing && state.activeWeek.id && state.activeWeek.id !== this.activeWeek.id) {
          this.activeWeek.id = state.activeWeek.id;
          hasChanges = true;
        }
        if (Array.isArray(state.activeWeek.courses) && !adminEditing) {
          state.activeWeek.courses.forEach((remoteCourse: Course) => {
            const localCourse = this.activeWeek.courses.find(c => c.number === remoteCourse.number);
            if (localCourse) {
              if (localCourse.isLocked !== remoteCourse.isLocked) {
                localCourse.isLocked = remoteCourse.isLocked;
                hasChanges = true;
              }
              if (localCourse.winningHorseNumber !== remoteCourse.winningHorseNumber) {
                localCourse.winningHorseNumber = remoteCourse.winningHorseNumber;
                hasChanges = true;
              }
              if (JSON.stringify(localCourse.horses) !== JSON.stringify(remoteCourse.horses)) {
                localCourse.horses = remoteCourse.horses;
                hasChanges = true;
              }
            }
          });
        }
      }

      if (!this.centralWeekLoaded) { this.centralWeekLoaded = true; this.lastCentralWeekSig = this.weekSig(); }
      // 2. Sync Predictions (Tickets from all users)
      if (!isSupabaseConfigured && Array.isArray(state.predictions) && state.predictions.length > 0) {
        const localSlipMap = new Map(this.predictions.map(p => [p.id, p]));
        let slipUpdated = false;
        state.predictions.forEach((remoteSlip: PredictionSlip) => {
          const local = localSlipMap.get(remoteSlip.id);
          if (!local) {
            this.predictions.unshift(remoteSlip);
            localSlipMap.set(remoteSlip.id, remoteSlip);
            slipUpdated = true;
          } else {
            if (local.status !== remoteSlip.status || local.payoutTomans !== remoteSlip.payoutTomans) {
              local.status = remoteSlip.status;
              local.payoutTomans = remoteSlip.payoutTomans;
              slipUpdated = true;
            }
          }
        });
        if (slipUpdated) {
          hasChanges = true;
          saveToStorage('predictions', this.predictions);
        }
      }

      // 3. Sync Transactions
      if (!isSupabaseConfigured && Array.isArray(state.transactions) && state.transactions.length > 0) {
        const localTxMap = new Map(this.transactions.map(t => [t.id, t]));
        let txUpdated = false;
        state.transactions.forEach((remoteTx: Transaction) => {
          const local = localTxMap.get(remoteTx.id);
          if (!local) {
            this.transactions.unshift(remoteTx);
            localTxMap.set(remoteTx.id, remoteTx);
            txUpdated = true;
          } else {
            if (local.status !== remoteTx.status || local.amountTomans !== remoteTx.amountTomans) {
              local.status = remoteTx.status;
              local.amountTomans = remoteTx.amountTomans;
              txUpdated = true;
            }
          }
        });
        if (txUpdated) {
          hasChanges = true;
          saveToStorage('transactions', this.transactions);
        }
      }

      // 4. Sync Users & Current User
      if (!isSupabaseConfigured && Array.isArray(state.users)) {
        state.users.forEach((remoteUser: UserProfile) => {
          const localUser = this.users.find(u => u.id === remoteUser.id);
          if (localUser) {
            if (localUser.balanceTomans !== remoteUser.balanceTomans) {
              localUser.balanceTomans = remoteUser.balanceTomans;
              hasChanges = true;
            }
          }
        });
        if (this.currentUser) {
          const remoteCur = state.users.find((u: UserProfile) => u.id === this.currentUser!.id);
          if (remoteCur && remoteCur.balanceTomans !== this.currentUser.balanceTomans) {
            this.currentUser.balanceTomans = remoteCur.balanceTomans;
            hasChanges = true;
            saveToStorage('current_user', this.currentUser);
          }
        }
      }

      // 5. Sync Notifications
      if (!isSupabaseConfigured && Array.isArray(state.notifications) && state.notifications.length > 0) {
        const localNotifIds = new Set(this.notifications.map(n => n.id));
        const newNotifs = state.notifications.filter((n: NotificationItem) => !localNotifIds.has(n.id));
        if (newNotifs.length > 0) {
          this.notifications = [...newNotifs, ...this.notifications];
          hasChanges = true;
          saveToStorage('notifications', this.notifications);
        }
      }

      // 5.5. Sync Poll Data (Requirement 2)
      if (state.pollVotes && typeof state.pollVotes === 'object') {
        // Server is the single source of truth: replace local counts entirely
        const realVotes: Record<string, number> = {};
        Object.entries(state.pollVotes).forEach(([hId, count]) => {
          if (typeof count === 'number' && count > 0) realVotes[hId] = count;
        });
        const pollUpdated = JSON.stringify(realVotes) !== JSON.stringify(this.pollVotes);
        if (pollUpdated) this.pollVotes = realVotes;
        if (pollUpdated) {
          hasChanges = true;
          saveToStorage('poll_votes_real_v1', this.pollVotes);
        }
      }
      if (state.userPollVotes && typeof state.userPollVotes === 'object') {
        let userPollUpdated = false;
        Object.entries(state.userPollVotes).forEach(([uId, vote]) => {
          if (!this.userPollVotes[uId]) {
            this.userPollVotes[uId] = vote as UserPollVote;
            userPollUpdated = true;
          }
        });
        if (userPollUpdated) {
          hasChanges = true;
          saveToStorage('user_poll_votes', this.userPollVotes);
        }
      }

      // 6. Sync Support Tickets
      if (Array.isArray(state.supportTickets) && state.supportTickets.length > 0) {
        const localTicketMap = new Map(this.supportTickets.map(t => [t.id, t]));
        let ticketUpdated = false;
        state.supportTickets.forEach((remoteTicket: SupportTicket) => {
          if (this.isTicketHidden(remoteTicket)) return;
          const local = localTicketMap.get(remoteTicket.id);
          if (!local) {
            this.supportTickets.unshift(remoteTicket);
            localTicketMap.set(remoteTicket.id, remoteTicket);
            ticketUpdated = true;
          } else {
            if (JSON.stringify(local.messages) !== JSON.stringify(remoteTicket.messages) || local.status !== remoteTicket.status) {
              local.messages = remoteTicket.messages;
              local.status = remoteTicket.status;
              local.summary = remoteTicket.summary;
              ticketUpdated = true;
            }
          }
        });
        if (ticketUpdated) {
          hasChanges = true;
          saveToStorage('support_tickets', this.supportTickets);
        }
      }

      if (hasChanges) {
        this.notify();
      }
    } catch {
      // Ignore background fetch error
    }
  }

  public adjustUserBalance(userId: string, deltaAmount: number): void {
    const u = this.users.find(usr => usr.id === userId);
    if (!u) return;
    u.balanceTomans = Math.max(0, u.balanceTomans + deltaAmount);
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser.balanceTomans = u.balanceTomans;
    }
    syncUserBalanceToDb(userId, u.balanceTomans).catch(() => {});
    this.notify();
  }

  /**
   * Hydrates state from Supabase database tables if available
   */
  public async initSupabaseSync(): Promise<void> {
    try {
      // 1. Sync current user's profile & balance from Supabase
      if (this.currentUser?.id) {
        const remoteUser = await fetchUserFromDb(this.currentUser.id);
        if (remoteUser && remoteUser.balanceTomans !== undefined) {
          this.currentUser.balanceTomans = remoteUser.balanceTomans;
          const uIdx = this.users.findIndex(u => u.id === this.currentUser!.id);
          if (uIdx !== -1) {
            this.users[uIdx].balanceTomans = remoteUser.balanceTomans;
          }
        }
      }

      // 2. Sync predictions slips from Supabase (Persistent retention)
      const remoteSlips = await fetchPredictionsFromDb();
      if (remoteSlips && remoteSlips.length > 0) {
        // Merge without losing any local ones
        const existingIds = new Set(this.predictions.map(p => p.id));
        const newSlips = remoteSlips.filter(s => !existingIds.has(s.id) && (s.status as string) !== 'cancelled' && !this.cancelledSlipIds.has(s.id));
        if (newSlips.length > 0) {
          this.predictions = [...newSlips, ...this.predictions];
          saveToStorage('predictions', this.predictions);
        }
      }

      // 3. Sync transactions from Supabase
      const remoteTxs = await fetchTransactionsFromDb();
      if (remoteTxs && remoteTxs.length > 0) {
        const existingTxIds = new Set(this.transactions.map(t => t.id));
        const newTxs = remoteTxs.filter(t => !existingTxIds.has(t.id));
        if (newTxs.length > 0) {
          this.transactions = [...newTxs, ...this.transactions];
        }
      }

      this.notify();
    } catch (err) {
      console.warn('[Store] Supabase hydration notice:', err);
    }
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.notify();
    }
  }

  public markAllNotificationsAsRead(): void {
    this.notifications.forEach(n => { n.read = true; });
    this.notify();
  }

  // --- AUTOMATED ADMIN RESULT EVALUATION ENGINE ---
  // SCENARIO A: No Scratched Horses -> Evaluate user's Primary selection ONLY (Strict Substitution Rule)
  // SCENARIO B: User's Primary Horse is Scratched (Red Toggle) -> System automatically switches to evaluate REPLACEMENT/RESERVE horse
  public setCourseWinningHorse(courseNumber: number, horseNumber: number | undefined): void {
    const course = this.activeWeek.courses.find(c => c.number === courseNumber);
    if (!course) return;
    course.winningHorseNumber = horseNumber;

    // Permanent Receipt History: Also record the winner directly into each active slip's snapshotCourses!
    // This guarantees that if admin clears or deletes courses later, the slip snapshot permanently retains the winning horse number!
    this.predictions.forEach(slip => {
      if (slip.snapshotCourses && isBoundToLive(slip, this.activeWeek.id)) {
        const snapCourse = slip.snapshotCourses.find(c => c.number === courseNumber);
        if (snapCourse) {
          snapCourse.winningHorseNumber = horseNumber;
        }
      }
    });

    this.evaluatePredictionSlips();
    // Persist the winner immediately: local storage + central DB so every device sees it and refresh keeps it
    saveToStorage('active_week', this.activeWeek);
    saveToStorage('predictions', this.predictions);
    this.lastSyncedWeek = JSON.stringify(this.activeWeek);
    this.adminWeekEditedAt = Date.now();
    syncAdminSettingToDb('active_week', this.activeWeek).catch(() => {});
    this.predictions.forEach(slip => {
      if (isBoundToLive(slip, this.activeWeek.id) || slip.lockedResults) updatePredictionInDb(slip).catch(() => {});
    });
    this.notify();
  }

  public evaluatePredictionSlips(): void {
    const activeCourses = this.activeWeek.courses;

    this.predictions.forEach(slip => {
      // Immutable Past Results: Never overwrite or re-evaluate finalized historical slips
      if (slip.isResultFinalized) {
        return;
      }

      const result = evaluateSlipCourses(slip, activeCourses, this.activeWeek.id);
      const hasFailedCourse = result.hasFailed;
      const allCoursesHaveWinners = result.complete;
      if (result.complete && !slip.lockedResults) {
        // Lock per-course outcome permanently: future race days can never alter it
        slip.lockedResults = result.rows;
      }

      if (hasFailedCourse) {
        if (slip.status !== 'lost') {
          this.hasRecentDefeatBadge = true;
          saveToStorage('has_recent_defeat_badge', true);
        }
        slip.status = 'lost';
      } else if (allCoursesHaveWinners) {
        slip.status = 'won';
      } else {
        slip.status = 'pending';
      }
    });

    // Check if courses all have official winners declared
    const has7Courses = activeCourses.some(c => c.number === 7 && c.horses.length > 0);
    const targetCourses = has7Courses 
      ? activeCourses.filter(c => c.number >= 1 && c.number <= 7 && c.horses.length > 0)
      : activeCourses.filter(c => c.number >= 1 && c.number <= 6 && c.horses.length > 0);

    const allCoursesFinished = targetCourses.length > 0 && targetCourses.every(c => c.winningHorseNumber !== undefined && c.winningHorseNumber !== null);
    if (allCoursesFinished) {
      const activeSlips = this.predictions.filter(p => {
        if (this.todayProfitResetTimestamp > 0 && (p.createdAtTimestamp || 0) < this.todayProfitResetTimestamp) {
          return false;
        }
        return true;
      });

      const unfinalizedWinners = activeSlips.filter(s => s.status === 'won' && !s.isResultFinalized);
      const isSixPr = (p: PredictionSlip) => (p.ticketType === 'shishpar') || (!p.ticketType && Object.keys(p.selections || {}).length >= 6);
      const isFivePr = (p: PredictionSlip) => (p.ticketType === 'panjpar') || (!p.ticketType && Object.keys(p.selections || {}).length === 5);

      if (unfinalizedWinners.length > 0) {
        const analytics = this.getProfitAnalytics();
        unfinalizedWinners.forEach(slip => {
          const payoutPerWinner = isSixPr(slip) 
            ? (analytics.sixPrReceiptPrize || 1000) 
            : (analytics.fivePrReceiptPrize || 1000);

          slip.payoutTomans = payoutPerWinner;
          slip.isResultFinalized = true;

          // Automatically credit winner's wallet in Supabase & Store
          const winnerUser = this.users.find(u => u.id === slip.userId);
          if (winnerUser) {
            winnerUser.balanceTomans = (Number(winnerUser.balanceTomans) || 0) + payoutPerWinner;
            winnerUser.winsCount = (winnerUser.winsCount || 0) + 1;
            syncUserBalanceToDb(winnerUser.id, winnerUser.balanceTomans).catch(() => {});
          }
          if (this.currentUser && this.currentUser.id === slip.userId) {
            this.currentUser.balanceTomans = (Number(this.currentUser.balanceTomans) || 0) + payoutPerWinner;
          }

          // Automated Win Transaction Record
          const winTx: Transaction = {
            id: `tx_win_${Date.now()}_${slip.id}`,
            userId: slip.userId,
            userName: slip.userName,
            type: 'prediction_win',
            amountTomans: payoutPerWinner,
            date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
            status: 'approved',
            trackingCode: `WIN-${Math.floor(100000 + Math.random() * 900000)}`,
          };
          this.transactions.unshift(winTx);
          insertTransactionToDb(winTx).catch(() => {});

          // Automated Winner Notification
          this.notifications.unshift({
            id: `notif_win_${Date.now()}_${slip.id}`,
            userId: slip.userId,
            title: 'برنده شدید!',
            message: `برنده شدید! مبلغ ${payoutPerWinner.toLocaleString('fa-IR')} تومان به حساب شما واریز شد.`,
            time: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
            read: false,
            type: 'financial',
          });

          this.hasRecentWinnerBadge = true;
          saveToStorage('has_recent_winner_badge', true);
        });
      } else {
        // Zero (0) winners scenario across both Six-Pareh and Five-Pareh:
        // Automatically refund configured percentage to each ticket owner's wallet balance
        const anyUnfinalized = activeSlips.some(s => !s.isResultFinalized && !s.isRefunded);
        if (anyUnfinalized) {
          this.executeNoWinnerRefunds();
        }
      }
    }

    saveToStorage('predictions', this.predictions);
    saveToStorage('transactions', this.transactions);
    saveToStorage('notifications', this.notifications);
    saveToStorage('active_week', this.activeWeek);
  }
}

export const store = AppStore.getInstance();
