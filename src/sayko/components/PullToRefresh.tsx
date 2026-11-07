// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { store } from '../lib/store';
import { haptics } from '../lib/haptics';

const THRESHOLD = 70;

/** Native-like pull-to-refresh for the whole page: refreshes races, wallet and all live data. */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !refreshing && !document.querySelector('[role="dialog"], .fixed.inset-0')) startY.current = e.touches[0].clientY;
      else startY.current = null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const d = e.touches[0].clientY - startY.current;
      if (d <= 0 || window.scrollY > 0) { pullRef.current = 0; setPull(0); return; }
      const v = Math.min(120, d * 0.5);
      if (v >= THRESHOLD && pullRef.current < THRESHOLD) haptics.tap();
      pullRef.current = v; setPull(v);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true); setPull(56);
        try { await Promise.all([store.syncWithCentralServer(), new Promise(r => setTimeout(r, 600))]); } catch {}
        setRefreshing(false);
      }
      pullRef.current = 0; setPull(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [refreshing]);

  if (pull <= 0 && !refreshing) return null;
  return (
    <div className="ptr-indicator" style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: Math.min(1, pull / THRESHOLD) }}>
      <RefreshCw className={`w-5 h-5 text-emerald-500 ${refreshing ? 'animate-spin' : ''}`} style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
    </div>
  );
}
