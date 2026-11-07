// @ts-nocheck
import React from 'react';

export interface JockeyConfig {
  bg: string;
  text: string;
  cap: string;
  border?: string;
}

export const JOCKEY_CONFIGS: Record<number, JockeyConfig> = {
  1: { bg: '#10B981', text: '#FFFFFF', cap: '#059669' },
  2: { bg: '#FFFFFF', text: '#0F172A', cap: '#E2E8F0', border: '#94A3B8' },
  3: { bg: '#EF4444', text: '#FFFFFF', cap: '#DC2626' },
  4: { bg: '#FACC15', text: '#0F172A', cap: '#EAB308' },
  5: { bg: '#F472B6', text: '#0F172A', cap: '#EC4899' },
  6: { bg: '#2563EB', text: '#FFFFFF', cap: '#1D4ED8' },
  7: { bg: '#854D0E', text: '#FFFFFF', cap: '#713F12' },
  8: { bg: '#65A30D', text: '#FFFFFF', cap: '#4D7C0F' },
  9: { bg: '#06B6D4', text: '#FFFFFF', cap: '#0891B2' },
  10: { bg: '#A855F7', text: '#FFFFFF', cap: '#9333EA' },
  11: { bg: '#F97316', text: '#FFFFFF', cap: '#EA580C' },
  12: { bg: '#1E293B', text: '#FFFFFF', cap: '#0F172A', border: '#334155' },
  13: { bg: '#EC4899', text: '#FFFFFF', cap: '#DB2777' },
  14: { bg: '#6366F1', text: '#FFFFFF', cap: '#4F46E5' },
};

interface JockeySilkIconProps {
  number: number;
  className?: string;
}

/**
 * JockeySilkIcon Component
 * Renders an authentic jockey jersey & helmet icon with jockey number (1-14)
 * matching official horse racing program silks.
 */
export const JockeySilkIcon: React.FC<JockeySilkIconProps> = ({ number, className = 'w-7 h-9' }) => {
  const conf = JOCKEY_CONFIGS[number] || { bg: '#3B82F6', text: '#FFFFFF', cap: '#1D4ED8' };
  const hasBorder = Boolean(conf.border);

  return (
    <svg 
      viewBox="0 0 36 44" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} shrink-0 select-none`}
      aria-label={`سیلک سوارکار شماره ${number}`}
    >
      {/* Jockey Cap / Helmet */}
      <ellipse 
        cx="18" 
        cy="8.5" 
        rx="7" 
        ry="6" 
        fill={conf.cap} 
        stroke={hasBorder ? conf.border : '#00000033'} 
        strokeWidth="0.8" 
      />
      {/* Helmet Peak / Visor */}
      <path d="M12 11 Q18 13.5 24 11 L25 12 Q18 15 11 12 Z" fill="#0F172A" />
      {/* Cyan Racing Goggles */}
      <rect x="13.5" y="6.5" width="9" height="2.5" rx="1" fill="#38BDF8" opacity="0.9" />

      {/* Jockey Jersey Shirt with Sleeves */}
      <path
        d="M9 15 L27 15 L32 22 L28 25 L26 21 L26 38.5 L10 38.5 L10 21 L8 25 L4 22 Z"
        fill={conf.bg}
        stroke={hasBorder ? conf.border : '#00000022'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* White V-Collar Accent */}
      {number !== 2 && (
        <path d="M15 15 L18 18.5 L21 15 Z" fill="#FFFFFF" opacity="0.8" />
      )}

      {/* Centered Jockey Row Number */}
      <text
        x="18"
        y="32.5"
        textAnchor="middle"
        fontSize={number >= 10 ? '11' : '12'}
        fontWeight="900"
        fontFamily="sans-serif"
        fill={conf.text}
        letterSpacing="-0.5px"
      >
        {number}
      </text>
    </svg>
  );
};
