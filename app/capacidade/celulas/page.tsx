'use client';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { Btn, Card, Inp, Num, Sel, Status, Titulo, corUtil, h1, pct } from '@/components/ui';
import { Grid, Col } from '@/components/Grid';
import { Quadro } from '@/components/graficos';
import { FAMILIAS, Linha } from '@/lib/capacidade';

const COLS: Col<Linha>[] = [
  { key: 'modelo', label: 'Modelo', so: true }, { key: 'peca', label: 'Peça', so: true }, { key: 'processo', label: 'Processo', so: true },
  { key: 'tp', label: 'Tempo padrão (min)', tipo: 'num', aviso: (v) => (!(v > 0) ? 'Sem tempo' : null) }, { key: 'tr', label: 'Tempo real (min)', tipo: 'num' },
  { key: 'oper', label: 'Operadores', tipo: 'num' }, { key: 'setup', label: 'Setup (min/lote)', tipo: 'num' }, { key: 'lote', label: 'Lote', tipo: 'num' }, { key: 'dem', label: 'Demanda (plano)', so: true },
];

export default function Celulas() {
  const { a, efetivo: e, r, set, aviso } = useStore();
  const [sel, setSel] = useState(0), [novo, setNovo] = useState(''), [nf, setNf] = useState('HE/PC');
  const cel = a.est.celulas[sel];
  const m = cel && r.celulas.find((x) => x.nome === cel.nome);
  const rows = cel ? e.linhas.map((row, id) => ({ id, row })).filter((x) => x.row.celula === cel.nome) : [];
  const graf = r.celulas.map((c) => ({ nome: c.nome, Capacidade: +c.efetiva.toFixed(1), Carga: +c.carga.toFixed(1) }));
  const add = () => { const n = novo.trim(); if (!n || a.est.celulas.some((c) => c.nome === n)) return aviso('Informe um nome novo'); set((x) => { x.est.celulas.push({ nome: n, familia: nf, func: x.est.cenarios.map(() => [0, 0, 0] as [number, number, number]) }); }, { campo: 'Nova célula', de: '', para: n }); setNovo(''); setSel(a.est.celulas.length); };
  return (
    <>
      <Titulo t="Capacidade por célula" sub="Selecione a célula, altere funcionários, eficiência ou tempos e veja o impacto imediatamente." />
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Sel value={sel} onChange={(x) => setSel(+x.target.value)}>{a.est.celulas.map((c, i) => <option key={c.nome} value={i}>{c.nome}</option>)}{!a.est.celulas.length && <option>— nenhuma célula —</option>}</Sel>
          <span className="mx-2 text-slate-300">|</span>
          <Inp placeholder="Nova célula (ex.: TW BOOM HE)" value={novo} onChange={(x) => setNovo(x.target.value)} onKeyDown={(x) => x.key === 'Enter' && add()} />
          <Sel value={nf} onChange={(x) => setNf(x.target.value)}>{FAMILIAS.map((f) => <option key={f}>{f}</option>)}</Sel><Btn v="primary" onClick={add}>Adicionar</Btn>
          {cel && <Btn v="danger" className="ml-auto" onClick={() => confirm(`Excluir a célula ${cel.nome}? As linhas vinculadas ficam sem célula.`) && (set((x) => { x.est.celulas.splice(sel, 1); x.est.linhas.forEach((l) => { if (l.celula === cel.nome) l.celula = ''; }); }, { campo: 'Célula excluída', de: cel.nome, para: '' }), setSel(0))}>Excluir</Btn>}
        </div>
        {!a.est.celulas.length && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Nenhuma célula cadastrada: o arquivo do Excel recebido não traz células da Caldeiraria com tempos e funcionários. Adicione as células, informe os funcionários por turno e vincule as linhas em <b>Tempos padrão</b> (coluna Célula).</p>}
      </Card>
      {cel && m && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {[['Funcionários', String(m.func)], ['Capacidade (h)', h1(m.efetiva)], ['Carga (h)', h1(m.carga)], ['Utilização', pct(m.util)], ['Saldo (h)', h1(m.saldo)], ['Func. adicionais', h1(m.funcAdic)]].map(([t, v]) => <div key={t} className="rounded-2xl border border-slate-200/80 bg-white p-3"><div className="text-xs text-slate-500">{t}</div><div className="text-xl font-semibold" style={t === 'Utilização' ? { color: corUtil(m.util, e.amarelo, e.vermelho) } : undefined}>{v}</div></div>)}
          </div>
          <Card>
            <Titulo t={`Funcionários por turno — ${cel.nome}`} sub="a capacidade muda na hora" />
            <div className="overflow-x-auto"><table className="text-sm"><thead><tr className="text-xs text-slate-500"><th className="pr-4 text-left">Cenário</th>{e.turnos.map((t) => <th key={t.nome} className="px-2">Turno {t.nome}</th>)}<th className="px-2 text-left">Status</th></tr></thead><tbody>
              {a.est.cenarios.map((c, k) => (
                <tr key={k} className="border-t"><td className="py-1 pr-4 font-medium">{c.nome}</td>{[0, 1, 2].map((t) => <td key={t} className="px-2"><Num v={cel.func[k]?.[t] ?? 0} max={99} w="w-16" on={(v) => set((x) => { const f = x.est.celulas[sel].func; f[k] ??= [0, 0, 0]; f[k][t] = v; }, { campo: `${cel.nome} — ${c.nome} turno ${e.turnos[t].nome}`, de: String(cel.func[k]?.[t] ?? 0), para: String(v) })} /></td>)}<td className="px-2">{k === a.sel && <Status s={m.status} />}</td></tr>
              ))}</tbody></table></div>
          </Card>
          <Card><Titulo t={`Modelos e processos da célula ${cel.nome}`} sub={`${rows.length} linhas`} />
            <Grid cols={COLS} rows={rows} onSalvar={(ms) => { set((x) => ms.forEach((q) => { (x.est.linhas[q.id] as any)[q.key] = q.para; }), ms.map((q) => ({ campo: `${cel.nome}: ${e.linhas[q.id].peca} — ${q.key}`, de: String(q.de), para: String(q.para) }))); aviso('Salvo — capacidade recalculada'); }} /></Card>
        </>
      )}
      {graf.length > 0 && <Quadro id="C1" origem="Novo (Capacidade por célula)" titulo="Carga × capacidade por célula (h)" alto={280}><ResponsiveContainer><BarChart data={graf}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nome" /><YAxis /><Tooltip /><Legend verticalAlign="top" /><Bar dataKey="Capacidade" fill="#A5A5A5" /><Bar dataKey="Carga" fill="#4472C4" /></BarChart></ResponsiveContainer></Quadro>}
    </>
  );
}
