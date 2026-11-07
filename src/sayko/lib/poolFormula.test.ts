import { describe, it, expect } from 'vitest';
import { netPoolShare, loserRefund } from './poolFormula';
describe('pool formula', () => {
  it('500k slip adds 430k to pool after 14% commission', () => expect(netPoolShare(500000)).toBe(430000));
  it('losing 500k slip refunds 100k (20%)', () => expect(loserRefund(500000)).toBe(100000));
});
