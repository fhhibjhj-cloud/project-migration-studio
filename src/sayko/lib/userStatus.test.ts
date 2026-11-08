import { describe, it, expect } from 'vitest';
import { isBanActive, banEndFor, isOnlineNow, DAY_MS } from './userStatus';
describe('user status', () => {
  const now = 1_000_000_000_000;
  it('20-day ban ends exactly 20 days later', () => expect(banEndFor(20, now)).toBe(now + 20 * DAY_MS));
  it('ban is active during the 20 days', () => expect(isBanActive({ isBanned: true, bannedUntil: banEndFor(20, now) }, now + 19 * DAY_MS)).toBe(true));
  it('ban lifts after the 20 days', () => expect(isBanActive({ isBanned: true, bannedUntil: banEndFor(20, now) }, now + 21 * DAY_MS)).toBe(false));
  it('user seen 2 minutes ago is offline', () => expect(isOnlineNow(now - 120_000, now)).toBe(false));
  it('user seen 10 seconds ago is online', () => expect(isOnlineNow(now - 10_000, now)).toBe(true));
});
