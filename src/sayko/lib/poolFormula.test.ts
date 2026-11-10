import { describe, it, expect } from 'vitest';
import { netPoolShare, loserRefund } from './poolFormula';
describe('pool formula', () => {
  it('500k slip adds 430k to pool after 14% commission', () => expect(netPoolShare(500000)).toBe(430000));
  it('losing 500k slip refunds 75k (15%)', () => expect(loserRefund(500000)).toBe(75000));
  it('losing 99k slip gets no refund', () => expect(loserRefund(99000)).toBe(0));
  it('losing 100k slip refunds 15k', () => expect(loserRefund(100000)).toBe(15000));
});
