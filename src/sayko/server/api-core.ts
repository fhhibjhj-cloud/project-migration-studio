// Ported from the original Express server (server.ts). State is persisted in Lovable Cloud (central_state table).
/* eslint-disable */
// @ts-nocheck
import { netPoolShare, loserRefund } from '../lib/poolFormula';
import seed from './seed.json';

type Req = { body: any };
type Res = { status: (c: number) => Res; json: (b: any) => void };
type Handler = (req: Req, res: Res) => void;
const routes: Record<string, Handler> = {};
const app = {
  get: (p: string, h: Handler) => { routes['GET ' + p] = h; },
  post: (p: string, h: Handler) => { routes['POST ' + p] = h; },
};

// Initial courses setup
const INITIAL_COURSES = [
  {
    id: 'c1',
    number: 1,
    title: 'کورس اول: تروبرد دوخون مبتدی و نبرده',
    distance: '۱۰۰۰ متر',
    trackType: 'ماسه نرم - هندیکپ',
    prizePool: 120000000,
    winningHorseNumber: 3,
    isLocked: false,
    horses: [
      { id: 'h1_1', number: 1, name: 'فانتوم جت', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'تکخال صحرا x سایکو کوئین', silkColor: '#10b981', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 92, odds: 1.8, isScratched: false, isReplacement: false },
      { id: 'h1_2', number: 2, name: 'رعد صحرا', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'دارک هورس x دایموند', silkColor: '#18181b', silkPattern: 'sash', silkSecondaryColor: '#10b981', rating: 88, odds: 2.4, isScratched: false, isReplacement: false },
      { id: 'h1_3', number: 3, name: 'تورقوز خان', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'اترک خان x گزل', silkColor: '#2563eb', silkPattern: 'solid', rating: 85, odds: 3.1, isScratched: true, isReplacement: false },
      { id: 'h1_4', number: 4, name: 'سایکو شاهین', jockey: 'جواد توماج', trainer: 'طاهر ارازپور', pedigree: 'فایتر x نگین', silkColor: '#eab308', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 81, odds: 4.0, isScratched: false, isReplacement: false },
      { id: 'h1_5', number: 5, name: 'تکاور خزر', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'اسکای واکر x جت بال', silkColor: '#f472b6', silkPattern: 'solid', rating: 79, odds: 4.5, isScratched: false, isReplacement: false },
      { id: 'h1_6', number: 6, name: 'سردار صحرا', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#3b82f6', silkPattern: 'solid', rating: 83, odds: 3.8, isScratched: false, isReplacement: true, replacementForNumber: 3 },
      { id: 'h1_7', number: 7, name: 'یلدوز خان', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'سامی x رکسانا', silkColor: '#854d0e', silkPattern: 'stars', silkSecondaryColor: '#000000', rating: 77, odds: 5.2, isScratched: false, isReplacement: false },
      { id: 'h1_8', number: 8, name: 'بوران دشت', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#65a30d', silkPattern: 'solid', rating: 80, odds: 4.1, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c2',
    number: 2,
    title: 'کورس دوم: اسب‌های اصیل ترکمن کلاس ۲',
    distance: '۱۲۰۰ متر',
    trackType: 'خاک کوبیده',
    prizePool: 150000000,
    winningHorseNumber: 4,
    isLocked: false,
    horses: [
      { id: 'h2_1', number: 1, name: 'گوهر گنبد', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'شاهین سیاه x دایموند', silkColor: '#10b981', silkPattern: 'solid', rating: 94, odds: 1.6, isScratched: false, isReplacement: false },
      { id: 'h2_2', number: 2, name: 'تیوان آی تپه', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x درنا', silkColor: '#3b82f6', silkPattern: 'solid', rating: 89, odds: 2.1, isScratched: false, isReplacement: false },
      { id: 'h2_3', number: 3, name: 'آهو صبا', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'تندر x مایا', silkColor: '#eab308', silkPattern: 'solid', rating: 86, odds: 2.9, isScratched: false, isReplacement: false },
      { id: 'h2_4', number: 4, name: 'صاعقه سرخ', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'المپیک x آیدا', silkColor: '#ec4899', silkPattern: 'solid', rating: 82, odds: 3.4, isScratched: true, isReplacement: false },
      { id: 'h2_5', number: 5, name: 'دلیران خزر', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#06b6d4', silkPattern: 'solid', rating: 87, odds: 2.7, isScratched: false, isReplacement: true, replacementForNumber: 4 },
      { id: 'h2_6', number: 6, name: 'باران صحرا', jockey: 'رامین قهرمانی', trainer: 'طاهر جرجانی', pedigree: 'شاهوار x رخساره', silkColor: '#8b5cf6', silkPattern: 'solid', rating: 78, odds: 4.5, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c3',
    number: 3,
    title: 'کورس سوم: تروبرد وارداتی کلاس هندیکپ ۱',
    distance: '۱۶۰۰ متر',
    trackType: 'خاک - پیست اصلی',
    prizePool: 220000000,
    winningHorseNumber: 7,
    isLocked: false,
    horses: [
      { id: 'h3_1', number: 1, name: 'شاهین طلایی', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'واتوسفر x درنا', silkColor: '#10b981', silkPattern: 'stripes', silkSecondaryColor: '#000000', rating: 91, odds: 2.0, isScratched: false, isReplacement: false },
      { id: 'h3_2', number: 2, name: 'پادشاه صحرا', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'تکخال صحرا x سایکو کوئین', silkColor: '#ef4444', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 90, odds: 2.2, isScratched: false, isReplacement: false },
      { id: 'h3_3', number: 3, name: 'تندیس گنبد', jockey: 'جواد توماج', trainer: 'طاهر ارازپور', pedigree: 'فایتر x نگین', silkColor: '#3b82f6', silkPattern: 'solid', rating: 84, odds: 3.0, isScratched: false, isReplacement: false },
      { id: 'h3_4', number: 4, name: 'عقاب البرز', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'اسکای واکر x جت بال', silkColor: '#f59e0b', silkPattern: 'solid', rating: 83, odds: 3.2, isScratched: false, isReplacement: false },
      { id: 'h3_5', number: 5, name: 'سایه سیاه', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'دارک هورس x دایموند', silkColor: '#18181b', silkPattern: 'solid', rating: 85, odds: 2.8, isScratched: false, isReplacement: false },
      { id: 'h3_6', number: 6, name: 'تیوان ۲', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'المپیک x آیدا', silkColor: '#10b981', silkPattern: 'solid', rating: 80, odds: 3.9, isScratched: false, isReplacement: false },
      { id: 'h3_7', number: 7, name: 'رعد و برق', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'سامی x رکسانا', silkColor: '#ec4899', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 87, odds: 2.5, isScratched: false, isReplacement: false },
      { id: 'h3_8', number: 8, name: 'زردشت خان', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#6366f1', silkPattern: 'solid', rating: 79, odds: 4.2, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c4',
    number: 4,
    title: 'کورس چهارم: دوخون هندیکپ کلاس ۳',
    distance: '۱۰۰۰ متر',
    trackType: 'خاک - سرعت',
    prizePool: 180000000,
    winningHorseNumber: 8,
    isLocked: false,
    horses: [
      { id: 'h4_1', number: 1, name: 'تایتانیک', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'تکخال صحرا x سایکو کوئین', silkColor: '#10b981', silkPattern: 'solid', rating: 93, odds: 1.7, isScratched: false, isReplacement: false },
      { id: 'h4_2', number: 2, name: 'کوهستان', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'دارک هورس x دایموند', silkColor: '#3b82f6', silkPattern: 'sash', silkSecondaryColor: '#ffffff', rating: 88, odds: 2.4, isScratched: false, isReplacement: false },
      { id: 'h4_3', number: 3, name: 'الماس سیاه', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x درنا', silkColor: '#18181b', silkPattern: 'solid', rating: 86, odds: 2.8, isScratched: false, isReplacement: false },
      { id: 'h4_4', number: 4, name: 'شهسوار', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'تندر x مایا', silkColor: '#eab308', silkPattern: 'stripes', silkSecondaryColor: '#ffffff', rating: 82, odds: 3.5, isScratched: false, isReplacement: false },
      { id: 'h4_5', number: 5, name: 'طوفان سرخ', jockey: 'جواد توماج', trainer: 'طاهر ارازپور', pedigree: 'فایتر x نگین', silkColor: '#ef4444', silkPattern: 'solid', rating: 84, odds: 3.1, isScratched: false, isReplacement: false },
      { id: 'h4_6', number: 6, name: 'جهان نما', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#8b5cf6', silkPattern: 'solid', rating: 79, odds: 4.3, isScratched: false, isReplacement: false },
      { id: 'h4_7', number: 7, name: 'سایکو لیدی', jockey: 'طاهر توماج', trainer: 'عظیم توماج', pedigree: 'سامی x رکسانا', silkColor: '#ec4899', silkPattern: 'stars', silkSecondaryColor: '#000000', rating: 85, odds: 2.9, isScratched: false, isReplacement: false },
      { id: 'h4_8', number: 8, name: 'شاهین دشت', jockey: 'مبین اسدی', trainer: 'امان قلیچ', pedigree: 'قیام x غزال', silkColor: '#06b6d4', silkPattern: 'solid', rating: 89, odds: 2.2, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c5',
    number: 5,
    title: 'کورس پنجم: هندیکپ ویژه قهرمانی سوارکاران برتر',
    distance: '۱۴۰۰ متر',
    trackType: 'خاک - پیست اصلی',
    prizePool: 260000000,
    winningHorseNumber: 6,
    isLocked: false,
    horses: [
      { id: 'h5_1', number: 1, name: 'آذرخش', jockey: 'کمال دالیجه عطا', trainer: 'متین توماج', pedigree: 'شاهین سیاه x دایموند', silkColor: '#10b981', silkPattern: 'solid', rating: 96, odds: 1.4, isScratched: false, isReplacement: false },
      { id: 'h5_2', number: 2, name: 'سونامی', jockey: 'امیر مختومی', trainer: 'اسماعیل قلر', pedigree: 'دارک هورس x دایموند', silkColor: '#ef4444', silkPattern: 'solid', rating: 91, odds: 2.0, isScratched: false, isReplacement: false },
      { id: 'h5_3', number: 3, name: 'ببر صحرا', jockey: 'پیمان قلرعطا', trainer: 'فرهاد قزل', pedigree: 'واتوسفر x درنا', silkColor: '#eab308', silkPattern: 'sash', silkSecondaryColor: '#000000', rating: 88, odds: 2.5, isScratched: false, isReplacement: false },
      { id: 'h5_4', number: 4, name: 'اسپید مستر', jockey: 'بنیامین جرجانی', trainer: 'جبار یارعلی', pedigree: 'تندر x مایا', silkColor: '#3b82f6', silkPattern: 'stars', silkSecondaryColor: '#ffffff', rating: 85, odds: 3.0, isScratched: false, isReplacement: false },
      { id: 'h5_5', number: 5, name: 'آهوی زرین', jockey: 'جواد توماج', trainer: 'طاهر ارازپور', pedigree: 'فایتر x نگین', silkColor: '#18181b', silkPattern: 'solid', rating: 83, odds: 3.4, isScratched: false, isReplacement: false },
      { id: 'h5_6', number: 6, name: 'توفان گنبد', jockey: 'نوید ایری', trainer: 'ستار کوچکی', pedigree: 'شاهوار x رخساره', silkColor: '#06b6d4', silkPattern: 'solid', rating: 90, odds: 2.1, isScratched: false, isReplacement: false },
    ],
  },
  {
    id: 'c6',
    number: 6,
    title: 'کورس ششم: تروبرد قهرمانی پاییزه گنبد',
    distance: '۱۶۰۰ متر',
    trackType: 'خاک - پیست اصلی',
    prizePool: 300000000,
    winningHorseNumber: 3,
    isLocked: false,
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
    isLocked: false,
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

const INITIAL_WEEK = {
  id: 'w5_gonbad_1405',
  code: 'W5-GONBAD',
  title: 'هفته ۵ مسابقات اسب‌دوانی پاییزه گنبد کاووس',
  trackName: 'مجتمع سوارکاری بین‌المللی گنبد کاووس',
  type: 'shishpar',
  startDatePersian: '۱۴۰۵/۰۷/۱۷',
  countdownEndTimestamp: Date.now() + (1 * 86400 + 6 * 3600 + 59 * 60 + 37) * 1000,
  status: 'active',
  totalPoolTomans: 0, // Real Dynamic Pool initialized strictly to 0, repopulated by real tickets
  unitPriceTomans: 2000,
  courses: INITIAL_COURSES,
  isShishParEnabled: true, // Master toggle switch for Six-Pore submissions
};

const INITIAL_USERS = [
  {
    id: 'user_admin',
    numericId: 10001,
    fullName: 'متین توماج',
    username: 'admin',
    password: '',
    role: 'admin',
    balanceTomans: 25000000,
    isGuest: false,
    isFullNameLocked: true,
    registeredAt: '۱۴۰۴/۰۶/۰۱',
    lastLogin: 'هم‌اکنون',
    isOnline: true,
    isBanned: false,
    depositCount: 0,
    depositTotalTomans: 0,
    withdrawalCount: 0,
    withdrawalTotalTomans: 0,
    iban: 'IR980120000000001234567890',
    cardNumber: '6037-9978-1122-3344',
    phone: '09113710000',
  },
];


let __db: any = null;
let __dirty = false;
function getDatabase() { return __db; }
function saveDatabase(db: any) { __db = db; __dirty = true; }

// 21. Admin Live Chat & Support Notif Toggles
app.post('/api/admin/toggle-live-chat', (req: Req, res: Res) => {
  const { isEnabled } = req.body;
  const db = getDatabase();
  if (!db.adminSettings) db.adminSettings = {};
  db.adminSettings.isLiveChatEnabled = Boolean(isEnabled);
  saveDatabase(db);
  res.json({ success: true, isLiveChatEnabled: db.adminSettings.isLiveChatEnabled });
});

app.post('/api/admin/toggle-support-notifs', (req: Req, res: Res) => {
  const { isEnabled } = req.body;
  const db = getDatabase();
  if (!db.adminSettings) db.adminSettings = {};
  db.adminSettings.isSupportNotificationsEnabled = Boolean(isEnabled);
  saveDatabase(db);
  res.json({ success: true, isSupportNotificationsEnabled: db.adminSettings.isSupportNotificationsEnabled });
});

// -------------------------------------------------------------
// CENTRAL DATABASE API ENDPOINTS
// -------------------------------------------------------------

// 1. Get complete central synchronized snapshot
app.get('/api/state', (req: Req, res: Res) => {
  const db = getDatabase();
  res.json({
    success: true,
    activeWeek: db.activeWeek,
    predictions: db.predictions,
    transactions: db.transactions,
    supportTickets: db.supportTickets,
    liveChatMessages: db.liveChatMessages,
    users: db.users.map((u: any) => ({ ...u, password: '' })), // mask passwords
    adminSettings: db.adminSettings,
    notifications: db.notifications || [],
    pollVotes: db.pollVotes || {},
    userPollVotes: db.userPollVotes || {},
  });
});

// 2. Authentication: Register
app.post('/api/auth/register', (req: Req, res: Res) => {
  const { fullName, username, password } = req.body;
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim() || cleanUser;

  if (!cleanUser || !password) {
    return res.status(400).json({ success: false, message: 'لطفاً تمامی فیلدها را با دقت تکمیل کنید.' });
  }

  const db = getDatabase();
  if (db.users.some((u: any) => u.username.toLowerCase() === cleanUser)) {
    return res.status(400).json({ success: false, message: 'این نام کاربری قبلاً ثبت شده است.' });
  }

  const assignedNumericId = Math.floor(10000 + Math.random() * 90000);
  const newUser = {
    id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    numericId: assignedNumericId,
    fullName: cleanName,
    username: cleanUser,
    password: password.trim(),
    role: 'user',
    balanceTomans: 0, // Fresh account starts strictly at 0
    isGuest: false,
    isFullNameLocked: Boolean(cleanName),
    registeredAt: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date()),
    lastLogin: 'هم‌اکنون',
    isOnline: true,
    isBanned: false,
    depositCount: 0,
    depositTotalTomans: 0,
    withdrawalCount: 0,
    withdrawalTotalTomans: 0,
    iban: '',
    cardNumber: '',
    phone: '',
  };

  db.users.push(newUser);
  saveDatabase(db);

  const safeUser = { ...newUser, password: '' };
  res.json({ success: true, user: safeUser });
});

// 3. Authentication: Login
app.post('/api/auth/login', (req: Req, res: Res) => {
  const { username, password } = req.body;
  const cleanUser = (username || '').trim().toLowerCase();

  const db = getDatabase();
  const user = db.users.find((u: any) => u.username.toLowerCase() === cleanUser);

  if (!user) {
    return res.status(404).json({ success: false, message: 'کاربری با این مشخصات یافت نشد.' });
  }

  if (password && user.password && user.password !== password.trim()) {
    return res.status(401).json({ success: false, message: 'رمز عبور وارد شده نادرست است.' });
  }

  user.isOnline = true;
  user.lastLogin = 'هم‌اکنون';
  saveDatabase(db);

  const safeUser = { ...user, password: '' };
  res.json({ success: true, user: safeUser });
});

// 4. Update User Profile
app.post('/api/auth/update-profile', (req: Req, res: Res) => {
  const { userId, data } = req.body;
  const db = getDatabase();
  const user = db.users.find((u: any) => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
  }

  // Immutable IBAN requirement: if IBAN is already set, do not allow altering
  if (user.iban && data.iban && data.iban !== user.iban) {
    delete data.iban;
  }

  Object.assign(user, data);
  saveDatabase(db);

  res.json({ success: true, user: { ...user, password: '' } });
});

// 5. Betting Tickets & Six-Pore Submissions
// Real Dynamic Total Prize Pool: Accumulates real user payments and locks when master toggle is OFF
app.post('/api/predictions', (req: Req, res: Res) => {
  const { slip, userId } = req.body;
  const db = getDatabase();

  // Check Master Six-Pore Switch & Countdown Lock
  const isLocked = db.activeWeek.isShishParEnabled === false || (db.activeWeek.countdownEndTimestamp && Date.now() >= db.activeWeek.countdownEndTimestamp);
  if (isLocked) {
    return res.status(403).json({ success: false, message: 'مهلت ثبت به اتمام رسید! از این لحظه برگه ای ثبت نمیشود!' });
  }

  // Check individual locked courses
  if (slip.selections) {
    for (const [courseNumStr, picks] of Object.entries(slip.selections)) {
      const cNum = Number(courseNumStr);
      const course = db.activeWeek.courses.find((c: any) => c.number === cNum);
      if (course?.isLocked && (picks as any[]).length > 0) {
        return res.status(403).json({ success: false, message: `کورس شماره ${cNum} بسته است و امکان ثبت آن وجود ندارد.` });
      }
    }
  }

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'کاربر ثبت فرم یافت نشد.' });
  }

  const totalCost = Number(slip.totalCostTomans) || 0;
  if (user.balanceTomans < totalCost) {
    return res.status(400).json({ success: false, message: 'موجودی کیف پول شما کافی نیست.' });
  }

  // Deduct user balance
  user.balanceTomans -= totalCost;

  // Real Dynamic Pool Accumulation: Adds exact ticket cost directly into the prize pool!
  db.activeWeek.totalPoolTomans = (Number(db.activeWeek.totalPoolTomans) || 0) + netPoolShare(totalCost);

  // Record slip
  const fullSlip = {
    ...slip,
    id: slip.id || `slip_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId: user.id,
    userName: user.fullName,
    createdAtTimestamp: Date.now(),
    submittedAt: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
    snapshotCourses: JSON.parse(JSON.stringify(db.activeWeek.courses)),
    isResultFinalized: false,
    status: 'pending',
  };

  db.predictions.unshift(fullSlip);

  // Financial record
  const tx = {
    id: `tx_${Date.now()}`,
    userId: user.id,
    userName: user.fullName,
    type: 'prediction_fee',
    amountTomans: totalCost,
    date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
    status: 'approved',
    trackingCode: `SAYKO-${Math.floor(100000 + Math.random() * 900000)}`,
  };
  db.transactions.unshift(tx);

  saveDatabase(db);

  res.json({
    success: true,
    slip: fullSlip,
    user: { ...user, password: '' },
    totalPoolTomans: db.activeWeek.totalPoolTomans,
  });
});

// 6. Deposit Request (User submitting credit increase)
app.post('/api/transactions/deposit', (req: Req, res: Res) => {
  const { userId, amountTomans } = req.body;
  const db = getDatabase();
  const user = db.users.find((u: any) => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
  }

  const tx = {
    id: `tx_${Date.now()}`,
    userId: user.id,
    userNumericId: user.numericId || 10842,
    userName: user.fullName || 'کاربر',
    type: 'deposit',
    amountTomans: Number(amountTomans),
    date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
    status: 'pending',
    trackingCode: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
    cardNumber: user.cardNumber || 'ثبت نشده',
    iban: user.iban || 'ثبت نشده',
  };

  db.transactions.unshift(tx);
  saveDatabase(db);

  res.json({ success: true, tx });
});

// 7. Admin Deposit Approval Workflow («افزایش اعتبار کاربر»)
// Dynamically credits user balance and sends formal notification
app.post('/api/transactions/approve-deposit', (req: Req, res: Res) => {
  const { txId, approvedAmount } = req.body;
  const db = getDatabase();
  const tx = db.transactions.find((t: any) => t.id === txId);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'تراکنش یافت نشد.' });
  }

  const finalAmount = Number(approvedAmount) > 0 ? Number(approvedAmount) : tx.amountTomans;
  tx.status = 'approved';
  tx.amountTomans = finalAmount;

  // Charge / Credit user account balance
  const user = db.users.find((u: any) => u.id === tx.userId);
  if (user) {
    user.balanceTomans = (Number(user.balanceTomans) || 0) + finalAmount;
    user.depositCount = (user.depositCount || 0) + 1;
    user.depositTotalTomans = (user.depositTotalTomans || 0) + finalAmount;
  }

  // Official formal notification generated for the user's Inbox
  const dateStr = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const notif = {
    id: `notif_${Date.now()}`,
    userId: tx.userId,
    title: 'تأیید افزایش اعتبار',
    message: `درخواست اعتبار حساب انجام شد به مبلغ ${finalAmount.toLocaleString('fa-IR')} تومان`,
    date: dateStr,
    time: dateStr,
    read: false,
    type: 'financial',
  };

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift(notif);

  saveDatabase(db);

  res.json({
    success: true,
    tx,
    user: user ? { ...user, password: '' } : null,
    message: `اعتبار کاربر به مبلغ ${finalAmount.toLocaleString('fa-IR')} تومان با موفقیت افزایش یافت.`,
  });
});

// 8. Admin Deposit Rejection
app.post('/api/transactions/reject-deposit', (req: Req, res: Res) => {
  const { txId } = req.body;
  const db = getDatabase();
  const tx = db.transactions.find((t: any) => t.id === txId);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'تراکنش یافت نشد.' });
  }

  tx.status = 'rejected';
  saveDatabase(db);

  res.json({ success: true, tx });
});

// 9. Withdrawal Request
app.post('/api/transactions/withdraw', (req: Req, res: Res) => {
  const { userId, amountTomans, iban } = req.body;
  const db = getDatabase();
  const user = db.users.find((u: any) => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'کاربر یافت نشد.' });
  }

  const amt = Number(amountTomans);
  if (user.balanceTomans < amt) {
    return res.status(400).json({ success: false, message: 'موجودی کمتر از مبلغ درخواستی است.' });
  }

  user.balanceTomans -= amt;
  const tx = {
    id: `tx_${Date.now()}`,
    userId: user.id,
    userNumericId: user.numericId || 10842,
    userName: user.fullName || 'کاربر',
    type: 'withdraw',
    amountTomans: amt,
    date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
    status: 'pending',
    iban,
    trackingCode: `WTH-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  db.transactions.unshift(tx);
  saveDatabase(db);

  res.json({ success: true, tx, user: { ...user, password: '' } });
});

// 10. Live Stream Spectator Chat (24-Hour Auto-delete & Persistence)
app.get('/api/chat/live', (req: Req, res: Res) => {
  const db = getDatabase();
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  if (Array.isArray(db.liveChatMessages)) {
    const prevCount = db.liveChatMessages.length;
    db.liveChatMessages = db.liveChatMessages.filter((m: any) => {
      const msgTime = m.timestamp || (m.created_at ? new Date(m.created_at).getTime() : now);
      return msgTime >= twentyFourHoursAgo;
    });
    if (db.liveChatMessages.length !== prevCount) {
      saveDatabase(db);
    }
  }

  res.json({ success: true, messages: db.liveChatMessages || [] });
});

const userChatCooldowns = new Map<string, number>();

app.post('/api/chat/live', (req: Req, res: Res) => {
  const { user, text } = req.body;
  const db = getDatabase();

  if (db.adminSettings && db.adminSettings.isLiveChatEnabled === false) {
    return res.status(403).json({ success: false, message: 'ارسال پیام در گفتگوی زنده در حال حاضر توسط مدیریت غیرفعال است.' });
  }

  const userKey = (user || 'guest').trim().toLowerCase();
  const now = Date.now();
  const lastPost = userChatCooldowns.get(userKey) || 0;
  const elapsed = now - lastPost;
  if (elapsed < 15000) {
    const waitSec = Math.ceil((15000 - elapsed) / 1000);
    return res.status(429).json({
      success: false,
      message: `شما هر ۱۵ ثانیه یک پیام می‌توانید ارسال کنید. لطفاً ${waitSec} ثانیه دیگر امتحان کنید.`,
      remainingSeconds: waitSec,
    });
  }
  userChatCooldowns.set(userKey, now);
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'پیام خالی ارسال نمی‌شود.' });
  }


  if (!db.liveChatMessages) db.liveChatMessages = [];


  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const timeStr = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  const newMsg = {
    id: now,
    user: (user || 'کاربر سایکو').trim(),
    text: text.trim(),
    time: timeStr,
    timestamp: now,
    created_at: new Date().toISOString(),
  };

  db.liveChatMessages.push(newMsg);

  // Auto-delete messages older than 24 hours
  db.liveChatMessages = db.liveChatMessages.filter((m: any) => {
    const msgTime = m.timestamp || (m.created_at ? new Date(m.created_at).getTime() : now);
    return msgTime >= twentyFourHoursAgo;
  });

  if (db.liveChatMessages.length > 200) {
    db.liveChatMessages = db.liveChatMessages.slice(-200);
  }
  saveDatabase(db);

  res.json({ success: true, message: newMsg });
});

// 11. Support Chat & 10-Day Policy
app.post('/api/support/message', (req: Req, res: Res) => {
  const { userId, userName, text, sender } = req.body;
  const db = getDatabase();

  const nowTimestamp = Date.now();
  const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  let ticket = db.supportTickets.find((t: any) => t.userId === userId && t.status !== 'closed');
  if (!ticket) {
    ticket = {
      id: `tkt_${Date.now()}`,
      userId,
      userName: userName || 'کاربر',
      subject: `گفتگو با کاربر: ${userName}`,
      summary: text.trim(),
      status: sender === 'support' ? 'answered' : 'new',
      createdAt: 'هم‌اکنون',
      createdAtTimestamp: nowTimestamp,
      messages: [],
    };
    db.supportTickets.unshift(ticket);
  }

  ticket.summary = text.trim();
  ticket.status = sender === 'support' ? 'answered' : 'new';
  ticket.messages.push({
    id: `msg_${nowTimestamp}_${Math.random().toString(36).substring(2, 6)}`,
    sender: sender || 'user',
    text: text.trim(),
    time: timeFa,
    timestamp: nowTimestamp,
  });

  saveDatabase(db);
  res.json({ success: true, ticket });
});

app.post('/api/support/reply', (req: Req, res: Res) => {
  const { ticketId, replyText } = req.body;
  const db = getDatabase();
  const ticket = db.supportTickets.find((t: any) => t.id === ticketId);

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'تیکت یافت نشد.' });
  }

  const nowTimestamp = Date.now();
  const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  ticket.messages.push({
    id: `msg_${nowTimestamp}`,
    sender: 'support',
    text: replyText.trim(),
    time: timeFa,
    timestamp: nowTimestamp,
  });
  ticket.status = 'answered';
  ticket.summary = replyText.trim();

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif_reply_${nowTimestamp}`,
    userId: ticket.userId,
    title: 'پاسخ جدید از پشتیبانی',
    message: replyText.trim(),
    time: timeFa,
    read: false,
    type: 'system',
    timestamp: nowTimestamp,
  });

  saveDatabase(db);
  res.json({ success: true, ticket });
});


// 11.5. Live Poll / Survey System (Requirement 2)
app.get('/api/poll', (req: Req, res: Res) => {
  const db = getDatabase();
  res.json({
    success: true,
    pollVotes: db.pollVotes || {},
    userPollVotes: db.userPollVotes || {},
  });
});

app.post('/api/poll/vote', (req: Req, res: Res) => {
  const { userId, userName, horseId, courseNumber, horseName } = req.body;
  if (!userId || !horseId) {
    return res.status(400).json({ success: false, message: 'شناسه کاربر یا اسب نامعتبر است.' });
  }

  const db = getDatabase();
  if (!db.pollVotes) db.pollVotes = {};
  if (!db.userPollVotes) db.userPollVotes = {};

  // Single-vote rule: each user is strictly allowed to vote only once
  if (db.userPollVotes[userId]) {
    return res.status(400).json({
      success: false,
      message: 'شما قبلاً رأی خود را ثبت کرده‌اید و بر اساس قوانین، امکان تغییر یا ثبت مجدد وجود ندارد.',
      userVote: db.userPollVotes[userId],
    });
  }

  const nowTimestamp = Date.now();
  const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  db.pollVotes[horseId] = (db.pollVotes[horseId] || 0) + 1;
  const userVote = {
    userId,
    userName: userName || 'کاربر',
    horseId,
    courseNumber: Number(courseNumber) || 1,
    horseName: horseName || '',
    votedAt: timeFa,
    timestamp: nowTimestamp,
  };
  db.userPollVotes[userId] = userVote;

  saveDatabase(db);
  res.json({ success: true, pollVotes: db.pollVotes, userVote });
});

// 12. Admin Controls: Lock/Unlock Individual Courses
app.post('/api/admin/course-lock', (req: Req, res: Res) => {
  const { courseNumber, isLocked } = req.body;
  const db = getDatabase();
  const course = db.activeWeek.courses.find((c: any) => c.number === Number(courseNumber));

  if (!course) {
    return res.status(404).json({ success: false, message: 'کورس مورد نظر یافت نشد.' });
  }

  course.isLocked = Boolean(isLocked);
  saveDatabase(db);

  res.json({ success: true, course, activeWeek: db.activeWeek });
});

// 13. Admin Controls: Master Six-Pore Switch
app.post('/api/admin/shishpar-toggle', (req: Req, res: Res) => {
  const { isShishParEnabled } = req.body;
  const db = getDatabase();

  db.activeWeek.isShishParEnabled = Boolean(isShishParEnabled);
  saveDatabase(db);

  res.json({ success: true, isShishParEnabled: db.activeWeek.isShishParEnabled, activeWeek: db.activeWeek });
});

// 13.5. Admin Controls: Six-Pareh Countdown Timer & Auto-Lock (Requirement 1)
app.post('/api/admin/countdown', (req: Req, res: Res) => {
  const { countdownEndTimestamp } = req.body;
  const db = getDatabase();

  if (countdownEndTimestamp !== undefined) {
    db.activeWeek.countdownEndTimestamp = Number(countdownEndTimestamp);
    saveDatabase(db);
  }

  res.json({
    success: true,
    countdownEndTimestamp: db.activeWeek.countdownEndTimestamp,
    activeWeek: db.activeWeek,
  });
});

// 14. Admin Controls: "حذف همه" (Delete All)
// Resets total pool to 0, clears active horses, preserves historical slips
app.post('/api/admin/clear-all', (req: Req, res: Res) => {
  const db = getDatabase();

  // Snapshot past slips permanently so their results remain immutable
  db.predictions.forEach((slip: any) => {
    if (!slip.snapshotCourses) {
      slip.snapshotCourses = JSON.parse(JSON.stringify(db.activeWeek.courses));
    }
    if (slip.status === 'won' || slip.status === 'lost') {
      slip.isResultFinalized = true;
    }
  });

  // Clear all horses and RESET total prize pool to 0!
  db.activeWeek.courses.forEach((c: any) => {
    c.horses = [];
    c.winningHorseNumber = undefined;
    c.isLocked = false;
  });
  db.activeWeek.totalPoolTomans = 0;

  saveDatabase(db);

  res.json({
    success: true,
    activeWeek: db.activeWeek,
    message: 'تمامی اسب‌ها حذف شدند و صندوق کل روی ۰ ریست گردید.',
  });
});

// 15. Admin Winner Declaration & Automated 14%/86% Settlement
app.post('/api/admin/set-winner', (req: Req, res: Res) => {
  const { courseNumber, winningHorseNumber } = req.body;
  const db = getDatabase();
  const course = db.activeWeek.courses.find((c: any) => c.number === Number(courseNumber));

  if (course) {
    course.winningHorseNumber = winningHorseNumber;
  }

  // Evaluate each pending slip
  const courses = db.activeWeek.courses;
  const allResolved = courses.slice(0, 6).every((c: any) => c.winningHorseNumber !== undefined && c.winningHorseNumber !== null);

  db.predictions.forEach((slip: any) => {
    if (slip.isResultFinalized) return;
    const evalCourses = slip.snapshotCourses || courses;
    let failed = false;
    let complete = true;
    for (const c of evalCourses) {
      if (slip.selections[c.number] === undefined) continue;
      const liveC = courses.find((lc: any) => lc.number === c.number);
      const winner = liveC?.winningHorseNumber ?? c.winningHorseNumber;
      if (winner === undefined || winner === null) {
        complete = false;
        continue;
      }
      const picks = slip.selections[c.number] || [];
      const repl = slip.replacementSelections?.[c.number] || [];
      const scratched = (c.horses || []).filter((h: any) => h.isScratched).map((h: any) => h.number);
      const priScratched = picks.some((n: any) => scratched.includes(n));
      const passed = priScratched ? repl.includes(winner) : picks.includes(winner);
      if (!passed) {
        failed = true;
      }
    }
    if (failed) {
      slip.status = 'lost';
    } else if (complete) {
      slip.status = 'won';
    } else {
      slip.status = 'pending';
    }
  });

  // Automated Pool Distribution: 14% platform profit, 86% winner pool
  if (allResolved) {
    const netPool = Number(db.activeWeek.totalPoolTomans) || 0;
    const winningSlips = db.predictions.filter((s: any) => s.status === 'won' && !s.isResultFinalized);
    const losingSlips = db.predictions.filter((s: any) => s.status === 'lost' && !s.isResultFinalized);
    let refundsTotal = 0;
    if (winningSlips.length > 0) {
      // 20% of each losing slip's paid amount goes back to its owner
      losingSlips.forEach((slip: any) => {
        const refund = loserRefund(Number(slip.totalCostTomans) || 0);
        refundsTotal += refund;
        slip.isResultFinalized = true;
        const u = db.users.find((x: any) => x.id === slip.userId);
        if (u) u.balanceTomans = (Number(u.balanceTomans) || 0) + refund;
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: `notif_refund_${Date.now()}_${slip.id}`,
          userId: slip.userId,
          title: 'عودت ۲۰٪ برگه',
          message: `۲۰٪ مبلغ برگه شما (${refund.toLocaleString('fa-IR')} تومان) به کیف پول شما بازگشت.`,
          time: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
          read: false,
          type: 'financial',
        });
      });
    }
    const winnerPool = Math.max(0, netPool - refundsTotal);
    if (winningSlips.length > 0) {
      const payoutPerSlip = Math.max(1000, Math.round(winnerPool / winningSlips.length));
      winningSlips.forEach((slip: any) => {
        slip.payoutTomans = payoutPerSlip;
        slip.isResultFinalized = true;
        const winnerUser = db.users.find((u: any) => u.id === slip.userId);
        if (winnerUser) {
          winnerUser.balanceTomans = (Number(winnerUser.balanceTomans) || 0) + payoutPerSlip;
        }
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: `notif_win_${Date.now()}_${slip.id}`,
          userId: slip.userId,
          title: 'برنده شدید!',
          message: `برنده شدید! مبلغ ${payoutPerSlip.toLocaleString('fa-IR')} تومان به حساب شما واریز شد.`,
          time: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
          read: false,
          type: 'financial',
        });
      });
    }
  }

  saveDatabase(db);
  res.json({ success: true, activeWeek: db.activeWeek, predictions: db.predictions });
});

app.post('/api/admin/settle', (req: Req, res: Res) => {
  const { prizeAmount } = req.body;
  const db = getDatabase();

  const finalPrize = Number(prizeAmount) > 0 ? Number(prizeAmount) : (db.adminSettings.customWinningPrize || 23000000);
  db.adminSettings.isSettlementCompleted = true;
  db.adminSettings.customWinningPrize = finalPrize;

  db.predictions.forEach((slip: any) => {
    if (slip.status === 'won') {
      slip.isResultFinalized = true;
      slip.payoutTomans = finalPrize;
    } else if (slip.status === 'lost') {
      slip.isResultFinalized = true;
    }
  });

  saveDatabase(db);
  res.json({ success: true, message: 'تسویه نهایی کلیه برگه‌های برنده با موفقیت انجام شد.' });
});

// 16. Admin Settings Update (PIN, stream URL, withdrawal toggle, etc.)
app.post('/api/admin/settings', (req: Req, res: Res) => {
  const { settings } = req.body;
  const db = getDatabase();

  Object.assign(db.adminSettings, settings);
  saveDatabase(db);

  res.json({ success: true, adminSettings: db.adminSettings });
});

// 17. Ticket Cancellation with Instant Refund
app.post('/api/predictions/cancel', (req: Req, res: Res) => {
  const { slipId, userId, refundAmount } = req.body;
  const db = getDatabase();
  const slipIndex = db.predictions.findIndex((s: any) => s.id === slipId);
  if (slipIndex !== -1) {
    db.predictions.splice(slipIndex, 1);
  }
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    user.balanceTomans = (Number(user.balanceTomans) || 0) + Number(refundAmount);
  }
  db.activeWeek.totalPoolTomans = Math.max(0, (Number(db.activeWeek.totalPoolTomans) || 0) - netPoolShare(Number(refundAmount)));
  saveDatabase(db);
  res.json({ success: true, totalPoolTomans: db.activeWeek.totalPoolTomans, user });
});

// 18. Countdown Timer Management
app.post('/api/admin/countdown-days', (req: Req, res: Res) => {
  const { remainingDays } = req.body;
  const db = getDatabase();
  const days = Math.max(0, Number(remainingDays) || 0);
  db.activeWeek.countdownEndTimestamp = Date.now() + days * 24 * 60 * 60 * 1000;
  saveDatabase(db);
  res.json({ success: true, activeWeek: db.activeWeek });
});

// 19. Ticket Base Price Switch (1,000 / 2,000 Tomans)
app.post('/api/admin/unit-price', (req: Req, res: Res) => {
  const { unitPrice } = req.body;
  const db = getDatabase();
  const price = Number(unitPrice) === 1000 ? 1000 : 2000;
  db.activeWeek.unitPriceTomans = price;
  saveDatabase(db);
  res.json({ success: true, unitPriceTomans: price, activeWeek: db.activeWeek });
});

// 20. Admin Direct Message to User
app.post('/api/admin/direct-message', (req: Req, res: Res) => {
  const { userId, userName, message, trackingCode } = req.body;
  const db = getDatabase();
  const dateStr = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const fullText = trackingCode ? `در خصوص تراکنش ${trackingCode}: ${message}` : `در خصوص تراکنش: ${message}`;
  
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: `notif_msg_${Date.now()}`,
    userId,
    title: 'پیام مدیریت',
    message: `${fullText} (تاریخ: ${dateStr})`,
    time: dateStr,
    read: false,
    type: 'system',
  });

  saveDatabase(db);
  res.json({ success: true, message: 'پیام با موفقیت به صندوق کاربر ارسال شد.' });
});


export const hasRoute = (method: string, path: string) => Boolean(routes[method + ' ' + path]);

export async function handleApi(method: string, path: string, body: any, loadDb: (fallback: () => any) => Promise<any>, persist: (db: any) => Promise<void>) {
  const h = routes[method + ' ' + path];
  if (!h) return { status: 404, body: { success: false, message: 'Not found' } };
  __db = await loadDb(() => ({ ...JSON.parse(JSON.stringify(seed)), activeWeek: seed.activeWeek || INITIAL_WEEK }));
  if (!__db.users) __db.users = INITIAL_USERS;
  __dirty = false;
  let status = 200; let out: any = null;
  const res: Res = { status(c) { status = c; return res; }, json(b) { out = b; } };
  h({ body: body || {} }, res);
  if (__dirty) await persist(__db);
  return { status, body: out };
}
