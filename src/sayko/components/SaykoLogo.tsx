// @ts-nocheck
import React from 'react';

interface SaykoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}

/**
 * Official SAYKO Horse Logo Component
 * Sized to height: 50px - 56px with width: auto.
 * Strictly uses native PNG assets with 100% transparent backgrounds:
 * - Dark Mode: /assets/aistudio/sayko_logo_white.png (pure crisp white)
 * - Light Mode: /assets/aistudio/sayko_logo_dark.png (crisp solid #0F172A)
 * ZERO CSS invert filters, ZERO blend modes, ZERO background boxes.
 */
export const SaykoLogo: React.FC<SaykoLogoProps> = ({ 
  className = '', 
  size = 'md',
  alt = 'SAYKO - سایکو آنالیز'
}) => {
  const sizeClasses = {
    sm: 'h-8 max-h-[34px]',
    md: 'h-[50px] sm:h-[52px] max-h-[56px]',
    lg: 'h-16 max-h-[64px]',
  }[size];

  return (
    <div 
      className={`relative flex items-center justify-center select-none bg-transparent border-none shadow-none ${className}`}
      style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
    >
      {/* Dark Mode: Crisp pure white horse silhouette & text (Rendered directly, NO CSS filters) */}
      <img
        src="/assets/aistudio/sayko_logo_white.png"
        alt={alt}
        className={`${sizeClasses} w-auto object-contain hidden dark:block transition-opacity duration-200`}
        style={{ filter: 'none', mixBlendMode: 'normal', background: 'transparent' }}
        loading="eager"
        decoding="async"
      />
      {/* Light Mode: Crisp solid #0F172A dark silhouette & text (Rendered directly, NO CSS filters) */}
      <img
        src="/assets/aistudio/sayko_logo_dark.png"
        alt={alt}
        className={`${sizeClasses} w-auto object-contain block dark:hidden transition-opacity duration-200`}
        style={{ filter: 'none', mixBlendMode: 'normal', background: 'transparent' }}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};
