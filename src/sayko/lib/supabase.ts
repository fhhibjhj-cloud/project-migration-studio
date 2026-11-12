// @ts-nocheck
/**
 * SAYKO RACING INTELLIGENCE - Supabase Database Client & Persistent Service
 * Handles real-time subscriptions, chat messages, user balances, predictions, and transactions.
 * Uses NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with Vite fallbacks.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PredictionSlip, Transaction, UserProfile } from './store';

// Works on any host (Lovable, Netlify, ...): set VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in the host's env settings.
// Connected directly to the original SAYKO database (public anon key).
const SB_URL: string = 'https://gingcgjhbmkjhgzwisst.supabase.co';
// ANON key first: on Netlify it is the user's own key, while the repo's .env carries a different PUBLISHABLE key.
const SB_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbmdjZ2poYm1ramhnendpc3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MTgxNjksImV4cCI6MjEwODE5NDE2OX0.YhCdurmo61QPaji9ODGl4JKogyode9v5B0LQ2g9LNUE';

export const isSupabaseConfigured = Boolean(SB_URL && SB_KEY);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SB_URL, SB_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sayko-db' },
    })
  : null;

/** Users whose balance was just changed locally; remote sync won't overwrite them for a few seconds. */
export const recentBalanceWrites: Record<string, number> = {};

