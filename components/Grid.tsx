'use client';
import { ReactNode, useRef, useState } from 'react';
import { Btn, cx } from '@/components/ui';

export type Col<T> = { key: keyof T & string; label: string; tipo?: 'texto' | 'num'; opcoes?: string[]; w?: string; aviso?: (v: any, row: T) => string | null; so?: boolean; custom?: (id: number, row: T) => ReactNode };
export type Mud<T> = { id: number; key: keyof T & string; de: any; para: any };

/** Tabela editável estilo Excel: edição direta, colar blocos do Excel (TSV), setas/Enter, rascunho com Salvar/Cancelar. */
export function Grid<T extends Record<string, any>>({ cols, rows, onSalvar, max = 150, acoes, rowClass }: { cols: Col<T>[]; rows: { id: number; row: T }[]; onSalvar: (m: Mud<T>[]) => void; max?: number; acoes?: (id: number, row: T) => ReactNode; rowClass?: (row: T) => string }) {
  const [rasc, setRasc] = useState<Record<string, any>>({});
  const [mostrar, setMostrar] = useState(max);
  const ref = useRef<HTMLTableElement>(null);
  const vis = rows.slice(0, mostrar);
  const k = (id: number, key: string) => `${id}|${key}`;
  const val = (id: number, key: keyof T & string, row: T) => (k(id, key) in rasc ? rasc[k(id, key)] : row[key]);
  const n = Object.keys(rasc).length;
  const conv = (c: Col<T>, s: string) => (c.tipo === 'num' ? Math.max(0, parseFloat(s.replace(',', '.')) || 0) : s.trim());

  const mudar = (id: number, c: Col<T>, orig: any, s: string) => setRasc((o) => { const v = conv(c, s); const nk = { ...o }; if (v === orig) delete nk[k(id, c.key)]; else nk[k(id, c.key)] = v; return nk; });
  const foco = (r: number, c: number) => { const el = ref.current?.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`); el?.focus(); (el as HTMLInputElement)?.select?.(); };
  const colar = (e: React.ClipboardEvent, r0: number, c0: number) => {
    const t = e.clipboardData.getData('text'); if (!t.includes('\t') && !t.includes('\n')) return;
    e.preventDefault();
    const m = t.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
    setRasc((o) => { const nk = { ...o };
      m.forEach((lin, i) => lin.forEach((s, j) => { const rr = vis[r0 + i], cc = cols[c0 + j]; if (!rr || !cc || cc.so) return;
        const v = conv(cc, s); if (v === rr.row[cc.key]) delete nk[k(rr.id, cc.key)]; else nk[k(rr.id, cc.key)] = v; }));
      return nk; });
  };
  const salvar = () => { const ms: Mud<T>[] = Object.entries(rasc).map(([kk, para]) => { const [id, key] = kk.split('|'); const r = rows.find((x) => x.id === +id)!; return { id: +id, key: key as any, de: r.row[key as keyof T], para }; }); onSalvar(ms); setRasc({}); };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className={cx('rounded-full px-2 py-0.5 text-xs', n ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500')}>{n ? `${n} alteração(ões) pendente(s)` : 'Sem alterações pendentes'}</span>
        <Btn v="primary" disabled={!n} onClick={salvar}>Salvar</Btn><Btn disabled={!n} onClick={() => setRasc({})}>Cancelar</Btn>
        <span className="ml-auto text-xs text-slate-400">Clique para editar · cole blocos do Excel · ↑↓ Enter navegam</span>
      </div>
      <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200">
        <table ref={ref} className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-500"><tr>{cols.map((c) => <th key={c.key} className="whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left font-medium">{c.label}</th>)}{acoes && <th className="border-b border-slate-200 px-2 py-2" />}</tr></thead>
          <tbody>
            {vis.map(({ id, row }, r) => (
              <tr key={id} className={cx('border-b border-slate-100 hover:bg-blue-50/40', rowClass?.(row))}>
                {cols.map((c, ci) => {
                  const v = val(id, c.key, row); const dirty = k(id, c.key) in rasc; const av = c.aviso?.(v, row);
                  const base = cx('w-full bg-transparent px-2 py-1 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-300', c.tipo === 'num' && 'text-right', dirty && 'bg-amber-100', av && 'text-red-700');
                  return (
                    <td key={c.key} className={cx('p-0', c.w)} title={av ?? undefined}>
                      {c.custom ? c.custom(id, row) : c.so ? <span className="block px-2 py-1 text-slate-500">{String(v ?? '')}</span>
                        : c.opcoes ? <select data-r={r} data-c={ci} className={base} value={String(v ?? '')} onChange={(e) => mudar(id, c, row[c.key], e.target.value)}><option value=""></option>{c.opcoes.map((o) => <option key={o}>{o}</option>)}</select>
                        : <input data-r={r} data-c={ci} className={base} value={String(v ?? '')} inputMode={c.tipo === 'num' ? 'decimal' : 'text'}
                            onChange={(e) => mudar(id, c, row[c.key], e.target.value)} onPaste={(e) => colar(e, r, ci)}
                            onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); foco(r + 1, ci); } else if (e.key === 'ArrowUp') { e.preventDefault(); foco(r - 1, ci); } else if (e.key === 'Escape') setRasc((o) => { const nk = { ...o }; delete nk[k(id, c.key)]; return nk; }); }} />}
                    </td>
                  );
                })}
                {acoes && <td className="whitespace-nowrap px-2">{acoes(id, row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > mostrar && <div className="mt-2 text-center"><Btn onClick={() => setMostrar((m) => m + max)}>Mostrar mais ({rows.length - mostrar} restantes)</Btn></div>}
      {!rows.length && <p className="p-6 text-center text-sm text-slate-400">Nenhuma linha com esses filtros.</p>}
    </div>
  );
}
