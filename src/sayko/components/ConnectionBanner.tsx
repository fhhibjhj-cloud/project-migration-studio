import { useEffect, useState } from 'react';

/** Red bar at the top when the device goes offline; brief green bar when it comes back. */
export default function ConnectionBanner() {
  const [online, setOnline] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    let t: ReturnType<typeof setTimeout> | undefined;
    const goOff = () => { setOnline(false); setShowBack(false); };
    const goOn = () => {
      setOnline(true);
      setShowBack(true);
      clearTimeout(t);
      t = setTimeout(() => setShowBack(false), 2500);
    };
    window.addEventListener('offline', goOff);
    window.addEventListener('online', goOn);
    return () => {
      window.removeEventListener('offline', goOff);
      window.removeEventListener('online', goOn);
      clearTimeout(t);
    };
  }, []);

  if (online && !showBack) return null;
  return (
    <div
      role="status"
      dir="rtl"
      className={`fixed top-0 inset-x-0 z-[9999] px-4 py-2 text-center text-xs font-bold text-white shadow-lg ${online ? 'bg-emerald-600' : 'bg-red-600'}`}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      {online ? 'اتصال اینترنت برقرار شد' : 'اتصال به اینترنت قطع شد، پس از اتصال دوباره تلاش کنید'}
    </div>
  );
}
