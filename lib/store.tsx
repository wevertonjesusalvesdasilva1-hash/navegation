'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { calcular } from '@/lib/capacidade';
import { App, Hist, efetivoDe, inicial, normalizar } from '@/lib/dados';
import { carregarRemoto, salvarRemoto, supa } from '@/lib/supabase';

type Ctx = {
  a: App; efetivo: ReturnType<typeof efetivoDe>; res: ReturnType<typeof calcular>[]; r: ReturnType<typeof calcular>;
  set: (f: (x: App) => void, h?: Omit<Hist, 't' | 'quem'>[] | Omit<Hist, 't' | 'quem'>) => void;
  undo: () => void; canUndo: boolean; reverter: (i: number) => void; restaurar: () => void; toast: string; aviso: (m: string) => void;
  papel: string; remoto: boolean; setPapel: (p: string) => void;
};
const C = createContext<Ctx>(null as never);
export const useStore = () => useContext(C);
const KEY = 'cap_app_v3';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [a, setA] = useState<App>(inicial);
  const [toast, setToast] = useState('');
  const aRef = useRef<App>(a);
  const [papel, setPapel] = useState('local');
  const pilha = useRef<App[]>([]);
  const [nUndo, setNUndo] = useState(0);
  const tm = useRef<ReturnType<typeof setTimeout>>();
  const aviso = useCallback((m: string) => { setToast(m); clearTimeout(tm.current); tm.current = setTimeout(() => setToast(''), 2200); }, []);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setA(normalizar(JSON.parse(s))); } catch {}
    carregarRemoto().then(({ app, papel: p }) => { setPapel(p); if (app) setA(normalizar(app)); }).catch(() => {});
  }, []);
  useEffect(() => { aRef.current = a; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} }, [a]);

  const set: Ctx['set'] = useCallback((f, h) => {
    setA((o) => {
      pilha.current = [...pilha.current.slice(-49), o]; setNUndo(pilha.current.length);
      const n = structuredClone(o); f(n);
      const hs = h ? (Array.isArray(h) ? h : [h]) : [];
      n.hist = [...hs.map((x) => ({ t: Date.now(), quem: 'local', ...x })), ...n.hist].slice(0, 500);
      if (hs.length) salvarRemoto(n, hs[0]).catch(() => {});
      return n;
    });
  }, []);
  const undo = useCallback(() => { const p = pilha.current.pop(); setNUndo(pilha.current.length); if (p) { setA(p); aviso('Alteração desfeita'); } }, [aviso]);
  const reverter = useCallback((i: number) => {
    const h = aRef.current.hist[i]; if (!h?.ref) return;
    const { i: li, k } = h.ref, num = ['tp', 'tr', 'setup', 'lote', 'oper', 'dem'].includes(k), v = num ? Number(h.de) || 0 : h.de;
    set((n) => { const l = n.est.linhas[li]; if (l) (l as any)[k] = v; }, { campo: `Valor restaurado: ${h.campo}`, de: h.para, para: h.de, ref: h.ref });
    aviso('Valor anterior restaurado');
  }, [aviso]); // eslint-disable-line
  const restaurar = useCallback(() => { pilha.current = []; setNUndo(0); setA(inicial()); aviso('Valores originais do Excel restaurados'); }, [aviso]);

  const efetivo = useMemo(() => efetivoDe(a), [a]);
  const res = useMemo(() => efetivo.cenarios.map((_, i) => calcular(efetivo, i)), [efetivo]);
  return <C.Provider value={{ a, efetivo, res, r: res[a.sel], set, undo, canUndo: nUndo > 0, reverter, restaurar, toast, aviso, papel, setPapel, remoto: !!supa() }}>{children}</C.Provider>;
}
