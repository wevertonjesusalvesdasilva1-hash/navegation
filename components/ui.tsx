'use client';
import { ReactNode, useEffect } from 'react';

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ');
export const h1 = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
export const pct = (n: number) => (n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%';

export function Btn({ v = 'ghost', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { v?: 'ghost' | 'primary' | 'danger' | 'soft' }) {
  const m = { ghost: 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700', primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm', danger: 'bg-red-600 text-white hover:bg-red-700', soft: 'bg-blue-50 text-blue-700 hover:bg-blue-100' }[v];
  return <button {...p} className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40', m, className)} />;
}
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <section className={cx('rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm', className)}>{children}</section>;
export const Titulo = ({ t, sub, children }: { t: string; sub?: string; children?: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-base font-semibold text-slate-800">{t}</h2>{sub && <p className="text-xs text-slate-400">{sub}</p>}</div><div className="flex flex-wrap gap-2">{children}</div></div>
);
export const Sel = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx('rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100', className)} />;
export const Inp = ({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx('rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100', className)} />;

/** Campo numérico editável (destacado em amarelo como no Excel). */
export function Num({ v, on, step = 1, min = 0, max, w = 'w-20', ...p }: { v: number; on: (n: number) => void; step?: number; min?: number; max?: number; w?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'step' | 'min' | 'max'>) {
  const bad = (min !== undefined && v < min) || (max !== undefined && v > max);
  return <input {...p} type="number" step={step} min={min} max={max} value={Number.isFinite(v) ? v : 0} onChange={(e) => { let n = parseFloat(e.target.value); if (!Number.isFinite(n)) n = 0; if (min !== undefined) n = Math.max(min, n); if (max !== undefined) n = Math.min(max, n); on(n); }}
    className={cx(w, 'rounded-md border px-1.5 py-1 text-right text-sm text-blue-800 outline-none transition focus:ring-2', bad ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-amber-200 bg-amber-50/70 focus:border-blue-400 focus:bg-white focus:ring-blue-100')} />;
}

const COR: Record<string, string> = { OK: 'bg-green-100 text-green-800', 'ATENÇÃO': 'bg-yellow-100 text-yellow-800', INSUFICIENTE: 'bg-red-100 text-red-800', 'SEM CARGA': 'bg-slate-100 text-slate-500' };
const DOT: Record<string, string> = { OK: 'bg-green-500', 'ATENÇÃO': 'bg-yellow-400', INSUFICIENTE: 'bg-red-500 pulse-dot', 'SEM CARGA': 'bg-slate-300' };
export const Status = ({ s }: { s: string }) => <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs', COR[s])}><i className={cx('h-1.5 w-1.5 rounded-full', DOT[s])} />{s}</span>;
export const corUtil = (u: number, am: number, vm: number) => (u >= vm ? '#ef4444' : u >= am ? '#facc15' : '#22c55e');

export function Modal({ aberto, fechar, titulo, children }: { aberto: boolean; fechar: () => void; titulo: string; children: ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && fechar(); if (aberto) addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, [aberto, fechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-up" onClick={fechar}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{titulo}</h3><Btn onClick={fechar}>Fechar</Btn></div>{children}
      </div>
    </div>
  );
}
