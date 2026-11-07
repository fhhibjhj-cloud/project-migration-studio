import { createFileRoute } from '@tanstack/react-router';
import { AppShell, appHead } from '@/sayko/AppShell';

export const Route = createFileRoute('/')({
  head: () => appHead('سایکو آنالیز (SAYKO - RACING INTELLIGENCE)'),
  component: AppShell,
});
