// Real presence & temporary ban rules for user accounts
export const ONLINE_WINDOW_MS = 60_000; // seen in the last minute = online
export const DAY_MS = 24 * 3600 * 1000;

export const isOnlineNow = (lastSeenAt: number | undefined, now = Date.now()) =>
  !!lastSeenAt && now - lastSeenAt < ONLINE_WINDOW_MS;

/** Ban is active when flagged and (no end date, or end date is still in the future). */
export const isBanActive = (u: { isBanned?: boolean; bannedUntil?: number } | null | undefined, now = Date.now()) =>
  !!u?.isBanned && (!u.bannedUntil || now < u.bannedUntil);

export const banEndFor = (days: number, now = Date.now()) => now + Math.max(1, Math.round(days)) * DAY_MS;
