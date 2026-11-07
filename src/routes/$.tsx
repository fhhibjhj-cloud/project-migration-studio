import { createFileRoute } from '@tanstack/react-router';
import { AppShell, appHead } from '@/sayko/AppShell';

// The app handles its own sections (shishpar, account, admin, live, support, messages, poll) by URL.
export const Route = createFileRoute('/$')({
  head: () => appHead('سایکو آنالیز | SAYKO'),
  component: AppShell,
});
