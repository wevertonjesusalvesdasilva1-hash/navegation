'use client';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { Card, Modal, Status, Titulo, corUtil, h1, pct } from '@/components/ui';
import { GCarga, GPlano, Quadro, cor } from '@/components/graficos';
import { calcular } from '@/lib/capacidade';
import { efetivoDe } from '@/lib/dados';

const Kpi = ({ t, v, s, c }: { t: string; v: string; s?: string; c?: string }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-xs text-slate-500">{t}</div><div className="mt-0.5 text-2xl font-semibold tracking-tight" style={{ color: c }}>{v}</div>{s && <div className="text-[11px] text-slate-400">{s}</div>}</div>
);

export default function Dashboard() {
  const { a, efetivo: e, res, r } = useStore();
  const [det, setDet] = useState<{ maq: string; modelo: string; h: number } | null>(null);
  const maqs = r.maquinas.filter((m) => a.fam === 'TODAS' || e.linhas.some((l) => l.maquina === m.nome && l.familia === a.fam));
  const t = maqs.reduce((x, m) => ({ cap: x.cap + m.efetiva, car: x.car + m.carga, nom: x.nom + m.nominal, def: x.def + m.deficit, oc: x.oc + m.ocioso }), { cap: 0, car: 0, nom: 0, def: 0, oc: 0 });
  const u = t.cap ? t.car / t.cap : 0, sogy = e.sogyodo === 'Nominal' ? (t.nom ? t.car / t.nom : 0) : u;
  const turnos = Math.max(0, ...r.turnosMaq.map((x) => (x[0] < e.vermelho ? 1 : x[1] < e.vermelho ? 2 : x[2] < e.vermelho ? 3 : 4)));
  const meses = useMemo(() => a.meses.map((m, i) => { const es = efetivoDe(a, i); const x = calcular(es, a.sel).maquinas; return { mes: m, Carga: +x.reduce((s, q) => s + q.carga, 0).toFixed(1), Capacidade: +x.reduce((s, q) => s + q.efetiva, 0).toFixed(1) }; }), [a]);
  const comp = r.maquinas.map((m, i) => ({ maq: m.nome, ...Object.fromEntries(res.map((x, k) => [e.cenarios[k].nome, +(x.maquinas[i].util * 100).toFixed(0)])) }));
  const linhasDet = det ? e.linhas.filter((l) => l.maquina === det.maq && l.modelo === det.modelo) : [];
  const [semSem] = [e.linhas.filter((l) => !(l.tp > 0)).length];
  return (
    <>
      <Titulo t="Dashboard" sub={`${e.cenarios[a.sel].nome} · ${a.meses[a.mes]} · ${e.diasMes} dias úteis · família: ${a.fam}`} />
      {semSem > 0 && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">⚠ {semSem} combinações peça×modelo estão sem tempo cadastrado — a carga mostrada é um piso. Cadastre em <b>Tempos padrão</b>.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi t="Capacidade (h)" v={h1(t.cap)} s="horas-máquina/mês" /><Kpi t="Carga planejada (h)" v={h1(t.car)} />
        <Kpi t="Utilização" v={pct(u)} c={corUtil(u, e.amarelo, e.vermelho)} s={`${e.amarelo * 100}% atenção · ${e.vermelho * 100}% limite`} /><Kpi t="Sogyodo" v={pct(sogy)} s={`base ${e.sogyodo.toLowerCase()}`} />
        <Kpi t="Excedente / HE necessárias (h)" v={h1(t.def)} c={t.def > 0 ? '#ef4444' : undefined} /><Kpi t="Ociosidade (h)" v={h1(t.oc)} />
        <Kpi t="Máquinas insuficientes" v={`${maqs.filter((m) => m.status === 'INSUFICIENTE').length} de ${maqs.length}`} s={`${maqs.filter((m) => m.status === 'ATENÇÃO').length} em atenção`} /><Kpi t="Turnos p/ fechar o plano" v={turnos > 3 ? '> 3' : String(turnos)} s="pior máquina, sem HE" />
      </div>
      <GCarga a={a} r={r} onDetalhe={(maq, modelo, h) => setDet({ maq, modelo, h })} />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Quadro id="D1" origem="Novo (visão por mês)" titulo="Carga × capacidade nos 12 meses" alto={280}>
          <ResponsiveContainer><ComposedChart data={meses}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" /><YAxis /><Tooltip /><Legend verticalAlign="top" /><Bar dataKey="Carga" fill="#4472C4" /><Line dataKey="Capacidade" stroke="#FF0000" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer>
        </Quadro>
        <Quadro id="D2" origem="Novo (comparação de cenários)" titulo="Utilização por máquina — cenários (%)" alto={280}>
          <ResponsiveContainer><BarChart data={comp}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="maq" /><YAxis /><Tooltip /><Legend verticalAlign="top" />{e.cenarios.map((c, i) => <Bar key={c.nome} dataKey={c.nome} fill={['#4472C4', '#ED7D31', '#70AD47'][i % 3]} />)}</BarChart></ResponsiveContainer>
        </Quadro>
      </div>
      <GPlano a={a} />
      <Card>
        <Titulo t="Máquinas" sub="clique no gráfico G1 para detalhar modelo × máquina" />
        <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr className="text-xs text-slate-500"><th className="text-left">Máquina</th><th>Cap. (h)</th><th>Carga (h)</th><th className="w-1/3 text-left">Utilização</th><th>Saldo (h)</th><th>HE nec. (h)</th><th>Status</th></tr></thead><tbody>
          {maqs.map((m) => <tr key={m.nome} className="border-t border-slate-100"><td className="text-left font-medium">{m.nome}</td><td>{h1(m.efetiva)}</td><td>{h1(m.carga)}</td>
            <td><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.util * 100)}%`, background: corUtil(m.util, e.amarelo, e.vermelho) }} /></div><span className="w-10">{pct(m.util)}</span></div></td>
            <td className={m.saldo < 0 ? 'text-red-600' : 'text-green-600'}>{h1(m.saldo)}</td><td>{h1(m.deficit)}</td><td><Status s={m.status} /></td></tr>)}
        </tbody></table></div>
      </Card>
      <Card>
        <Titulo t="Gargalos por fluxo" sub="recurso mais carregado de cada modelo/peça" />
        <ul className="grid gap-x-6 md:grid-cols-2">{r.gargalos.slice(0, 12).map((g) => <li key={g.chave} className="flex justify-between border-t border-slate-100 py-1"><span>{g.chave}</span><span><b>{g.recurso}</b> {pct(g.util)}</span></li>)}</ul>
      </Card>
      <Modal aberto={!!det} fechar={() => setDet(null)} titulo={det ? `${det.maq} · ${det.modelo} — ${h1(det.h)} h` : ''}>
        <table className="w-full text-right text-sm"><thead><tr className="text-xs text-slate-500"><th className="text-left">Peça</th><th>Tempo (min)</th><th>Demanda</th><th>Horas</th></tr></thead><tbody>
          {linhasDet.map((l, i) => <tr key={i} className="border-t"><td className="text-left">{l.peca}</td><td>{l.tp}</td><td>{l.dem}</td><td>{h1((l.dem * l.tp * e.cenarios[a.sel].fTempo * e.cenarios[a.sel].fDem) / 60, 2)}</td></tr>)}
        </tbody></table>
      </Modal>
    </>
  );
}