/** Tiny synchronous SHA-256 (hex) for password hashing so login works across devices. */
export function sha256(ascii: string): string {
  const str = unescape(encodeURIComponent(ascii));
  const K: number[] = [];
  const H: number[] = [];
  let n = 2;
  for (let c = 0; c < 64; n++) {
    let p = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
    if (p) {
      if (c < 8) H[c] = (Math.pow(n, 1 / 2) * 0x100000000) | 0;
      K[c++] = (Math.pow(n, 1 / 3) * 0x100000000) | 0;
    }
  }
  const words: number[] = [];
  const bitLen = str.length * 8;
  for (let i = 0; i < str.length; i++) words[i >> 2] |= str.charCodeAt(i) << ((3 - (i % 4)) * 8);
  words[str.length >> 2] |= 0x80 << ((3 - (str.length % 4)) * 8);
  const total = (((str.length + 8) >> 6) + 1) * 16;
  for (let i = 0; i < total; i++) words[i] = words[i] | 0;
  words[total - 1] = bitLen;
  const rr = (v: number, s: number) => (v >>> s) | (v << (32 - s));
  for (let j = 0; j < total; j += 16) {
    const w = words.slice(j, j + 16);
    const old = H.slice(0);
    for (let i = 0; i < 64; i++) {
      if (i >= 16) {
        const w15 = w[i - 15], w2 = w[i - 2];
        w[i] = (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0;
      }
      const [a, b, c, d, e, f, g, h] = H;
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      H.unshift((t1 + t2) | 0);
      H.pop();
      H[4] = (H[4] + t1) | 0;
      void d;
    }
    for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0;
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/** Register / update a full user row in the central database. */
export async function upsertUserToDb(u: UserProfile): Promise<boolean> {
  if (!supabase) return false;
  const { password, ...rest } = u as any;
  const row: Record<string, any> = {
    id: u.id,
    username: u.username,
    full_name: u.fullName || u.username,
    role: u.role || 'user',
    balance_tomans: Number(u.balanceTomans) || 0,
    phone: u.phone || null,
    iban: u.iban || null,
    card_number: u.cardNumber || null,
    is_banned: Boolean(u.isBanned),
    is_full_name_locked: Boolean(u.isFullNameLocked),
    numeric_id: u.numericId || null,
    data: { ...rest, isGuest: false, isOnline: undefined },
    updated_at: new Date().toISOString(),
  };
  if (password) row.password_hash = sha256(String(password));
  const { error } = await supabase.from('users').upsert([row]);
  if (error) console.warn('[DB] user upsert failed:', error.message);
  return !error;
}

const FAKE_IDS = ['user_sample', 'user_sara', 'user_reza', 'user_kamran'];
export const isRemovedRow = (r: any) => !r || FAKE_IDS.includes(r.id) || Boolean(r.data && r.data.deleted);

export async function fetchAllUsersRaw(): Promise<any[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('users').select('*');
  return (data || []).filter((r: any) => !isRemovedRow(r));
}

/** Merge fields into the user's JSON data column. */
export async function patchUserDataInDb(userId: string, patch: Record<string, any>, cols: Record<string, any> = {}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.from('users').select('data').eq('id', userId).limit(1);
    const cur = (data && data[0] && data[0].data) || {};
    const { error } = await supabase.from('users').update({ ...cols, data: { ...cur, ...patch }, updated_at: new Date().toISOString() }).eq('id', userId);
    return !error;
  } catch { return false; }
}

/** Permanently remove a user. Rows are deleted where allowed; the account is also tombstoned so it can never return. */
export async function deleteUserFromDb(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    for (const t of ['predictions', 'transactions', 'notifications', 'support_tickets', 'messages']) {
      await supabase.from(t).delete().eq('user_id', userId);
    }
    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('users').update({ is_banned: true, data: { deleted: true, deletedAt: Date.now() }, password_hash: null }).eq('id', userId);
    return true;
  } catch { return false; }
}

export async function upsertNotificationToDb(n: any): Promise<void> {
  if (!supabase || !n?.userId) return;
  await supabase.from('notifications').upsert([{ id: n.id, user_id: n.userId, data: n }]);
}

export async function fetchNotificationsForUser(userId: string): Promise<any[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('notifications').select('data').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(200);
  return (data || []).map((r: any) => r.data);
}

export async function upsertSupportTicketToDb(t: any): Promise<void> {
  if (!supabase || !t) return;
  await supabase.from('support_tickets').upsert([{
    id: t.id, user_id: t.userId, user_name: t.userName, subject: t.subject,
    summary: t.summary, status: t.status, messages: t.messages || [],
    updated_at: new Date().toISOString(),
  }]);
}

export async function deleteSupportTicketsFromDb(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return;
  await supabase.from('support_tickets').delete().in('id', ids);
}

export async function fetchSupportTicketsFromDb(userId?: string): Promise<any[]> {
  if (!supabase) return [];
  let q = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
  if (userId) q = q.eq('user_id', userId);
  const { data } = await q;
  return (data || []).map((t: any) => ({
    id: t.id, userId: t.user_id, userName: t.user_name, subject: t.subject || '',
    summary: t.summary || '', status: t.status || 'new', messages: t.messages || [],
    createdAt: t.created_at ? new Date(t.created_at).toLocaleString('fa-IR') : '',
    createdAtTimestamp: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
  }));
}

export async function updatePredictionInDb(slip: PredictionSlip): Promise<void> {
  if (!supabase) return;
  await supabase.from('predictions').update({
    status: slip.status, payout_tomans: slip.payoutTomans || 0, data: slip,
  }).eq('id', slip.id);
}

/**
 * Message interface for the Supabase 'messages' table
 */
export interface SupabaseChatMessage {
  id?: number | string;
  user_id: string;
  user_name: string;
  sender: 'user' | 'support';
  text: string;
  ticket_id?: string;
  created_at?: string;
}

/**
 * 1. SUPPORT & CHAT SYSTEM
 */
export async function fetchSupportMessagesFromDb(userId?: string): Promise<SupabaseChatMessage[]> {
  if (!supabase) {
    // Return empty array when Supabase is not connected
    return [];
  }

  try {
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase] Failed to fetch messages:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[Supabase] Unexpected error fetching messages:', err);
    return [];
  }
}

export async function insertSupportMessageToDb(msg: {
  userId: string;
  userName: string;
  sender: 'user' | 'support';
  text: string;
  ticketId?: string;
}): Promise<SupabaseChatMessage | null> {
  if (!supabase) return null;

  try {
    const payload = {
      user_id: msg.userId,
      user_name: msg.userName,
      sender: msg.sender,
      text: msg.text,
      ticket_id: msg.ticketId || 'tkt_default',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Error inserting message:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] Unexpected error sending message:', err);
    return null;
  }
}

