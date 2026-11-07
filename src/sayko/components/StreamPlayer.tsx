// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { resolveStreamUrl } from '../lib/streamUtils';
import { Volume2, VolumeX, Maximize2, AlertCircle, RefreshCw, Radio } from 'lucide-react';

interface StreamPlayerProps {
  streamUrl: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  showControlsOverlay?: boolean;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  streamUrl,
  title = 'پخش زنده مسابقات سوارکاری',
  className = '',
  autoPlay = true,
  showControlsOverlay = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const resolution = useMemo(() => {
    return resolveStreamUrl(streamUrl);
  }, [streamUrl]);

  const handleRetry = () => {
    setHasError(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center ${className}`}>
      {hasError ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 animate-pulse" />
          <p className="text-xs sm:text-sm font-bold">
            خطا در بارگذاری استریم ویدیویی
          </p>
          <p className="text-[11px] text-slate-400 max-w-xs font-mono">
            {resolution.embedUrl}
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تلاش مجدد</span>
          </button>
        </div>
      ) : resolution.isDirectVideo ? (
        <video
          key={reloadKey}
          src={resolution.embedUrl}
          controls
          autoPlay={autoPlay}
          playsInline
          onError={() => setHasError(true)}
          className="w-full h-full object-contain bg-black"
        >
          مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
        </video>
      ) : (
        <iframe
          key={`${resolution.embedUrl}-${reloadKey}`}
          src={resolution.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
          className="w-full h-full border-0 absolute inset-0 bg-black"
        />
      )}
    </div>
  );
};
