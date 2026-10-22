'use client';
import { useEffect, useState } from 'react';
import { supa } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Btn, Inp } from '@/components/ui';

export function AuthBar() {
  const { papel, remoto, aviso } = useStore();
  const [email, setEmail] = useState(''), [senha, setSenha] = useState(''), [user, setUser] = useState<string | null>(null);
  useEffect(() => { supa()?.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null)); }, []);
  if (!remoto) return <div className="rounded-xl bg-slate-800 p-2 text-[11px] text-slate-400">Modo local: dados salvos neste navegador. Configure o Supabase (.env) para login e dados compartilhados.</div>;
  if (user) return <div className="space-y-1 rounded-xl bg-slate-800 p-2 text-xs"><div className="truncate text-slate-300">{user}</div><div className="text-slate-500">papel: {papel}</div><Btn className="w-full" onClick={async () => { await supa()!.auth.signOut(); setUser(null); location.reload(); }}>Sair</Btn></div>;
  return (
    <form className="space-y-1.5 rounded-xl bg-slate-800 p-2" onSubmit={async (e) => { e.preventDefault(); const { error } = await supa()!.auth.signInWithPassword({ email, password: senha }); if (error) aviso(error.message); else location.reload(); }}>
      <Inp className="w-full" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} /><Inp className="w-full" type="password" placeholder="senha" value={senha} onChange={(e) => setSenha(e.target.value)} /><Btn v="primary" className="w-full" type="submit">Entrar</Btn>
    </form>
  );
}
