'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, Num, Status, Titulo, corUtil, h1, pct, Btn } from '@/components/ui';
import { Grid, Col } from '@/components/Grid';
import { ParamCen } from '@/components/ParamCen';
import { GCarga } from '@/components/graficos';
import { Linha } from '@/lib/capacidade';

const COLS: Col<Linha>[] = [
  { key: 'modelo', label: 'Modelo', so: true }, { key: 'peca', label: 'Peça', so: true },
  { key: 'tp', label: 'Tempo usinagem (min/pç)', tipo: 'num', aviso: (v) => (!(v > 0) ? 'Sem tempo cadastrado' : null) },
  { key: 'setup', label: 'Setup (min/lote)', tipo: 'num' }, { key: 'lote', label: 'Lote (pç)', tipo: 'num' }, { key: 'dem', label: 'Peças no mês (plano)', so: true },
];

export default function Usinagem() {
  const { a, efetivo: e, r, set, aviso } = useStore();
  const [sel, setSel] = useState(0);
  const maqs = a.est.maquinas.filter(Boolean);
  const nome = maqs[sel] ?? maqs[0];
  const m = r.maquinas.find((x) => x.nome === nome);
  const i = r.maquinas.findIndex((x) => x.nome === nome);
  const c = a.est.cenarios[a.sel];
  const rows = e.linhas.map((row, id) => ({ id, row })).filter((x) => x.row.maquina === nome);
  const nomeCampo = (k: string) => ({ turnos: 'turnos ativos', heH: 'HE h/dia', heDias: 'dias HE', efic: 'eficiência', disp: 'disponibilidade', fDem: 'fator demanda', fTempo: 'fator tempo', base: 'base de tempo' } as Record<string, string>)[k] ?? k;
  const por = <K extends keyof typeof c>(k: K, v: (typeof c)[K]) => set((n) => { (n.est.cenarios[a.sel] as any)[k] = v; }, { campo: `${c.nome} — ${nomeCampo(k)}`, de: String(c[k]), para: String(v) });
  return (
    <>
      <Titulo t="Capacidade da usinagem" sub="Selecione a máquina, altere tempos, setup, turnos ou dias úteis e veja o impacto na hora." />
      <div className="flex flex-wrap gap-2">
        {r.maquinas.map((x, k) => (
          <button key={x.nome} onClick={() => setSel(k)} className={`rounded-2xl border px-4 py-2 text-left transition active:scale-95 ${x.nome === nome ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
            <div className="font-semibold">{x.nome}</div><div className="flex items-center gap-2 text-xs"><span style={{ color: corUtil(x.util, e.amarelo, e.vermelho) }} className="font-semibold">{pct(x.util)}</span><Status s={x.status} /></div>
          </button>
        ))}
      </div>
      {m && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[['Capacidade (h)', h1(m.efetiva)], ['Carga (h)', h1(m.carga)], ['Utilização', pct(m.util)], ['Saldo (h)', h1(m.saldo)], ['HE necessárias (h)', h1(m.deficit)], ['Sogyodo', pct(m.sogyodo)]].map(([t, v]) => <div key={t} className="rounded-2xl border border-slate-200/80 bg-white p-3"><div className="text-xs text-slate-500">{t}</div><div className="text-xl font-semibold">{v}</div></div>)}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <Titulo t={`Parâmetros — cenário ${c.nome}`} sub="aplicam-se a todas as máquinas" />
          <ParamCen c={c} turnos={e.turnos.map((t) => t.nome)} on={por} />
          <label className="mt-3 flex items-center gap-2 text-sm"><span className="text-slate-500">Dias úteis em {a.meses[a.mes]}</span><Num v={a.dias[a.mes]} max={31} on={(v) => set((n) => { n.dias[n.mes] = v; }, { campo: `Dias úteis ${a.meses[a.mes]}`, de: String(a.dias[a.mes]), para: String(v) })} /></label>
        </Card>
        {m && <Card><Titulo t={`${m.nome} com 1, 2 e 3 turnos`} />
          {[0, 1, 2].map((k) => <div key={k} className="mb-2"><div className="flex justify-between text-xs"><span>{k + 1} turno(s)</span><b>{pct(r.turnosMaq[i][k])}</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, r.turnosMaq[i][k] * 100)}%`, background: corUtil(r.turnosMaq[i][k], e.amarelo, e.vermelho) }} /></div></div>)}
          <p className="mt-2 text-xs text-slate-400">{r.turnosMaq[i].some((u) => u < e.vermelho) ? `Fecha o plano com ${r.turnosMaq[i].findIndex((u) => u < e.vermelho) + 1} turno(s).` : 'Não fecha o plano nem com 3 turnos — avalie HE ou outra máquina.'}</p></Card>}
      </div>
      <GCarga a={a} r={r} />
      <Card>
        <Titulo t={`Peças usinadas em ${nome}`} sub={`${rows.length} linhas · edite tempo, setup e lote direto na tabela`} />
        <Grid cols={COLS} rows={rows} onSalvar={(ms) => { set((n) => ms.forEach((x) => { (n.est.linhas[x.id] as any)[x.key] = x.para; }), ms.map((x) => ({ campo: `${nome}: ${e.linhas[x.id].modelo}/${e.linhas[x.id].peca} — ${x.key}`, de: String(x.de), para: String(x.para) }))); aviso('Salvo — capacidade recalculada'); }} />
      </Card>
    </>
  );
}
