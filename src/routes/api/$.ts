import { createFileRoute } from '@tanstack/react-router';

async function run(request: Request, method: string) {
  const { handleApi } = await import('@/sayko/server/api-core');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  let body: unknown = {};
  if (method === 'POST') {
    try { body = await request.json(); } catch { body = {}; }
  }
  const result = await handleApi(
    method,
    path,
    body,
    async (fallback) => {
      const { data, error } = await supabaseAdmin.from('central_state').select('data').eq('id', 'main').maybeSingle();
      if (error) throw error;
      if (data?.data) return data.data;
      const initial = fallback();
      await supabaseAdmin.from('central_state').upsert({ id: 'main', data: initial });
      return initial;
    },
    async (db) => {
      const { error } = await supabaseAdmin
        .from('central_state')
        .upsert({ id: 'main', data: db, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  );
  return Response.json(result.body, { status: result.status });
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: ({ request }) => run(request, 'GET'),
      POST: ({ request }) => run(request, 'POST'),
    },
  },
});
