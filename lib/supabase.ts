import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { App } from '@/lib/dados';

let cli: SupabaseClient | null | undefined;
/** Retorna null quando as variáveis NEXT_PUBLIC_SUPABASE_* não existem (modo local, dados no navegador). */
export function supa(): SupabaseClient | null {
  if (cli !== undefined) return cli;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cli = url && key ? createClient(url, key) : null;
  return cli;
}

export async function carregarRemoto(): Promise<{ app: App | null; papel: string }> {
  const c = supa(); if (!c) return { app: null, papel: 'local' };
  const { data: u } = await c.auth.getUser(); if (!u.user) return { app: null, papel: 'anon' };
  const [{ data: est }, { data: perfil }] = await Promise.all([
    c.from('capacidade_estado').select('estado').eq('id', 'oficial').maybeSingle(),
    c.from('perfis').select('papel').eq('id', u.user.id).maybeSingle(),
  ]);
  return { app: (est?.estado as App) ?? null, papel: perfil?.papel ?? 'leitor' };
}

export async function salvarRemoto(app: App, hist?: { campo: string; de: string; para: string }) {
  const c = supa(); if (!c) return;
  const { data: u } = await c.auth.getUser(); if (!u.user) return;
  await c.from('capacidade_estado').upsert({ id: 'oficial', estado: app, atualizado_por: u.user.id, atualizado_em: new Date().toISOString() });
  if (hist) await c.from('capacidade_historico').insert({ usuario: u.user.id, ...hist });
}
