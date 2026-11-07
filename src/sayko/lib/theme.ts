// @ts-nocheck
/**
 * Theme Manager for SAYKO RACING INTELLIGENCE
 * Implements strict dynamic class/data-attribute switching and 'theme' localStorage key.
 */

export type Theme = 'dark' | 'light';

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    // Check localStorage.getItem('theme') as required
    const saved = localStorage.getItem('theme') || localStorage.getItem('sayko_theme_preference');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Fallback to standard system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  const root = document.documentElement;
  const body = document.body;

  // 1. Update .dark / .light class
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);

  if (body) {
    body.classList.toggle('dark', isDark);
    body.classList.toggle('light', !isDark);
  }

  // 2. Set data-theme attribute on root and body
  root.setAttribute('data-theme', theme);
  if (body) {
    body.setAttribute('data-theme', theme);
  }
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem('theme', theme);
    localStorage.setItem('sayko_theme_preference', theme);
  } catch (e) {
    console.warn('Failed to persist theme preference', e);
  }
}
