'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StoreProvider, useStore } from '@/lib/store';
import { Btn, Sel } from '@/components/ui';
import { FAMILIAS } from '@/lib/capacidade';
import { AuthBar } from '@/components/AuthBar';

const NAV: [string, string, string][] = [
  ['/capacidade', 'Dashboard', 'M4 20V10m6 10V4m6 16v-7m4 7H2'],
  ['/capacidade/simulador', 'Simulador', 'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M14 4v4m-6 2v4m8 2v4'],
  ['/capacidade/usinagem', 'Usinagem', 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7z'],
  ['/capacidade/celulas', 'Células', 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z'],
  ['/capacidade/tempos', 'Tempos padrão', 'M10 2h4M12 8v5l3 2M20 13a8 8 0 11-16 0 8 8 0 0116 0z'],
  ['/capacidade/turnos', 'Turnos e pessoas', 'M21 13A9 9 0 1111 3a7 7 0 0010 10z'],
  ['/capacidade/graficos', 'Gráficos do Excel', 'M3 17l6-6 4 4 8-8M3 21h18'],
  ['/capacidade/dados', 'Importar / Exportar', 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14'],
];
const Ic = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0"><path d={d} /></svg>;

function Casca({ children }: { children: React.ReactNode }) {
  const p = usePathname(); const { a, set, undo, canUndo, toast, restaurar } = useStore();
  return (
    <div className="min-h-screen bg-slate-50 text-sm text-slate-700 md:flex">
      <aside className="hidden w-56 shrink-0 flex-col bg-slate-900 p-3 text-slate-300 md:flex">
        <div className="mb-4 px-2 pt-2"><div className="text-xs uppercase tracking-widest text-blue-300">Komatsu</div><div className="text-lg font-semibold text-white">Capacidade</div></div>
        <nav className="flex flex-1 flex-col gap-0.5">{NAV.map(([h, n, d]) => <Link key={h} href={h} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${p === h ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Ic d={d} />{n}</Link>)}</nav>
        <AuthBar />
      </aside>
      <div className="min-w-0 flex-1 pb-20 md:pb-6">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
          <span className="font-medium text-slate-500 md:hidden">Capacidade</span>
          <Sel value={a.sel} onChange={(e) => set((n) => { n.sel = +e.target.value; })} title="Cenário">{a.est.cenarios.map((c, i) => <option key={i} value={i}>{c.nome}</option>)}</Sel>
          <Sel value={a.mes} onChange={(e) => set((n) => { n.mes = +e.target.value; })} title="Mês do plano">{a.meses.map((m, i) => <option key={i} value={i}>{m}</option>)}</Sel>
          <Sel value={a.fam} onChange={(e) => set((n) => { n.fam = e.target.value; })} title="Família"><option>TODAS</option>{FAMILIAS.map((f) => <option key={f}>{f}</option>)}</Sel>
          <span className="ml-auto flex gap-2"><Btn onClick={undo} disabled={!canUndo}>Desfazer</Btn><Btn onClick={() => confirm('Restaurar todos os valores originais do Excel? As alterações atuais serão perdidas.') && restaurar()}>Restaurar Excel</Btn></span>
        </header>
        <main key={p} className="animate-fade-up mx-auto max-w-7xl space-y-4 p-4">{children}</main>
      </div>
      <nav className="fixed inset-x-2 bottom-2 z-40 flex justify-around rounded-2xl bg-slate-900/95 p-1 shadow-2xl backdrop-blur md:hidden">
        {NAV.slice(0, 6).map(([h, n, d]) => <Link key={h} href={h} className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] ${p === h ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Ic d={d} />{n.split(' ')[0]}</Link>)}
      </nav>
      <div className={`pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-white shadow-xl transition-all duration-300 md:bottom-6 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>✓ {toast}</div>
    </div>
  );
}
export default function Layout({ children }: { children: React.ReactNode }) { return <StoreProvider><Casca>{children}</Casca></StoreProvider>; }
