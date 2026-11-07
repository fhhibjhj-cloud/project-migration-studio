/**
 * Pure receipt evaluation engine (shared by store + Inbox).
 * - Receipts are bound to the event (weekId) they were created in. Live results
 *   only apply while the receipt's event is still the active one and it isn't locked.
 * - If a primary horse was scratched or removed by admin, the user's substitute
 *   horses are activated and evaluated as part of the primary selections.
 */
export interface EvalHorse { number: number; isScratched?: boolean }
export interface EvalCourse { number: number; horses?: EvalHorse[]; winningHorseNumber?: number | null }
export interface LockedCourseResult {
  courseNum: number;
  winner: number | null;
  status: 'passed' | 'failed' | 'pending';
  effectivePicks: number[];
  substituteActivated: boolean;
}
export interface EvalSlip {
  weekId: string;
  selections: { [n: number]: number[] };
  replacementSelections?: { [n: number]: number[] };
  snapshotCourses?: EvalCourse[];
  isResultFinalized?: boolean;
  lockedResults?: LockedCourseResult[];
}

export function isBoundToLive(slip: EvalSlip, liveWeekId: string): boolean {
  return !slip.isResultFinalized && !slip.lockedResults && slip.weekId === liveWeekId;
}

export function evaluateSlipCourses(slip: EvalSlip, liveCourses: EvalCourse[], liveWeekId: string) {
  if (slip.lockedResults && slip.lockedResults.length > 0) {
    const rows = slip.lockedResults;
    return {
      rows,
      hasFailed: rows.some(r => r.status === 'failed'),
      complete: rows.every(r => r.status !== 'pending'),
    };
  }
  const bound = isBoundToLive(slip, liveWeekId);
  const courseNums = Object.keys(slip.selections || {})
    .map(Number)
    .filter(n => (slip.selections[n] || []).length > 0)
    .sort((a, b) => a - b);

  const rows: LockedCourseResult[] = courseNums.map(cNum => {
    const snap = slip.snapshotCourses?.find(c => c.number === cNum);
    const live = bound ? liveCourses.find(c => c.number === cNum) : undefined;
    const rawWinner = bound ? live?.winningHorseNumber : snap?.winningHorseNumber;
    const winner = rawWinner === undefined || rawWinner === null ? null : Number(rawWinner);

    const primaries = slip.selections[cNum] || [];
    const reserves = slip.replacementSelections?.[cNum] || [];
    const isOut = (n: number) => {
      if (snap?.horses?.some(h => h.number === n && h.isScratched)) return true;
      if (live) {
        const lh = (live.horses || []).find(h => h.number === n);
        if (lh?.isScratched) return true;
        if (!lh && (live.horses || []).length > 0) return true; // removed by admin
      }
      return false;
    };
    const outPrimaries = primaries.filter(isOut);
    const substituteActivated = outPrimaries.length > 0;
    const effectivePicks = [
      ...primaries.filter(n => !isOut(n)),
      ...(substituteActivated ? reserves.filter(n => !isOut(n)) : []),
    ];
    let status: LockedCourseResult['status'] = 'pending';
    if (winner !== null) status = effectivePicks.includes(winner) ? 'passed' : 'failed';
    return { courseNum: cNum, winner, status, effectivePicks, substituteActivated };
  });

  return {
    rows,
    hasFailed: rows.some(r => r.status === 'failed'),
    complete: rows.length > 0 && rows.every(r => r.status !== 'pending'),
  };
}