export function subscribeToSupportMessages(
  userId: string,
  onNewMessage: (msg: SupabaseChatMessage) => void
) {
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            onNewMessage(payload.new as SupabaseChatMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase] Realtime subscription error:', err);
    return () => {};
  }
}

/**
 * 2. USER ACCOUNT & BALANCE MANAGEMENT
 */
export async function syncUserBalanceToDb(userId: string, newBalance: number): Promise<boolean> {
  recentBalanceWrites[userId] = Date.now();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('users')
      .update({ balance_tomans: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.warn('[Supabase] Error updating user balance:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Unexpected error updating balance:', err);
    return false;
  }
}

export async function fetchUserFromDb(userId: string): Promise<Partial<UserProfile> | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      fullName: data.full_name,
      balanceTomans: Number(data.balance_tomans) || 0,
      phone: data.phone,
      iban: data.iban,
      cardNumber: data.card_number,
      role: data.role || 'user',
      isBanned: Boolean(data.is_banned),
    };
  } catch (err) {
    console.warn('[Supabase] Error fetching user profile:', err);
    return null;
  }
}

export async function syncUserProfileToDb(
  userId: string,
  profile: { fullName?: string; iban?: string; cardNumber?: string; isFullNameLocked?: boolean }
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (profile.fullName !== undefined) payload.full_name = profile.fullName;
    if (profile.iban !== undefined) payload.iban = profile.iban;
    if (profile.cardNumber !== undefined) payload.card_number = profile.cardNumber;
    if (profile.isFullNameLocked !== undefined) payload.is_full_name_locked = profile.isFullNameLocked;

    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId);

    if (error) {
      console.warn('[Supabase] Error updating user profile:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Unexpected error updating profile:', err);
    return false;
  }
}

/**
 * 3. PREDICTIONS & BET SLIPS MANAGEMENT
 */
