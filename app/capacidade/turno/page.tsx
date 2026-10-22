'use client';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { Btn, Card, Num, Sel, Titulo, corUtil, cx, h1, pct } from '@/components/ui';
import { Quadro } from '@/components/graficos';
import { comparar, dif, periodos, sugestoes, Agg } from '@/lib/turnos';

type Per = 'dia' | 'semana' | 'mes';
const AT = '#A5A5A5', NV = '#4472C4';

export default function PorTurno() {
  const { a, efetivo: e, set, aviso } = useStore();
  const [sAtual, setSAtual] = useState(0), [per, setPer] = useState<Per>('mes'), [tf, setTf] = useState(-1);
  const cmp = useMemo(() => comparar(e, sAtual, a.sel), [e, sAtual, a.sel]);
  const { atual, nova, perdas } = cmp;
  const k = (m: number) => { const p = periodos(e, m); return per === 'dia' ? p.diario : per === 'semana' ? p.semanal : p.mensal; };
  const fm = (m: number) => h1(k(m));
  const sinal = (n: number) => (n > 0.005 ? '+' : '') + h1(n);
  const cor = (n: number) => (n < -0.005 ? 'text-red-600' : n > 0.005 ? 'text-green-600' : 'text-slate-500');
  const cN = e.cenarios[a.sel].nome, cA = e.cenarios[sAtual].nome;
  const sug = useMemo(() => sugestoes(e, nova, a.sel), [e, nova, a.sel]);
  const perdeu = perdas.filter((p) => p.maq.h < -0.005 || p.cel.h < -0.005);
  const tsel = (arr: Agg[]) => (tf < 0 ? arr.reduce((s, x) => s + x.cap, 0) : arr[tf].cap);

  const grupos: { nome: string; un: string; g: (i: number, r: typeof atual) => number }[] = [
    { nome: 'Máquinas de usinagem', un: 'h-máquina', g: (i, r) => r.turnos[i].maq.cap },
    { nome: 'Células (mão de obra)', un: 'h-homem', g: (i, r) => r.turnos[i].cel.cap },
    { nome: 'Peças usinadas possíveis', un: 'peças', g: (i, r) => r.turnos[i].maq.pecas },
  ];
  const porTurnoChart = nova.turnos.map((t, i) => ({ turno: `Turno ${t.nome}`, [`Atual (${cA})`]: +k(atual.turnos[i].maq.cap).toFixed(1), [`Nova (${cN})`]: +k(t.maq.cap).toFixed(1), 'Carga': +k(t.maq.carga).toFixed(1) }));
  const porCel = nova.celulas.map((c, i) => ({ nome: c.nome, Atual: +k(tsel(atual.celulas[i].t)).toFixed(1), Nova: +k(tsel(c.t)).toFixed(1) }));
  const porMaq = nova.maquinas.map((m, i) => ({ nome: m.nome, Atual: +k(tsel(atual.maquinas.find((x) => x.nome === m.nome)?.t ?? atual.maquinas[i].t)).toFixed(1), Nova: +k(tsel(m.t)).toFixed(1) }));

  return (
    <>
      <Titulo t="Capacidade por turno" sub={`Escala atual (${cA}) × nova escala (${cN}) · ${a.meses[a.mes]} · ${e.diasMes} dias úteis`}>
        <Sel value={sAtual} onChange={(x) => setSAtual(+x.target.value)} title="Cenário da escala atual">{e.cenarios.map((c, i) => <option key={i} value={i}>Atual = {c.nome}</option>)}</Sel>
        <Sel value={per} onChange={(x) => setPer(x.target.value as Per)}><option value="dia">por dia</option><option value="semana">por semana</option><option value="mes">por mês</option></Sel>
      </Titulo>

      <Card className={perdeu.length ? '!border-red-200 !bg-red-50/40' : '!border-green-200 !bg-green-50/40'}>
        <h3 className="font-semibold">{perdeu.length ? `Turno${perdeu.length > 1 ? 's' : ''} que perde${perdeu.length > 1 ? 'm' : ''} capacidade com a nova escala` : 'Nenhum turno perde capacidade com a nova escala'}</h3>
        {perdeu.map((p) => <p key={p.turno} className="mt-1 text-sm"><b>Turno {p.turno}</b>: máquinas {sinal(k(p.maq.h))} h ({(p.maq.pct * 100).toFixed(1)}%) · pessoas {sinal(k(p.cel.h))} h-homem ({(p.cel.pct * 100).toFixed(1)}%) · peças {sinal(k(p.pecas.h))}</p>)}
        {!perdeu.length && <p className="mt-1 text-sm text-slate-500">Edite os horários em <b>Turnos e pessoas</b> (coluna “Nova escala”) para ver o impacto.</p>}
        {sug.length > 0 && <div className="mt-3 border-t pt-2"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Onde agir (nova escala)</div><ul className="list-disc space-y-0.5 pl-5 text-sm">{sug.map((s) => <li key={s}>{s}</li>)}</ul></div>}
      </Card>

      <Card>
        <Titulo t="Comparativo atual × nova por turno" sub={`capacidade ${per === 'dia' ? 'diária' : per === 'semana' ? 'semanal' : 'mensal'}`} />
        {grupos.map((g) => (
          <div key={g.nome} className="mb-4 overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="text-xs text-slate-500"><th className="text-left">{g.nome} ({g.un})</th>{nova.turnos.map((t) => <th key={t.nome} className="w-28">Turno {t.nome}</th>)}<th className="w-28">Total</th></tr></thead><tbody>
            <tr className="border-t"><td className="text-left">Capacidade atual</td>{[0, 1, 2].map((i) => <td key={i}>{fm(g.g(i, atual))}</td>)}<td className="font-medium">{fm([0, 1, 2].reduce((s, i) => s + g.g(i, atual), 0))}</td></tr>
            <tr className="border-t"><td className="text-left">Capacidade nova</td>{[0, 1, 2].map((i) => <td key={i}>{fm(g.g(i, nova))}</td>)}<td className="font-medium">{fm([0, 1, 2].reduce((s, i) => s + g.g(i, nova), 0))}</td></tr>
            <tr className="border-t"><td className="text-left">Diferença em horas{g.un === 'peças' ? ' (peças)' : ''}</td>{[0, 1, 2].map((i) => { const d = dif(g.g(i, atual), g.g(i, nova)); return <td key={i} className={cor(d.h)}>{sinal(k(d.h))}</td>; })}{(() => { const d = dif([0, 1, 2].reduce((s, i) => s + g.g(i, atual), 0), [0, 1, 2].reduce((s, i) => s + g.g(i, nova), 0)); return <td className={cx('font-medium', cor(d.h))}>{sinal(k(d.h))}</td>; })()}</tr>
            <tr className="border-t"><td className="text-left">Diferença em %</td>{[0, 1, 2].map((i) => { const d = dif(g.g(i, atual), g.g(i, nova)); return <td key={i} className={cor(d.h)}>{(d.pct * 100).toFixed(1)}%</td>; })}{(() => { const d = dif([0, 1, 2].reduce((s, i) => s + g.g(i, atual), 0), [0, 1, 2].reduce((s, i) => s + g.g(i, nova), 0)); return <td className={cx('font-medium', cor(d.h))}>{(d.pct * 100).toFixed(1)}%</td>; })()}</tr>
          </tbody></table></div>
        ))}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {nova.turnos.map((t, i) => { const at = atual.turnos[i]; const linhas: [string, string, string][] = [
          ['Horário', `${at.ini}–${at.fim}`, `${t.ini}–${t.fim}`], ['Horas disponíveis (bruto)', h1(at.bruto, 2), h1(t.bruto, 2)], ['Horas produtivas/dia (líquidas)', h1(at.liquida, 2), h1(t.liquida, 2)], ['Efetivamente produtivas/dia (× efic. × disp.)', h1(at.produtiva, 2), h1(t.produtiva, 2)],
          ['Funcionários', String(at.func), String(t.func)], ['Capacidade máquinas (h)', fm(at.maq.cap), fm(t.maq.cap)], ['Capacidade pessoas (h-homem)', fm(at.cel.cap), fm(t.cel.cap)], ['Capacidade em peças', h1(k(at.maq.pecas), 0), h1(k(t.maq.pecas), 0)],
          ['Carga planejada máquinas (h)', fm(at.maq.carga), fm(t.maq.carga)], ['Utilização máquinas', pct(at.maq.util), pct(t.maq.util)], ['Utilização pessoas', pct(at.cel.util), pct(t.cel.util)], ['Ociosidade máquinas (h)', fm(at.maq.ocioso), fm(t.maq.ocioso)],
          ['Sogyodo máquinas', pct(at.maq.sogyodo), pct(t.maq.sogyodo)], ['Saldo/déficit máquinas (h)', sinal(k(at.maq.saldo)), sinal(k(t.maq.saldo))], ['Horas extras necessárias (h)', fm(at.maq.deficit + at.cel.deficit), fm(t.maq.deficit + t.cel.deficit)],
        ]; return (
          <Card key={t.nome}>
            <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Turno {t.nome}</h3><span className={cx('rounded-full px-2 py-0.5 text-xs', t.ativo ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500')}>{t.ativo ? 'ativo' : 'inativo no cenário'}</span></div>
            <table className="w-full text-xs"><thead><tr className="text-slate-400"><th className="text-left font-normal" /><th className="w-20 text-right font-normal">Atual</th><th className="w-20 text-right font-normal">Nova</th></tr></thead><tbody>
              {linhas.map(([n, x, y]) => <tr key={n} className="border-t border-slate-100"><td className="py-1 pr-2">{n}</td><td className="text-right text-slate-500">{x}</td><td className={cx('text-right font-medium', x !== y && 'text-blue-700')}>{y}</td></tr>)}
            </tbody></table>
            {nova.celulas.length > 0 && <div className="mt-2 border-t pt-2 text-xs"><div className="mb-1 text-slate-400">Funcionários por célula</div>{nova.celulas.map((c, ci) => <div key={c.nome} className="flex justify-between"><span>{c.nome}</span><span>{e.celulas.filter((x) => x.nome)[ci].func[sAtual]?.[i] ?? 0} → <b>{e.celulas.filter((x) => x.nome)[ci].func[a.sel]?.[i] ?? 0}</b></span></div>)}</div>}
          </Card>
        ); })}
      </div>

      <div className="flex items-center gap-2 text-xs"><span className="text-slate-500">Gráficos por célula/máquina — turno:</span>{[-1, 0, 1, 2].map((i) => <Btn key={i} v={tf === i ? 'primary' : 'ghost'} className="!px-2.5 !py-1 text-xs" onClick={() => setTf(i)}>{i < 0 ? 'Todos' : e.turnos[i].nome}</Btn>)}</div>
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Quadro id="T1" origem="Novo (capacidade por turno)" titulo={`Capacidade das máquinas por turno — atual × nova (h ${per === 'dia' ? '/dia' : per === 'semana' ? '/semana' : '/mês'})`} alto={280}>
          <ResponsiveContainer><BarChart data={porTurnoChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="turno" /><YAxis /><Tooltip /><Legend verticalAlign="top" /><Bar dataKey={`Atual (${cA})`} fill={AT} /><Bar dataKey={`Nova (${cN})`} fill={NV} /><Bar dataKey="Carga" fill="#ED7D31" /></BarChart></ResponsiveContainer>
        </Quadro>
        <Quadro id="T2" origem="Novo (por máquina)" titulo={`Capacidade por máquina — atual × nova (${tf < 0 ? 'todos os turnos' : 'turno ' + e.turnos[tf].nome})`} alto={280}>
          <ResponsiveContainer><BarChart data={porMaq}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nome" /><YAxis /><Tooltip /><Legend verticalAlign="top" /><Bar dataKey="Atual" fill={AT} /><Bar dataKey="Nova" fill={NV} /></BarChart></ResponsiveContainer>
        </Quadro>
      </div>
      {porCel.length > 0 && <Quadro id="T3" origem="Novo (por célula)" titulo={`Capacidade por célula — atual × nova (${tf < 0 ? 'todos os turnos' : 'turno ' + e.turnos[tf].nome})`} alto={280}>
        <ResponsiveContainer><BarChart data={porCel}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nome" /><YAxis /><Tooltip /><Legend verticalAlign="top" /><Bar dataKey="Atual" fill={AT} /><Bar dataKey="Nova" fill={NV} /></BarChart></ResponsiveContainer></Quadro>}

      <Card>
        <Titulo t="Máquinas por turno" sub="capacidade, carga e utilização de cada máquina em cada turno (nova escala)" />
        <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="text-xs text-slate-500"><th className="text-left">Máquina</th>{nova.turnos.map((t) => <th key={t.nome} colSpan={3} className="border-l border-slate-100 text-center">Turno {t.nome}</th>)}</tr><tr className="text-[11px] text-slate-400"><th />{nova.turnos.map((t) => ['Cap.', 'Carga', 'Util.'].map((x) => <th key={t.nome + x} className="border-l border-slate-50 font-normal">{x}</th>))}</tr></thead><tbody>
          {nova.maquinas.map((m) => <tr key={m.nome} className="border-t border-slate-100"><td className="text-left font-medium">{m.nome}</td>{m.t.map((t, i) => t.cap > 0 || t.carga > 0 ? [<td key={i + 'c'} className="border-l border-slate-50">{fm(t.cap)}</td>, <td key={i + 'l'}>{fm(t.carga)}</td>, <td key={i + 'u'} style={{ color: corUtil(t.util, e.amarelo, e.vermelho) }} className="font-medium">{pct(t.util)}</td>] : [<td key={i + 'n'} colSpan={3} className="border-l border-slate-50 text-center text-slate-300">não opera</td>])}</tr>)}
        </tbody></table></div>
      </Card>

      <Card>
        <Titulo t="Funcionários por célula e turno" sub={`cenário ${cN} · cada célula pode ter quantidade diferente em cada turno`} />
        {!e.celulas.length && <p className="text-sm text-slate-400">Nenhuma célula cadastrada — cadastre em <b>Células</b>.</p>}
        {e.celulas.length > 0 && <div className="overflow-x-auto"><table className="text-sm"><thead><tr className="text-xs text-slate-500"><th className="pr-4 text-left">Célula</th>{e.turnos.map((t) => <th key={t.nome} className="px-2">Turno {t.nome}</th>)}</tr></thead><tbody>
          {a.est.celulas.map((c, ci) => <tr key={c.nome} className="border-t"><td className="py-1 pr-4 font-medium">{c.nome}</td>{[0, 1, 2].map((t) => <td key={t} className="px-2"><Num v={c.func[a.sel]?.[t] ?? 0} max={99} w="w-16" on={(v) => set((n) => { const f = n.est.celulas[ci].func; f[a.sel] ??= [0, 0, 0]; f[a.sel][t] = v; }, { campo: `${c.nome} — ${cN} turno ${e.turnos[t].nome}`, de: String(c.func[a.sel]?.[t] ?? 0), para: String(v) })} /></td>)}</tr>)}</tbody></table></div>}
      </Card>

      <Card>
        <Titulo t="Como a carga é distribuída entre os turnos" sub="a demanda é mensal; esta regra define quanto de cada recurso cai em cada turno" />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Sel value={a.est.alocacao ?? 'proporcional'} onChange={(x) => set((n) => { n.est.alocacao = x.target.value as any; }, { campo: 'Distribuição da carga entre turnos', de: a.est.alocacao ?? 'proporcional', para: x.target.value })}>
            <option value="proporcional">Proporcional à capacidade (mesma utilização em todos os turnos)</option><option value="sequencial">Sequencial (enche A, depois B, depois C)</option><option value="manual">Manual (pesos)</option></Sel>
          {(a.est.alocacao ?? 'proporcional') === 'manual' && ['A', 'B', 'C'].map((n, i) => <label key={n} className="flex items-center gap-1">peso {n}<Num v={a.est.pesoTurno?.[i] ?? 1} w="w-16" on={(v) => set((x) => { x.est.pesoTurno = [...(x.est.pesoTurno ?? [1, 1, 1])] as [number, number, number]; x.est.pesoTurno[i] = v; }, { campo: `Peso turno ${n}`, de: String(a.est.pesoTurno?.[i] ?? 1), para: String(v) })} /></label>)}
        </div>
        <p className="mt-2 text-xs text-slate-400">Capacidade de máquina = horas do turno × eficiência × disponibilidade, só nos turnos em que a máquina opera. Não aumenta com o número de funcionários.</p>
      </Card>
    </>
  );
}
