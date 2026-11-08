// Financial transparency formula for the total pool (صندوق کل)
export const SITE_COMMISSION_RATE = 0.14; // always site profit, taken at submission
export const LOSER_REFUND_RATE = 0.2; // refunded to each losing slip's owner
export const WINNERS_RATE = 0.66; // shared among winners

/** Amount added to the total pool when a slip is submitted (paid minus 14%). */
export const netPoolShare = (paid: number) => Math.round(paid * (1 - SITE_COMMISSION_RATE));
/** Amount refunded to the owner of a losing slip. */
export const REFUND_MIN_EXCLUSIVE = 99000; // only slips paid above 99,000 get the refund
export const loserRefund = (paid: number) => (paid > REFUND_MIN_EXCLUSIVE ? Math.round(paid * LOSER_REFUND_RATE) : 0);