export async function insertPredictionToDb(slip: PredictionSlip): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('predictions').insert([
      {
        id: slip.id,
        user_id: slip.userId,
        user_name: slip.userName,
        week_id: slip.weekId,
        selections: slip.selections,
        replacement_selections: slip.replacementSelections || {},
        combinations_count: slip.combinationsCount,
        total_cost_tomans: slip.totalCostTomans,
        status: slip.status,
        payout_tomans: slip.payoutTomans || 0,
        submitted_at: slip.submittedAt,
        data: slip,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn('[Supabase] Error saving prediction slip:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Unexpected error saving prediction:', err);
    return false;
  }
}

export async function cleanupExpiredPredictionsFromDb(): Promise<void> {
  if (!supabase) return;
  try {
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('predictions').delete().lt('created_at', thirtyDaysAgoIso);
  } catch (err) {
    console.warn('[Supabase] Cleanup tickets notice:', err);
  }
}

export async function fetchPredictionsFromDb(userId?: string): Promise<PredictionSlip[]> {
  if (!supabase) return [];

  try {
    // Automatic Receipt Retention Policy: Exclude tickets older than 30 days
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from('predictions')
      .select('*')
      .gte('created_at', thirtyDaysAgoIso)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      ...(d.data || {}),
      id: d.id,
      userId: d.user_id,
      userName: d.user_name,
      weekId: d.week_id,
      selections: d.selections || {},
      replacementSelections: d.replacement_selections || {},
      combinationsCount: Number(d.combinations_count) || 1,
      totalCostTomans: Number(d.total_cost_tomans) || 0,
      submittedAt: d.submitted_at || new Date(d.created_at).toLocaleString('fa-IR'),
      status: d.status as 'pending' | 'won' | 'lost',
      payoutTomans: Number(d.payout_tomans) || 0,
      createdAtTimestamp: new Date(d.created_at).getTime(),
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching predictions:', err);
    return [];
  }
}

/**
 * 4. FINANCIAL TRANSACTIONS
 */
/**
 * 4. FINANCIAL TRANSACTIONS
 */
export async function insertTransactionToDb(tx: Transaction): Promise<boolean> {
  if (!supabase) return false;

  try {
    const nowIso = new Date().toISOString();
    const dateVal = (tx.date && String(tx.date).trim()) ? String(tx.date).trim() : nowIso;
    const trackingVal = (tx.trackingCode && String(tx.trackingCode).trim())
      ? String(tx.trackingCode).trim()
      : `TRX-${Math.floor(100000 + Math.random() * 900000)}`;
    const userIdVal = String(tx.userId || 'guest_user');
    const userNameVal = String(tx.userName || 'کاربر');
    const typeVal = String(tx.type || 'deposit');
    const amountVal = Math.max(0, Number(tx.amountTomans) || 0);
    const statusVal = tx.status || 'pending';
    const ibanVal = String(tx.iban || '');

    const { error } = await supabase.from('transactions').insert([
      {
        id: tx.id || `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        user_id: userIdVal,
        user_name: userNameVal,
        type: typeVal,
        amount_tomans: amountVal,
        date: dateVal,
        status: statusVal,
        iban: ibanVal,
        card_number: tx.cardNumber || null,
        user_numeric_id: tx.userNumericId || null,
        tracking_code: trackingVal,
        created_at: nowIso,
      },
    ]);

    if (error) {
      console.warn('[Supabase] Error saving transaction:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Unexpected error saving transaction:', err);
    return false;
  }
}

export async function fetchTransactionsFromDb(userId?: string): Promise<Transaction[]> {
  if (!supabase) return [];

  try {
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      userNumericId: Number(t.user_numeric_id) || undefined,
      userName: t.user_name,
      type: t.type,
      amountTomans: Number(t.amount_tomans) || 0,
      approvedAmountTomans: t.approved_amount_tomans ? Number(t.approved_amount_tomans) : undefined,
      date: t.date || (t.created_at ? new Date(t.created_at).toLocaleString('fa-IR') : new Date().toISOString()),
      status: t.status,
      iban: t.iban,
      cardNumber: t.card_number,
      trackingCode: t.tracking_code || `TRX-${t.id}`,
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching transactions:', err);
    return [];
  }
}

export async function updateTransactionStatusInDb(
  txId: string,
  newStatus: 'approved' | 'rejected' | 'pending',
  approvedAmount?: number
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const payload: Record<string, any> = { status: newStatus };
    if (approvedAmount !== undefined) {
      payload.amount_tomans = approvedAmount;
      payload.approved_amount_tomans = approvedAmount;
    }
    const { error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', txId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * 5. PREDICTION DELETION & CANCELLATION
 */
export async function deletePredictionFromDb(slipId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('predictions').delete().eq('id', slipId);
    if (error) {
      console.warn('[Supabase] Error deleting prediction:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Unexpected error deleting prediction:', err);
    return false;
  }
}

/**
 * 6. ADMIN DIRECT MESSAGING TO USER
 */
export async function sendAdminDirectMessageInDb(
  userId: string,
  userName: string,
  messageText: string,
  trackingCode?: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const fullText = trackingCode
      ? `در خصوص تراکنش ${trackingCode}: ${messageText}`
      : `در خصوص تراکنش: ${messageText}`;

    const { error } = await supabase.from('messages').insert([
      {
        user_id: userId,
        user_name: userName,
        sender: 'support',
        text: fullText,
        ticket_id: trackingCode ? `tx_${trackingCode}` : 'direct_admin_notice',
        created_at: new Date().toISOString(),
      },
    ]);

    return !error;
  } catch {
    return false;
  }
}

/**
 * 7. LIVE STREAM CHAT (24-Hour Persistence & Auto-cleanup)
 */
export interface LiveChatMessageItem {
  id: number | string;
  user: string;
  text: string;
  time: string;
  created_at?: string;
}

export async function fetchLiveChatFromDb(): Promise<LiveChatMessageItem[]> {
  if (!supabase) return [];

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('live_chat')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error || !data) return [];
    return data.filter((d: any) => !isRemovedRow(d)).map((d: any) => ({
      id: d.id,
      user: d.user_name || d.user || 'کاربر',
      text: d.text,
      time: d.time || new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(d.created_at || Date.now())),
      created_at: d.created_at,
    }));
  } catch {
    return [];
  }
}

export async function insertLiveChatMessageToDb(msg: { user: string; text: string }): Promise<boolean> {
  if (!supabase) return false;

  try {
    const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const { error } = await supabase.from('live_chat').insert([
      {
        user_name: msg.user,
        text: msg.text,
        time: timeFa,
        created_at: new Date().toISOString(),
      },
    ]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * 8. ADMIN SETTINGS PERSISTENCE & REALTIME SYNCHRONIZATION
 */
export async function fetchAdminSettingsFromDb(): Promise<Record<string, any>> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from('admin_settings').select('*');
    if (error || !data) return {};
    const settingsMap: Record<string, any> = {};
    data.forEach((row: any) => {
      settingsMap[row.key] = row.value;
    });
    return settingsMap;
  } catch (err) {
    console.warn('[Supabase] Error fetching admin settings:', err);
    return {};
  }
}

export async function syncAdminSettingToDb(key: string, value: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('admin_settings').upsert([
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
    ]);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToAdminSettings(
  onUpdate: (key: string, value: any) => void
) {
  if (!supabase) return () => {};
  try {
    const channel = supabase
      .channel('public:admin_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings' },
        (payload) => {
          if (payload.new && (payload.new as any).key) {
            onUpdate((payload.new as any).key, (payload.new as any).value);
          }
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

/**
 * 9. USER LIST MANAGEMENT (Direct Supabase Connection)
 */
export async function fetchUsersFromDb(): Promise<UserProfile[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.filter((d: any) => !isRemovedRow(d)).map((d: any) => ({
      id: d.id,
      numericId: Number(d.id.replace(/\D/g, '').slice(-5)) || 10842,
      fullName: d.full_name,
      username: d.username,
      role: d.role || 'user',
      balanceTomans: Number(d.balance_tomans) || 0,
      phone: d.phone,
      iban: d.iban,
      cardNumber: d.card_number,
      isBanned: Boolean(d.is_banned),
      isFullNameLocked: Boolean(d.is_full_name_locked),
    }));
  } catch {
    return [];
  }
}

export async function updateUserBanStatusInDb(userId: string, isBanned: boolean): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * 10. REALTIME LIVE CHAT SUBSCRIPTION
 */
export function subscribeToLiveChat(
  onNewMessage: (msg: LiveChatMessageItem) => void
) {
  if (!supabase) return () => {};
  try {
    const channel = supabase
      .channel('public:live_chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat' },
        (payload) => {
          if (payload.new) {
            const d = payload.new as any;
            onNewMessage({
              id: d.id,
              user: d.user_name || 'کاربر',
              text: d.text,
              time: d.time || new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
              created_at: d.created_at,
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

/** Data retention: live chat 24h, support 7 days, receipts & transactions 30 days. */
export const RETENTION_MS = { liveChat: 24 * 3600e3, support: 7 * 24 * 3600e3, inbox: 30 * 24 * 3600e3 };
let lastPrune = 0;
export async function pruneExpiredData(): Promise<void> {
  if (!supabase || Date.now() - lastPrune < 10 * 60e3) return;
  lastPrune = Date.now();
  const iso = (ms: number) => new Date(Date.now() - ms).toISOString();
  const jobs: Array<PromiseLike<unknown>> = [
    supabase.from('live_chat').delete().lt('created_at', iso(RETENTION_MS.liveChat)),
    supabase.from('messages').delete().lt('created_at', iso(RETENTION_MS.support)),
    supabase.from('support_tickets').delete().lt('updated_at', iso(RETENTION_MS.support)),
    supabase.from('predictions').delete().lt('created_at', iso(RETENTION_MS.inbox)),
    supabase.from('transactions').delete().lt('created_at', iso(RETENTION_MS.inbox)),
    supabase.from('notifications').delete().lt('created_at', iso(RETENTION_MS.inbox)),
  ];
  await Promise.allSettled(jobs.map(j => Promise.resolve(j)));
}

export async function deleteTransactionFromDb(txId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', txId);
    return !error;
  } catch { return false; }
}
