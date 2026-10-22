'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Btn, Card, Inp, Modal, Sel, Titulo } from '@/components/ui';
import { Col, Grid } from '@/components/Grid';
import { FAMILIAS, Linha } from '@/lib/capacidade';

const COLS = (celulas: string[], maquinas: string[]): Col<Linha>[] => [
  { key: 'familia', label: 'Família', opcoes: FAMILIAS, w: 'w-24' }, { key: 'modelo', label: 'Modelo', w: 'w-28' }, { key: 'peca', label: 'Peça' }, { key: 'processo', label: 'Processo', w: 'w-28' },
  { key: 'celula', label: 'Célula', opcoes: celulas, w: 'w-28' }, { key: 'maquina', label: 'Máquina', opcoes: maquinas, w: 'w-28' },
  { key: 'tp', label: 'Tempo padrão (min)', tipo: 'num', w: 'w-32', aviso: (v, r) => (!(v > 0) ? 'Sem tempo cadastrado' : v > 600 ? 'Tempo acima de 10 h — confira' : null) },
  { key: 'tr', label: 'Tempo real (min)', tipo: 'num', w: 'w-32', aviso: (v, r) => (v > 0 && r.tp > 0 && (v < r.tp * 0.5 || v > r.tp * 2) ? 'Real muito diferente do padrão' : null) },
  { key: 'setup', label: 'Setup (min/lote)', tipo: 'num', w: 'w-28' }, { key: 'lote', label: 'Lote (pç)', tipo: 'num', w: 'w-20' },
];

export default function Tempos() {
  const { a, set, aviso } = useStore();
  const [f, setF] = useState({ fam: '', modelo: '', q: '', maq: '', sem: false });
  const [hist, setHist] = useState(false);
  const [fator, setFator] = useState(100);
  const L = a.est.linhas;
  const modelos = useMemo(() => Array.from(new Set(L.map((l) => l.modelo))).sort(), [L]);
  const rows = useMemo(() => L.map((row, id) => ({ id, row })).filter(({ row: l }) =>
    (!f.fam || l.familia === f.fam) && (!f.modelo || l.modelo === f.modelo) && (!f.maq || l.maquina === f.maq) && (!f.sem || !(l.tp > 0)) &&
    (!f.q || `${l.peca} ${l.processo} ${l.modelo}`.toLowerCase().includes(f.q.toLowerCase()))), [L, f]);
  const sem = L.filter((l) => !(l.tp > 0)).length;
  const ids = rows.map((r) => r.id);

  return (
    <>
      <Titulo t="Tempos padrão" sub={`${L.length} linhas · ${sem} sem tempo cadastrado · ${rows.length} exibidas`}>
        <Btn onClick={() => setHist(true)}>Histórico</Btn>
        <Btn onClick={() => { set((n) => { n.est.linhas.unshift({ familia: '', modelo: '', peca: '', processo: 'USINAGEM', celula: '', maquina: '', oper: 1, tp: 0, tr: 0, setup: 0, lote: 0, dem: 0 }); }, { campo: 'Nova linha', de: '', para: '' }); aviso('Linha adicionada no topo'); }}>+ Linha</Btn>
      </Titulo>
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Inp placeholder="Pesquisar peça, processo, modelo…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="min-w-[14rem] flex-1" />
          <Sel value={f.fam} onChange={(e) => setF({ ...f, fam: e.target.value })}><option value="">Família</option>{FAMILIAS.map((x) => <option key={x}>{x}</option>)}</Sel>
          <Sel value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })}><option value="">Modelo</option>{modelos.map((x) => <option key={x}>{x}</option>)}</Sel>
          <Sel value={f.maq} onChange={(e) => setF({ ...f, maq: e.target.value })}><option value="">Máquina</option>{a.est.maquinas.filter(Boolean).map((x) => <option key={x}>{x}</option>)}</Sel>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.sem} onChange={(e) => setF({ ...f, sem: e.target.checked })} />só sem tempo</label>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">Alterar todos exibidos: tempo padrão ×<input type="number" value={fator} onChange={(e) => setFator(+e.target.value)} className="w-16 rounded border border-amber-200 bg-amber-50 px-1 py-1 text-right" />%
            <Btn v="soft" disabled={fator === 100 || !rows.length} onClick={() => { set((n) => ids.forEach((i) => { n.est.linhas[i].tp = +(n.est.linhas[i].tp * fator / 100).toFixed(3); }), { campo: `Tempo padrão × ${fator}% em ${ids.length} linhas`, de: '', para: '' }); aviso(`${ids.length} tempos alterados`); setFator(100); }}>Aplicar</Btn></span>
        </div>
        <Grid cols={COLS(a.est.celulas.map((c) => c.nome), a.est.maquinas.filter(Boolean))} rows={rows}
          onSalvar={(ms) => { set((n) => ms.forEach((m) => { (n.est.linhas[m.id] as any)[m.key] = m.para; }), ms.map((m) => ({ campo: `${L[m.id].modelo} / ${L[m.id].peca} — ${m.key}`, de: String(m.de ?? ''), para: String(m.para ?? '') }))); aviso(`${ms.length} alteração(ões) salva(s) — capacidade recalculada`); }} />
      </Card>
      <Modal aberto={hist} fechar={() => setHist(false)} titulo="Histórico de alterações">
        <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th>Quando</th><th>Campo</th><th>De</th><th>Para</th></tr></thead><tbody>
          {a.hist.map((h, i) => <tr key={i} className="border-t"><td className="whitespace-nowrap">{new Date(h.t).toLocaleString('pt-BR')}</td><td>{h.campo}</td><td>{h.de}</td><td>{h.para}</td></tr>)}
        </tbody></table>{!a.hist.length && <p className="py-6 text-center text-slate-400">Nenhuma alteração registrada.</p>}
      </Modal>
    </>
  );
}
