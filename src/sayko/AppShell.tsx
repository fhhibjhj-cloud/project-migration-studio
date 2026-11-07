// @ts-nocheck
import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';

const SaykoApp = lazy(() => import('./SaykoApp'));

export function AppShell() {
  return (
    <ClientOnly fallback={<div className="min-h-screen" />}>
      <Suspense fallback={<div className="min-h-screen" />}>
        <SaykoApp />
      </Suspense>
    </ClientOnly>
  );
}

export const appHead = (title: string) => ({
  meta: [
    { title },
    { name: 'description', content: 'سامانه هوشمند پیش‌بینی، آنالیز و پخش زنده مسابقات اسب‌دوانی شش پره (SAYKO)' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: 'سامانه هوشمند پیش‌بینی، آنالیز و پخش زنده مسابقات اسب‌دوانی شش پره (SAYKO)' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
});
