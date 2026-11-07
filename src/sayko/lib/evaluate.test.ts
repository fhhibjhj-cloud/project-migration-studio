import { describe, it, expect } from 'vitest';
import { evaluateSlipCourses } from './evaluate';

const horses = [1, 2, 3, 4].map(n => ({ number: n, isScratched: false }));

describe('receipt evaluation', () => {
  it('activates substitute when admin removes the primary horse', () => {
    const slip = { weekId: 'w1', selections: { 1: [2] }, replacementSelections: { 1: [4] }, snapshotCourses: [{ number: 1, horses }] };
    const live = [{ number: 1, horses: horses.filter(h => h.number !== 2), winningHorseNumber: 4 }];
    expect(evaluateSlipCourses(slip, live, 'w1').rows[0]?.status).toBe('passed');
  });

  it('activates substitute when primary horse is scratched', () => {
    const slip = { weekId: 'w1', selections: { 1: [2] }, replacementSelections: { 1: [4] }, snapshotCourses: [{ number: 1, horses }] };
    const live = [{ number: 1, horses: horses.map(h => (h.number === 2 ? { ...h, isScratched: true } : h)), winningHorseNumber: 4 }];
    expect(evaluateSlipCourses(slip, live, 'w1').rows[0]?.status).toBe('passed');
  });

  it('ignores substitute when primary still runs', () => {
    const slip = { weekId: 'w1', selections: { 1: [2] }, replacementSelections: { 1: [4] }, snapshotCourses: [{ number: 1, horses }] };
    const live = [{ number: 1, horses, winningHorseNumber: 4 }];
    expect(evaluateSlipCourses(slip, live, 'w1').rows[0]?.status).toBe('failed');
  });

  it('new race day results never change an old receipt', () => {
    const slip = { weekId: 'old', selections: { 1: [2] }, snapshotCourses: [{ number: 1, horses, winningHorseNumber: 2 }] };
    const live = [{ number: 1, horses, winningHorseNumber: 3 }];
    expect(evaluateSlipCourses(slip, live, 'new').rows[0]?.status).toBe('passed');
  });

  it('locked results stay fixed', () => {
    const locked = [{ courseNum: 1, winner: 2, status: 'passed' as const, effectivePicks: [2], substituteActivated: false }];
    const slip = { weekId: 'w1', selections: { 1: [2] }, lockedResults: locked };
    const live = [{ number: 1, horses, winningHorseNumber: 3 }];
    expect(evaluateSlipCourses(slip, live, 'w1').rows[0]?.status).toBe('passed');
  });
});
